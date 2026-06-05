import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
} from "@nestjs/common";
import { verifyToken } from "./staff-auth.service.js";

export interface StaffPrincipal {
	staffId: string;
	email: string;
	displayName: string;
	role: string;
	storeId: string;
}

const STAFF_PRINCIPAL_KEY = Symbol.for("jewelry-api.staff-principal");

export function getStaffPrincipal(
	request: Record<symbol, unknown>,
): StaffPrincipal | null {
	const val = request[STAFF_PRINCIPAL_KEY];
	if (!val || typeof val !== "object") return null;
	return val as StaffPrincipal;
}

@Injectable()
export class StaffAuthGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest();
		const headers = request.headers as Record<string, string | undefined>;
		const authHeader = headers["authorization"];
		if (
			!authHeader ||
			typeof authHeader !== "string" ||
			!authHeader.startsWith("Bearer ")
		) {
			return false;
		}

		const token = authHeader.slice(7);
		const payload = verifyToken(token);
		const staffId = payload?.["staffId"];
		if (!payload || typeof staffId !== "string") {
			return false;
		}

		const principal: StaffPrincipal = {
			staffId,
			email: String(payload["email"] ?? ""),
			displayName: String(payload["displayName"] ?? ""),
			role: String(payload["role"] ?? ""),
			storeId: String(payload["storeId"] ?? ""),
		};

		(request as Record<symbol, unknown>)[STAFF_PRINCIPAL_KEY] = principal;
		return true;
	}
}
