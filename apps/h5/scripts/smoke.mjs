import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const readPublicFile = (name) =>
	readFile(new URL(`../public/${name}`, import.meta.url), "utf8");

const required = {
	"index.html": [
		"法芮珂珠宝",
		"专属试戴体验",
		"宝石护照",
		"到店券",
		"预约到店",
		"我的宝石护照",
		"领取到店权益",
		"领取到店鉴赏券",
		"AI 风格分析",
		"向下滑动探索",
	],
	"app.js": [
		"查看宝石护照",
		"已添加到收藏",
		"已添加到对比",
		"最多对比3件",
		"已取消收藏",
		"API_BASE",
		"toggleFav",
		"toggleCmp",
	],
	"styles.css": [
		"product-card",
		"compare-section",
		"compare-table",
		"consult-option",
		"coupon-claimed",
		"empty-msg",
		"splash",
		"btn-gold",
	],
	"../scripts/serve.mjs": [
		"EADDRINUSE",
		"public entry not found",
		"isInsidePublicRoot",
		"PORT=4302",
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
	`@jewelry/h5 smoke passed at ${fileURLToPath(new URL("../public/index.html", import.meta.url))}`,
);
