import { Module } from '@nestjs/common';
import { InitService } from './init.service';
import { FtModule } from 'src/ft/ft.module';

@Module({
  imports: [FtModule],
  providers: [InitService],
})
export class InitModule {}
