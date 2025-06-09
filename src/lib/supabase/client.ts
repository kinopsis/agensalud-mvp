import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * Enhanced Supabase client configuration for production deployment
 * Handles both build-time and runtime environment variable resolution
 */

// Runtime environment variable resolution for browser
const getSupabaseUrl = (): string => {
  // In browser environment, check for runtime-injected variables first
  if (typeof window !== 'undefined') {
    // Check if runtime config is available (injected by server)
    const runtimeConfig = (window as any).__RUNTIME_CONFIG__;
    if (runtimeConfig?.NEXT_PUBLIC_SUPABASE_URL) {
      return runtimeConfig.NEXT_PUBLIC_SUPABASE_URL;
    }
  }

  // Fallback to process.env (build-time or server-side)
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Validate that we have a real URL, not placeholder
  if (!envUrl || envUrl === 'https://placeholder.supabase.co') {
    console.error('❌ Missing or invalid NEXT_PUBLIC_SUPABASE_URL environment variable');
    console.error('Current value:', envUrl);
    console.error('Please set the correct Supabase URL in Coolify environment variables');
  }

  return envUrl || 'https://placeholder.supabase.co';
};

const getSupabaseAnonKey = (): string => {
  // In browser environment, check for runtime-injected variables first
  if (typeof window !== 'undefined') {
    const runtimeConfig = (window as any).__RUNTIME_CONFIG__;
    if (runtimeConfig?.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return runtimeConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }
  }

  // Fallback to process.env (build-time or server-side)
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Validate that we have a real key, not placeholder
  if (!envKey || envKey.includes('placeholder')) {
    console.error('❌ Missing or invalid NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
    console.error('Current value:', envKey ? 'placeholder key detected' : 'undefined');
    console.error('Please set the correct Supabase anon key in Coolify environment variables');
  }

  return envKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder-signature-for-build-time-only';
};

export const createClient = () => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  // Enhanced validation and logging
  const isPlaceholder = url === 'https://placeholder.supabase.co' || key.includes('placeholder');

  if (isPlaceholder) {
    console.warn('⚠️ Using placeholder Supabase configuration');
    console.warn('URL:', url);
    console.warn('Key:', key.includes('placeholder') ? 'placeholder key' : 'valid key');
    console.warn('Environment check:');
    console.warn('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.warn('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'not set');
  } else {
    console.log('✅ Supabase client initialized with production configuration');
    console.log('URL:', url);
  }

  return createBrowserClient<Database>(url, key);
};

export const supabase = createClient();
