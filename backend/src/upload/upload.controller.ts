import {
  BadRequestException,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { randomUUID } from 'crypto';
import { extname, basename, join } from 'path';
import { unlink } from 'fs/promises';

// Images render inline; documents are offered as downloads. Deliberately no
// archives or executables — they are the classic upload attack vector.
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
]);
// Extension must match the declared type: a browser can send an arbitrary
// Content-Type, so the stored name is what later decides how a file is served.
const ALLOWED_EXT = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
  '.txt',
  '.md',
  '.csv',
]);
const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo

// Server-side type gate — never trust the client's `accept` attribute.
const uploadFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: (err: Error | null, ok: boolean) => void,
) => {
  const ext = extname(file.originalname).toLowerCase();
  if (ALLOWED_TYPES.has(file.mimetype) && ALLOWED_EXT.has(ext)) cb(null, true);
  else
    cb(
      new BadRequestException(
        'Allowed files: JPEG, PNG, GIF, WebP, PDF, TXT, MD, CSV (max 5 MB)',
      ),
      false,
    );
};

const named = (
  _req: Request,
  file: Express.Multer.File,
  cb: (e: null, name: string) => void,
) => cb(null, `${randomUUID()}${extname(file.originalname)}`);

@Controller()
export class UploadController {
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({ destination: './uploads', filename: named }),
      fileFilter: uploadFilter,
      limits: { fileSize: MAX_SIZE },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return { url: `/uploads/${file.filename}` };
  }

  @Post('upload/group')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './private-uploads',
        filename: named,
      }),
      fileFilter: uploadFilter,
      limits: { fileSize: MAX_SIZE },
    }),
  )
  uploadGroup(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return { url: `/files/${file.filename}` };
  }

  // basename() strips any path so a crafted name can't escape ./uploads; the
  // UUID filenames are unguessable, so a bare auth check is enough here.
  @Delete('upload/:filename')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('filename') filename: string) {
    await unlink(join(process.cwd(), 'uploads', basename(filename))).catch(
      () => {},
    );
    return { ok: true };
  }
}
