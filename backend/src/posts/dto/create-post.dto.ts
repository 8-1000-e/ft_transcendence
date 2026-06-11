import {
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsArray,
  ArrayMaxSize,
  Matches,
} from 'class-validator';

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Matches(/^\/uploads\/[\w-]+\.\w+$/, { each: true })
  @MaxLength(255, { each: true })
  filesUrl?: string[];
}
