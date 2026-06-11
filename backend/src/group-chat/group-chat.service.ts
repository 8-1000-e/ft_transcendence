import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import type { GroupChat } from 'generated/prisma/client';
import { PusherService } from 'src/pusher/pusher.services';
import { PrismaService } from 'src/prisma/prisma.service';
import { assertPrivateFilesExist } from 'src/utils/files';

@Injectable()
export class GroupChatService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pusher: PusherService,
  ) {}

  onModuleInit() {
    this.pusher.registerChannel({
      prefix: 'private-group-',
      canAccess: (userId, channelName) =>
        this.canAccessGroupChannel(userId, channelName),
    });
  }

  private async canAccessGroupChannel(
    userId: string,
    channelName: string,
  ): Promise<boolean> {
    const groupId = channelName.replace('private-group-', '');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const group = await this.prisma.projectGroup.findUnique({
      where: { id: groupId },
    });

    return !!user?.ftId && !!group && group.usersId.includes(user.ftId);
  }

  async sendMessage(
    groupId: string,
    userId: string,
    content: string,
    filesUrl?: string[],
    replyMessageId?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const group = await this.prisma.projectGroup.findUnique({
      where: { id: groupId },
    });

    if (!user || !group) throw new NotFoundException();

    if (!user.ftId || !group.usersId.includes(user.ftId))
      throw new ForbiddenException();

    assertPrivateFilesExist(filesUrl);

    let replyMessage: GroupChat | null = null;

    if (replyMessageId) {
      replyMessage = await this.prisma.groupChat.findUnique({
        where: { id: replyMessageId },
      });
      if (!replyMessage || replyMessage.group !== groupId)
        throw new ForbiddenException();
    }

    const message = await this.prisma.groupChat.create({
      data: {
        content,
        filesUrl: filesUrl ?? [],
        sender: userId,
        group: groupId,
        messageReply: replyMessageId ?? null,
      },
      include: this.messageInclude(),
    });

    await this.pusher.trigger(
      this.pusher.groupChannel(groupId),
      'message-created',
      message,
    );

    return message;
  }

  async editMessage(
    groupId: string,
    messageId: string,
    userId: string,
    content: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException();

    const existingMessage = await this.prisma.groupChat.findUnique({
      where: { id: messageId },
    });

    if (!existingMessage || existingMessage.group !== groupId)
      throw new NotFoundException();
    if (existingMessage.sender !== userId) throw new ForbiddenException();

    const message = await this.prisma.groupChat.update({
      where: {
        id: messageId,
      },
      data: {
        content,
      },
      include: this.messageInclude(),
    });

    await this.pusher.trigger(
      this.pusher.groupChannel(groupId),
      'message-updated',
      message,
    );

    return message;
  }

  async getMessages(
    groupId: string,
    userId: string,
    fromQuery?: string,
    toQuery?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const group = await this.prisma.projectGroup.findUnique({
      where: { id: groupId },
    });

    if (!user || !group) throw new NotFoundException();

    if (!user.ftId || !group.usersId.includes(user.ftId))
      throw new ForbiddenException();

    const parsedFrom = Number(fromQuery);
    const from = Number.isFinite(parsedFrom) ? Math.max(0, parsedFrom) : 0;
    const parsedTo = Number(toQuery);
    const to = Number.isFinite(parsedTo) ? Math.max(from, parsedTo) : from + 50;
    const take = Math.min(Math.max(to - from, 1), 100);

    const messages = await this.prisma.groupChat.findMany({
      where: { group: groupId },
      orderBy: { sendTime: 'desc' },
      skip: from,
      take,
      include: this.messageInclude(),
    });

    return messages.reverse();
  }

  async deleteMessage(groupId: string, messageId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();

    const message = await this.prisma.groupChat.findUnique({
      where: { id: messageId },
    });
    if (!message || message.group !== groupId) throw new NotFoundException();
    if (message.sender !== userId) throw new ForbiddenException();

    const deletedMessage = await this.prisma.groupChat.delete({
      where: { id: messageId },
    });

    await this.pusher.trigger(
      this.pusher.groupChannel(groupId),
      'message-deleted',
      deletedMessage,
    );

    return deletedMessage;
  }

  async getFile(filename: string, userId: string) {
    const fileUrl = `/files/${filename}`;
    const message = await this.prisma.groupChat.findFirst({
      where: { filesUrl: { has: fileUrl } },
    });
    if (!message) throw new NotFoundException();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const group = await this.prisma.projectGroup.findUnique({
      where: { id: message.group },
    });
    if (!user?.ftId || !group?.usersId.includes(user.ftId))
      throw new ForbiddenException();

    return filename;
  }

  private messageInclude() {
    return {
      user: {
        select: {
          id: true,
          name: true,
          ftPfpUrl: true,
          rdmName: true,
          rdmPfp: true,
        },
      },
      replyTo: {
        select: {
          id: true,
          content: true,
        },
      },
    };
  }
}
