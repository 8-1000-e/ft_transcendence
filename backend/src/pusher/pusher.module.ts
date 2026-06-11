import { Global, Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PusherController } from './pusher.controller';
import { PusherService } from './pusher.services';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [PusherController],
  providers: [PusherService],
  exports: [PusherService],
})
export class PusherModule {}
