/**
 * =====================================================
 * AGENTSALUD MVP - ENVIRONMENT DEBUG ENDPOINT
 * =====================================================
 * Debug endpoint to check environment variable loading
 * REMOVE THIS IN PRODUCTION AFTER DEBUGGING
 * 
 * @author AgentSalud DevOps Team
 * @date January 2025
 */

import { NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Only allow in development or with debug flag
    if (process.env.NODE_ENV === 'production' && !process.env.DEBUG_ENV) {
      return NextResponse.json(
        { error: 'Debug endpoint disabled in production' },
        { status: 403 }
      );
    }

    const envDebug = {
      timestamp: new Date().toISOString(),
      node_env: process.env.NODE_ENV,
      platform: process.platform,
      
      // Supabase Configuration (masked for security)
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
        url_masked: process.env.NEXT_PUBLIC_SUPABASE_URL 
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20)}...` 
          : 'NOT_SET',
        anon_key_set: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        anon_key_length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
        service_key_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        service_key_length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
        service_key_has_placeholder: process.env.SUPABASE_SERVICE_ROLE_KEY?.includes('placeholder') || false
      },
      
      // NextAuth Configuration
      nextauth: {
        secret_set: !!process.env.NEXTAUTH_SECRET,
        secret_length: process.env.NEXTAUTH_SECRET?.length || 0,
        url: process.env.NEXTAUTH_URL || 'NOT_SET'
      },
      
      // Other Configuration
      other: {
        port: process.env.PORT || 'NOT_SET',
        hostname: process.env.HOSTNAME || 'NOT_SET',
        deployment_version: process.env.DEPLOYMENT_VERSION || 'NOT_SET'
      },
      
      // Environment Variable Count
      env_count: Object.keys(process.env).length,
      
      // Build Time Detection
      build_time_detection: {
        url_is_placeholder: process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co',
        service_key_has_placeholder: process.env.SUPABASE_SERVICE_ROLE_KEY?.includes('placeholder') || false,
        is_build_time: (
          process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co' || 
          (process.env.SUPABASE_SERVICE_ROLE_KEY?.includes('placeholder') || false)
        )
      }
    };

    return NextResponse.json(envDebug, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
