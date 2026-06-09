import { Module } from '@nestjs/common';
import { InitService } from './init.service';
import { FtApiModule } from 'src/ftapi/ftapi.module';

@Module({
  imports: [FtApiModule],
  providers: [InitService],
})
export class InitModule {}
