/**
 * Emergency Instance Reset API
 * 
 * Provides emergency reset functionality for WhatsApp instances that are stuck
 * in problematic states or causing infinite monitoring loops.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  resetInstanceState, 
  emergencyCleanup, 
  getProblematicInstances,
  isProblematicInstance,
  markInstanceAsProblematic,
  unmarkInstanceAsProblematic
} from '@/lib/utils/instanceStateManager';

/**
 * POST /api/admin/instances/emergency-reset
 * Reset specific instance or perform emergency cleanup
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, instanceId, targetState = 'disconnected' } = body;

    console.log('🚨 Emergency reset requested:', { action, instanceId, targetState });

    switch (action) {
      case 'reset_instance':
        if (!instanceId) {
          return NextResponse.json({
            success: false,
            error: 'Instance ID is required for reset_instance action'
          }, { status: 400 });
        }

        const resetResult = await resetInstanceState(instanceId, targetState);
        
        return NextResponse.json({
          success: resetResult.success,
          result: resetResult,
          message: resetResult.message
        });

      case 'emergency_cleanup':
        const cleanupResult = await emergencyCleanup();
        
        return NextResponse.json({
          success: cleanupResult.success,
          results: cleanupResult.results,
          message: cleanupResult.message
        });

      case 'mark_problematic':
        if (!instanceId) {
          return NextResponse.json({
            success: false,
            error: 'Instance ID is required for mark_problematic action'
          }, { status: 400 });
        }

        markInstanceAsProblematic(instanceId);
        
        return NextResponse.json({
          success: true,
          message: `Instance ${instanceId} marked as problematic`,
          instanceId
        });

      case 'unmark_problematic':
        if (!instanceId) {
          return NextResponse.json({
            success: false,
            error: 'Instance ID is required for unmark_problematic action'
          }, { status: 400 });
        }

        unmarkInstanceAsProblematic(instanceId);
        
        return NextResponse.json({
          success: true,
          message: `Instance ${instanceId} unmarked as problematic`,
          instanceId
        });

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}. Valid actions: reset_instance, emergency_cleanup, mark_problematic, unmark_problematic`
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error in emergency reset:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to perform emergency reset operation'
    }, { status: 500 });
  }
}

/**
 * GET /api/admin/instances/emergency-reset
 * Get list of problematic instances
 */
export async function GET() {
  try {
    const problematicInstances = await getProblematicInstances();
    
    return NextResponse.json({
      success: true,
      instances: problematicInstances,
      count: problematicInstances.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting problematic instances:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/instances/emergency-reset
 * Force delete problematic instance (emergency only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId');

    if (!instanceId) {
      return NextResponse.json({
        success: false,
        error: 'Instance ID is required'
      }, { status: 400 });
    }

    console.log('🗑️ Emergency delete requested for instance:', instanceId);

    // Only allow deletion of known problematic instances
    if (!isProblematicInstance(instanceId)) {
      return NextResponse.json({
        success: false,
        error: 'Instance is not marked as problematic. Use mark_problematic first.'
      }, { status: 403 });
    }

    // Import Supabase client
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    // Delete the instance
    const { error } = await supabase
      .from('whatsapp_instances_simple')
      .delete()
      .eq('id', instanceId);

    if (error) {
      throw error;
    }

    // Remove from problematic list
    unmarkInstanceAsProblematic(instanceId);

    return NextResponse.json({
      success: true,
      message: `Instance ${instanceId} deleted successfully`,
      instanceId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in emergency delete:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
