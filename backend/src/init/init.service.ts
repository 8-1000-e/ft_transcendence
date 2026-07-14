import { Injectable, OnModuleInit } from '@nestjs/common';
import { FtApiService } from 'src/ftapi/ftapi.services';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class InitService implements OnModuleInit {
  constructor(
    private readonly ft: FtApiService,
    private readonly prisma: PrismaService,
  ) {}

  // Populate the 42 project catalogue once (fresh DB). Skipping it when already
  // synced avoids re-crawling the live 42 API — a chatty, rate-limited walk — on
  // every container restart, which otherwise starves the 2 req/s budget and
  // makes login/suggest sluggish for the first minute after each boot.
  async onModuleInit() {
    const already = await this.prisma.projects.count({
      where: { category: { not: null } },
    });
    if (already > 0) return;
    this.ft.syncAllProjects().catch((e) => console.error('INIT SYNC ERROR', e));
  }
}
