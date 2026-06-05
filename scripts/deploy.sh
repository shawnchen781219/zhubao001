#!/usr/bin/env bash
# ============================================================================
# 一键部署脚本 — 珠宝店数字化系统
# 用法：./scripts/deploy.sh [target] [options]
#
#   target:
#     api       只部署后端 API（build + rsync dist + pm2 restart）
#     h5        只部署 H5 前端（rsync public/）
#     admin     只部署 Admin 前端（rsync public/）
#     prisma    只部署 Prisma schema + migrations（不重启 API）
#     all       全部（默认值）
#
#   options:
#     --skip-build      跳过本地构建
#     --skip-commit     跳过自动 git commit
#     --skip-verify     跳过健康检查
#     --dry-run         模拟执行，输出命令但不执行
#     -h, --help        显示帮助
#
# 部署目标：root@47.98.109.227:/var/www/jewelry
# ============================================================================
set -euo pipefail

# ── 配置 ──
SSH_USER="${DEPLOY_USER:-root}"
SSH_HOST="${DEPLOY_HOST:-47.98.109.227}"
REMOTE_DIR="${DEPLOY_REMOTE_DIR:-/var/www/jewelry}"
REMOTE_APP_DIR="${REMOTE_DIR}/apps/api"
PM2_NAME="${PM2_NAME:-jewelry-api}"
HEALTH_URL="http://127.0.0.1:3000/healthz"

# 项目根目录（脚本所在位置的上一级）
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# ── 颜色输出 ──
RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[1;33m'
BLU='\033[0;34m'; CYN='\033[0;36m'; RST='\033[0m'
log() { echo -e "${BLU}[deploy]${RST} $*"; }
ok()  { echo -e "${GRN}  ✓${RST} $*"; }
warn(){ echo -e "${YLW}  ⚠${RST} $*"; }
err() { echo -e "${RED}  ✗${RST} $*" >&2; }

# ── 帮助 ──
usage() {
  cat <<'HELP'
用法: ./scripts/deploy.sh [target] [options]

target（必选其一，默认 all）:
  api        只部署后端 API（build + rsync dist + pm2 restart）
  h5         只部署 H5 前端（rsync public/）
  admin      只部署 Admin 前端（rsync public/）
  prisma     只部署 Prisma schema + migrations（不重启 API）
  all        全部（默认值）

options:
  --skip-build        跳过本地构建
  --skip-commit       跳过自动 git commit
  --skip-verify       跳过健康检查
  --dry-run           模拟执行，输出命令但不执行
  -h, --help          显示帮助

环境变量（可覆盖默认值）:
  DEPLOY_USER             远程用户（默认 root）
  DEPLOY_HOST             远程主机（默认 47.98.109.227）
  DEPLOY_REMOTE_DIR       远程目录（默认 /var/www/jewelry）
  PM2_NAME                PM2 进程名（默认 jewelry-api）

示例:
  ./scripts/deploy.sh                    # 全部署
  ./scripts/deploy.sh h5                 # 只部署 H5
  ./scripts/deploy.sh api --skip-build   # API 部署（跳过构建，用于之前已成功构建的场景）
  ./scripts/deploy.sh all --dry-run      # 模拟执行
  ./scripts/deploy.sh all --skip-commit  # 不自动 commit
HELP
  exit 0
}

# ── 参数解析 ──
TARGET="all"
SKIP_BUILD=0
SKIP_COMMIT=0
SKIP_VERIFY=0
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    api|h5|admin|prisma|all) TARGET="$1" ;;
    --skip-build)    SKIP_BUILD=1 ;;
    --skip-commit)   SKIP_COMMIT=1 ;;
    --skip-verify)   SKIP_VERIFY=1 ;;
    --dry-run)       DRY_RUN=1 ;;
    -h|--help)       usage ;;
    *)               err "Unknown option: $1"; usage ;;
  esac
  shift
done

run() {
  if [[ $DRY_RUN -eq 1 ]]; then
    echo -e "${CYN}  [dry]${RST} $*"
    return 0
  fi
  "$@"
}

# ── 1. 本地构建 ──
do_build() {
  if [[ $SKIP_BUILD -eq 1 ]]; then
    warn "跳过本地构建"
    return 0
  fi

  if [[ "$TARGET" == "api" || "$TARGET" == "all" ]]; then
    log "🔨 构建 API（pnpm --filter @jewelry/api build）..."
    if ! run pnpm --filter @jewelry/api build; then
      err "API 构建失败"
      exit 1
    fi
    ok "API 构建成功"
  fi

  if [[ "$TARGET" == "admin" || "$TARGET" == "h5" || "$TARGET" == "all" ]]; then
    log "🧪 语法检查前端 JS..."
    run node -c apps/admin/public/app.js 2>/dev/null || { err "admin/app.js 语法错误"; exit 1; }
    run node -c apps/h5/public/app.js 2>/dev/null || { err "h5/app.js 语法错误"; exit 1; }
    ok "前端 JS 语法 OK"
  fi
}

