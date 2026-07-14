import {
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

// Shared with the client-side check in GroupChatView so both layers agree.
export const GITHUB_URL_RE = /^(https?:\/\/)?(www\.)?github\.com\/.+/i;

export class EditGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  groupName?: string;

  // '' or null clears the link; ValidateIf lets '' bypass the URL rule (@IsOptional only skips null/undefined) when editing just the name.
  @IsOptional()
  @ValidateIf((o: EditGroupDto) => o.githubLink !== null && o.githubLink !== '')
  @Matches(GITHUB_URL_RE, { message: 'githubLink must be a GitHub URL' })
  githubLink?: string | null;
}
