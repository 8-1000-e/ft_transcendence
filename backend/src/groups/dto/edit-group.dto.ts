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

  // Optional. '' or null clears the link; any other value must be a valid URL.
  // (@IsOptional only skips null/undefined — ValidateIf also lets '' through so
  // editing just the name never trips @IsUrl on an empty github field.)
  @IsOptional()
  @ValidateIf((o: EditGroupDto) => o.githubLink !== null && o.githubLink !== '')
  @IsUrl()
  githubLink?: string | null;
}
