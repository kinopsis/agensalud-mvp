/**
 * WhatsApp State Synchronization Service
 * 
 * Ensures consistency between Evolution API state and local database state.
 * Resolves conflicts with Evolution API as the source of truth.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { createEvolutionAPIService } from './EvolutionAPIService';
import { createClient } from '@/lib/supabase/client';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface SyncResult {
  synced: boolean;
  changed: boolean;
  newState?: string;
  error?: string;
  conflicts?: StateConflict[];
}

interface StateConflict {
  field: string;
  evolutionValue: any;
  databaseValue: any;
  resolution: 'evolution_wins' | 'database_wins' | 'manual_required';
}

interface InstanceState {
  id: string;
  instanceName: string;
  status: string;
  evolutionState?: any;
  lastSync?: string;
  config?: any;
}

interface SyncConfig {
  syncInterval: number;
  conflictResolution: 'evolution_priority' | 'database_priority' | 'manual';
  retryAttempts: number;
  retryDelay: number;
}

// =====================================================
// STATE SYNCHRONIZATION SERVICE
// =====================================================

/**
 * Manages bidirectional state synchronization between Evolution API and database
 */
export class WhatsAppStateSyncService {
  private static instance: WhatsAppStateSyncService;
  private syncIntervals = new Map<string, NodeJS.Timeout>();
  private lastSyncTimes = new Map<string, number>();
  
