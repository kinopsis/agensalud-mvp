/**
 * Admin Monitoring Cleanup API
 * 
 * Emergency endpoint to stop infinite monitoring loops and clean up
 * problematic instances that are causing resource drain.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// =====================================================
// POST /api/admin/cleanup-monitoring
// =====================================================

/**
 * Emergency cleanup endpoint for monitoring loops
 * 
 * @description Stops infinite monitoring loops and cleans up problematic instances.
 * Only accessible to superadmin users.
 * 
 * @param request - Next.js request object
 * @returns JSON response with cleanup results
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'User profile not found' }
      }, { status: 404 });
    }

    // Only superadmin can access this endpoint
    if (profile.role !== 'superadmin') {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'INSUFFICIENT_PERMISSIONS', 
          message: 'Only superadmin can perform monitoring cleanup',
          requiredRole: 'superadmin',
          userRole: profile.role
        }
      }, { status: 403 });
    }

    // Parse request body for cleanup options
    const body = await request.json().catch(() => ({}));
    const { 
      stopProblematic = true, 
      emergencyStop = false,
      markInstances = []
    } = body;

    const cleanupResults = {
      stoppedProblematic: false,
      emergencyStop: false,
      markedInstances: [],
      timestamp: new Date().toISOString()
    };

    // Stop problematic instance monitoring
    if (stopProblematic) {
      console.log('🛑 Admin cleanup: Stopping problematic instance monitoring...');
      
      // List of known problematic instances
      const problematicInstances = [
        '927cecbe-hhghg',
        '927cecbe-polopolo',
        'df3d987c-2e6b-46a0-9b9d-40d8de867a09'
      ];

      // Update database to mark these instances as problematic
      for (const instanceName of problematicInstances) {
        try {
          await supabase
            .from('channel_instances')
            .update({ 
              status: 'error',
              error_message: 'Monitoring disabled due to infinite loop',
              updated_at: new Date().toISOString()
            })
            .ilike('instance_name', `%${instanceName}%`);
          
          console.log(`🔧 Marked instance as problematic: ${instanceName}`);
        } catch (error) {
          console.error(`Failed to mark instance as problematic: ${instanceName}`, error);
        }
      }

      cleanupResults.stoppedProblematic = true;
    }

    // Emergency stop all monitoring
    if (emergencyStop) {
      console.log('🚨 Admin cleanup: Emergency stop all monitoring...');
      
      // This will be handled by the frontend monitoring cleanup utility
      cleanupResults.emergencyStop = true;
    }

    // Mark specific instances as problematic
    if (markInstances.length > 0) {
      for (const instanceId of markInstances) {
        try {
          await supabase
            .from('channel_instances')
            .update({ 
              status: 'error',
              error_message: 'Monitoring disabled by admin',
              updated_at: new Date().toISOString()
            })
            .eq('id', instanceId);
          
          cleanupResults.markedInstances.push(instanceId);
          console.log(`🔧 Admin marked instance as problematic: ${instanceId}`);
        } catch (error) {
          console.error(`Failed to mark instance as problematic: ${instanceId}`, error);
        }
      }
    }

    // Create audit log
    await supabase.rpc('create_channel_audit_log', {
      p_organization_id: profile.organization_id,
      p_channel_type: 'system',
      p_instance_id: null,
      p_action: 'monitoring_cleanup',
      p_actor_id: user.id,
      p_actor_type: 'superadmin',
      p_details: {
        cleanupType: 'admin_monitoring_cleanup',
        options: { stopProblematic, emergencyStop, markInstances },
        results: cleanupResults,
        performedBy: user.email,
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Monitoring cleanup completed successfully',
      data: cleanupResults,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        performedBy: user.email
      }
    });

  } catch (error) {
    console.error('Unexpected error in monitoring cleanup:', error);
    return NextResponse.json({ 
      success: false,
      error: { 
        code: 'INTERNAL_ERROR', 
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    }, { status: 500 });
  }
}

// =====================================================
// GET /api/admin/cleanup-monitoring
// =====================================================

/**
 * Get monitoring cleanup status
 * 
 * @description Returns information about current monitoring status and problematic instances.
 * 
 * @param request - Next.js request object
 * @returns JSON response with monitoring status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'User profile not found' }
      }, { status: 404 });
    }

    // Only admin and superadmin can access this endpoint
    if (!['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'INSUFFICIENT_PERMISSIONS', 
          message: 'Only administrators can view monitoring status'
        }
      }, { status: 403 });
    }

    // Get instances with monitoring issues
    const { data: problematicInstances, error: queryError } = await supabase
      .from('channel_instances')
      .select('id, instance_name, status, error_message, updated_at')
      .or('error_message.ilike.%infinite loop%,error_message.ilike.%monitoring disabled%')
      .order('updated_at', { ascending: false });

    if (queryError) {
      throw new Error(`Failed to query problematic instances: ${queryError.message}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        problematicInstances: problematicInstances || [],
        totalProblematic: problematicInstances?.length || 0,
        lastChecked: new Date().toISOString()
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Unexpected error in monitoring status check:', error);
    return NextResponse.json({ 
      success: false,
      error: { 
        code: 'INTERNAL_ERROR', 
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    }, { status: 500 });
  }
}
