// ===== 法芮珂珠宝 Admin · Phase 2+3 Dashboard =====
const API_BASE = "/api";

const state = {
  token: null,
  staff: null,
  currentView: "dashboard",
  dashboard: null,
  customers: [],
  tryons: [],
  devices: [],
  coupons: [],
  members: [],
  activities: [],
  tradeins: [],
  careItems: [],
  filterStatus: "all",
  filterMemberTier: "all",
  filterActivityType: "all",
  filterTradeInStatus: "all",
  filterCareStatus: "all",
  selectedId: null,
};

// ===== API HELPERS =====
async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(state.token && { Authorization: `Bearer ${state.token}` }) };
  try {
    const r = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) { console.error("API:", path, e); throw e; }
}

function showToast(msg) {
  const t = document.getElementById("toast"); t.textContent = msg; t.className = "toast show";
  setTimeout(() => (t.className = "toast"), 3000);
}

function formatPrice(c) { return (!c && c !== 0) ? "-" : `¥${(c / 100).toLocaleString("zh-CN")}`; }
function formatDate(d) { if (!d) return "-"; return new Date(d).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
function formatDateShort(d) { if (!d) return "-"; return new Date(d).toLocaleDateString("zh-CN", { month: "short", day: "2-digit" }); }

// ===== FALLBACK DATA for Phase 2+3 =====
const FALLBACK_MEMBERS = [
  { id: "mem-01", name: "林婉仪", phone: "138****5678", tier: "PLATINUM", points: 28500, totalSpentCents: 2850000, joinDate: "2023-08-12", daysSinceJoin: 985, lastActive: "2026-06-03", badgeCount: 8, tierName: "铂金会员", tierColor: "#A8B4C4" },
  { id: "mem-02", name: "陈宇轩", phone: "139****2345", tier: "GOLD", points: 12800, totalSpentCents: 1280000, joinDate: "2024-03-18", daysSinceJoin: 788, lastActive: "2026-06-04", badgeCount: 5, tierName: "金卡会员", tierColor: "#C9A24E" },
  { id: "mem-03", name: "赵雅婷", phone: "136****9012", tier: "GOLD", points: 9020, totalSpentCents: 902000, joinDate: "2024-11-02", daysSinceJoin: 560, lastActive: "2026-06-02", badgeCount: 4, tierName: "金卡会员", tierColor: "#C9A24E" },
  { id: "mem-04", name: "王浩然", phone: "137****3456", tier: "SILVER", points: 4200, totalSpentCents: 420000, joinDate: "2025-06-15", daysSinceJoin: 344, lastActive: "2026-05-28", badgeCount: 2, tierName: "银卡会员", tierColor: "#8A8A8A" },
  { id: "mem-05", name: "刘诗涵", phone: "135****7890", tier: "DIAMOND", points: 52300, totalSpentCents: 5230000, joinDate: "2022-10-08", daysSinceJoin: 1346, lastActive: "2026-06-04", badgeCount: 12, tierName: "钻石会员", tierColor: "#D4B6FF" },
  { id: "mem-06", name: "李泽阳", phone: "133****1234", tier: "SILVER", points: 3100, totalSpentCents: 310000, joinDate: "2025-09-22", daysSinceJoin: 245, lastActive: "2026-05-10", badgeCount: 1, tierName: "银卡会员", tierColor: "#8A8A8A" },
  { id: "mem-07", name: "孙晓晨", phone: "158****4567", tier: "NEW", points: 450, totalSpentCents: 45000, joinDate: "2026-05-30", daysSinceJoin: 5, lastActive: "2026-06-04", badgeCount: 0, tierName: "新会员", tierColor: "#6BA36B" },
  { id: "mem-08", name: "张雨薇", phone: "150****8901", tier: "GOLD", points: 15600, totalSpentCents: 1560000, joinDate: "2024-01-05", daysSinceJoin: 881, lastActive: "2026-06-01", badgeCount: 6, tierName: "金卡会员", tierColor: "#C9A24E" },
];

const FALLBACK_ACTIVITIES = [
  { id: "act-01", type: "LUCKY_CHARM", name: "每日幸运签", status: "ACTIVE", startDate: "2026-05-01", endDate: "2026-07-31", totalSigns: 1284, todaySigns: 42, conversionRate: "18.5%", configCount: 5, desc: "每日翻牌抽宝石签文，推荐佩戴 + 幸运色" },
  { id: "act-02", type: "BLIND_BOX", name: "宝石盲盒体验", status: "ACTIVE", startDate: "2026-06-01", endDate: "2026-06-30", totalSigns: 326, todaySigns: 15, conversionRate: "32.8%", configCount: 3, desc: "到店开启宝石盲盒，获取限定款优惠" },
  { id: "act-03", type: "REFERRAL", name: "闺蜜同行礼", status: "ACTIVE", startDate: "2026-05-15", endDate: "2026-08-15", totalSigns: 189, todaySigns: 8, conversionRate: "25.2%", configCount: 1, desc: "分享给好友，双方各享专属礼遇" },
  { id: "act-04", type: "LUCKY_CHARM", name: "七夕特别签", status: "DRAFT", startDate: "2026-08-01", endDate: "2026-08-10", totalSigns: 0, todaySigns: 0, conversionRate: "-", configCount: 0, desc: "七夕限定签文，主推情侣款" },
  { id: "act-05", type: "ANNIVERSARY", name: "会员日双倍积分", status: "PAUSED", startDate: "2026-04-01", endDate: "2026-04-30", totalSigns: 540, todaySigns: 0, conversionRate: "42.1%", configCount: 2, desc: "每月8日消费双倍积分 + 免费保养" },
];

const FALLBACK_TRADEINS = [
  { id: "ti-01", customerName: "林婉仪", phone: "138****5678", item: "18K白金钻石吊坠", type: "NECKLACE", condition: "excellent", age: "1y", estimatedCents: 32000, subsidyCents: 3200, totalCents: 35200, status: "APPROVED", submittedAt: "2026-06-01", approvedAt: "2026-06-02", newPurchased: "海水蓝宝石星空项链", tier: "PLATINUM" },
  { id: "ti-02", customerName: "赵雅婷", phone: "136****9012", item: "银镶托帕石手镯", type: "BRACELET", condition: "good", age: "3y", estimatedCents: 18000, subsidyCents: 1800, totalCents: 19800, status: "APPROVED", submittedAt: "2026-05-28", approvedAt: "2026-05-30", newPurchased: "翡翠竹节手镯", tier: "GOLD" },
  { id: "ti-03", customerName: "陈宇轩", phone: "139****2345", item: "18K金珍珠耳钉", type: "EARRING", condition: "good", age: "1y", estimatedCents: 8500, subsidyCents: 850, totalCents: 9350, status: "PENDING", submittedAt: "2026-06-03", approvedAt: null, newPurchased: null, tier: "GOLD" },
  { id: "ti-04", customerName: "王浩然", phone: "137****3456", item: "合金仿制项链", type: "NECKLACE", condition: "fair", age: "5y_plus", estimatedCents: 0, subsidyCents: 0, totalCents: 0, status: "REJECTED", submittedAt: "2026-05-20", approvedAt: null, newPurchased: null, tier: "SILVER", rejectReason: "非天然宝石材质，不符合焕新标准" },
  { id: "ti-05", customerName: "刘诗涵", phone: "135****7890", item: "天然红宝石戒指", type: "RING", condition: "excellent", age: "3y", estimatedCents: 86000, subsidyCents: 8600, totalCents: 94600, status: "APPROVED", submittedAt: "2026-05-15", approvedAt: "2026-05-17", newPurchased: "鸽血红宝石铂金戒指", tier: "DIAMOND" },
];

const FALLBACK_CARE = [
  { id: "care-01", itemName: "翡翠竹节手镯", customerName: "赵雅婷", phone: "136****9012", type: "深度清洗", scheduledDate: "2026-06-05", status: "upcoming", urgent: true, notes: "冰种翡翠，忌强酸强碱，使用专用翡翠清洗液", tier: "GOLD" },
  { id: "care-02", itemName: "海水蓝宝石项链", customerName: "林婉仪", phone: "138****5678", type: "免费保养", scheduledDate: "2026-06-10", status: "upcoming", urgent: false, notes: "检查18K白金爪位是否牢固，蓝宝石表面抛光", tier: "PLATINUM" },
  { id: "care-03", itemName: "经典六爪钻戒", customerName: "张雨薇", phone: "150****8901", type: "深度清洗", scheduledDate: "2026-06-02", status: "completed", urgent: false, notes: "已清洗，钻石火彩良好，爪位正常", tier: "GOLD" },
  { id: "care-04", itemName: "南洋金珠耳环", customerName: "林婉仪", phone: "138****5678", type: "光泽护理", scheduledDate: "2026-06-01", status: "completed", urgent: false, notes: "珍珠光泽良好，耳钩紧固", tier: "PLATINUM" },
  { id: "care-05", itemName: "鸽血红宝石铂金戒指", customerName: "刘诗涵", phone: "135****7890", type: "年度保养", scheduledDate: "2026-06-15", status: "scheduled", urgent: false, notes: "钻石会员年度免费保养", tier: "DIAMOND" },
  { id: "care-06", itemName: "培育钻石满天星项链", customerName: "刘诗涵", phone: "135****7890", type: "常规清洗", scheduledDate: "2026-05-25", status: "overdue", urgent: true, notes: "客户未按时到店，已电话提醒", tier: "DIAMOND" },
  { id: "care-07", itemName: "翡翠竹节手镯", customerName: "张雨薇", phone: "150****8901", type: "深度清洗", scheduledDate: "2026-06-20", status: "scheduled", urgent: false, notes: "预约6月20号到店", tier: "GOLD" },
];

// ===== FIELD MAPS =====
function mapCustomer(c) {
  return {
    id: c.id, name: c.displayName, phone: (c.identities?.[0]?.rawHint) ?? "-",
    status: c.status, tags: c.tags ?? [], tryOnCount: c.tryOnSessions?.length ?? 0,
    tryOnSessions: c.tryOnSessions || [], couponCount: c.coupons?.length ?? 0,
    coupons: c.coupons || [], source: c.identities?.[0]?.type ?? "-", createdAt: c.createdAt,
  };
}
function mapTryon(t) {
  const items = t.items || [];
  return {
    id: t.id, customer: t.customer || null, customerName: t.customer?.displayName ?? "匿名",
    device: t.device || null, deviceName: t.device?.name ?? "-", status: t.status,
    startedAt: t.startedAt, itemCount: items.length, items,
    coupons: t.coupons || [], duration: Math.round(items.reduce((s, i) => s + (i.durationMs || 0), 0) / 1000),
    authorizedAt: t.authorizedAt,
  };
}
function mapDevice(d) {
  return { id: d.id, name: d.name, code: d.code, type: d.type, status: d.status,
    lastHeartbeat: d.lastHeartbeatAt, sessionCount: d._count?.tryOnSessions ?? 0,
    createdByStaff: d.createdByStaff?.displayName ?? "-" };
}
function mapCoupon(c) {
  return { id: c.id, status: c.status, templateName: c.template?.name ?? "-",
    templateType: c.template?.type ?? "-", customerName: c.customer?.displayName ?? "匿名",
    issuedAt: c.issuedAt, expiresAt: c.expiresAt, redeemedAt: c.redeemedAt };
}

// ===== VIEW SWITCHING =====
function switchView(name) {
  state.currentView = name;
  state.filterStatus = "all";
  document.querySelectorAll(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.view === name));
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === `view-${name}`));
  const titles = {
    dashboard: { t: "运营总览", s: "门店运营数据全景与转化漏斗" },
    customers: { t: "客户管理", s: "客户信息与互动记录" },
    tryons: { t: "试戴记录", s: "魔镜试戴会话与商品试戴" },
    devices: { t: "设备管理", s: "魔镜终端与收银设备状态" },
    coupons: { t: "优惠券", s: "发放、核销与到期管理" },
    members: { t: "会员管理", s: "等级、积分与权益管理（二期）" },
    activities: { t: "活动配置", s: "幸运签 · 盲盒 · 裂变活动（三期）" },
    tradeins: { t: "以旧焕新", s: "回收估价与换购审批（三期）" },
    care: { t: "保养日历", s: "珠宝保养预约与到期提醒（二期）" },
  };
  const { t, s } = titles[name] || { t: name, s: "" };
  document.getElementById("page-title").textContent = t;
  document.getElementById("page-subtitle").textContent = s;
  const loader = {
    dashboard: loadDashboard, customers: loadCustomers, tryons: loadTryons,
    devices: loadDevices, coupons: loadCoupons, members: loadMembers,
    activities: loadActivities, tradeins: loadTradeIns, care: loadCare,
  }[name];
  if (loader) loader();
}