  private readonly config: SyncConfig = {
    syncInterval: 30000,        // Sync every 30 seconds
    conflictResolution: 'evolution_priority', // Evolution API is source of truth
    retryAttempts: 3,
    retryDelay: 5000
  };

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): WhatsAppStateSyncService {
    if (!WhatsAppStateSyncService.instance) {
      WhatsAppStateSyncService.instance = new WhatsAppStateSyncService();
    }
    return WhatsAppStateSyncService.instance;
  }

  /**
   * Start continuous state synchronization for an instance
   */
  startContinuousSync(instanceId: string, instanceName: string): void {
    // Stop existing sync if running
    this.stopContinuousSync(instanceId);

    console.log(`🔄 Starting continuous state sync for instance ${instanceId} (${instanceName})`);

    // Perform initial sync
    this.syncInstanceState(instanceId, instanceName);

    // Set up periodic sync
    const intervalId = setInterval(() => {
      this.syncInstanceState(instanceId, instanceName);
    }, this.config.syncInterval);

    this.syncIntervals.set(instanceId, intervalId);
  }

  /**
   * Stop continuous synchronization for an instance
   */
  stopContinuousSync(instanceId: string): void {
    const intervalId = this.syncIntervals.get(instanceId);
    if (intervalId) {
      clearInterval(intervalId);
      this.syncIntervals.delete(instanceId);
      console.log(`🛑 Stopped continuous state sync for instance ${instanceId}`);
    }
  }

  /**
   * Perform one-time state synchronization for an instance
   */
  async syncInstanceState(instanceId: string, instanceName?: string): Promise<SyncResult> {
    try {
      console.log(`🔄 Syncing state for instance ${instanceId}`);

      // Get database state
      const dbState = await this.getDBInstanceState(instanceId);
      if (!dbState) {
        return { synced: false, error: 'Instance not found in database' };
      }

      const actualInstanceName = instanceName || dbState.instanceName;
      if (!actualInstanceName) {
        return { synced: false, error: 'Instance name not available' };
      }

      // Get Evolution API state with retry
      const evolutionState = await this.getEvolutionStateWithRetry(actualInstanceName);
      if (!evolutionState) {
        return { synced: false, error: 'Failed to get Evolution API state' };
      }

      // Compare states and detect conflicts
      const conflicts = this.detectStateConflicts(dbState, evolutionState);
      
      if (conflicts.length === 0) {
        // States are in sync
        this.lastSyncTimes.set(instanceId, Date.now());
        return { synced: true, changed: false };
      }

      console.log(`⚠️ State conflicts detected for instance ${instanceId}:`, conflicts);

      // Resolve conflicts based on configuration
      const resolvedState = this.resolveStateConflicts(dbState, evolutionState, conflicts);

      // Update database with resolved state
      const updateResult = await this.updateDBInstanceState(instanceId, resolvedState);
      
      if (updateResult.success) {
        this.lastSyncTimes.set(instanceId, Date.now());
        console.log(`✅ State synchronized for instance ${instanceId}: ${dbState.status} → ${resolvedState.status}`);
        
        return {
          synced: true,
          changed: true,
          newState: resolvedState.status,
          conflicts
        };
      } else {
        return { synced: false, error: updateResult.error };
      }

    } catch (error) {
      console.error(`❌ State sync failed for instance ${instanceId}:`, error);
      return { 
        synced: false, 
        error: error instanceof Error ? error.message : 'Unknown sync error' 
      };
    }
  }

  /**
   * Force sync all active instances
   */
  async syncAllInstances(): Promise<{ [instanceId: string]: SyncResult }> {
    try {
      const supabase = createClient();
      
      // Get all active WhatsApp instances
      const { data: instances, error } = await supabase
        .from('channel_instances')
        .select('id, instance_name, status, config')
        .eq('channel_type', 'whatsapp')
        .in('status', ['connecting', 'connected', 'disconnected']);

      if (error) {
        throw new Error(`Failed to get instances: ${error.message}`);
      }

      const results: { [instanceId: string]: SyncResult } = {};

      // Sync each instance
      for (const instance of instances || []) {
        const instanceName = instance.config?.whatsapp?.evolution_api?.instance_name || instance.instance_name;
        results[instance.id] = await this.syncInstanceState(instance.id, instanceName);
      }

      return results;
    } catch (error) {
      console.error('❌ Failed to sync all instances:', error);
      throw error;
    }
  }

  /**
   * Get sync status for an instance
   */
  getSyncStatus(instanceId: string): {
    isActive: boolean;
    lastSync?: number;
    timeSinceLastSync?: number;
  } {
    const isActive = this.syncIntervals.has(instanceId);
    const lastSync = this.lastSyncTimes.get(instanceId);
    const timeSinceLastSync = lastSync ? Date.now() - lastSync : undefined;

    return { isActive, lastSync, timeSinceLastSync };
  }

  // =====================================================
  // PRIVATE METHODS
  // =====================================================

  /**
   * Get instance state from database
   */
  private async getDBInstanceState(instanceId: string): Promise<InstanceState | null> {
    try {
      const supabase = createClient();
      
      const { data: instance, error } = await supabase
        .from('channel_instances')
        .select('id, instance_name, status, config, updated_at')
        .eq('id', instanceId)
        .single();

      if (error || !instance) {
        console.error(`❌ Failed to get DB state for instance ${instanceId}:`, error);
        return null;
      }

      return {
        id: instance.id,
        instanceName: instance.instance_name,
        status: instance.status,
        config: instance.config,
        lastSync: instance.updated_at
      };
    } catch (error) {
      console.error(`❌ Error getting DB state for instance ${instanceId}:`, error);
      return null;
    }
  }

  /**
   * Get Evolution API state with retry logic
   */
  private async getEvolutionStateWithRetry(instanceName: string): Promise<any | null> {
    const evolutionAPI = createEvolutionAPIService();
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const state = await evolutionAPI.getInstanceStatus(instanceName);
        return state;
      } catch (error) {
        console.warn(`⚠️ Evolution API state fetch attempt ${attempt}/${this.config.retryAttempts} failed:`, error.message);
        
        if (attempt < this.config.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      }
    }

    return null;
  }

  /**
   * Detect conflicts between database and Evolution API states
   */
  private detectStateConflicts(dbState: InstanceState, evolutionState: any): StateConflict[] {
    const conflicts: StateConflict[] = [];

    // Map Evolution API state to database status
    const mappedEvolutionStatus = this.mapEvolutionStateToDBStatus(evolutionState.state);

    // Check status conflict
    if (dbState.status !== mappedEvolutionStatus) {
      conflicts.push({
        field: 'status',
        evolutionValue: mappedEvolutionStatus,
        databaseValue: dbState.status,
        resolution: 'evolution_wins'
      });
    }

    return conflicts;
  }

  /**
   * Resolve state conflicts based on configuration
   */
  private resolveStateConflicts(
    dbState: InstanceState, 
    evolutionState: any, 
    conflicts: StateConflict[]
  ): Partial<InstanceState> {
    const resolvedState: Partial<InstanceState> = {};

    for (const conflict of conflicts) {
      switch (this.config.conflictResolution) {
        case 'evolution_priority':
          resolvedState[conflict.field as keyof InstanceState] = conflict.evolutionValue;
          break;
        case 'database_priority':
          resolvedState[conflict.field as keyof InstanceState] = conflict.databaseValue;
          break;
        case 'manual':
          // For manual resolution, log the conflict and keep database value
          console.warn(`🔧 Manual resolution required for ${conflict.field}:`, conflict);
          resolvedState[conflict.field as keyof InstanceState] = conflict.databaseValue;
          break;
      }
    }

    // Always update sync metadata
    resolvedState.evolutionState = evolutionState;
    resolvedState.lastSync = new Date().toISOString();

    return resolvedState;
  }

  /**
   * Update database instance state
   */
  private async updateDBInstanceState(
    instanceId: string, 
    newState: Partial<InstanceState>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      // Prepare update data
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (newState.status) {
        updateData.status = newState.status;
      }

      if (newState.evolutionState || newState.lastSync) {
        // Update config with sync metadata
        const { data: currentInstance } = await supabase
          .from('channel_instances')
          .select('config')
          .eq('id', instanceId)
          .single();

        const currentConfig = currentInstance?.config || {};
        updateData.config = {
          ...currentConfig,
          whatsapp: {
            ...currentConfig.whatsapp,
            sync: {
              last_sync: newState.lastSync,
              evolution_state: newState.evolutionState,
              sync_version: Date.now()
            }
          }
        };
      }

      const { error } = await supabase
        .from('channel_instances')
        .update(updateData)
        .eq('id', instanceId);

      if (error) {
        console.error(`❌ Failed to update DB state for instance ${instanceId}:`, error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error(`❌ Error updating DB state for instance ${instanceId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown update error' 
      };
    }
  }

  /**
   * Map Evolution API state to database status
   */
  private mapEvolutionStateToDBStatus(evolutionState: string): string {
    switch (evolutionState) {
      case 'open':
        return 'connected';
      case 'connecting':
        return 'connecting';
      case 'close':
      case 'closed':
        return 'disconnected';
      default:
        return 'error';
    }
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

/**
 * Get the state sync service instance
 */
export const getStateSyncService = () => WhatsAppStateSyncService.getInstance();

/**
 * Convenience function to start state sync
 */
export const startStateSync = (instanceId: string, instanceName: string) => {
  getStateSyncService().startContinuousSync(instanceId, instanceName);
};

/**
 * Convenience function to stop state sync
 */
export const stopStateSync = (instanceId: string) => {
  getStateSyncService().stopContinuousSync(instanceId);
};

/**
 * Convenience function to sync instance state once
 */
export const syncInstanceState = (instanceId: string, instanceName?: string) => {
  return getStateSyncService().syncInstanceState(instanceId, instanceName);
};

// Debug function for development
if (typeof window !== 'undefined') {
  (window as any).stateSyncService = getStateSyncService();
}
