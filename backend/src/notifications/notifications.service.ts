import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotifType } from 'generated/prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async notify(params: {
    recipientId: string;
    actorId: string;
    type: NotifType;
    entityLabel?: string | null;
    link?: string | null;
  }) {
    if (params.recipientId === params.actorId) return; // never notify yourself
    const actor = await this.prisma.user.findUnique({
      where: { id: params.actorId },
      select: { name: true },
    });
    await this.prisma.notification.create({
      data: {
        recipientId: params.recipientId,
        actorId: params.actorId,
        actorName: actor?.name ?? null,
        type: params.type,
        entityLabel: params.entityLabel ?? null,
        link: params.link ?? null,
      },
    });
  }

  async list(userId: string) {
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { recipientId: userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      this.prisma.notification.count({
        where: { recipientId: userId, read: false },
      }),
    ]);
    return { items, unread };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, read: false },
      data: { read: true },
    });
    return { ok: true };
  }
}
