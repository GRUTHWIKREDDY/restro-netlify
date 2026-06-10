import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_RESTRO_PROJECT_URL_SUPABASE || '';
const supabaseAnonKey = (import.meta as any).env.VITE_RESTRO_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Utility: convert camelCase object keys to snake_case for DB writes
export function toSnake(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = value;
  }
  return result;
}

// Utility: convert snake_case DB row keys to camelCase for client reads
export function toCamel(row: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}