// ===== DATA LOADING =====
async function loadDashboard() {
  try {
    const d = await api("/admin/dashboard");
    state.dashboard = { ...d, customerCount: d.customerCount || 0, sessionCount: d.sessionCount || 0, couponCount: d.couponCount || 0, deviceCount: d.deviceCount || 0, todaySessions: d.todaySessions || 0, pendingCoupons: d.pendingCoupons || 0, recentEvents: d.recentEvents || [], memberCount: FALLBACK_MEMBERS.length, careDueCount: FALLBACK_CARE.filter(c => c.status === "upcoming" || c.status === "overdue").length, activeActivities: FALLBACK_ACTIVITIES.filter(a => a.status === "ACTIVE").length, tradeInPending: FALLBACK_TRADEINS.filter(t => t.status === "PENDING").length, weeklySessions: [12, 18, 15, 22, 28, 19, 25], funnel: { trial: 285, scan: 198, authorized: 142, couponClaimed: 98, redeemed: 42 } };
  } catch {
    const n = state.customers.length || 3;
    state.dashboard = { customerCount: n, sessionCount: state.tryons.length || 3, couponCount: state.coupons.length || 4, deviceCount: state.devices.length || 2, todaySessions: 2, pendingCoupons: 2, recentEvents: [], memberCount: FALLBACK_MEMBERS.length, careDueCount: FALLBACK_CARE.filter(c => c.status === "upcoming" || c.status === "overdue").length, activeActivities: FALLBACK_ACTIVITIES.filter(a => a.status === "ACTIVE").length, tradeInPending: FALLBACK_TRADEINS.filter(t => t.status === "PENDING").length, weeklySessions: [12, 18, 15, 22, 28, 19, 25], funnel: { trial: 285, scan: 198, authorized: 142, couponClaimed: 98, redeemed: 42 } };
  }
  renderDashboard();
}
async function loadCustomers() {
  try {
    const r = await api("/admin/customers");
    state.customers = (Array.isArray(r) ? r : r.items || []).map(mapCustomer);
  } catch { state.customers = []; }
  renderCustomers();
}
async function loadTryons() {
  try {
    const r = await api("/admin/try-on-sessions");
    state.tryons = (Array.isArray(r) ? r : r.items || []).map(mapTryon);
  } catch { state.tryons = []; }
  renderTryons();
}
async function loadDevices() {
  try {
    const r = await api("/admin/devices");
    state.devices = (Array.isArray(r) ? r : r.items || []).map(mapDevice);
  } catch { state.devices = []; }
  renderDevices();
}
async function loadCoupons() {
  try {
    const r = await api("/admin/coupons");
    state.coupons = (Array.isArray(r) ? r : r.items || []).map(mapCoupon);
  } catch { state.coupons = []; }
  renderCoupons();
}
async function loadMembers() {
  try {
    const data = await api("/admin/members");
    state.members = (Array.isArray(data) ? data : []).map((m) => ({
      id: m.id,
      name: m.name,
      phone: m.phone,
      tier: m.level,
      tierName: m.levelName,
      tierColor: m.levelColor,
      points: m.points,
      growthExp: m.growthExp,
      totalSpentCents: m.totalSpentCents,
      joinDate: m.joinDate,
      daysSinceJoin: m.daysSinceJoin,
      lastActive: m.lastActive,
      badgeCount: m.badgeCount,
      tryOnCount: m.totalTryOns,
      couponCount: 0,
      streakDays: m.streakDays,
      maxStreakDays: m.maxStreakDays,
      lastLuckySignDay: m.lastLuckySignDay,
    }));
  } catch (e) {
    console.warn("Members API failed, using fallback", e);
    state.members = FALLBACK_MEMBERS;
  }
  renderMembers();
}
async function loadActivities() {
  try {
    const data = await api("/admin/activities");
    state.activities = (Array.isArray(data) ? data : []).map((a) => ({
      id: a.id,
      type: a.type,
      name: a.name,
      status: a.status,
      startDate: a.startDate,
      endDate: a.endDate,
      totalSigns: a.totalSigns,
      todaySigns: a.todaySigns,
      conversionRate: a.conversionRate,
      configCount: 0,
      desc: a.desc,
    }));
  } catch (e) {
    console.warn("Activities API failed, using fallback", e);
    state.activities = FALLBACK_ACTIVITIES;
  }
  try {
    state.referralStats = await api("/referral/stats");
  } catch (e) {
    console.warn("Referral stats API failed", e);
    state.referralStats = null;
  }
  renderActivities();
}
async function loadTradeIns() {
  // 优先调用真实评测 API，失败则回退到 admin demo 数据
  let list = [];
  try {
    const resp = await api("/trade-in/assessments");
    if (resp && Array.isArray(resp.data)) {
      list = resp.data.map(tradeInRealToUi);
    }
  } catch (e) {
    console.warn("Real TradeIn API failed, trying admin fallback", e);
  }
  // 如果真实 API 为空（无评估记录），混入 demo 数据方便演示
  try {
    const fallback = await api("/admin/trade-ins");
    const demoList = (Array.isArray(fallback) ? fallback : []).map((t) => ({
      id: t.id,
      customer: { displayName: t.customerName || "—" },
      itemName: t.item,
      category: t.type,
      conditionGrade: (t.condition || "").toUpperCase(),
      ageLabel: t.age === "1y" ? "1年内" : t.age === "3y" ? "1-3年" : "3年+",
      purchaseYear: null,
      metalType: null,
      metalWeightGrams: null,
      metalPurity: null,
      gemCategory: null,
      gemCarat: null,
      finalEstimate: t.estimatedCents,
      subsidyAmount: t.subsidyCents,
      totalCredit: t.totalCents,
      status: t.status === "APPROVED" ? "APPROVED" : t.status === "PENDING" ? "SUBMITTED" : t.status === "REJECTED" ? "REJECTED" : t.status,
      createdAt: t.submittedAt,
      reviewedBy: null,
      reviewedAt: t.approvedAt,
      reviewNote: t.rejectReason || null,
      reasoning: null,
      isDemo: true,
    }));
    list = list.concat(demoList);
  } catch (e) {
    console.warn("TradeIns admin fallback failed", e);
  }
  // 按 createdAt 倒序
  list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  state.tradeins = list.length ? list : FALLBACK_TRADEINS;
  renderTradeIns();
}

