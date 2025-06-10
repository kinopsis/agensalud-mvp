import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * Enhanced Supabase client configuration for production deployment
 * Handles both build-time and runtime environment variable resolution
 */

// Cache for environment variables to prevent repeated validation
let cachedSupabaseUrl: string | null = null;
let cachedSupabaseKey: string | null = null;
let validationLogged = false;

// Runtime environment variable resolution for browser
const getSupabaseUrl = (): string => {
  // Return cached value if available
  if (cachedSupabaseUrl !== null) {
    return cachedSupabaseUrl;
  }

  // In browser environment, check for runtime-injected variables first
  if (typeof window !== 'undefined') {
    // Check if runtime config is available (injected by server)
    const runtimeConfig = (window as any).__RUNTIME_CONFIG__;
    if (runtimeConfig?.NEXT_PUBLIC_SUPABASE_URL) {
      cachedSupabaseUrl = runtimeConfig.NEXT_PUBLIC_SUPABASE_URL;
      return cachedSupabaseUrl;
    }
  }

  // Fallback to process.env (build-time or server-side)
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Validate that we have a real URL, not placeholder (only log once)
  const isPlaceholderUrl = !envUrl || envUrl === 'https://placeholder.supabase.co';
  const isValidSupabaseUrl = envUrl && envUrl.includes('.supabase.co') && envUrl.startsWith('https://');

  if (isPlaceholderUrl && !validationLogged) {
    console.error('❌ Missing or invalid NEXT_PUBLIC_SUPABASE_URL environment variable');
    console.error('Current value:', envUrl);
    console.error('Please set the correct Supabase URL in Coolify environment variables');
    validationLogged = true;
  } else if (envUrl && !isValidSupabaseUrl && !validationLogged) {
    console.error('❌ Invalid NEXT_PUBLIC_SUPABASE_URL format');
    console.error('Current value:', envUrl);
    console.error('Expected format: https://your-project.supabase.co');
    validationLogged = true;
  }

  cachedSupabaseUrl = envUrl || 'https://placeholder.supabase.co';
  return cachedSupabaseUrl;
};

const getSupabaseAnonKey = (): string => {
  // Return cached value if available
  if (cachedSupabaseKey !== null) {
    return cachedSupabaseKey;
  }

  // In browser environment, check for runtime-injected variables first
  if (typeof window !== 'undefined') {
    const runtimeConfig = (window as any).__RUNTIME_CONFIG__;
    if (runtimeConfig?.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      cachedSupabaseKey = runtimeConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      return cachedSupabaseKey;
    }
  }

  // Fallback to process.env (build-time or server-side)
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Validate that we have a real key, not placeholder (only log once)
  const isPlaceholderKey = !envKey || envKey.includes('placeholder');
  const isValidJWT = envKey && envKey.startsWith('eyJ') && envKey.length > 100;

  if (isPlaceholderKey && !validationLogged) {
    console.error('❌ Missing or invalid NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
    console.error('Current value:', envKey ? 'placeholder key detected' : 'undefined');
    console.error('Please set the correct Supabase anon key in Coolify environment variables');
    validationLogged = true;
  } else if (envKey && !isValidJWT && !validationLogged) {
    console.error('❌ Invalid NEXT_PUBLIC_SUPABASE_ANON_KEY format');
    console.error('Expected: JWT token starting with "eyJ"');
    validationLogged = true;
  }

  cachedSupabaseKey = envKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder-signature-for-build-time-only';
  return cachedSupabaseKey;
};

// Cache the client instance to prevent recreation
let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

export const createClient = () => {
  // Return cached client if available
  if (clientInstance) {
    return clientInstance;
  }

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  // Enhanced validation and logging (only on first creation)
  const isPlaceholderUrl = url === 'https://placeholder.supabase.co';
  const isPlaceholderKey = key.includes('placeholder');
  const isPlaceholder = isPlaceholderUrl || isPlaceholderKey;

  if (isPlaceholder) {
    console.warn('⚠️ Using placeholder Supabase configuration');
    console.warn('URL:', url);
    console.warn('Key:', isPlaceholderKey ? 'placeholder key' : 'valid key');
    console.warn('Environment check:');
    console.warn('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.warn('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'not set');
  } else {
    console.log('✅ Supabase client initialized with production configuration');
    console.log('URL:', url);
  }

  clientInstance = createBrowserClient<Database>(url, key);
  return clientInstance;
};

export const supabase = createClient();
