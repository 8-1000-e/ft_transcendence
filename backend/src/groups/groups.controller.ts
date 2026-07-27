import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import type { AuthedRequest } from 'src/auth/authed-request';
import { EditGroupDto } from './dto/edit-group.dto';
import { GroupService } from './groups.service';

@Controller()
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Get('groups')
  @UseGuards(JwtAuthGuard)
  getMyGroups(@Req() req: AuthedRequest) {
    return this.groupService.getMyGroups(req.user.sub);
  }

  @Get('groups/:groupId')
  @UseGuards(JwtAuthGuard)
  getGroup(@Param('groupId') groupId: string, @Req() req: AuthedRequest) {
    return this.groupService.getGroup(groupId, req.user.sub);
  }

  @Get('groups/:groupId/members')
  @UseGuards(JwtAuthGuard)
  getMembers(@Param('groupId') groupId: string, @Req() req: AuthedRequest) {
    return this.groupService.getMembers(groupId, req.user.sub);
  }

  @Patch('groups/:groupId')
  @UseGuards(JwtAuthGuard)
  editGroup(
    @Param('groupId') groupId: string,
    @Body() body: EditGroupDto,
    @Req() req: AuthedRequest,
  ) {
    return this.groupService.updateGroup(groupId, req.user.sub, body);
  }
}
