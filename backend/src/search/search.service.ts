import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string) {
    const q = query.trim();
    if (q.length < 1) return { projects: [], users: [] };

    const [projects, users] = await Promise.all([
      this.prisma.projects.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        select: { id: true, name: true },
        distinct: ['name'],
        orderBy: { name: 'asc' },
        take: 8,
      }),
      this.prisma.user.findMany({
        where: { name: { contains: q, mode: 'insensitive' }, deleteAt: null },
        select: { id: true, name: true, ftPfpUrl: true, campus: true },
        take: 8,
      }),
    ]);

    return { projects, users };
  }
}
