import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db, attachments, eq } from '@reported/database';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error.js';

export const attachmentsRouter = Router();

const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
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
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/json', 'text/plain', 'text/markdown', 'application/pdf',
  'text/x-log'
];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.log')) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'UNSUPPORTED_FILE_TYPE', 'Only images, json, logs, markdown, text, and PDF are allowed'));
    }
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

    return res.status(201).json({
      id: record.id,
      originalName: record.originalName,
      url: `/api/v1/attachments/${record.id}/download`,
      sizeBytes: record.sizeBytes,
      mimeType: record.mimeType
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

    return res.download(fullPath, record.originalName);
  } catch (error) {
    next(error);
  }
});

