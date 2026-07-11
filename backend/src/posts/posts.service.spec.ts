import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PostsService } from './posts.service';

describe('PostsService', () => {
  const prisma = {
    projects: { findUnique: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    projectsPost: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    postVote: { findUnique: jest.fn(), delete: jest.fn(), upsert: jest.fn() },
  };
  let service: PostsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PostsService(prisma as never);
  });

  const feedPost = (over: object = {}) => ({
    id: 'post1',
    content: 'hi',
    project: { name: 'cub3d' },
    votes: [
      { vote: 'UP', userId: 'me' },
      { vote: 'UP', userId: 'other' },
      { vote: 'DOWN', userId: 'x' },
    ],
    user: {
      name: 'lospacce',
      ftId: '42',
      ftPfpUrl: 'pp',
      campus: 'Paris',
      rdmName: 'anon',
      rdmPfp: 'rp',
      rdmCampus: 'Z',
    },
    ...over,
  });

  describe('getFeed', () => {
    it('enriches with vote counts, myVote and projectName for a 42 viewer', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'me', ftId: '42' });
      prisma.projectsPost.findMany.mockResolvedValue([feedPost()]);

      const [res] = await service.getFeed('me');

      expect(res.upvotes).toBe(2);
      expect(res.downvotes).toBe(1);
      expect(res.myVote).toBe('UP');
      expect(res.projectName).toBe('cub3d');
      expect(res.user.name).toBe('lospacce');
      expect(res).not.toHaveProperty('votes');
      expect(res).not.toHaveProperty('project');
    });

    it('anonymizes the author and nulls myVote for a non-42 viewer', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'me', ftId: null });
      prisma.projectsPost.findMany.mockResolvedValue([feedPost({ votes: [] })]);

      const [res] = await service.getFeed('me');

      expect(res.user).toEqual({ name: 'anon', ftPfpUrl: 'rp', campus: 'Z' });
      expect(res.myVote).toBeNull();
      expect(res.projectName).toBe('cub3d');
    });
  });

  describe('bestPosters', () => {
    it('ranks by post count and drops writers with no matching user', async () => {
      prisma.projectsPost.groupBy.mockResolvedValue([
        { writer: 'u1', _count: { _all: 5 } },
        { writer: 'u2', _count: { _all: 2 } },
        { writer: 'ghost', _count: { _all: 1 } },
      ]);
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', name: 'A', ftPfpUrl: null },
        { id: 'u2', name: 'B', ftPfpUrl: 'p' },
      ]);

      const res = await service.bestPosters();

      expect(res).toEqual([
        { id: 'u1', name: 'A', ftPfpUrl: null, posts: 5 },
        { id: 'u2', name: 'B', ftPfpUrl: 'p', posts: 2 },
      ]);
    });
  });

  describe('votePost', () => {
    beforeEach(() => {
      prisma.projectsPost.findUnique.mockResolvedValue({ id: 'post1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'me', ftId: '42' });
    });

    it('throws when the post does not exist', async () => {
      prisma.projectsPost.findUnique.mockResolvedValue(null);
      await expect(
        service.votePost('nope', { vote: 'UP' } as never, 'me'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a non-42 user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'me', ftId: null });
      await expect(
        service.votePost('post1', { vote: 'UP' } as never, 'me'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('removes the vote when re-voting the same value (toggle off)', async () => {
      prisma.postVote.findUnique.mockResolvedValue({ vote: 'UP' });

      await service.votePost('post1', { vote: 'UP' } as never, 'me');

      expect(prisma.postVote.delete).toHaveBeenCalledWith({
        where: { userId_postId: { userId: 'me', postId: 'post1' } },
      });
      expect(prisma.postVote.upsert).not.toHaveBeenCalled();
    });

    it('upserts when switching the vote or voting for the first time', async () => {
      prisma.postVote.findUnique.mockResolvedValue({ vote: 'UP' });

      await service.votePost('post1', { vote: 'DOWN' } as never, 'me');

      expect(prisma.postVote.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { vote: 'DOWN' } }),
      );
      expect(prisma.postVote.delete).not.toHaveBeenCalled();
    });
  });
});