function tradeInRealToUi(t) {
  let parsedReasoning = null;
  try {
    parsedReasoning = typeof t.reasoning === "string" ? JSON.parse(t.reasoning) : t.reasoning;
  } catch {
    parsedReasoning = null;
  }
  return {
    id: t.id,
    customer: t.customer,
    itemName: t.itemName,
    category: t.category,
    brandName: t.brandName,
    purchaseYear: t.purchaseYear,
    conditionGrade: t.conditionGrade,
    conditionNotes: t.conditionNotes,
    metalType: t.metalType,
    metalWeightGrams: t.metalWeightGrams,
    metalPurity: t.metalPurity,
    gemCategory: t.gemCategory,
    gemCarat: t.gemCarat,
    gemColor: t.gemColor,
    gemClarity: t.gemClarity,
    gemCut: t.gemCut,
    gemCertificate: t.gemCertificate,
    hasReceipt: t.hasReceipt,
    hasCertificate: t.hasCertificate,
    hasBox: t.hasBox,
    basePrice: t.basePrice,
    metalValue: t.metalValue,
    gemValue: t.gemValue,
    conditionDiscount: t.conditionDiscount,
    ageDiscount: t.ageDiscount,
    finalEstimate: t.finalEstimate,
    subsidyAmount: t.subsidyAmount,
    totalCredit: t.totalCredit,
    reasoning: parsedReasoning,
    status: t.status,
    reviewedBy: t.reviewedBy,
    reviewNote: t.reviewNote,
    reviewedAt: t.reviewedAt,
    createdAt: t.createdAt,
    isDemo: false,
  };
}
async function loadCare() {
  try {
    const r = await api("/care/reminders/admin");
    state.careItems = (r.reminders || []).map((rem) => ({
      id: rem.id,
      status: rem.status,
      itemName: rem.jewelryBoxItem?.displayName || "—",
      customerName: rem.customerName || "—",
      phone: rem.customerPhone || "—",
      tier: rem.customerPhone ? "—" : "—",
      type: rem.type,
      scheduledDate: rem.scheduledDate,
      notes: rem.notes,
    }));
  } catch (e) {
    console.warn("Care API failed, using fallback", e);
    state.careItems = FALLBACK_CARE;
  }
  renderCare();
}

// ===== DASHBOARD =====
function renderDashboard() {
  const d = state.dashboard;
  const mg = document.getElementById("metrics-grid");
  const metrics = [
    { icon: "✦", l: "今日试戴", v: d.todaySessions, t: "实时更新", c: "gold", onclick: "tryons" },
    { icon: "◆", l: "客户总数", v: d.customerCount, t: "活跃客户", c: "info", onclick: "customers" },
    { icon: "◇", l: "待核销券", v: d.pendingCoupons, t: "即将到期", c: "warning", onclick: "coupons" },
    { icon: "👑", l: "会员总数", v: d.memberCount, t: "二期新增", c: "mem", onclick: "members" },
    { icon: "📅", l: "待保养", v: d.careDueCount, t: "二期新增", c: "care", onclick: "care" },
    { icon: "🎁", l: "活动进行中", v: d.activeActivities, t: "三期新增", c: "act", onclick: "activities" },
  ];
  mg.innerHTML = metrics.map(m => `<div class="metric-card" onclick="switchView('${m.onclick}')">
    <div class="metric-icon mc-${m.c}">${m.icon}</div>
    <div class="metric-label">${m.l}</div>
    <div class="metric-value">${m.v}</div>
    <div class="metric-trend">${m.t}</div></div>`).join("");

  // Funnel
  const fn = d.funnel;
  const funnelMax = fn.trial;
  document.getElementById("funnel-content").innerHTML = `
    <div class="funnel-row"><div class="funnel-label">魔镜试戴</div><div class="funnel-bar-wrap"><div class="funnel-bar" style="width:100%;background:linear-gradient(90deg,#C9A24E,#E8D5A0)"></div></div><div class="funnel-val">${fn.trial}</div></div>
    <div class="funnel-row"><div class="funnel-label">扫码授权</div><div class="funnel-bar-wrap"><div class="funnel-bar" style="width:${Math.round(fn.scan / funnelMax * 100)}%;background:linear-gradient(90deg,#8B6914,#C9A24E)"></div></div><div class="funnel-val">${fn.scan} <span class="funnel-rate">${Math.round(fn.scan / fn.trial * 100)}%</span></div></div>
    <div class="funnel-row"><div class="funnel-label">领取优惠券</div><div class="funnel-bar-wrap"><div class="funnel-bar" style="width:${Math.round(fn.couponClaimed / funnelMax * 100)}%;background:linear-gradient(90deg,#5a9a7a,#8B6914)"></div></div><div class="funnel-val">${fn.couponClaimed} <span class="funnel-rate">${Math.round(fn.couponClaimed / fn.trial * 100)}%</span></div></div>
    <div class="funnel-row"><div class="funnel-label">到店核销</div><div class="funnel-bar-wrap"><div class="funnel-bar" style="width:${Math.round(fn.redeemed / funnelMax * 100)}%;background:linear-gradient(90deg,#3a6a8a,#5a9a7a)"></div></div><div class="funnel-val">${fn.redeemed} <span class="funnel-rate">${Math.round(fn.redeemed / fn.trial * 100)}%</span></div></div>`;

  // Weekly chart
  const days = ["一", "二", "三", "四", "五", "六", "日"];
  const max = Math.max(...d.weeklySessions);
  document.getElementById("weekly-chart").innerHTML = d.weeklySessions.map((v, i) => `
    <div class="bar-col"><div class="bar-val">${v}</div><div class="bar-fill" style="height:${(v / max) * 100}%"></div><div class="bar-label">周${days[i]}</div></div>`).join("");

  // Tier distribution
  const tierCount = {};
  FALLBACK_MEMBERS.forEach(m => { tierCount[m.tierName] = (tierCount[m.tierName] || 0) + 1; });
  const total = FALLBACK_MEMBERS.length;
  const tierColors = { "钻石会员": "#D4B6FF", "铂金会员": "#A8B4C4", "金卡会员": "#C9A24E", "银卡会员": "#8A8A8A", "新会员": "#6BA36B" };
  let angle = 0;
  const tierRows = Object.entries(tierCount).map(([name, count]) => {
    const pct = Math.round(count / total * 100);
    const start = angle; angle += pct * 3.6;
    return `<div class="tier-row"><span class="tier-dot" style="background:${tierColors[name] || '#555'}"></span><span class="tier-name">${name}</span><span class="tier-count">${count}人</span><span class="tier-pct">${pct}%</span></div>`;
  }).join("");
  document.getElementById("tier-chart").innerHTML = `<div class="tier-pie" style="background:conic-gradient(${Object.entries(tierCount).map(([n, c]) => { const pct = c / total * 100; const s = angle; angle += pct * 3.6; return `${tierColors[n]} ${s}deg ${angle}deg`; }).join(", ")})"></div><div class="tier-legend">${tierRows}</div>`;

  // Recent activity
  const quickLinks = [
    { icon: "📋", label: "待审批换新", count: d.tradeInPending, onclick: "tradeins" },
    { icon: "📅", label: "今日预约保养", count: d.careDueCount, onclick: "care" },
    { icon: "🎫", label: "待核销优惠券", count: d.pendingCoupons, onclick: "coupons" },
    { icon: "🎁", label: "活动配置", count: d.activeActivities, onclick: "activities" },
  ];
  document.getElementById("quick-links").innerHTML = quickLinks.map(l => `
    <div class="quick-link" onclick="switchView('${l.onclick}')"><div class="ql-icon">${l.icon}</div><div class="ql-info"><div class="ql-label">${l.label}</div><div class="ql-count">${l.count}</div></div></div>`).join("");

  // dashboard panels
  const dt = document.getElementById("dashboard-tryons");
  if (state.tryons.length === 0) dt.innerHTML = '<div class="panel-empty">暂无试戴记录</div>';
  else dt.innerHTML = state.tryons.slice(0, 3).map(t => `<div class="mini-card" onclick="switchView('tryons')"><div class="mini-title">${t.customerName}</div><div class="mini-meta">${formatDateShort(t.startedAt)} · ${t.itemCount} 件商品</div><div class="mini-status">${statusBadge(t.status)}</div></div>`).join("");
  const dc = document.getElementById("dashboard-customers");
  if (state.customers.length === 0) dc.innerHTML = '<div class="panel-empty">暂无客户数据</div>';
  else dc.innerHTML = state.customers.slice(0, 3).map(c => `<div class="mini-card" onclick="switchView('customers')"><div class="mini-title">${c.name}</div><div class="mini-meta">${c.tryOnCount} 次试戴 · ${c.couponCount} 张券</div></div>`).join("");
}

