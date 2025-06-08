/**
 * Instance State Manager
 * 
 * Utility for managing WhatsApp instance states and recovering from problematic states.
 * Provides functions to detect, reset, and recover instances that are stuck in infinite loops.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { createClient } from '@/lib/supabase/server';

// =====================================================
// TYPES
// =====================================================

export interface InstanceStateInfo {
  id: string;
  status: string;
  display_name: string;
  created_at: string;
  updated_at: string;
  last_activity?: string;
  error_count?: number;
  is_problematic?: boolean;
}

export interface StateResetResult {
  success: boolean;
  instanceId: string;
  previousState: string;
  newState: string;
  message: string;
  timestamp: string;
}

// =====================================================
// PROBLEMATIC INSTANCE DETECTION
// =====================================================

/**
 * List of known problematic instances that cause infinite loops
 */
const PROBLEMATIC_INSTANCES = [
  'bc3f6952-378a-4dc4-9d1e-1e8f8f426967',
  'kinopsis',
  '927cecbe-hhghg',
  '927cecbe-polopolo',
  '927cecbe-pticavisualcarwhatsa',
  '693b032b-bdd2-4ae4-91eb-83a031aef568'
];

/**
 * Check if an instance is known to be problematic
 */
export function isProblematicInstance(instanceId: string): boolean {
  return PROBLEMATIC_INSTANCES.some(problematic => instanceId.includes(problematic));
}

/**
 * Add an instance to the problematic list
 */
export function markInstanceAsProblematic(instanceId: string): void {
  if (!isProblematicInstance(instanceId)) {
    PROBLEMATIC_INSTANCES.push(instanceId);
    console.log(`🚨 Instance ${instanceId} marked as problematic`);
  }
}

/**
 * Remove an instance from the problematic list
 */
export function unmarkInstanceAsProblematic(instanceId: string): void {
  const index = PROBLEMATIC_INSTANCES.findIndex(problematic => instanceId.includes(problematic));
  if (index > -1) {
    PROBLEMATIC_INSTANCES.splice(index, 1);
    console.log(`✅ Instance ${instanceId} unmarked as problematic`);
  }
}

// =====================================================
// STATE MANAGEMENT FUNCTIONS
// =====================================================

/**
 * Get current state of an instance
 */
export async function getInstanceState(instanceId: string): Promise<InstanceStateInfo | null> {
  try {
    const supabase = await createClient();
    
    const { data: instance, error } = await supabase
      .from('whatsapp_instances_simple')
      .select('*')
      .eq('id', instanceId)
      .single();

    if (error || !instance) {
      return null;
    }

    return {
      id: instance.id,
      status: instance.status,
      display_name: instance.display_name,
      created_at: instance.created_at,
      updated_at: instance.updated_at,
      last_activity: instance.last_activity,
      is_problematic: isProblematicInstance(instanceId)
    };

  } catch (error) {
    console.error('Error getting instance state:', error);
    return null;
  }
}

/**
 * Reset instance to a safe state
 */
export async function resetInstanceState(
  instanceId: string, 
  targetState: 'disconnected' | 'error' = 'disconnected'
): Promise<StateResetResult> {
  try {
    const supabase = await createClient();
    
    // Get current state
    const currentState = await getInstanceState(instanceId);
    const previousState = currentState?.status || 'unknown';

    // Update instance to safe state
    const { error } = await supabase
      .from('whatsapp_instances_simple')
      .update({
        status: targetState,
        updated_at: new Date().toISOString(),
        error_message: targetState === 'error' 
          ? 'Instance reset due to problematic state' 
          : null
      })
      .eq('id', instanceId);

    if (error) {
      throw error;
    }

    const result: StateResetResult = {
      success: true,
      instanceId,
      previousState,
      newState: targetState,
      message: `Instance successfully reset from ${previousState} to ${targetState}`,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Instance state reset:', result);
    return result;

  } catch (error) {
    const result: StateResetResult = {
      success: false,
      instanceId,
      previousState: 'unknown',
      newState: targetState,
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };

    console.error('❌ Instance state reset failed:', result);
    return result;
  }
}

/**
 * Perform emergency cleanup for problematic instances
 */
export async function emergencyCleanup(): Promise<{
  success: boolean;
  results: StateResetResult[];
  message: string;
}> {
  console.log('🚨 Starting emergency cleanup for problematic instances...');
  
  const results: StateResetResult[] = [];
  
  try {
    // Reset all known problematic instances
    for (const instanceId of PROBLEMATIC_INSTANCES) {
      const result = await resetInstanceState(instanceId, 'error');
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    const message = `Emergency cleanup completed: ${successCount}/${results.length} instances reset successfully`;

    console.log('✅ Emergency cleanup completed:', message);

    return {
      success: true,
      results,
      message
    };

  } catch (error) {
    const message = `Emergency cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('❌ Emergency cleanup failed:', message);

    return {
      success: false,
      results,
      message
    };
  }
}

/**
 * Get all instances that might be in problematic states
 */
export async function getProblematicInstances(): Promise<InstanceStateInfo[]> {
  try {
    const supabase = await createClient();
    
    const { data: instances, error } = await supabase
      .from('whatsapp_instances_simple')
      .select('*')
      .in('status', ['connecting', 'error'])
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (instances || []).map(instance => ({
      id: instance.id,
      status: instance.status,
      display_name: instance.display_name,
      created_at: instance.created_at,
      updated_at: instance.updated_at,
      last_activity: instance.last_activity,
      is_problematic: isProblematicInstance(instance.id)
    }));

  } catch (error) {
    console.error('Error getting problematic instances:', error);
    return [];
  }
}

/**
 * Check if an instance should be automatically reset
 */
export function shouldAutoReset(instance: InstanceStateInfo): boolean {
  // Auto-reset if instance is problematic and in connecting state for too long
  if (instance.is_problematic && instance.status === 'connecting') {
    const updatedAt = new Date(instance.updated_at);
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceUpdate > 1; // Reset if connecting for more than 1 hour
  }

  return false;
}
