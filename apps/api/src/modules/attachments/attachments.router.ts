import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db, attachments, eq, and, desc } from '@reported/database';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error.js';

export const attachmentsRouter = Router();

const uploadDir = path.resolve(process.cwd(), 'uploads');
const chunksDir = path.resolve(uploadDir, 'temp_chunks');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(chunksDir)) {
  fs.mkdirSync(chunksDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, safeName);
  }
});

const allowedMimes = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/x-icon',
  'application/json', 'text/plain', 'text/markdown', 'application/pdf',
  'text/x-log', 'text/csv', 'text/html', 'text/css', 'text/javascript', 'application/javascript',
  'application/typescript', 'text/x-typescript', 'text/x-python', 'text/x-sql', 'text/x-diff',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip', 'application/x-zip-compressed', 'application/gzip', 'application/x-tar', 'application/x-7z-compressed',
  'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/x-m4a',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  'application/octet-stream'
];

const allowedExtensions = [
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico',
  '.json', '.txt', '.md', '.pdf', '.log', '.csv', '.tsv',
  '.docx', '.doc', '.xlsx', '.xls', '.pptx',
  '.zip', '.gz', '.tar', '.tgz', '.7z', '.rar',
  '.webm', '.ogg', '.mp3', '.wav', '.m4a',
  '.mp4', '.mov', '.avi', '.mkv',
  '.ts', '.tsx', '.js', '.jsx', '.py', '.sql', '.patch', '.diff', '.env', '.yml', '.yaml', '.xml', '.sh'
];

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (
      allowedMimes.includes(file.mimetype) ||
      file.mimetype.startsWith('audio/') ||
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('video/') ||
      file.mimetype.startsWith('text/') ||
      allowedExtensions.includes(ext) ||
      ext === ''
    ) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'UNSUPPORTED_FILE_TYPE', `Unsupported file type: ${file.mimetype} (${ext})`));
    }
  }
});

const chunkStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const uploadId = req.body.uploadId || 'temp';
    const targetDir = path.resolve(chunksDir, uploadId);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, _file, cb) => {
    const index = req.body.chunkIndex !== undefined ? String(req.body.chunkIndex) : '0';
    cb(null, `chunk_${index}`);
  }
});

const chunkUpload = multer({
  storage: chunkStorage,
  limits: { fileSize: 15 * 1024 * 1024 }
});

attachmentsRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetType = req.query.targetType as string;
    const targetId = req.query.targetId as string;

    if (!targetType || !targetId) {
      return res.json([]);
    }

    const items = await db.query.attachments.findMany({
      where: and(
        eq(attachments.targetType, targetType),
        eq(attachments.targetId, targetId)
      ),
      orderBy: [desc(attachments.createdAt)]
    });

    return res.json(items.map(record => ({
      id: record.id,
      filename: record.filename,
      originalName: record.originalName,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      url: `/api/v1/attachments/${record.id}/download`,
      inlineUrl: `/api/v1/attachments/${record.id}/download?inline=true`,
      isVoiceNote: record.mimeType.startsWith('audio/'),
      createdAt: record.createdAt.toISOString()
    })));
  } catch (error) {
    next(error);
  }
});

attachmentsRouter.post('/', requireAuth, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) {
      throw new AppError(400, 'NO_FILE', 'No file uploaded');
    }

    const user = req.user!;
    const targetType = req.body.targetType as string;
    const targetId = req.body.targetId as string;

    const [record] = await db.insert(attachments).values({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      filePath: `/uploads/${file.filename}`,
      uploadedBy: user.id,
      targetType: targetType || null,
      targetId: targetId || null
    }).returning();

    console.log(`[Attachments] Uploaded: ${file.originalname} (${file.size} bytes, ${file.mimetype}) -> id: ${record.id}, target: ${targetType || 'none'}:${targetId || 'none'}`);

    return res.status(201).json({
      id: record.id,
      originalName: record.originalName,
      filename: record.filename,
      url: `/api/v1/attachments/${record.id}/download`,
      inlineUrl: `/api/v1/attachments/${record.id}/download?inline=true`,
      sizeBytes: record.sizeBytes,
      mimeType: record.mimeType,
      isVoiceNote: record.mimeType.startsWith('audio/')
    });
  } catch (error) {
    next(error);
  }
});

