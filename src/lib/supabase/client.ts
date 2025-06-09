import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

// Handle missing environment variables during build time
const getSupabaseUrl = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
};

const getSupabaseAnonKey = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder-signature-for-build-time-only';
};

export const createClient = () => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  // Only create real client if we have valid environment variables
  if (url === 'https://placeholder.supabase.co' || key.includes('placeholder')) {
    console.warn('⚠️ Using placeholder Supabase configuration for build time');
  }

  return createBrowserClient<Database>(url, key);
};

export const supabase = createClient();
