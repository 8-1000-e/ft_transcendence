import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { unlinkStoredFiles } from 'src/utils/files';

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
        // Right-to-erasure: the rows stay (anonymised tombstone) but the user's
        // uploaded media must not survive deletion → unlink from disk, then null
        // the refs so the anonymised posts don't dangle at a deleted file.
        const [posts, chats, msgs] = await Promise.all([
          this.prisma.projectsPost.findMany({
            where: { writer: u.id },
            select: { filesUrl: true },
          }),
          this.prisma.projectsChat.findMany({
            where: { writer: u.id },
            select: { filesUrl: true },
          }),
          this.prisma.groupChat.findMany({
            where: { sender: u.id },
            select: { filesUrl: true },
          }),
        ]);
        for (const row of [...posts, ...chats, ...msgs])
          await unlinkStoredFiles(row.filesUrl);

        await this.prisma.$transaction([
          this.prisma.refreshToken.deleteMany({ where: { userId: u.id } }),
          this.prisma.projectsPost.updateMany({
            where: { writer: u.id },
            data: { filesUrl: [] },
          }),
          this.prisma.projectsChat.updateMany({
            where: { writer: u.id },
            data: { filesUrl: [] },
          }),
          this.prisma.groupChat.updateMany({
            where: { sender: u.id },
            data: { filesUrl: [] },
          }),
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