# ── 2. 上传文件 ──
do_upload() {
  local rsync_opts=(-avz --progress)

  if [[ "$TARGET" == "api" || "$TARGET" == "all" ]]; then
    log "📦 上传 API dist（编译产物）..."
    run rsync "${rsync_opts[@]}" --delete \
      apps/api/dist/ \
      "${SSH_USER}@${SSH_HOST}:${REMOTE_APP_DIR}/dist/" \
      || { err "rsync API dist 失败"; exit 1; }
    ok "API dist 已上传"

    log "📦 上传 Prisma Client（generated/）..."
    run rsync "${rsync_opts[@]}" --delete \
      apps/api/src/generated/ \
      "${SSH_USER}@${SSH_HOST}:${REMOTE_APP_DIR}/src/generated/" \
      || { err "rsync generated 失败"; exit 1; }
    ok "Prisma Client 已上传"
  fi

  if [[ "$TARGET" == "h5" || "$TARGET" == "all" ]]; then
    log "📦 上传 H5 前端..."
    run rsync "${rsync_opts[@]}" --delete \
      apps/h5/public/ \
      "${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/apps/h5/public/" \
      || { err "rsync H5 失败"; exit 1; }
    ok "H5 已上传"
  fi

  if [[ "$TARGET" == "admin" || "$TARGET" == "all" ]]; then
    log "📦 上传 Admin 前端..."
    run rsync "${rsync_opts[@]}" --delete \
      apps/admin/public/ \
      "${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/apps/admin/public/" \
      || { err "rsync Admin 失败"; exit 1; }
    ok "Admin 已上传"
  fi

  if [[ "$TARGET" == "prisma" || "$TARGET" == "all" ]]; then
    log "📦 上传 Prisma schema + migrations..."
    run rsync "${rsync_opts[@]}" \
      prisma/schema.prisma \
      "${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/prisma/schema.prisma" \
      || { err "rsync schema 失败"; exit 1; }
    run rsync "${rsync_opts[@]}" \
      prisma/migrations/ \
      "${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/prisma/migrations/" \
      || { err "rsync migrations 失败"; exit 1; }
    run rsync "${rsync_opts[@]}" \
      prisma.config.ts \
      "${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/prisma.config.ts" \
      2>/dev/null || true
    ok "Prisma 文件已上传"
  fi
}

# ── 3. 远程重启 & 验证 ──
do_restart() {
  if [[ "$TARGET" != "api" && "$TARGET" != "prisma" && "$TARGET" != "all" ]]; then
    log "纯前端部署，无需重启 API"
    return 0
  fi

  log "🔄 远程重启 PM2 进程 '${PM2_NAME}'..."
  run ssh "${SSH_USER}@${SSH_HOST}" "cd ${REMOTE_DIR} && pm2 restart ${PM2_NAME} --update-env && sleep 4" \
    || { err "pm2 restart 失败"; exit 1; }
  ok "PM2 重启完成"

  if [[ $SKIP_VERIFY -eq 1 ]]; then
    warn "跳过健康检查"
    return 0
  fi

  log "🩺 健康检查..."
  local status
  status=$(ssh "${SSH_USER}@${SSH_HOST}" "curl -sf '${HEALTH_URL}' | python3 -c 'import sys,json;print(json.load(sys.stdin).get(\"status\",\"FAIL\"))' 2>/dev/null" || echo "TIMEOUT")
  if [[ "$status" == "ok" ]]; then
    ok "API 健康 ✓ (${HEALTH_URL})"
  else
    err "API 不健康！响应: $status"
    err "查看日志: ssh ${SSH_USER}@${SSH_HOST} 'pm2 logs ${PM2_NAME} --lines 20 --nostream'"
    exit 1
  fi

  log "📊 PM2 进程状态..."
  ssh "${SSH_USER}@${SSH_HOST}" "pm2 status ${PM2_NAME} 2>/dev/null | tail -5" | head -3
}

# ── 4. 自动 git commit ──
do_commit() {
  if [[ $SKIP_COMMIT -eq 1 ]]; then
    warn "跳过自动 git commit"
    return 0
  fi

  cd "$PROJECT_ROOT"
  local changes
  changes=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$changes" -eq 0 ]]; then
    log "📝 无变更，跳过 commit"
    return 0
  fi

  log "📝 自动 commit（${changes} 个文件变更）..."
  run git add -A
  local msg="deploy: ${TARGET} auto-deploy $(date +'%Y-%m-%d %H:%M')"
  run git commit -m "$msg" -m "target: ${TARGET}, skip-build: ${SKIP_BUILD}, files: ${changes}" \
    || warn "commit 失败（可能是 hook 拦截）"
  ok "已 commit：${msg}"
}

# ── 主流程 ──
main() {
  echo -e "${CYN}"
  echo "╔══════════════════════════════════════════════════════╗"
  echo "║   🚀 珠宝店数字化系统 — 一键部署                    ║"
  echo "╚══════════════════════════════════════════════════════╝"
  echo -e "${RST}"
  log "Target:   ${CYN}${TARGET}${RST}"
  log "Server:   ${CYN}${SSH_USER}@${SSH_HOST}${RST} → ${REMOTE_DIR}"
  log "Skip:     build=${SKIP_BUILD}  commit=${SKIP_COMMIT}  verify=${SKIP_VERIFY}"
  log "Dry-run:  ${DRY_RUN}"
  echo ""

  local start_ts
  start_ts=$(date +%s)

  do_build
  do_upload
  do_restart
  do_commit

  local end_ts
  end_ts=$(date +%s)
  local elapsed=$((end_ts - start_ts))

  echo ""
  echo -e "${GRN}"
  echo "╔══════════════════════════════════════════════════════╗"
  echo -e "║   ✓ 部署完成！ 耗时 ${elapsed}s${RST}"
  echo -e "╠══════════════════════════════════════════════════════╣"
  echo "║  🌐 Admin: http://${SSH_HOST}:5176"
  echo "║  📱 H5:    http://${SSH_HOST}:5175"
  echo "║  🔌 API:   http://${SSH_HOST}:3000/healthz"
  echo -e "╚══════════════════════════════════════════════════════╝${RST}"
}

main
