import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../public", import.meta.url)));
const port = Number.parseInt(process.env.PORT ?? "4201", 10);

const contentTypes = {
	".css": "text/css; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
};

const isInsidePublicRoot = (filePath) => {
	const relativePath = relative(root, filePath);
	return (
		relativePath === "" ||
		(!relativePath.startsWith("..") && !relativePath.startsWith("/"))
	);
};

const resolveRequestPath = (url) => {
	const pathname = new URL(url ?? "/", `http://localhost:${port}`).pathname;
	const safePath = normalize(decodeURIComponent(pathname)).replace(
		/^(\.\.[/\\])+/,
		"",
	);
	const filePath = join(root, safePath === "/" ? "index.html" : safePath);
	return isInsidePublicRoot(filePath) ? filePath : join(root, "index.html");
};

const server = createServer(async (request, response) => {
	const filePath = resolveRequestPath(request.url);

	try {
		const fileStat = await stat(filePath);
		if (!fileStat.isFile()) {
			response.writeHead(404);
			response.end("Not found");
			return;
		}

		response.writeHead(200, {
			"Cache-Control": "no-store",
			"Content-Type":
				contentTypes[extname(filePath)] ?? "text/plain; charset=utf-8",
		});
		createReadStream(filePath).pipe(response);
	} catch {
		response.writeHead(404);
		response.end("Not found");
	}
});

server.on("error", (error) => {
	if (error.code === "EADDRINUSE") {
		console.error(
			`@jewelry/admin dev server failed: port ${port} is already in use. Try PORT=4301 pnpm --filter @jewelry/admin dev.`,
		);
	} else if (error.code === "EACCES" || error.code === "EPERM") {
		console.error(
			`@jewelry/admin dev server failed: cannot listen on 127.0.0.1:${port}. Check local permissions or use another PORT.`,
		);
	} else {
		console.error(
			`@jewelry/admin dev server failed: ${error.message ?? String(error)}`,
		);
	}
	process.exitCode = 1;
});

try {
	await access(join(root, "index.html"));
	server.listen(port, "127.0.0.1", () => {
		console.log(`@jewelry/admin dev server: http://127.0.0.1:${port}`);
	});
} catch {
	console.error(
		`@jewelry/admin dev server failed: public entry not found at ${join(root, "index.html")}.`,
	);
	process.exitCode = 1;
}
