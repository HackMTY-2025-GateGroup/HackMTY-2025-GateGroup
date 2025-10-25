import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';

export const supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
