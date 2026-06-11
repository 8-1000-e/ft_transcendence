import { BadRequestException } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';

// Ensures every referenced file actually exists in the uploads folder
// (the DTO already guarantees the `/uploads/<name>.<ext>` format).
export function assertFilesExist(filesUrl?: string[]) {
  for (const url of filesUrl ?? []) {
    const filename = url.replace('/uploads/', '');
    if (!existsSync(join('uploads', filename)))
      throw new BadRequestException(`File not found: ${url}`);
  }
}
