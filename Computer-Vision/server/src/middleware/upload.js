import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Resolve to Computer-Vision/storage/uploads regardless of CWD
const STORAGE_DIR = process.env.STORAGE_DIR || path.resolve(__dirname, '../../../storage/uploads');

// Ensure directory exists
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
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export function pathToPublicUrl(filePath) {
  // For now, expose a relative path the API can later serve statically if needed
  return filePath;
}
