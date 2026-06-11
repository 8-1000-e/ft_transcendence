import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GroupChatModule } from './group-chat/group-chat.module';
import { GroupsModule } from './groups/groups.module';
import { InitModule } from './init/init.module';
import { PostsModule } from './posts/posts.module';
import { FtApiModule } from './ftapi/ftapi.module';
import { UploadModule } from './upload/upload.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { SuggestModule } from './suggest/suggest.module';
import { PusherModule } from './pusher/pusher.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    GroupChatModule,
    GroupsModule,
    InitModule,
    PostsModule,
    FtApiModule,
    UploadModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    SuggestModule,
    PusherModule,
  ],
})
export class AppModule {}
