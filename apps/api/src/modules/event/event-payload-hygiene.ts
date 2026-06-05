/**
 * Event payload hygiene — pure validation with rejection strategy.
 *
 * No database, no NestJS runtime, no external service dependencies.
 * Returns structured failures so callers can decide how to respond.
 */

export type EventPayloadValidationResult =
	| { ok: true }
	| { ok: false; code: string; message: string; path: string };

const SENSITIVE_KEYS = new Set([
	"secret",
	"signature",
	"privatekey",
	"apikey",
	"token",
	"password",
	"credential",
	"phone",
	"mobile",
	"phonenumber",
	"openid",
	"unionid",
	"rawmedia",
	"rawimage",
	"rawvideo",
	"biometric",
	"facevector",
]);

const DATA_URI_PREFIXES = [
	"data:image/",
	"data:video/",
	"data:application/octet-stream",
];

const BASE64_CHARS = /^[A-Za-z0-9+/=]+$/;

// Chinese mobile phone heuristic: 11 digits starting with 1[3-9]
const PHONE_LIKE = /^(?:\+?86)?1[3-9]\d{9}$/;

function isSensitiveKey(key: string): boolean {
	return SENSITIVE_KEYS.has(key.toLowerCase());
}

function isHashField(key: string): boolean {
	return key.toLowerCase().includes("hash");
}

function isDataUri(value: string): boolean {
	return DATA_URI_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function isBase64Like(value: string): boolean {
	if (value.length < 100) return false;
	return BASE64_CHARS.test(value);
}

function isPhoneLike(value: string): boolean {
	return PHONE_LIKE.test(value);
}

function joinPath(parent: string, key: string | number): string {
	if (parent === "") return String(key);
	if (typeof key === "number") return `${parent}[${key}]`;
	return `${parent}.${key}`;
}

function fail(
	code: string,
	message: string,
	path: string,
): EventPayloadValidationResult {
	return { ok: false, code, message, path };
}

/**
 * Validate an event payload recursively.
 *
 * Policy: reject (do not silently drop) so callers cannot accidentally
 * persist payloads that were silently stripped.
 *
 * @param payload — the payload to validate
 * @param maxDepth — maximum recursion depth (default 5)
 * @param currentDepth — internal recursion tracking
 * @param path — internal path tracking
 * @param parentKey — the object key that held this value (for hash-field allowance)
 */
export function validateEventPayload(
	payload: unknown,
	maxDepth = 5,
	currentDepth = 0,
	path = "",
	parentKey = "",
): EventPayloadValidationResult {
	if (currentDepth > maxDepth) {
		return fail(
			"VALIDATION_FAILED",
			"Event payload exceeds maximum allowed nesting depth",
			path,
		);
	}

	if (payload === null || typeof payload !== "object") {
		if (typeof payload === "string") {
			const value = payload;
			if (isDataUri(value)) {
				return fail(
					"VALIDATION_FAILED",
					"Event payload contains raw media data URI",
					path,
				);
			}
			if (isBase64Like(value)) {
				return fail(
					"VALIDATION_FAILED",
					"Event payload contains base64-like data",
					path,
				);
			}
			if (!isHashField(parentKey) && isPhoneLike(value)) {
				return fail(
					"VALIDATION_FAILED",
					"Event payload contains raw phone number",
					path,
				);
			}
		}
		return { ok: true };
	}

	if (Array.isArray(payload)) {
		for (let i = 0; i < payload.length; i++) {
			const item = payload[i];
			const result = validateEventPayload(
				item,
				maxDepth,
				currentDepth + 1,
				joinPath(path, i),
				parentKey,
			);
			if (!result.ok) return result;
		}
		return { ok: true };
	}

	const obj = payload as Record<string, unknown>;
	for (const [key, value] of Object.entries(obj)) {
		const childPath = joinPath(path, key);

		if (isSensitiveKey(key)) {
			return fail(
				"VALIDATION_FAILED",
				`Event payload contains forbidden key: ${key}`,
				childPath,
			);
		}

		const result = validateEventPayload(
			value,
			maxDepth,
			currentDepth + 1,
			childPath,
			key,
		);
		if (!result.ok) return result;
	}

	return { ok: true };
}
