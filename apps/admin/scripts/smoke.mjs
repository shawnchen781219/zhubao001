import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const readPublicFile = (name) =>
	readFile(new URL(`../public/${name}`, import.meta.url), "utf8");

const required = {
	"index.html": [
		"法芮珂珠宝",
		"运营总览",
		"客户管理",
		"设备管理",
		"试戴记录",
		"优惠券",
		"Noto+Serif+SC",
	],
	"app.js": [
		"switchView",
		"showCustomerDetail",
		"showTryonDetail",
		"auth/staff/demo-token",
		"/admin/customers",
		"/admin/try-on-sessions",
		"/admin/dashboard",
		"/admin/coupons",
		"/admin/devices",
		"mapCustomer",
		"mapTryon",
		"mapDevice",
		"mapCoupon",
		"loadDashboard",
		"loadCustomers",
		"loadTryons",
		"renderDashboard",
		"renderCustomers",
		"redeemCoupon",
		"formatDate",
		"formatPrice",
	],
	"styles.css": [
		"metrics-grid",
		"dashboard-grid",
		"filter-btn",
		"search-input",
		"empty-state",
		"metric-card",
		"data-table",
		"toast",
		"@media",
	],
	"../scripts/serve.mjs": [
		"EADDRINUSE",
		"public entry not found",
		"isInsidePublicRoot",
		"PORT=4301",
	],
};

for (const [file, markers] of Object.entries(required)) {
	const content = await readPublicFile(file);
	for (const marker of markers) {
		if (!content.includes(marker)) {
			throw new Error(`${file} missing marker: ${marker}`);
		}
	}
}

console.log(
	`@jewelry/admin smoke passed at ${fileURLToPath(new URL("../public/index.html", import.meta.url))}`,
);