attachmentsRouter.post('/chunk', requireAuth, chunkUpload.single('chunk'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const uploadId = req.body.uploadId as string;
    const chunkIndex = parseInt(req.body.chunkIndex, 10);
    const totalChunks = parseInt(req.body.totalChunks, 10);
    const originalName = (req.body.filename as string) || 'upload.bin';
    const mimeType = (req.body.mimeType as string) || 'application/octet-stream';
    const targetType = req.body.targetType as string;
    const targetId = req.body.targetId as string;

    if (!uploadId || isNaN(chunkIndex) || isNaN(totalChunks)) {
      throw new AppError(400, 'INVALID_CHUNK_PARAMS', 'Missing or invalid chunk parameters');
    }

    if (chunkIndex === totalChunks - 1) {
      const ext = path.extname(originalName).toLowerCase();
      const safeFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
      const finalFilePath = path.resolve(uploadDir, safeFilename);
      const chunkFolder = path.resolve(chunksDir, uploadId);

      const writeStream = fs.createWriteStream(finalFilePath);
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.resolve(chunkFolder, `chunk_${i}`);
        if (!fs.existsSync(chunkPath)) {
          throw new AppError(500, 'CHUNK_MISSING', `Chunk ${i} is missing`);
        }
        const data = fs.readFileSync(chunkPath);
        writeStream.write(data);
      }
      writeStream.end();

      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
      });

      fs.rmSync(chunkFolder, { recursive: true, force: true });

      const stats = fs.statSync(finalFilePath);

      const [record] = await db.insert(attachments).values({
        filename: safeFilename,
        originalName,
        mimeType,
        sizeBytes: stats.size,
        filePath: `/uploads/${safeFilename}`,
        uploadedBy: user.id,
        targetType: targetType || null,
        targetId: targetId || null
      }).returning();

      console.log(`[Attachments] Chunk upload complete: ${originalName} (${stats.size} bytes) -> id: ${record.id}, target: ${targetType || 'none'}:${targetId || 'none'}`);

      return res.status(201).json({
        id: record.id,
        originalName: record.originalName,
        filename: record.filename,
        url: `/api/v1/attachments/${record.id}/download`,
        inlineUrl: `/api/v1/attachments/${record.id}/download?inline=true`,
        sizeBytes: record.sizeBytes,
        mimeType: record.mimeType,
        isVoiceNote: record.mimeType.startsWith('audio/'),
        completed: true
      });
    }

    console.log(`[Attachments] Chunk ${chunkIndex + 1}/${totalChunks} received for upload ${uploadId}`);

    return res.json({
      uploadId,
      chunkIndex,
      totalChunks,
      completed: false
    });
  } catch (error) {
    next(error);
  }
});

attachmentsRouter.get('/:id/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await db.query.attachments.findFirst({
      where: eq(attachments.id, req.params.id)
    });

    if (!record) {
      throw new AppError(404, 'NOT_FOUND', 'Attachment not found');
    }

    const fullPath = path.resolve(uploadDir, record.filename);
    if (!fs.existsSync(fullPath)) {
      throw new AppError(404, 'FILE_MISSING', 'File not found on server disk');
    }

    const isAudio = record.mimeType.startsWith('audio/');
    const isInline = req.query.inline === 'true' || isAudio;

    if (isAudio && req.query.download === 'true') {
      throw new AppError(403, 'DOWNLOAD_FORBIDDEN', 'Audio voice recordings cannot be downloaded');
    }

    if (isInline) {
      res.setHeader('Content-Type', record.mimeType);
      return res.sendFile(fullPath);
    }

    return res.download(fullPath, record.originalName);
  } catch (error) {
    next(error);
  }
});
