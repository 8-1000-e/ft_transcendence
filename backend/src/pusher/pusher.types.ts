export interface PusherChannelConfig {
  prefix: string;
  canAccess(userId: string, channelName: string): Promise<boolean>;
}
