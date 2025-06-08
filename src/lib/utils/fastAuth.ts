/**
 * Fast Authentication Utility
 * Provides rapid authentication with intelligent fallback for performance optimization
 */

import { createClient } from '@/lib/supabase/server';

interface AuthResult {
  user: any | null;
  error: any | null;
  isFallback: boolean;
  responseTime: number;
  method: 'supabase' | 'development' | 'cached';
}

interface CacheEntry {
  user: any;
  timestamp: number;
  expiresAt: number;
}

// Simple in-memory cache for development
const authCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const AUTH_TIMEOUT = 2000; // 2 seconds max for auth

/**
 * Fast authentication with timeout and fallback
 * @param timeoutMs Maximum time to wait for Supabase auth (default: 2000ms)
 * @returns AuthResult with user, error, and performance metrics
 */
export async function fastAuth(timeoutMs: number = AUTH_TIMEOUT): Promise<AuthResult> {
  const startTime = Date.now();
  
  try {
    // Check cache first (development optimization)
    const cacheKey = 'current_user';
    const cached = authCache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiresAt) {
      return {
        user: cached.user,
        error: null,
        isFallback: false,
        responseTime: Date.now() - startTime,
        method: 'cached'
      };
    }

    // Create Supabase client
    const supabase = await createClient();
    
    // Race between auth and timeout
    const authPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth timeout')), timeoutMs)
    );

    const result = await Promise.race([authPromise, timeoutPromise]) as any;
    const responseTime = Date.now() - startTime;

    if (result.data?.user) {
      // Cache successful auth for development
      if (process.env.NODE_ENV === 'development') {
        authCache.set(cacheKey, {
          user: result.data.user,
          timestamp: Date.now(),
          expiresAt: Date.now() + CACHE_DURATION
        });
      }

      return {
        user: result.data.user,
        error: result.error,
        isFallback: false,
        responseTime,
        method: 'supabase'
      };
    } else {
      throw new Error(result.error?.message || 'Authentication failed');
    }

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    console.warn(`⚡ Fast auth failed in ${responseTime}ms:`, error.message);
    
    // Development fallback
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Using development auth fallback');
      
      const devUser = {
        id: 'dev-user-' + Date.now(),
        email: 'dev@agentsalud.com',
        role: 'admin',
        created_at: new Date().toISOString()
      };

      return {
        user: devUser,
        error: null,
        isFallback: true,
        responseTime,
        method: 'development'
      };
    }

    return {
      user: null,
      error: error,
      isFallback: false,
      responseTime,
      method: 'supabase'
    };
  }
}

/**
 * Clear authentication cache (for development)
 */
export function clearAuthCache(): void {
  authCache.clear();
  console.log('🧹 Auth cache cleared');
}

/**
 * Get cache statistics (for monitoring)
 */
export function getAuthCacheStats() {
  const now = Date.now();
  const entries = Array.from(authCache.entries());
  
  return {
    totalEntries: entries.length,
    validEntries: entries.filter(([_, entry]) => now < entry.expiresAt).length,
    expiredEntries: entries.filter(([_, entry]) => now >= entry.expiresAt).length,
    oldestEntry: entries.length > 0 ? Math.min(...entries.map(([_, entry]) => entry.timestamp)) : null,
    newestEntry: entries.length > 0 ? Math.max(...entries.map(([_, entry]) => entry.timestamp)) : null
  };
}
