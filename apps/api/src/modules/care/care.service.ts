import { Inject, Injectable } from "@nestjs/common";
import { PRISMA_CLIENT } from "../../common/prisma-runtime/prisma-runtime.tokens.js";
import type { PrismaClient } from "../../generated/client.js";

@Injectable()
export class CareService {
	constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

	async listByCustomer(customerId: string) {
		const reminders = await this.prisma.careReminder.findMany({
			where: { customerId },
			include: {
				jewelryBoxItem: {
					select: { id: true, displayName: true, gemType: true },
				},
			},
			orderBy: { scheduledDate: "asc" },
		});

		const _now = new Date();
		const sevenDaysOut = new Date(Date.now() + 7 * 86_400_000);

		const upcoming = reminders.filter((r) => r.status === "upcoming").length;
		const overdue = reminders.filter((r) => r.status === "overdue").length;
		const scheduled = reminders.filter(
			(r) => r.status === "scheduled" && r.scheduledDate > sevenDaysOut,
		).length;
		const completed = reminders.filter((r) => r.status === "completed").length;

		return {
			reminders,
			stats: {
				upcoming,
				overdue,
				scheduled,
				completed,
				total: reminders.length,
			},
			customerId,
		};
	}

	async listByStore(storeId: string) {
		const customers = await this.prisma.customer.findMany({
			where: { storeId },
			select: {
				id: true,
				displayName: true,
				tags: true,
				identities: { select: { type: true, rawHint: true }, take: 1 },
				careReminders: {
					include: {
						jewelryBoxItem: {
							select: { id: true, displayName: true, gemType: true },
						},
					},
					orderBy: { scheduledDate: "asc" },
				},
			},
		});
		const allReminders = customers.flatMap((c) =>
			c.careReminders.map((r) => ({
				...r,
				customerName: c.displayName,
				customerPhone: c.identities[0]?.rawHint ?? null,
			})),
		);
		allReminders.sort(
			(a, b) =>
				new Date(a.scheduledDate).getTime() -
				new Date(b.scheduledDate).getTime(),
		);

		const _now = new Date();
		const sevenDaysOut = new Date(Date.now() + 7 * 86_400_000);
		const upcoming = allReminders.filter((r) => r.status === "upcoming").length;
		const overdue = allReminders.filter((r) => r.status === "overdue").length;
		const scheduled = allReminders.filter(
			(r) => r.status === "scheduled" && r.scheduledDate > sevenDaysOut,
		).length;
		const completed = allReminders.filter(
			(r) => r.status === "completed",
		).length;

		return {
			reminders: allReminders,
			stats: {
				upcoming,
				overdue,
				scheduled,
				completed,
				total: allReminders.length,
			},
		};
	}

	async findFirstActiveCustomer(storeId: string): Promise<string | null> {
		const c = await this.prisma.customer.findFirst({
			where: { storeId, status: "ACTIVE" },
			select: { id: true },
		});
		return c?.id ?? null;
	}

	async complete(id: string) {
		return this.prisma.careReminder.update({
			where: { id },
			data: { status: "completed", completedAt: new Date() },
			include: { jewelryBoxItem: true },
		});
	}

	async cancel(id: string) {
		return this.prisma.careReminder.update({
			where: { id },
			data: { status: "cancelled", cancelledAt: new Date() },
		});
	}
}
