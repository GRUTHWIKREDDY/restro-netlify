import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.RESTRO_PROJECT_URL_SUPABASE || '';
// Use the anon key for server-side too (no RLS configured on tables yet)
const supabaseKey = process.env.RESTRO_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not configured. Server will not work.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
