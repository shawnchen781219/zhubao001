import { Body, Controller, Get, Post } from "@nestjs/common";
// biome-ignore lint/style/useImportType: NestJS DI requires runtime class reference for reflect-metadata paramtypes
import { StaffAuthService } from "./staff-auth.service.js";

@Controller("auth")
export class StaffAuthController {
	constructor(private readonly authService: StaffAuthService) {}

	@Post("staff/login")
	async login(@Body() body: { email: string; password: string }) {
		const result = await this.authService.login(body.email, body.password);
		if (!result) {
			return { ok: false, error: "INVALID_CREDENTIALS" };
		}
		return { ok: true, data: result };
	}

	@Get("staff/demo-token")
	async getDemoToken() {
		const result = await this.authService.issueDemoToken();
		if (!result) {
			return { ok: false, error: "NO_STAFF_FOUND" };
		}
		return { ok: true, data: result };
	}
}
