import {
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class EditGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  groupName?: string;

  // '' or null clears the link; ValidateIf lets '' bypass @IsUrl (@IsOptional only skips null/undefined) when editing just the name.
  @IsOptional()
  @ValidateIf((o: EditGroupDto) => o.githubLink !== null && o.githubLink !== '')
  @IsUrl()
  githubLink?: string | null;
}
