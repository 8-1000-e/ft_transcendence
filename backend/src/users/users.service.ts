import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { authorView } from 'src/utils/anonymize';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: { id: true, email: true, name: true },
    });
  }

  async requestDeletion(id: string) {
    await this.prisma.user.update({
      where: { id },
      data: { deleteAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) }, // 14Days
    });
    return { message: 'Account will be deleted in 14 days' };
  }

  async cancelDelete(id: string) {
    await this.prisma.user.update({
      where: { id },
      data: { deleteAt: null }, // Turning off deleteAt
    });
    return { message: 'Delete request cancelled' };
  }

  async getUserProfile(id: string, viewerId: string) {
    const [viewer, user] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: viewerId },
        select: { ftId: true },
      }),
      this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          createdAt: true,
          name: true,
          ftPfpUrl: true,
          campus: true,
          rdmName: true,
          rdmPfp: true,
          rdmCampus: true,
        },
      }),
    ]);
    if (!user) throw new NotFoundException();
    // Non-42 viewers only ever see the anonymous identity — default-deny.
    return {
      id: user.id,
      createdAt: user.createdAt,
      ...authorView(viewer, user),
    };
  }
}
