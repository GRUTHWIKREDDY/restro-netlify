import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.RESTRO_PROJECT_URL_SUPABASE || '';
// Use the service_role key for server-side operations (bypasses RLS)
const supabaseServiceKey = process.env.RESTRO_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase credentials not configured. Server will not work.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
