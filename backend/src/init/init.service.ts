import { Injectable, OnModuleInit } from '@nestjs/common';
import { FtApiService } from 'src/ftapi/ftapi.services';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class InitService implements OnModuleInit {
  constructor(
    private readonly ft: FtApiService,
    private readonly prisma: PrismaService,
  ) {}

  // Populate the 42 project catalogue once (fresh DB); skip on later boots so a
  // restart doesn't re-crawl the rate-limited 42 API.
  async onModuleInit() {
    const already = await this.prisma.projects.count({
      where: { category: { not: null } },
    });
    if (already > 0) return;
    this.ft.syncAllProjects().catch((e) => console.error('INIT SYNC ERROR', e));
  }
}
