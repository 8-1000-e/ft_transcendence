import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EditGroupDto } from './dto/edit-group.dto';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

@Injectable()
export class GroupService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyGroups(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    if (!user.ftId) throw new ForbiddenException();

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