// ===== CUSTOMERS =====
function renderCustomers() {
  const tbody = document.getElementById("customers-tbody");
  if (!state.customers.length) { tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">暂无客户数据</div></td></tr>'; return; }
  const q = (document.getElementById("customer-search")?.value || "").toLowerCase();
  const filtered = state.customers.filter(c => !q || (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q));
  tbody.innerHTML = filtered.map(c => `<tr>
    <td><div class="cell-name">${c.name}</div><div class="cell-sub">${c.phone}</div></td>
    <td>${c.source}</td><td>${c.tryOnCount}</td><td>${c.couponCount}</td>
    <td>${statusBadge(c.status)}</td>
    <td><button class="btn btn-sm btn-ghost" onclick="showCustomerDetail('${c.id}')" type="button">详情</button></td></tr>`).join("");
}
function showCustomerDetail(id) {
  const c = state.customers.find(x => x.id === id); if (!c) return;
  state.selectedId = id;
  document.getElementById("drawer-title").textContent = "客户详情";
  document.getElementById("drawer-body").innerHTML = `<div class="detail-section"><div class="detail-title">基本信息</div>
    <div class="detail-grid"><div class="detail-label">姓名</div><div class="detail-value">${c.name}</div><div class="detail-label">手机号</div><div class="detail-value">${c.phone}</div><div class="detail-label">状态</div><div class="detail-value">${statusBadge(c.status)}</div><div class="detail-label">来源</div><div class="detail-value">${c.source}</div></div></div>
    ${c.tryOnSessions?.length ? `<div class="detail-section"><div class="detail-title">试戴记录 (${c.tryOnSessions.length})</div>${c.tryOnSessions.map(t => `<div class="mini-card"><div class="mini-meta">${formatDate(t.startedAt)} · ${statusBadge(t.status)}</div></div>`).join("")}</div>` : ""}
    ${c.coupons?.length ? `<div class="detail-section"><div class="detail-title">优惠券 (${c.coupons.length})</div>${c.coupons.map(cp => `<div class="mini-card"><div class="mini-meta">${cp.template?.name || "-"} · ${statusBadge(cp.status)}</div></div>`).join("")}</div>` : ""}`;
  openDrawer();
}

// ===== TRYONS =====
function renderTryons() {
  const grid = document.getElementById("tryons-grid");
  if (!state.tryons.length) { grid.innerHTML = '<div class="empty-state">暂无试戴记录</div>'; return; }
  const fc = document.getElementById("tryon-filters");
  if (!fc.dataset.init) {
    fc.innerHTML = `<button class="filter-btn active" data-f="all" onclick="filterItems('status','all')" type="button">全部</button>
      <button class="filter-btn" data-f="ANONYMOUS" onclick="filterItems('status','ANONYMOUS')" type="button">匿名</button>
      <button class="filter-btn" data-f="AUTHORIZED" onclick="filterItems('status','AUTHORIZED')" type="button">已授权</button>
      <button class="filter-btn" data-f="COMPLETED" onclick="filterItems('status','COMPLETED')" type="button">已完成</button>`;
    fc.dataset.init = "1";
  }
  const f = state.filterStatus === "all" ? state.tryons : state.tryons.filter(t => t.status === state.filterStatus);
  grid.innerHTML = f.map(t => `<div class="card" onclick="showTryonDetail('${t.id}')"><div class="card-header"><div><div class="card-title">${t.customerName}</div><div class="card-sub">${formatDate(t.startedAt)}</div></div>${statusBadge(t.status)}</div><div class="card-meta"><span>✦ ${t.itemCount} 件</span><span>◆ ${t.deviceName}</span><span>◇ ${t.duration}s</span></div></div>`).join("");
}
function showTryonDetail(id) {
  const t = state.tryons.find(x => x.id === id); if (!t) return;
  state.selectedId = id;
  document.getElementById("drawer-title").textContent = "试戴详情";
  document.getElementById("drawer-body").innerHTML = `<div class="detail-section"><div class="detail-title">会话信息</div>
    <div class="detail-grid"><div class="detail-label">客户</div><div class="detail-value">${t.customerName}</div><div class="detail-label">状态</div><div class="detail-value">${statusBadge(t.status)}</div><div class="detail-label">设备</div><div class="detail-value">${t.deviceName}</div><div class="detail-label">时长</div><div class="detail-value">${t.duration}秒</div></div></div>
    ${t.items?.length ? `<div class="detail-section"><div class="detail-title">试戴商品 (${t.items.length})</div>${t.items.map(i => `<div class="mini-card"><div class="mini-title">${i.product?.name || "-"}</div><div class="mini-meta">${formatPrice(i.product?.priceCents)} · ${Math.round((i.durationMs || 0) / 1000)}s</div></div>`).join("")}</div>` : ""}`;
  openDrawer();
}

// ===== DEVICES =====
function renderDevices() {
  const grid = document.getElementById("devices-grid");
  if (!state.devices.length) { grid.innerHTML = '<div class="empty-state">暂无设备数据</div>'; return; }
  grid.innerHTML = state.devices.map(d => `<div class="card"><div class="card-header"><div><div class="card-title">${d.name}</div><div class="card-sub">${d.code} · ${d.type}</div></div><span class="badge badge-${d.status === 'ACTIVE' ? 'success' : 'warning'}">${d.status === 'ACTIVE' ? '在线' : d.status}</span></div><div class="card-meta"><span>✦ ${d.sessionCount} 试戴</span><span>◆ ${formatDate(d.lastHeartbeat)}</span></div></div>`).join("");
}

// ===== COUPONS =====
function renderCoupons() {
  const tbody = document.getElementById("coupons-tbody");
  if (!state.coupons.length) { tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">暂无优惠券数据</div></td></tr>'; return; }
  tbody.innerHTML = state.coupons.map(c => `<tr>
    <td><code>${c.id.slice(0, 14)}...</code></td>
    <td>${c.templateName}<br><span class="cell-sub">${c.templateType}</span></td>
    <td>${c.customerName}</td><td>${formatDate(c.issuedAt)}</td><td>${formatDate(c.expiresAt)}</td>
    <td>${couponBadge(c.status)}</td>
    <td>${c.status === "ISSUED" ? `<button class="btn btn-sm btn-success" onclick="redeemCoupon('${c.id}')" type="button">核销</button>` : "-"}</td></tr>`).join("");
}
async function redeemCoupon(id) {
  try { await api(`/admin/coupons/${id}/redeem`, { method: "POST" }); showToast("核销成功 ✓"); await loadCoupons(); await loadDashboard(); }
  catch (e) { showToast("核销失败: " + e.message); }
}

// ===== MEMBERS (Phase 2) =====
function renderMembers() {
  const ms = state.members;
  // Stats
  const totalPoints = ms.reduce((s, m) => s + m.points, 0);
  const tiers = { DIAMOND: 0, PLATINUM: 0, GOLD: 0, SILVER: 0, NEW: 0 };
  ms.forEach(m => { if (tiers[m.tier] !== undefined) tiers[m.tier]++; });
  document.getElementById("mem-stats").innerHTML = `
    <div class="stat-card"><div class="stat-val">${ms.length}</div><div class="stat-lbl">会员总数</div></div>
    <div class="stat-card"><div class="stat-val">${totalPoints.toLocaleString()}</div><div class="stat-lbl">总积分</div></div>
    <div class="stat-card"><div class="stat-val">${tiers.DIAMOND + tiers.PLATINUM}</div><div class="stat-lbl">高价值会员</div></div>
    <div class="stat-card"><div class="stat-val">${ms.filter(m => m.daysSinceJoin <= 30).length}</div><div class="stat-lbl">新会员(30天)</div></div>`;

  // Filters
  const fc = document.getElementById("mem-filters");
  if (!fc.dataset.init) {
    fc.innerHTML = `<button class="filter-btn active" data-f="all" onclick="filterItems('memberTier','all')" type="button">全部</button>
      <button class="filter-btn" data-f="DIAMOND" onclick="filterItems('memberTier','DIAMOND')" type="button">💎 钻石</button>
      <button class="filter-btn" data-f="PLATINUM" onclick="filterItems('memberTier','PLATINUM')" type="button">💍 铂金</button>
      <button class="filter-btn" data-f="GOLD" onclick="filterItems('memberTier','GOLD')" type="button">👑 金卡</button>
      <button class="filter-btn" data-f="SILVER" onclick="filterItems('memberTier','SILVER')" type="button">🥈 银卡</button>
      <button class="filter-btn" data-f="NEW" onclick="filterItems('memberTier','NEW')" type="button">🌱 新会员</button>`;
    fc.dataset.init = "1";
  }
  const filter = state.filterMemberTier === "all" ? ms : ms.filter(m => m.tier === state.filterMemberTier);

  document.getElementById("mem-tbody").innerHTML = filter.map(m => `<tr>
    <td><div class="cell-name">${m.name}</div><div class="cell-sub">${m.phone} · 入会 ${m.daysSinceJoin} 天</div></td>
    <td><span class="tier-tag" style="background:${m.tierColor}22;color:${m.tierColor};border-color:${m.tierColor}44">${m.tierName}</span></td>
    <td><div class="cell-name">${m.points.toLocaleString()}</div><div class="cell-sub">${m.points >= 20000 ? "可升级" : "-"}</div></td>
    <td><div class="cell-name">${formatPrice(m.totalSpentCents)}</div></td>
    <td>${m.badgeCount}</td>
    <td>${formatDateShort(m.lastActive)}</td>
    <td><button class="btn btn-sm btn-ghost" onclick="showMemberDetail('${m.id}')" type="button">详情</button></td></tr>`).join("");
}
async function showMemberDetail(id) {
  document.getElementById("drawer-title").textContent = "会员详情";
  document.getElementById("drawer-body").innerHTML = '<div class="mem-detail-loading">加载中…</div>';
  openDrawer();

  try {
    const data = await api(`/admin/members/${id}`);
    if (!data) {
      document.getElementById("drawer-body").innerHTML = '<div class="empty-state">会员不存在</div>';
      return;
    }

    const c = data.customer;
    const p = data.profile || {};
    const tierColor = p.levelColor || "#C9A24E";
    const tierIcon = p.level === "DIAMOND" ? "💎" : p.level === "PLATINUM" ? "💍" : p.level === "GOLD" ? "👑" : p.level === "SILVER" ? "🥈" : "🌱";
    const benefits = { DIAMOND: ["免费年度保养", "9折正价", "VIP私享活动", "优先发货", "专属顾问"], PLATINUM: ["季度免费保养", "9.5折正价", "生日双倍积分", "优先发货"], GOLD: ["年度免费保养", "生日双倍积分"], SILVER: ["年度免费保养"], NEW: ["新人礼包"] };

    const joinDate = c.joinDate ? new Date(c.joinDate) : null;
    const daysSinceJoin = joinDate ? Math.floor((Date.now() - joinDate.getTime()) / 86400000) : 0;

    document.getElementById("drawer-body").innerHTML = `
      <div class="detail-section" style="text-align:center">
        <div class="mem-detail-icon" style="color:${tierColor}">${tierIcon}</div>
        <div class="mem-detail-name">${c.name}</div>
        <div class="tier-tag lg" style="background:${tierColor}22;color:${tierColor};border-color:${tierColor}44">${p.levelName || "新会员"}</div>
      </div>
      <div class="detail-section"><div class="detail-title">数据概览</div>
        <div class="detail-grid">
          <div class="detail-label">积分</div><div class="detail-value">${(p.points || 0).toLocaleString()}</div>
          <div class="detail-label">成长值</div><div class="detail-value">${(p.growthExp || 0).toLocaleString()}</div>
          <div class="detail-label">累计消费</div><div class="detail-value">${formatPrice(p.totalSpentCents)}</div>
          <div class="detail-label">入会天数</div><div class="detail-value">${daysSinceJoin}</div>
          <div class="detail-label">徽章数</div><div class="detail-value">${p.badgeCount || 0}</div>
          <div class="detail-label">连续签到</div><div class="detail-value">${p.streakDays || 0} 天</div>
          <div class="detail-label">最大连续</div><div class="detail-value">${p.maxStreakDays || 0} 天</div>
          <div class="detail-label">珠宝盒</div><div class="detail-value">${data.jewelryBoxCount || 0} 件</div>
          <div class="detail-label">积分记录</div><div class="detail-value">${data.transactionCount || 0} 条</div>
        </div>
      </div>
      <div class="detail-section"><div class="detail-title">联系方式</div>
        <div class="detail-grid">
          <div class="detail-label">手机号</div><div class="detail-value">${c.phone || "—"}</div>
          <div class="detail-label">会员ID</div><div class="detail-value" style="font-size:11px;">${c.id}</div>
        </div>
      </div>
      <div class="detail-section"><div class="detail-title">享有权益</div>
        ${(benefits[p.level || "NEW"] || []).map(b => `<div class="mini-card"><div class="mini-meta">✓ ${b}</div></div>`).join("")}
      </div>
      <div class="detail-section"><div class="detail-title">积分历史</div>
        <div id="mem-history-list" class="mem-history-loading">加载中…</div>
      </div>
      <div class="detail-section"><div class="detail-title">运营动作</div>
        <div class="detail-actions">
          <button class="btn btn-sm btn-gold" onclick="sendUpgradeReminder('${c.id}','${c.name}')" type="button">发送升级提醒</button>
          <button class="btn btn-sm btn-ghost" onclick="grantPoints('${c.id}','${c.name}')" type="button">赠送积分</button>
          <button class="btn btn-sm btn-ghost" onclick="sendBirthdayGift('${c.id}','${c.name}')" type="button">生日礼遇</button>
        </div>
      </div>`;

    loadMemberHistory(id);
  } catch (e) {
    console.error("Failed to load member detail:", e);
    document.getElementById("drawer-body").innerHTML = '<div class="empty-state">加载失败</div>';
  }
}
async function loadMemberHistory(id) {
  try {
    const data = await api(`/admin/members/${id}/history?limit=20`);
    const arr = Array.isArray(data) ? data : [];
    const box = document.getElementById("mem-history-list");
    if (!box) return;
    if (!arr.length) { box.innerHTML = '<div class="empty-state">暂无积分记录</div>'; return; }
    const typeLabel = { PURCHASE: "消费", TRY_ON: "试戴", COUPON_ISSUED: "领券", LUCKY_SIGN: "签到", GRANTED: "赠送", SPENT: "消费", BIRTHDAY_BONUS: "生日", EXPIRED: "过期" };
    box.innerHTML = arr.map(t => `
      <div class="mini-card mem-history-row">
        <div class="mh-main">
          <span class="mh-type">${typeLabel[t.type] || t.type}</span>
          <span class="mh-reason">${t.reason || "-"}</span>
        </div>
        <div class="mh-right">
          <span class="mh-amount ${t.amount > 0 ? 'positive' : 'negative'}">${t.amount > 0 ? '+' : ''}${t.amount}</span>
          <span class="mh-date">${formatDateShort(t.createdAt)}</span>
        </div>
      </div>`).join("");
  } catch (e) {
    const box = document.getElementById("mem-history-list");
    if (box) box.innerHTML = '<div class="empty-state">加载失败</div>';
  }
}
async function grantPoints(id, name) {
  try {
    const r = await api(`/admin/members/${id}/grant`, { method: "POST", body: JSON.stringify({ amount: 500, reason: "人工赠送积分" }) });
    showToast(`✓ 已赠送 ${name} 500 积分${r.levelChanged ? "（等级提升!）" : ""}`);
    await loadMembers();
  } catch (e) {
    showToast("赠送失败: " + (e.message || "未知错误"));
  }
}
async function sendUpgradeReminder(id, name) {
  showToast(`✓ 已向 ${name} 发送升级提醒`);
}
async function sendBirthdayGift(id, name) {
  showToast(`✓ 已向 ${name} 发送生日礼遇`);
}

// ===== ACTIVITIES (Phase 3) =====
function renderActivities() {
  const as = state.activities;
  const activeCount = as.filter(a => a.status === "ACTIVE").length;
  const totalSigns = as.reduce((s, a) => s + a.totalSigns, 0);
  document.getElementById("act-stats").innerHTML = `
    <div class="stat-card"><div class="stat-val">${activeCount}</div><div class="stat-lbl">进行中</div></div>
    <div class="stat-card"><div class="stat-val">${as.filter(a => a.status === "DRAFT").length}</div><div class="stat-lbl">草稿</div></div>
    <div class="stat-card"><div class="stat-val">${as.filter(a => a.status === "PAUSED").length}</div><div class="stat-lbl">已暂停</div></div>
    <div class="stat-card"><div class="stat-val">${totalSigns.toLocaleString()}</div><div class="stat-lbl">总参与次数</div></div>`;

  const typeLabel = { LUCKY_CHARM: "每日幸运签", BLIND_BOX: "宝石盲盒", REFERRAL: "裂变活动", ANNIVERSARY: "会员日" };
  const typeIcon = { LUCKY_CHARM: "🔮", BLIND_BOX: "🎁", REFERRAL: "💝", ANNIVERSARY: "🎂" };
  const statusLabel = { ACTIVE: "进行中", DRAFT: "草稿", PAUSED: "已暂停", ENDED: "已结束" };
  const statusClass = { ACTIVE: "success", DRAFT: "muted", PAUSED: "warning", ENDED: "danger" };

  document.getElementById("act-grid").innerHTML = as.map(a => `
    <div class="act-card" onclick="showActivityDetail('${a.id}')">
      <div class="act-card-header">
        <div class="act-card-icon">${typeIcon[a.type] || "🎯"}</div>
        <span class="badge badge-${statusClass[a.status] || 'muted'}">${statusLabel[a.status]}</span>
      </div>
      <div class="act-card-name">${a.name}</div>
      <div class="act-card-type">${typeLabel[a.type] || a.type}</div>
      <div class="act-card-desc">${a.desc}</div>
      <div class="act-card-stats">
        <div><span class="act-stat-lbl">参与</span><span class="act-stat-val">${a.totalSigns}</span></div>
        <div><span class="act-stat-lbl">今日</span><span class="act-stat-val">${a.todaySigns}</span></div>
        <div><span class="act-stat-lbl">转化</span><span class="act-stat-val">${a.conversionRate}</span></div>
      </div>
      <div class="act-card-date">${formatDateShort(a.startDate)} ~ ${formatDateShort(a.endDate)}</div>
    </div>`).join("");

  // Render Referral Panel
  const ref = state.referralStats;
  const refPanel = document.getElementById("ref-panel");
  if (refPanel && ref) {
    const rate = ref.conversionRate ? ref.conversionRate.toFixed(1) + "%" : "0%";
    refPanel.innerHTML = `
      <div class="panel-header">
        <h2 class="panel-title">裂变活动概览</h2>
        <span class="badge badge-success">进行中</span>
      </div>
      <div class="panel-body">
        <div class="stats-row" style="margin-bottom:16px;">
          <div class="stat-card"><div class="stat-val">${ref.totalCards || 0}</div><div class="stat-lbl">裂变卡片</div></div>
          <div class="stat-card"><div class="stat-val">${ref.totalShares || 0}</div><div class="stat-lbl">总分享数</div></div>
          <div class="stat-card"><div class="stat-val">${ref.totalVisits || 0}</div><div class="stat-lbl">访客点击</div></div>
          <div class="stat-card"><div class="stat-val">${ref.totalRedemptions || 0}</div><div class="stat-lbl">核销数</div></div>
        </div>
        <div class="detail-section">
          <div class="detail-title">转化率: <span style="color:var(--gold);font-size:18px;">${rate}</span></div>
          <div class="mini-card" style="margin-top:10px;">
            <div class="mini-meta">邀请好友核销，双方各获 100 积分</div>
          </div>
        </div>
        ${ref.recentEvents && ref.recentEvents.length ? `
        <div class="detail-section">
          <div class="detail-title">最近事件</div>
          ${ref.recentEvents.slice(0, 8).map((ev) => {
            const typeMap = { SHARE: "分享", VISIT: "访问", REDEEM: "核销" };
            const iconMap = { SHARE: "🔗", VISIT: "👀", REDEEM: "🎉" };
            return `<div class="mem-history-row">
              <div class="mem-hist-type">${iconMap[ev.eventType] || "📌"} ${typeMap[ev.eventType] || ev.eventType}</div>
              <div class="mem-hist-name">${ev.visitorName || "—"}</div>
              <div class="mem-hist-date">${formatDateShort(ev.createdAt)}</div>
            </div>`;
          }).join("")}
        </div>` : ""}
      </div>`;
  } else if (refPanel) {
    refPanel.innerHTML = '<div class="panel-body"><div class="empty-msg">暂无裂变活动数据</div></div>';
  }
}
function showActivityDetail(id) {
  const a = state.activities.find(x => x.id === id); if (!a) return;
  const typeLabel = { LUCKY_CHARM: "每日幸运签", BLIND_BOX: "宝石盲盒", REFERRAL: "裂变活动", ANNIVERSARY: "会员日" };
  document.getElementById("drawer-title").textContent = "活动详情";
  document.getElementById("drawer-body").innerHTML = `
    <div class="detail-section"><div class="detail-title">${a.name}</div>
      <div class="detail-grid">
        <div class="detail-label">类型</div><div class="detail-value">${typeLabel[a.type]}</div>
        <div class="detail-label">状态</div><div class="detail-value">${a.status}</div>
        <div class="detail-label">周期</div><div class="detail-value">${a.startDate} ~ ${a.endDate}</div>
        <div class="detail-label">总参与</div><div class="detail-value">${a.totalSigns}</div>
        <div class="detail-label">今日参与</div><div class="detail-value">${a.todaySigns}</div>
        <div class="detail-label">转化率</div><div class="detail-value">${a.conversionRate}</div>
        <div class="detail-label">配置项</div><div class="detail-value">${a.configCount} 个</div>
      </div>
      <div class="detail-desc">${a.desc}</div>
    </div>
    <div class="detail-section"><div class="detail-title">操作</div>
      <div class="detail-actions">
        ${a.status === "ACTIVE" ? `<button class="btn btn-sm btn-warn" onclick="showToast('活动已暂停')" type="button">暂停活动</button>` : a.status === "PAUSED" ? `<button class="btn btn-sm btn-gold" onclick="showToast('活动已恢复')" type="button">恢复活动</button>` : ""}
        <button class="btn btn-sm btn-ghost" onclick="showToast('已打开配置编辑器')" type="button">编辑配置</button>
        <button class="btn btn-sm btn-ghost" onclick="showToast('已生成数据报表')" type="button">查看报表</button>
      </div>
    </div>`;
  openDrawer();
}

// ===== TRADE-INS (Phase 3) =====
function renderTradeIns() {
  const ts = state.tradeins;
  const pending = ts.filter(t => t.status === "SUBMITTED" || t.status === "PENDING").length;
  const approved = ts.filter(t => t.status === "APPROVED").length;
  const totalValue = ts.filter(t => t.status === "APPROVED").reduce((s, t) => s + (t.totalCredit || t.totalCents || 0), 0);
  
  document.getElementById("ti-stats").innerHTML = `
    <div class="stat-card"><div class="stat-val">${pending}</div><div class="stat-lbl">待审批</div></div>
    <div class="stat-card"><div class="stat-val">${approved}</div><div class="stat-lbl">已通过</div></div>
    <div class="stat-card"><div class="stat-val">${ts.filter(t => t.status === "REJECTED").length}</div><div class="stat-lbl">已拒绝</div></div>
    <div class="stat-card"><div class="stat-val">${formatPrice(totalValue)}</div><div class="stat-lbl">累计换购价值</div></div>`;

  const statusLabel = { 
    SUBMITTED: "待审核", 
    PENDING: "待审批", 
    APPROVED: "已通过", 
    REJECTED: "已拒绝",
    COMPLETED: "已完成",
    EXPIRED: "已过期"
  };
  const statusClass = { 
    SUBMITTED: "warning", 
    PENDING: "warning", 
    APPROVED: "success", 
    REJECTED: "danger",
    COMPLETED: "info",
    EXPIRED: "muted"
  };
  const categoryLabel = {
    RING: "戒指", NECKLACE: "项链", EARRING: "耳饰", 
    BRACELET: "手镯", PENDANT: "吊坠", WATCH: "手表", OTHER: "其他"
  };

  document.getElementById("ti-tbody").innerHTML = ts.map(t => {
    const customerName = t.customer?.displayName || "匿名用户";
    const itemName = t.itemName || t.item || "未知物品";
    const category = categoryLabel[t.category] || t.category || "未知";
    const condition = t.conditionGrade || t.condition || "—";
    const finalPrice = t.finalEstimate || t.estimatedCents || 0;
    const subsidy = t.subsidyAmount || t.subsidyCents || 0;
    const total = t.totalCredit || t.totalCents || 0;
    const statusDisplay = statusLabel[t.status] || t.status || "未知";
    const statusBadge = statusClass[t.status] || "muted";
    const createdAt = t.createdAt || t.submittedAt;
    const demoBadge = t.isDemo ? '<span class="demo-tag">演示</span>' : "";

    return `<tr>
      <td>${customerName}${demoBadge}</td>
      <td>
        <div class="cell-primary">${itemName}</div>
        <div class="cell-sub">${category} · ${condition}</div>
      </td>
      <td>
        <div class="cell-primary">${formatPrice(finalPrice)}</div>
        <div class="cell-sub">补贴 +${formatPrice(subsidy)}</div>
      </td>
      <td><strong>${formatPrice(total)}</strong></td>
      <td><span class="badge badge-${statusBadge}">${statusDisplay}</span></td>
      <td>${formatDate(createdAt)}</td>
      <td>
        <button class="btn btn-sm btn-ghost" onclick="showTradeInDetail('${t.id}')">详情</button>
        ${(t.status === "SUBMITTED" || t.status === "PENDING") ? `
          <button class="btn btn-sm btn-success" onclick="approveTradeIn('${t.id}')">通过</button>
          <button class="btn btn-sm btn-danger" onclick="rejectTradeIn('${t.id}')">拒绝</button>
        ` : ""}
      </td>
    </tr>`;
  }).join("");
}
function showTradeInDetail(id) {
  const t = state.tradeins.find(x => x.id === id);
  if (!t) return;
  
  const customerName = t.customer?.displayName || t.customerName || "匿名用户";
  const itemName = t.itemName || t.item || "未知物品";
  const category = t.category || t.type || "—";
  const condition = t.conditionGrade || t.condition || "—";
  
  // 价格拆解
  const breakdown = (t.metalValue || t.gemValue || t.conditionDiscount) ? `
    <div class="detail-section">
      <h4>价格拆解明细</h4>
      <table class="breakdown-table">
        <tr><td>基准价格</td><td class="text-right">${formatPrice(t.basePrice || 0)}</td></tr>
        <tr><td>贵金属价值 (金属类型: ${t.metalType || "—"}, 重量: ${t.metalWeightGrams || "—"}g, 纯度: ${t.metalPurity || "—"})</td><td class="text-right">+${formatPrice(t.metalValue || 0)}</td></tr>
        <tr><td>宝石价值 (${t.gemCategory || "无"}, ${t.gemCarat || "0"}克拉, ${t.gemColor || "—"}色, ${t.gemClarity || "—"}净度)</td><td class="text-right">+${formatPrice(t.gemValue || 0)}</td></tr>
        <tr><td>品相折扣 (等级: ${condition})</td><td class="text-right">${formatPrice(t.conditionDiscount || 0)}</td></tr>
        <tr><td>年限折旧</td><td class="text-right">${formatPrice(t.ageDiscount || 0)}</td></tr>
        <tr class="breakdown-subtotal"><td>基础估价</td><td class="text-right">${formatPrice(t.finalEstimate || 0)}</td></tr>
        <tr><td>换新补贴 (10%)</td><td class="text-right">+${formatPrice(t.subsidyAmount || 0)}</td></tr>
        <tr class="breakdown-total"><td>总抵扣额</td><td class="text-right">${formatPrice(t.totalCredit || t.totalCents || 0)}</td></tr>
      </table>
    </div>
  ` : `
    <div class="detail-section">
      <p class="text-muted">此记录为简化演示数据，无完整价格拆解信息。</p>
      <div class="price-summary">
        <div class="price-row"><span>基础估价:</span><strong>${formatPrice(t.finalEstimate || t.estimatedCents || 0)}</strong></div>
        <div class="price-row"><span>换新补贴:</span><strong>${formatPrice(t.subsidyAmount || t.subsidyCents || 0)}</strong></div>
        <div class="price-row total"><span>总抵扣额:</span><strong>${formatPrice(t.totalCredit || t.totalCents || 0)}</strong></div>
      </div>
    </div>
  `;

  // Reasoning 评估理由
  const reasoning = Array.isArray(t.reasoning) ? t.reasoning : [];
  const reasoningHtml = reasoning.length > 0 ? `
    <div class="detail-section">
      <h4>评估理由</h4>
      <ol class="reasoning-list">
        ${reasoning.map(r => `<li>${r}</li>`).join("")}
      </ol>
    </div>
  ` : "";

  // 物品详细信息
  const itemDetails = `
    <div class="detail-section">
      <h4>物品信息</h4>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="label">物品名称:</span>
          <span class="value">${itemName}</span>
        </div>
        <div class="detail-item">
          <span class="label">类型:</span>
          <span class="value">${category}</span>
        </div>
        ${t.brandName ? `
        <div class="detail-item">
          <span class="label">品牌:</span>
          <span class="value">${t.brandName}</span>
        </div>
        ` : ""}
        <div class="detail-item">
          <span class="label">购买年份:</span>
          <span class="value">${t.purchaseYear || "—"}</span>
        </div>
        <div class="detail-item">
          <span class="label">品相等级:</span>
          <span class="value">${condition}</span>
        </div>
        ${t.conditionNotes ? `
        <div class="detail-item full-width">
          <span class="label">品相描述:</span>
          <span class="value">${t.conditionNotes}</span>
        </div>
        ` : ""}
      </div>
    </div>
  `;

  // 凭证信息
  const certificates = `
    <div class="detail-section">
      <h4>凭证与附件</h4>
      <div class="cert-tags">
        <span class="cert-tag ${t.hasReceipt ? "active" : "inactive"}">${t.hasReceipt ? "✓" : "✗"} 收据</span>
        <span class="cert-tag ${t.hasCertificate ? "active" : "inactive"}">${t.hasCertificate ? "✓" : "✗"} 鉴定证书</span>
        <span class="cert-tag ${t.hasBox ? "active" : "inactive"}">${t.hasBox ? "✓" : "✗"} 原装盒</span>
        ${t.gemCertificate ? `<span class="cert-tag active">宝石证书: ${t.gemCertificate}</span>` : ""}
      </div>
    </div>
  `;

  // 审核信息
  const reviewInfo = t.reviewedBy || t.reviewNote ? `
    <div class="detail-section">
      <h4>审核信息</h4>
      <div class="detail-grid">
        ${t.reviewedBy ? `
        <div class="detail-item">
          <span class="label">审核人:</span>
          <span class="value">${t.reviewedBy}</span>
        </div>
        ` : ""}
        ${t.reviewedAt ? `
        <div class="detail-item">
          <span class="label">审核时间:</span>
          <span class="value">${formatDate(t.reviewedAt)}</span>
        </div>
        ` : ""}
        ${t.reviewNote ? `
        <div class="detail-item full-width">
          <span class="label">审核备注:</span>
          <span class="value">${t.reviewNote}</span>
        </div>
        ` : ""}
      </div>
    </div>
  ` : "";

  document.getElementById("drawer-title").textContent = `焕新记录详情 #${id.slice(0, 8)}`;
  document.getElementById("drawer-body").innerHTML = `
    <div class="detail-section">
      <div class="detail-grid">
        <div class="detail-item">
          <span class="label">客户:</span>
          <span class="value">${customerName}${t.isDemo ? ' <span class="demo-tag">演示</span>' : ''}</span>
        </div>
        <div class="detail-item">
          <span class="label">提交时间:</span>
          <span class="value">${formatDate(t.createdAt || t.submittedAt)}</span>
        </div>
        <div class="detail-item">
          <span class="label">状态:</span>
          <span class="value"><span class="badge badge-${t.status === "APPROVED" ? "success" : t.status === "REJECTED" ? "danger" : "warning"}">${t.status}</span></span>
        </div>
      </div>
    </div>
    ${itemDetails}
    ${breakdown}
    ${reasoningHtml}
    ${certificates}
    ${reviewInfo}
    ${(t.status === "SUBMITTED" || t.status === "PENDING") ? `
      <div class="detail-section">
        <h4>审核操作</h4>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-success" onclick="approveTradeIn('${t.id}')">通过审核</button>
          <button class="btn btn-danger" onclick="rejectTradeIn('${t.id}')">拒绝</button>
        </div>
      </div>
    ` : ""}
  `;
  openDrawer();
}
async function approveTradeIn(id) {
  const t = state.tradeins.find(x => x.id === id);
  try {
    // 真实 API：更新状态为 APPROVED
    await api(`/trade-in/assessments/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "APPROVED", reviewNote: "管理员审核通过" }),
    });
    showToast("✓ 焕新审批已通过");
    closeDrawer();
    await loadTradeIns();
  } catch (e) {
    // 真实 API 失败则尝试 admin demo 接口
    if (t?.isDemo) {
      try {
        await api(`/admin/trade-ins/${id}/approve`, { method: "PATCH" });
        showToast("✓ 焕新审批已通过（演示）");
        closeDrawer();
        await loadTradeIns();
        return;
      } catch (e2) {
        console.warn("Demo approve also failed", e2);
      }
    }
    showToast("审批失败: " + (e.message || "未知错误"));
  }
}
async function rejectTradeIn(id) {
  const t = state.tradeins.find(x => x.id === id);
  try {
    await api(`/trade-in/assessments/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "REJECTED", reviewNote: "不符合换购标准" }),
    });
    showToast("焕新审批已拒绝");
    closeDrawer();
    await loadTradeIns();
  } catch (e) {
    if (t?.isDemo) {
      try {
        await api(`/admin/trade-ins/${id}/reject`, { method: "PATCH" });
        showToast("焕新审批已拒绝（演示）");
        closeDrawer();
        await loadTradeIns();
        return;
      } catch (e2) {
        console.warn("Demo reject also failed", e2);
      }
    }
    showToast("操作失败: " + (e.message || "未知错误"));
  }
}

