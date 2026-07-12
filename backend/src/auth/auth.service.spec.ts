import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from 'generated/prisma/client';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn() }));
jest.mock('src/utils/anon', () => ({
  randomIdentity: jest
    .fn()
    .mockResolvedValue({ name: 'rn', city: 'rc', pfp: 'rp' }),
}));

const hash = bcrypt.hash as jest.Mock;
const compare = bcrypt.compare as jest.Mock;

describe('AuthService', () => {
  const jwt = { sign: jest.fn().mockReturnValue('access-token') };
  const mail = {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  };
  const config = { getOrThrow: jest.fn() };
  const ft = {
    syncUserTeam: jest.fn().mockResolvedValue(undefined),
    getProfileFromCode: jest.fn(),
  };
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    pendingRegistration: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    jwt.sign.mockReturnValue('access-token');
    prisma.refreshToken.create.mockResolvedValue({});
    service = new AuthService(
      jwt as never,
      prisma as never,
      mail as never,
      config as never,
      ft as never,
    );
  });

  describe('signup', () => {
    it('rejects an already-registered email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      await expect(
        service.signup('a@b.co', 'password123', 'A'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.pendingRegistration.upsert).not.toHaveBeenCalled();
    });

    it('hashes the password, stores a pending registration and emails the code', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      hash.mockResolvedValue('hashed');
      prisma.pendingRegistration.upsert.mockResolvedValue({});

      const res = await service.signup('a@b.co', 'password123', 'Alice');

      expect(hash).toHaveBeenCalledWith('password123', 10);
      expect(prisma.pendingRegistration.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'a@b.co' } }),
      );
      expect(mail.sendVerificationEmail).toHaveBeenCalledWith(
        'a@b.co',
        expect.any(String),
      );
      expect(res).toEqual({ message: 'Verification code sent to a@b.co' });
    });
  });

  describe('login', () => {
    it('rejects an unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login('a@b.co', 'x')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects an OAuth-only account (no password)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        passwordHash: null,
      });
      await expect(service.login('a@b.co', 'x')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(compare).not.toHaveBeenCalled();
    });

    it('rejects a wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', passwordHash: 'h' });
      compare.mockResolvedValue(false);
      await expect(service.login('a@b.co', 'bad')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('issues tokens on valid credentials and triggers a team sync', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', passwordHash: 'h' });
      compare.mockResolvedValue(true);

      const res = await service.login('a@b.co', 'password123');

      expect(res.access_token).toBe('access-token');
      expect(typeof res.refresh_token).toBe('string');
      expect(prisma.refreshToken.create).toHaveBeenCalled();
      expect(ft.syncUserTeam).toHaveBeenCalledWith('u1');
    });
  });

  describe('verify', () => {
    const pending = {
      name: 'Alice',
      passwordHash: 'h',
      verifCode: '123456',
      verifCodeExpiresAt: new Date(Date.now() + 60000),
    };

    it('rejects when there is no pending registration', async () => {
      prisma.pendingRegistration.findUnique.mockResolvedValue(null);
      await expect(service.verify('a@b.co', '123456')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects a wrong code', async () => {
      prisma.pendingRegistration.findUnique.mockResolvedValue(pending);
      await expect(service.verify('a@b.co', '000000')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects an expired code', async () => {
      prisma.pendingRegistration.findUnique.mockResolvedValue({
        ...pending,
        verifCodeExpiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.verify('a@b.co', '123456')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('creates the user and issues tokens on a valid code', async () => {
      prisma.pendingRegistration.findUnique.mockResolvedValue(pending);
      prisma.$transaction.mockResolvedValue([{ id: 'newuser' }, {}]);

      const res = await service.verify('a@b.co', '123456');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(res.access_token).toBe('access-token');
      expect(typeof res.refresh_token).toBe('string');
    });

    it('maps a P2002 race to "Email already taken"', async () => {
      prisma.pendingRegistration.findUnique.mockResolvedValue(pending);
      prisma.$transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: '1',
        }),
      );
      await expect(service.verify('a@b.co', '123456')).rejects.toThrow(
        'Email already taken',
      );
    });
  });

  describe('refresh', () => {
    it('rejects an unknown token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('tok')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects an expired/already-consumed token (single-use)', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({ userId: 'u1' });
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
      await expect(service.refresh('tok')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rotates and issues new tokens on a valid refresh', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({ userId: 'u1' });
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      const res = await service.refresh('tok');

      expect(res.access_token).toBe('access-token');
      expect(typeof res.refresh_token).toBe('string');
      expect(ft.syncUserTeam).toHaveBeenCalledWith('u1');
    });
  });

  describe('logout', () => {
    it('deletes the refresh token by hash', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });
      const res = await service.logout('tok');
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledTimes(1);
      expect(res).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('createAccessToken', () => {
    it('signs a { sub } payload', () => {
      expect(service.createAccessToken('u1')).toBe('access-token');
      expect(jwt.sign).toHaveBeenCalledWith({ sub: 'u1' });
    });
  });

  describe('getFtCallback', () => {
    const profile = {
      id: 42,
      email: 'alice@student.42.fr',
      login: 'alice',
      image: { link: 'pp' },
      campus: [{ name: 'Paris', id: 1 }],
    };

    it('updates an existing 42 account (resolved by ftId) and issues tokens', async () => {
      ft.getProfileFromCode.mockResolvedValue(profile);
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', ftId: '42' });
      prisma.user.update.mockResolvedValue({ id: 'u1' });

      const res = await service.getFtCallback('code');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ftId: '42' } }),
      );
      expect(prisma.user.upsert).not.toHaveBeenCalled();
      expect(res.access_token).toBe('access-token');
      expect(ft.syncUserTeam).toHaveBeenCalledWith('u1');
    });

    it('provisions a new account (email upsert / auto-link) for an unknown ftId', async () => {
      ft.getProfileFromCode.mockResolvedValue(profile);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.upsert.mockResolvedValue({ id: 'u2' });

      const res = await service.getFtCallback('code');

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'alice@student.42.fr' } }),
      );
      expect(res.access_token).toBe('access-token');
      expect(ft.syncUserTeam).toHaveBeenCalledWith('u2');
    });
  });
});
