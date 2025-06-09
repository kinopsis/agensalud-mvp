/**
 * =====================================================
 * AGENTSALUD MVP - BASIC HEALTH CHECK FOR COOLIFY
 * =====================================================
 * Simplified health check endpoint for Coolify deployment
 * Returns 200 OK if the Next.js server is running
 * 
 * @author AgentSalud DevOps Team
 * @date January 2025
 */

import { NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      server: 'running',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      deployment: {
        platform: 'coolify',
        commit: process.env.DEPLOYMENT_VERSION || 'unknown'
      }
    };

    return NextResponse.json(healthData, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
