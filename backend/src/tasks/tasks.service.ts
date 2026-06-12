import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 3 * * *') // 3 am everyday
  async purgeDueAccounts() {
    const due = await this.prisma.user.findMany({
      where: { deleteAt: { lte: new Date() } },
    });
    for (const u of due) {
      try {
        await this.prisma.$transaction([
          this.prisma.refreshToken.deleteMany({ where: { userId: u.id } }),
          this.prisma.user.update({
            where: { id: u.id },
            data: {
              name: '[DELETED_USER]',
              email: `deleted+${u.id}@deleted.invalid`,
              passwordHash: null,
              ftId: null,
              ftPfpUrl: null,
              campusId: null,
              campus: null,
              rdmName: '[DELETED_USER]',
              rdmPfp: null,
              rdmCampus: null,
              deleteAt: null,
            },
          }),
        ]);
      } catch (e) {
        console.error(e);
      }
    }
  }
}
