import { BadRequestException } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';

// Ensure every referenced file exists on disk (the DTO already guarantees the `/uploads/<name>.<ext>` format).
export function assertFilesExist(filesUrl?: string[]) {
  for (const url of filesUrl ?? []) {
    const filename = url.replace('/uploads/', '');
    if (!existsSync(join('uploads', filename)))
      throw new BadRequestException(`File not found: ${url}`);
  }
}

// Same, but for the private (gated) group-chat files served under /files/.
export function assertPrivateFilesExist(filesUrl?: string[]) {
  for (const url of filesUrl ?? []) {
    const filename = url.replace('/files/', '');
    if (!existsSync(join('private-uploads', filename)))
      throw new BadRequestException(`File not found: ${url}`);
  }
}
