import { Controller, Get, Post, UseGuards} from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { ChatService } from "./chat.service";
import { SendMessageDto } from "./dto/send-message.dto";
import { Body } from "@nestjs/common";
import { Param, Req } from "@nestjs/common";

@Controller()
export class ChatController
{
    constructor(private readonly chatService: ChatService) {}

    @Post('groups/:groupId/message')
    @UseGuards(JwtAuthGuard)
    postMessage(@Param('groupId') groupId: string, @Body() body: SendMessageDto, @Req() req: any)
    {
        return this.chatService.sendMessage(groupId, req.user.sub, body.content);
    }

    @Get('groups/:groupId/messages')
    @UseGuards(JwtAuthGuard)
    getMessages(@Param('groupId') groupId: string, @Req() req: any)
    {
        return this.chatService.getMessages(groupId, req.user.sub);
    }

}