// ===== CARE SCHEDULE (Phase 2) =====
function renderCare() {
  const cs = state.careItems;
  const upcoming = cs.filter(c => c.status === "upcoming").length;
  const completed = cs.filter(c => c.status === "completed").length;
  const overdue = cs.filter(c => c.status === "overdue").length;
  document.getElementById("care-stats").innerHTML = `
    <div class="stat-card"><div class="stat-val">${upcoming}</div><div class="stat-lbl">即将到期</div></div>
    <div class="stat-card urgent"><div class="stat-val">${overdue}</div><div class="stat-lbl">已逾期</div></div>
    <div class="stat-card"><div class="stat-val">${completed}</div><div class="stat-lbl">已完成</div></div>
    <div class="stat-card"><div class="stat-val">${cs.length}</div><div class="stat-lbl">总预约数</div></div>`;

  const statusLabel = { upcoming: "即将到期", completed: "已完成", overdue: "已逾期", scheduled: "已预约" };
  const statusClass = { upcoming: "warning", completed: "success", overdue: "danger", scheduled: "info" };
  document.getElementById("care-tbody").innerHTML = cs.map(c => `<tr class="${c.status === 'overdue' ? 'row-urgent' : ''}">
    <td><div class="cell-name">${c.itemName}</div></td>
    <td><div class="cell-name">${c.customerName}</div><div class="cell-sub">${c.phone} · ${c.tier}</div></td>
    <td>${c.type}</td>
    <td><strong>${formatDateShort(c.scheduledDate)}</strong></td>
    <td><span class="badge badge-${statusClass[c.status]}">${statusLabel[c.status]}</span></td>
    <td>${c.notes?.slice(0, 30) || "-"}${c.notes?.length > 30 ? "..." : ""}</td>
    <td><button class="btn btn-sm btn-ghost" onclick="showCareDetail('${c.id}')" type="button">详情</button></td></tr>`).join("");
}
function showCareDetail(id) {
  const c = state.careItems.find(x => x.id === id); if (!c) return;
  document.getElementById("drawer-title").textContent = "保养预约详情";
  document.getElementById("drawer-body").innerHTML = `
    <div class="detail-section"><div class="detail-title">保养物品</div>
      <div class="detail-grid"><div class="detail-label">商品</div><div class="detail-value">${c.itemName}</div><div class="detail-label">保养类型</div><div class="detail-value">${c.type}</div></div></div>
    <div class="detail-section"><div class="detail-title">客户</div>
      <div class="detail-grid"><div class="detail-label">姓名</div><div class="detail-value">${c.customerName}</div><div class="detail-label">等级</div><div class="detail-value">${c.tier}</div></div></div>
    <div class="detail-section"><div class="detail-title">预约</div>
      <div class="detail-grid"><div class="detail-label">预约日期</div><div class="detail-value">${c.scheduledDate}</div><div class="detail-label">状态</div><div class="detail-value"><span class="badge badge-${c.status === 'overdue' ? 'danger' : c.status === 'completed' ? 'success' : 'warning'}">${c.status}</span></div></div></div>
    ${c.notes ? `<div class="detail-section"><div class="detail-title">备注</div><div class="detail-value">${c.notes}</div></div>` : ""}
    <div class="detail-section"><div class="detail-title">操作</div>
      <div class="detail-actions">
        ${c.status !== "completed" ? `<button class="btn btn-sm btn-success" onclick="markCareComplete('${c.id}')" type="button">标记完成</button>` : ""}
        <button class="btn btn-sm btn-ghost" onclick="showToast('已发短信提醒')" type="button">发送提醒</button>
        <button class="btn btn-sm btn-ghost" onclick="showToast('已改期')" type="button">改期</button>
      </div>
    </div>`;
  openDrawer();
}
async function markCareComplete(id) {
  try {
    await api(`/care/reminders/${id}/complete`, { method: "PATCH" });
    showToast("✓ 已标记保养完成");
    closeDrawer();
    await loadCare();
  } catch (e) {
    showToast("操作失败: " + e.message);
  }
}

