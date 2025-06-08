/**
 * Admin Monitoring Cleanup API
 * 
 * Emergency endpoint to stop infinite monitoring loops and clean up problematic instances.
 * This endpoint provides manual control over the monitoring system for troubleshooting.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';

// Global monitoring registry for cleanup operations
let globalMonitoringRegistry: any = null;

try {
  // Import monitoring registry if available
  const registryModule = require('@/lib/monitoring/MonitoringRegistry');
  globalMonitoringRegistry = registryModule.monitoringRegistry;
} catch (error) {
  console.warn('MonitoringRegistry not available for cleanup operations');
}

/**
 * POST /api/admin/monitoring/cleanup
 * Stop monitoring for specific instances or all instances
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, instanceId, force = false } = body;

    console.log('🧹 Monitoring cleanup requested:', { action, instanceId, force });

    const results: any = {
      success: true,
      action,
      instanceId,
      operations: []
    };

    switch (action) {
      case 'stop_instance':
        if (!instanceId) {
          return NextResponse.json({
            success: false,
            error: 'Instance ID is required for stop_instance action'
          }, { status: 400 });
        }

        // Stop monitoring for specific instance
        if (globalMonitoringRegistry) {
          const stopped = globalMonitoringRegistry.forceStop(instanceId);
          results.operations.push({
            type: 'stop_monitoring',
            instanceId,
            success: stopped,
            message: stopped ? 'Monitoring stopped successfully' : 'Instance not found in registry'
          });
        }

        // Clear any intervals for this instance
        const clearedIntervals = clearInstanceIntervals(instanceId);
        results.operations.push({
          type: 'clear_intervals',
          instanceId,
          count: clearedIntervals,
          message: `Cleared ${clearedIntervals} intervals`
        });

        break;

      case 'stop_all':
        // Stop all monitoring
        if (globalMonitoringRegistry) {
          const allInstances = globalMonitoringRegistry.getAllInstances();
          let stoppedCount = 0;

          for (const instance of allInstances) {
            const stopped = globalMonitoringRegistry.forceStop(instance.instanceId);
            if (stopped) stoppedCount++;
          }

          results.operations.push({
            type: 'stop_all_monitoring',
            count: stoppedCount,
            total: allInstances.length,
            message: `Stopped monitoring for ${stoppedCount}/${allInstances.length} instances`
          });
        }

        // Clear all intervals
        const totalCleared = clearAllIntervals();
        results.operations.push({
          type: 'clear_all_intervals',
          count: totalCleared,
          message: `Cleared ${totalCleared} total intervals`
        });

        break;

      case 'reset_problematic':
        // Reset problematic instances list
        if (globalMonitoringRegistry) {
          globalMonitoringRegistry.resetProblematicInstances();
          results.operations.push({
            type: 'reset_problematic',
            message: 'Problematic instances list reset'
          });
        }

        break;

      case 'status':
        // Get monitoring status
        if (globalMonitoringRegistry) {
          const status = globalMonitoringRegistry.getStatus();
          results.status = status;
          results.operations.push({
            type: 'get_status',
            message: 'Status retrieved successfully'
          });
        }

        break;

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}. Valid actions: stop_instance, stop_all, reset_problematic, status`
        }, { status: 400 });
    }

    console.log('✅ Monitoring cleanup completed:', results);

    return NextResponse.json(results);

  } catch (error) {
    console.error('❌ Error in monitoring cleanup:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to perform monitoring cleanup operation'
    }, { status: 500 });
  }
}

/**
 * GET /api/admin/monitoring/cleanup
 * Get current monitoring status
 */
export async function GET() {
  try {
    const status: any = {
      success: true,
      timestamp: new Date().toISOString(),
      monitoring_registry_available: !!globalMonitoringRegistry
    };

    if (globalMonitoringRegistry) {
      status.registry_status = globalMonitoringRegistry.getStatus();
      status.active_instances = globalMonitoringRegistry.getAllInstances();
    }

    // Get Node.js process information
    status.process_info = {
      pid: process.pid,
      memory_usage: process.memoryUsage(),
      uptime: process.uptime()
    };

    return NextResponse.json(status);

  } catch (error) {
    console.error('❌ Error getting monitoring status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Clear intervals for a specific instance
 */
function clearInstanceIntervals(instanceId: string): number {
  let clearedCount = 0;

  // This is a simplified approach - in a real implementation,
  // you would need access to the actual interval IDs
  // For now, we'll just log the attempt
  console.log(`🧹 Attempting to clear intervals for instance: ${instanceId}`);
  
  // In a production system, you would maintain a registry of interval IDs
  // and clear them here
  
  return clearedCount;
}

/**
 * Clear all intervals (emergency cleanup)
 */
function clearAllIntervals(): number {
  let clearedCount = 0;

  // This is an emergency function that would clear all known intervals
  console.log('🧹 Emergency: Attempting to clear all intervals');
  
  // In a production system, you would have a global registry of all intervals
  // and clear them here
  
  return clearedCount;
}
