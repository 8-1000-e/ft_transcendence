import { ForbiddenException, Injectable } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { assertPrivateFilesExist } from 'src/utils/files';

@Injectable()
export class GroupChatService {
  constructor(private readonly prisma: PrismaService) {}

  async sendMessage(
    groupId: string,
    userId: string,
    content: string,
    filesUrl?: string[],
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const group = await this.prisma.projectGroup.findUnique({
      where: { id: groupId },
    });

    if (!user || !group) throw new NotFoundException();

    if (!user.ftId || !group.usersId.includes(user.ftId))
      throw new ForbiddenException();

    assertPrivateFilesExist(filesUrl);

    return this.prisma.groupChat.create({
      data: { content, sender: userId, group: groupId, filesUrl },
    });
  }

  async getMessages(groupId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const group = await this.prisma.projectGroup.findUnique({
      where: { id: groupId },
    });

    if (!user || !group) throw new NotFoundException();

    if (!user.ftId || !group.usersId.includes(user.ftId))
      throw new ForbiddenException();

    return this.prisma.groupChat.findMany({
      where: { group: groupId },
      orderBy: { sendTime: 'asc' },
    });
  }

  async getFile(filename: string, userId: string) {
    const fileUrl = `/files/${filename}`;
    const msg = await this.prisma.groupChat.findFirst({
      where: { filesUrl: { has: fileUrl } },
    });
    if (!msg) throw new NotFoundException();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const group = await this.prisma.projectGroup.findUnique({
      where: { id: msg.group },
    });
    if (!user?.ftId || !group?.usersId.includes(user.ftId))
      throw new ForbiddenException();

    return filename;
  }
}
