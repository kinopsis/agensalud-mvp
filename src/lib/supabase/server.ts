import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

// Handle missing environment variables during build time
const getSupabaseUrl = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
};

const getSupabaseAnonKey = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder-signature-for-build-time-only';
};

/**
 * Enhanced Supabase client with connection resilience
 * Addresses timeout issues and provides graceful degradation
 */
export async function createClient() {
  const cookieStore = await cookies();
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  // Only log warning during build time
  if (url === 'https://placeholder.supabase.co' || key.includes('placeholder')) {
    console.warn('⚠️ Using placeholder Supabase configuration for build time');
  }

  const client = createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          } catch {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      global: {
        fetch: (url, options = {}) => {
          // Enhanced fetch with shorter timeout for WhatsApp operations
          const timeoutMs = url.toString().includes('whatsapp') ? 5000 : 15000;

          return Promise.race([
            fetch(url, {
              ...options,
              signal: AbortSignal.timeout(timeoutMs)
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
            )
          ]);
        }
      }
    }
  );

  return client;
}

/**
 * Create client with retry mechanism for critical operations
 */
export async function createClientWithRetry(maxRetries = 3, baseDelay = 1000) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await createClient();

      // Test connection with a simple query
      await client.from('organizations').select('id').limit(1);

      console.log(`✅ Supabase connection established on attempt ${attempt}`);
      return client;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown connection error');
      console.warn(`⚠️ Supabase connection attempt ${attempt}/${maxRetries} failed:`, lastError.message);

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`🔄 Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error('❌ All Supabase connection attempts failed');
  throw new Error(`Failed to connect to Supabase after ${maxRetries} attempts: ${lastError?.message}`);
}
