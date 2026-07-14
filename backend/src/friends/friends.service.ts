import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

// A user is "online" if seen in the last 2 minutes (lastSeenAt is touched by the
// heartbeat POST /me/ping and by GET /me).
const ONLINE_WINDOW_MS = 2 * 60 * 1000;
function isOnline(lastSeenAt: Date): boolean {
  return Date.now() - lastSeenAt.getTime() < ONLINE_WINDOW_MS;
}

const FRIEND_SELECT = {
  id: true,
  name: true,
  login: true,
  ftPfpUrl: true,
  campus: true,
  lastSeenAt: true,
} as const;

type FriendRow = {
  id: string;
  name: string;
  login: string | null;
  ftPfpUrl: string | null;
  campus: string | null;
  lastSeenAt: Date;
};

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  // Friends are between real, consenting 42 identities only (non-42 accounts are
  // read-only + anonymised, so they can neither friend nor be friended).
  private async assert42(userId: string): Promise<void> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ftId: true },
    });
    if (!u?.ftId) throw new ForbiddenException('42 account required');
  }

  private view(f: FriendRow) {
    return {
      id: f.id,
      name: f.name,
      login: f.login,
      ftPfpUrl: f.ftPfpUrl,
      campus: f.campus,
      online: isOnline(f.lastSeenAt),
    };
  }

  async request(userId: string, targetId: string) {
    if (userId === targetId)
      throw new BadRequestException('Cannot friend yourself');
    await this.assert42(userId);

    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { ftId: true },
    });
    if (!target) throw new NotFoundException();
    if (!target.ftId)
      throw new BadRequestException('That user cannot be added');

    // If they already requested ME, accept it → instant mutual friendship.
    const reverse = await this.prisma.friendship.findUnique({
      where: {
        requesterId_addresseeId: { requesterId: targetId, addresseeId: userId },
      },
    });
    if (reverse) {
      if (reverse.status !== 'ACCEPTED') {
        await this.prisma.friendship.update({
          where: { id: reverse.id },
          data: { status: 'ACCEPTED' },
        });
      }
      return { status: 'friends' as const };
    }

    await this.prisma.friendship.upsert({
      where: {
        requesterId_addresseeId: { requesterId: userId, addresseeId: targetId },
      },
      update: {},
      create: { requesterId: userId, addresseeId: targetId },
    });
    return { status: 'pending_out' as const };
  }

  async accept(userId: string, requesterId: string) {
    const f = await this.prisma.friendship.findUnique({
      where: { requesterId_addresseeId: { requesterId, addresseeId: userId } },
    });
    if (!f) throw new NotFoundException();
    if (f.status !== 'ACCEPTED') {
      await this.prisma.friendship.update({
        where: { id: f.id },
        data: { status: 'ACCEPTED' },
      });
    }
    return { status: 'friends' as const };
  }

  // Remove a friend, decline a request, or cancel one you sent (any direction).
  async remove(userId: string, otherId: string) {
    await this.prisma.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: userId, addresseeId: otherId },
          { requesterId: otherId, addresseeId: userId },
        ],
      },
    });
    return { status: 'none' as const };
  }

  async list(userId: string) {
    const rows = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: FRIEND_SELECT },
        addressee: { select: FRIEND_SELECT },
      },
    });
    return (
      rows
        .map((r) =>
          this.view(r.requesterId === userId ? r.addressee : r.requester),
        )
        // online first, then alphabetical.
        .sort(
          (a, b) =>
            Number(b.online) - Number(a.online) || a.name.localeCompare(b.name),
        )
    );
  }

  async incomingRequests(userId: string) {
    const rows = await this.prisma.friendship.findMany({
      where: { addresseeId: userId, status: 'PENDING' },
      include: { requester: { select: FRIEND_SELECT } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.view(r.requester));
  }

  // Relationship between the viewer and another user (drives the profile button).
  async status(userId: string, otherId: string) {
    if (userId === otherId) return { status: 'self' as const };
    const [out, inc] = await Promise.all([
      this.prisma.friendship.findUnique({
        where: {
          requesterId_addresseeId: {
            requesterId: userId,
            addresseeId: otherId,
          },
        },
      }),
      this.prisma.friendship.findUnique({
        where: {
          requesterId_addresseeId: {
            requesterId: otherId,
            addresseeId: userId,
          },
        },
      }),
    ]);
    if (out?.status === 'ACCEPTED' || inc?.status === 'ACCEPTED')
      return { status: 'friends' as const };
    if (out?.status === 'PENDING') return { status: 'pending_out' as const };
    if (inc?.status === 'PENDING') return { status: 'pending_in' as const };
    return { status: 'none' as const };
  }
}

export { isOnline };
