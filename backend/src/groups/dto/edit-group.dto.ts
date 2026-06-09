import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class EditGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  groupName?: string;

  @IsOptional()
  @IsUrl()
  githubLink?: string;
}
