import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Pusher from 'pusher';
import type { PusherChannelConfig } from './pusher.types';

@Injectable()
export class PusherService {
  private readonly logger = new Logger(PusherService.name);
  private readonly pusher: Pusher;
  private readonly channelConfigs: PusherChannelConfig[] = [];

  constructor(private readonly config: ConfigService) {
    this.pusher = new Pusher({
      appId: this.config.getOrThrow('PUSHER_APP_ID'),
      key: this.config.getOrThrow('PUSHER_KEY'),
      secret: this.config.getOrThrow('PUSHER_SECRET'),
      cluster: this.config.getOrThrow<string>('PUSHER_CLUSTER').trim(),
      useTLS: true,
    });
  }

  registerChannel(config: PusherChannelConfig) {
    this.channelConfigs.push(config);
  }

  groupChannel(groupId: string) {
    return `private-group-${groupId}`;
  }

  async authorize(socketId: string, channelName: string, userId: string) {
    const config = this.channelConfigs.find((config) =>
      channelName.startsWith(config.prefix),
    );

    if (!config) {
      throw new ForbiddenException('Unknown pusher channel');
    }
    const allowed = await config.canAccess(userId, channelName);
    if (!allowed) {
      throw new ForbiddenException();
    }

    return this.pusher.authorizeChannel(socketId, channelName);
  }

  async trigger(channel: string, event: string, data: unknown) {
    try {
      await this.pusher.trigger(channel, event, data);
    } catch (error) {
      const trace = error instanceof Error ? error.stack : String(error);
      this.logger.error(`Failed to trigger ${event} on ${channel}`, trace);
    }
  }
}
