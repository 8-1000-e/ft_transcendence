import { SetMetadata } from '@nestjs/common';

export const ALLOW_PENDING = 'allowPending';
export const AllowWhilePending = () => SetMetadata(ALLOW_PENDING, true);
