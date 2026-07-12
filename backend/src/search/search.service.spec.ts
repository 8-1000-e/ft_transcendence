import { SearchService } from './search.service';

describe('SearchService', () => {
  const prisma = {
    projects: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
  };
  let service: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SearchService(prisma as never);
  });

  it('returns empty results for a blank query without hitting the db', async () => {
    const res = await service.search('   ');
    expect(res).toEqual({ projects: [], users: [] });
    expect(prisma.projects.findMany).not.toHaveBeenCalled();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('searches distinct projects and non-deleted users, case-insensitive, trimmed', async () => {
    prisma.projects.findMany.mockResolvedValue([{ id: 'p1', name: 'cub3d' }]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', name: 'lospacce', ftPfpUrl: null, campus: 'Paris' },
    ]);

    const res = await service.search('  cub  ');

    expect(prisma.projects.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: { contains: 'cub', mode: 'insensitive' } },
        distinct: ['name'],
        take: 8,
      }),
    );
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          name: { contains: 'cub', mode: 'insensitive' },
          deleteAt: null,
        },
        take: 8,
      }),
    );
    expect(res).toEqual({
      projects: [{ id: 'p1', name: 'cub3d' }],
      users: [{ id: 'u1', name: 'lospacce', ftPfpUrl: null, campus: 'Paris' }],
    });
  });
});