// ===== FILTERS & DRAWER =====
function filterItems(type, val) {
  if (type === "status") { state.filterStatus = val; document.querySelectorAll("#tryon-filters .filter-btn").forEach(b => b.classList.toggle("active", b.dataset.f === val)); renderTryons(); }
  else if (type === "memberTier") { state.filterMemberTier = val; document.querySelectorAll("#mem-filters .filter-btn").forEach(b => b.classList.toggle("active", b.dataset.f === val)); renderMembers(); }
}
function openDrawer() { document.getElementById("drawer").classList.add("active"); document.getElementById("drawer-overlay").classList.add("active"); }
function closeDrawer() { document.getElementById("drawer").classList.remove("active"); document.getElementById("drawer-overlay").classList.remove("active"); }

// ===== HELPERS =====
function statusBadge(s) {
  const m = { ACTIVE: ["活跃", "success"], ANONYMOUS: ["匿名", "warning"], QR_SHOWN: ["已出示", "info"], SCANNED: ["已扫码", "info"], AUTHORIZED: ["已授权", "success"], COMPLETED: ["已完成", "success"], PENDING_ACTIVATION: ["待激活", "warning"], SUSPENDED: ["已暂停", "danger"], ISSUED: ["已发放", "info"], REDEEMED: ["已核销", "success"], EXPIRED: ["已过期", "warning"], VOIDED: ["已作废", "danger"] };
  const [l, c] = m[s] || [s, "muted"];
  return `<span class="badge badge-${c}">${l}</span>`;
}
function couponBadge(s) {
  const m = { ISSUED: ["已发放", "info"], REDEEMED: ["已核销", "success"], EXPIRED: ["已过期", "warning"], VOIDED: ["已作废", "danger"] };
  const [l, c] = m[s] || [s, "muted"];
  return `<span class="badge badge-${c}">${l}</span>`;
}

