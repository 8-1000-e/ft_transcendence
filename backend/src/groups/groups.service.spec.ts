import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GroupService } from './groups.service';

describe('GroupService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    projectGroup: { findMany: jest.fn(), findUnique: jest.fn() },
    groupRead: { findMany: jest.fn() },
    groupChat: { count: jest.fn() },
    $executeRaw: jest.fn(),
  };
  let service: GroupService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GroupService(prisma as never);
  });

  describe('getMyGroups', () => {
    it('throws NotFound when the user is missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getMyGroups('me')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws Forbidden for a non-42 user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'me', ftId: null });
      await expect(service.getMyGroups('me')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns the groups the user belongs to', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'me', ftId: '42' });
      prisma.projectGroup.findMany.mockResolvedValue([{ id: 'g1' }]);
      const res = await service.getMyGroups('me');
      expect(prisma.projectGroup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usersId: { has: '42' } } }),
      );
      expect(res).toEqual([{ id: 'g1' }]);
    });
  });

  describe('getUnread', () => {
    it('returns {} for a non-42 user', async () => {
      prisma.user.findUnique.mockResolvedValue({ ftId: null });
      expect(await service.getUnread('me')).toEqual({});
    });

    it('counts peer messages after lastRead and omits zero counts', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'me', ftId: '42' });
      prisma.projectGroup.findMany.mockResolvedValue([
        { id: 'g1' },
        { id: 'g2' },
      ]);
      const last = new Date('2020-01-01T00:00:00Z');
      prisma.groupRead.findMany.mockResolvedValue([
        { groupId: 'g1', lastReadAt: last },
      ]);
      prisma.groupChat.count.mockResolvedValueOnce(3).mockResolvedValueOnce(0);

      const res = await service.getUnread('me');

      expect(res).toEqual({ g1: 3 });
      expect(prisma.groupChat.count).toHaveBeenNthCalledWith(1, {
        where: { group: 'g1', sender: { not: 'me' }, sendTime: { gt: last } },
      });
      expect(prisma.groupChat.count).toHaveBeenNthCalledWith(2, {
        where: { group: 'g2', sender: { not: 'me' } },
      });
    });
  });

  describe('markRead', () => {
    it('throws Forbidden when the user is not a group member', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'me', ftId: '42' });
      prisma.projectGroup.findUnique.mockResolvedValue({
        id: 'g1',
        usersId: ['someoneelse'],
      });
      await expect(service.markRead('g1', 'me')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });

    it('upserts the read timestamp for a member', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'me', ftId: '42' });
      prisma.projectGroup.findUnique.mockResolvedValue({
        id: 'g1',
        usersId: ['42'],
      });
      prisma.$executeRaw.mockResolvedValue(1);

      const res = await service.markRead('g1', 'me');

      expect(res).toEqual({ ok: true });
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });
  });
});
