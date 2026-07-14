import {
  IsString,
  MaxLength,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  Matches,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

// A message must carry text OR an image (both allowed). Enforced at the object
// level so `content` keeps its unconditional @IsString + @MaxLength guard even
// for an image-only send (gating the whole property with @ValidateIf would drop
// the length/type checks — CVE-shaped: 50k-char content, or non-string → 500).
@ValidatorConstraint({ name: 'contentOrImage', async: false })
class ContentOrImageConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const o = args.object as SendMessageDto;
    return !!o.content?.trim() || !!o.filesUrl?.length;
  }
  defaultMessage(): string {
    return 'A message must have text or an image';
  }
}

export class SendMessageDto {
  // Empty string is allowed only alongside an image (see ContentOrImage below);
  // type + length are always validated so an image never bypasses them.
  @IsString()
  @MaxLength(1000)
  @Validate(ContentOrImageConstraint)
  content: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Matches(/^\/files\/[\w-]+\.\w+$/, { each: true })
  @MaxLength(255, { each: true })
  filesUrl?: string[];
}