// ===== INIT =====
async function init() {
  document.querySelectorAll(".nav-item").forEach(n => n.addEventListener("click", e => { e.preventDefault(); switchView(n.dataset.view); }));
  document.getElementById("customer-search")?.addEventListener("input", renderCustomers);

  // Initial data load
  try {
    const r = await api("/auth/staff/demo-token");
    if (r.ok && r.data) { state.token = r.data.token; state.staff = r.data.staff; document.getElementById("api-status").innerHTML = `<span class="status-dot"></span><span class="status-text">${state.staff.displayName} · API 已连接</span>`; }
  } catch { document.getElementById("api-status").innerHTML = '<span class="status-dot offline"></span><span class="status-text">API 离线 · 使用演示数据</span>'; }

  try {
    const [cr, tr, cp, dv] = await Promise.all([api("/admin/customers"), api("/admin/try-on-sessions"), api("/admin/coupons"), api("/admin/devices")]);
    state.customers = (Array.isArray(cr) ? cr : cr.items || []).map(mapCustomer);
    state.tryons = (Array.isArray(tr) ? tr : tr.items || []).map(mapTryon);
    state.coupons = (Array.isArray(cp) ? cp : cp.items || []).map(mapCoupon);
    state.devices = (Array.isArray(dv) ? dv : dv.items || []).map(mapDevice);
  } catch { state.customers = []; state.tryons = []; state.coupons = []; state.devices = []; }

  switchView("dashboard");
}

// Expose globals
window.switchView = switchView;
window.showCustomerDetail = showCustomerDetail;
window.showTryonDetail = showTryonDetail;
window.showMemberDetail = showMemberDetail;
window.showActivityDetail = showActivityDetail;
window.showTradeInDetail = showTradeInDetail;
window.showCareDetail = showCareDetail;
window.markCareComplete = markCareComplete;
window.showMemberDetail = showMemberDetail;
window.loadMemberHistory = loadMemberHistory;
window.grantPoints = grantPoints;
window.sendUpgradeReminder = sendUpgradeReminder;
window.sendBirthdayGift = sendBirthdayGift;
window.showTradeInDetail = showTradeInDetail;
window.approveTradeIn = approveTradeIn;
window.rejectTradeIn = rejectTradeIn;
window.closeDrawer = closeDrawer;
window.redeemCoupon = redeemCoupon;
window.filterItems = filterItems;
window.showToast = showToast;

document.addEventListener("DOMContentLoaded", init);
