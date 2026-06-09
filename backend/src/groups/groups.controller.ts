import { Controller, Patch, UseGuards} from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { Body } from "@nestjs/common";
import { Param, Req } from "@nestjs/common";
import { EditGroupDto } from "./dto/edit-group.dto";
import { GroupService } from "./groups.service";

@Controller()
export class GroupController
{
    constructor(
        private readonly groupService: GroupService,
    ) {}


    @Patch('groups/:groupId')
    @UseGuards(JwtAuthGuard)
    editGroup(@Param('groupId') groupId: string, @Body() body: EditGroupDto, @Req() req: any)
    {
        return this.groupService.updateGroup(groupId, req.user.sub, body);
    }

}
