import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EditGroupDto } from './dto/edit-group.dto';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { FtApiService } from 'src/ftapi/ftapi.services';

@Injectable()
export class GroupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ft: FtApiService,
  ) {}

  async getMyGroups(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    // A non-42 account has no teams — return an empty list, not an error.
    if (!user.ftId) return [];

    return this.prisma.projectGroup.findMany({
      where: { usersId: { has: user.ftId } },
      orderBy: [{ projectName: 'asc' }, { groupName: 'asc' }],
    });
  }

  async getGroup(groupId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const group = await this.prisma.projectGroup.findUnique({
      where: { id: groupId },
    });

    if (!user || !group) throw new NotFoundException();
    if (!user.ftId || !group.usersId.includes(user.ftId))
      throw new ForbiddenException();

    return group;
  }

  // Teammates' real name + 42 picture for the chat header. Read live from the 42
  // API and never stored; getGroup() gates it to members of that group (42-only).
  async getMembers(groupId: string, userId: string) {
    const group = await this.getGroup(groupId, userId);
    if (!group.usersId.length) return [];
    try {
      return await this.ft.getUsersByIds(group.usersId);
    } catch {
      // 42 API unavailable → the header falls back to initials.
      return [];
    }
  }

  async updateGroup(groupId: string, userId: string, body: EditGroupDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const group = await this.prisma.projectGroup.findUnique({
      where: { id: groupId },
    });

    if (!user || !group) throw new NotFoundException();
    if (!user.ftId || !group.usersId.includes(user.ftId))
      throw new ForbiddenException();

    return this.prisma.projectGroup.update({
      where: { id: groupId },
      data: body,
    });
  }
}
