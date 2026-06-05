import { createHmac } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { PRISMA_CLIENT } from "../../common/prisma-runtime/prisma-runtime.tokens.js";
import type { PrismaClient } from "../../generated/client.js";

export interface StaffTokenPayload {
	staffId: string;
	email: string;
	displayName: string;
	role: string;
	storeId: string;
}

export interface StaffLoginResult {
	token: string;
	staff: StaffTokenPayload;
}

const JWT_SECRET = process.env["JWT_SECRET"] ?? "jewelry-demo-secret-2026";
const TOKEN_EXPIRY_HOURS = 24;

function base64UrlEncode(data: string): string {
	return Buffer.from(data)
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function signToken(payload: StaffTokenPayload): string {
	const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
	const body = base64UrlEncode(
		JSON.stringify({
			staffId: payload.staffId,
			email: payload.email,
			displayName: payload.displayName,
			role: payload.role,
			storeId: payload.storeId,
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_HOURS * 3600,
		}),
	);
	const signature = createHmac("sha256", JWT_SECRET)
		.update(`${header}.${body}`)
		.digest("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
	return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): Record<string, unknown> | null {
	const parts = token.split(".");
	if (parts.length !== 3) return null;
	const [header, body, sig] = parts as [string, string, string];
	const expected = createHmac("sha256", JWT_SECRET)
		.update(`${header}.${body}`)
		.digest("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
	if (sig !== expected) return null;
	try {
		const padded = body + "=".repeat((4 - (body.length % 4)) % 4);
		const decoded = Buffer.from(
			padded.replace(/-/g, "+").replace(/_/g, "/"),
			"base64",
		).toString("utf8");
		const parsed = JSON.parse(decoded) as Record<string, unknown>;
		const exp = parsed["exp"];
		if (typeof exp === "number" && Date.now() / 1000 > exp) return null;
		return parsed;
	} catch {
		return null;
	}
}

@Injectable()
export class StaffAuthService {
	constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

	async login(
		email: string,
		_password: string,
	): Promise<StaffLoginResult | null> {
		const staff = await this.prisma.staffUser.findFirst({
			where: { email, status: "ACTIVE" },
		});
		if (!staff) return null;

		const payload: StaffTokenPayload = {
			staffId: staff.id,
			email: staff.email,
			displayName: staff.displayName,
			role: staff.role,
			storeId: staff.storeId,
		};

		return { token: signToken(payload), staff: payload };
	}

	generateDemoToken(
		staffId: string,
		email: string,
		displayName: string,
		role: string,
		storeId: string,
	): StaffLoginResult {
		const payload: StaffTokenPayload = {
			staffId,
			email,
			displayName,
			role,
			storeId,
		};
		return { token: signToken(payload), staff: payload };
	}

	async issueDemoToken(): Promise<StaffLoginResult | null> {
		const staff = await this.prisma.staffUser.findFirst({
			where: { status: "ACTIVE", role: "MANAGER" },
		});
		if (!staff) return null;
		return this.generateDemoToken(
			staff.id,
			staff.email,
			staff.displayName,
			staff.role,
			staff.storeId,
		);
	}
}
