import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsIn(['en', 'fr', 'es'])
  locale?: string;
}
