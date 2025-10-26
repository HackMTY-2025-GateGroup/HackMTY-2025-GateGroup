import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';

const STORAGE_DIR = process.env.CV_STORAGE_DIR || path.resolve(process.cwd(), 'storage/uploads');
fs.mkdirSync(STORAGE_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, STORAGE_DIR);
  },
  filename: function (_req, file, cb) {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${ts}-${safe}`);
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});
