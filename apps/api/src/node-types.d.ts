/**
 * Minimal type declarations for Node built-ins.
 *
 * Avoids @types/node while covering crypto, Buffer, and process used
 * across device auth, staff auth, and customer identity hashing.
 */

declare module "node:crypto" {
	export function createHmac(
		algorithm: string,
		key: string,
	): {
		update(data: string, encoding?: string): ReturnType<typeof createHmac>;
		digest(encoding?: string): string;
	};
	export function createHash(algorithm: string): {
		update(data: string, encoding?: string): ReturnType<typeof createHash>;
		digest(encoding?: string): string;
	};
	export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
	export function randomBytes(
		size: number,
	): Uint8Array & { toString(encoding: string): string };
}

declare global {
	interface Buffer extends Uint8Array {
		toString(encoding?: string): string;
		subarray(start?: number, end?: number): Buffer;
	}
	interface BufferConstructor {
		from(data: string | Uint8Array, encoding?: string): Buffer;
		from(
			data: ArrayBuffer | ArrayBufferView,
			byteOffset?: number,
			length?: number,
		): Buffer;
	}
	var Buffer: BufferConstructor;

	namespace NodeJS {
		interface ProcessEnv {
			[key: string]: string | undefined;
		}
	}
	var process: {
		env: NodeJS.ProcessEnv;
	};
}

export {};
