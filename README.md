# Jewelry Digital System

珠宝店数字化系统一期工程骨架。

本仓库采用 pnpm workspace + Turborepo 管理后端、微信端、运营后台、魔镜终端、H5 页面与共享包。一期目标是先跑通“魔镜试戴 -> 扫码授权 -> 优惠券发放 -> 后台跟进”的最小运营闭环，不提前实现 P1/P2 复杂功能。

## Workspace

- `apps/api`: NestJS + Fastify 后端模块化单体
- `apps/miniapp`: Taro + React + TypeScript 微信端
- `apps/admin`: React + Vite + TypeScript 运营后台
- `apps/mirror-terminal`: Electron + React + Vite 魔镜终端
- `apps/h5`: 活动页、分享页、原石身份证页
- `packages/shared`: 多端共享类型、枚举和接口占位
- `packages/ui`: 可复用 UI 组件预留
- `packages/config`: 统一工程配置预留
- `prisma`: Prisma schema 与迁移目录
- `docs`: 架构、API、ADR、运维文档

## Commands

当前未安装依赖，以下命令为后续接入依赖后的统一入口：

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm format
```

## Phase 1 Rule

本阶段只建立工程骨架和最小可验证闭环。任何业务表、真实 AR SDK、真实 AI 供应商、支付、消息推送等实现，需等待后续编号指令。
