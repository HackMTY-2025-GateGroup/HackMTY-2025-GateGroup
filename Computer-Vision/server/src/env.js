import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load Computer-Vision/.env regardless of CWD
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: envPath });

export const config = {
  port: parseInt(process.env.PORT || '5175', 10),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_KEY || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '',
};

if (!config.supabaseUrl || !config.supabaseServiceKey) {
  console.warn('[cv-env] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
}
