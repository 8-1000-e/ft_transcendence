import { BadRequestException } from '@nestjs/common';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { basename, join } from 'path';

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

// Delete stored upload files from disk, routing by URL prefix (public /uploads
// vs gated /files). basename() prevents path escape; missing files are ignored.
// Used to avoid orphaned files on delete/purge (edit/delete don't self-clean).
export async function unlinkStoredFiles(filesUrl?: string[]): Promise<void> {
  for (const url of filesUrl ?? []) {
    let dir: string | null = null;
    if (url.startsWith('/uploads/')) dir = 'uploads';
    else if (url.startsWith('/files/')) dir = 'private-uploads';
    if (!dir) continue;
    await unlink(join(process.cwd(), dir, basename(url))).catch(() => {});
  }
}
