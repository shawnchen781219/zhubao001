import { Inject, Injectable } from "@nestjs/common";
import { PRISMA_CLIENT } from "../../common/prisma-runtime/prisma-runtime.tokens.js";
import type { PrismaClient } from "../../generated/client.js";

export interface NotificationListOptions {
	customerId: string;
	limit?: number;
	onlyUnread?: boolean;
}

export interface NotificationDto {
	id: string;
	type: string;
	title: string;
	body: string;
	iconEmoji: string | null;
	actionUrl: string | null;
	payload: Record<string, unknown> | null;
	readAt: string | null;
	createdAt: string;
}

@Injectable()
export class NotificationService {
	constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

	async listByCustomer(options: NotificationListOptions): Promise<{
		items: NotificationDto[];
		total: number;
		unread: number;
	}> {
		const where: Record<string, unknown> = { customerId: options.customerId };
		if (options.onlyUnread) {
			where["readAt"] = null;
		}
		const [items, total, unread] = await Promise.all([
			this.prisma.notification.findMany({
				where,
				orderBy: { createdAt: "desc" },
				take: options.limit ?? 50,
			}),
			this.prisma.notification.count({ where }),
			this.prisma.notification.count({
				where: { customerId: options.customerId, readAt: null },
			}),
		]);
		return {
			items: items.map(this.toDto),
			total,
			unread,
		};
	}

	async markRead(
		customerId: string,
		id: string,
	): Promise<NotificationDto | null> {
		const existing = await this.prisma.notification.findFirst({
			where: { id, customerId },
		});
		if (!existing) return null;
		if (existing.readAt) return this.toDto(existing);
		const updated = await this.prisma.notification.update({
			where: { id },
			data: { readAt: new Date() },
		});
		return this.toDto(updated);
	}

	async markAllRead(customerId: string): Promise<{ count: number }> {
		const result = await this.prisma.notification.updateMany({
			where: { customerId, readAt: null },
			data: { readAt: new Date() },
		});
		return { count: result.count };
	}

	async getUnreadCount(customerId: string): Promise<number> {
		return this.prisma.notification.count({
			where: { customerId, readAt: null },
		});
	}

	private toDto(raw: {
		id: string;
		type: string;
		title: string;
		body: string;
		iconEmoji: string | null;
		actionUrl: string | null;
		payload: unknown;
		readAt: Date | null;
		createdAt: Date;
	}): NotificationDto {
		return {
			id: raw.id,
			type: raw.type,
			title: raw.title,
			body: raw.body,
			iconEmoji: raw.iconEmoji,
			actionUrl: raw.actionUrl,
			payload: (raw.payload as Record<string, unknown> | null) ?? null,
			readAt: raw.readAt ? raw.readAt.toISOString() : null,
			createdAt: raw.createdAt.toISOString(),
		};
	}
}
