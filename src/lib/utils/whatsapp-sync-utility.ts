/**
 * WhatsApp Instance Synchronization Utility
 * 
 * Utility for synchronizing WhatsApp instances between Evolution API v2 
 * and the application database. Handles state reconciliation and cleanup.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { createClient } from '@/lib/supabase/server';
import { createEvolutionAPIService } from '@/lib/services/EvolutionAPIService';
import type { WhatsAppInstance } from '@/types/whatsapp';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface SyncResult {
  success: boolean;
  synchronized: number;
  created: number;
  updated: number;
  errors: string[];
  details: {
    evolutionInstances: number;
    databaseInstances: number;
    orphanedInDatabase: string[];
    orphanedInEvolution: string[];
  };
}

export interface InstanceSyncStatus {
  instanceName: string;
  inEvolution: boolean;
  inDatabase: boolean;
  evolutionStatus?: string;
  databaseStatus?: string;
  needsSync: boolean;
  action: 'create_in_db' | 'update_db' | 'delete_from_db' | 'create_in_evolution' | 'none';
}

// =====================================================
// SYNCHRONIZATION SERVICE
// =====================================================

export class WhatsAppSyncUtility {
  private supabase;
  private evolutionAPI;

  constructor() {
    this.evolutionAPI = createEvolutionAPIService();
  }

  /**
   * Initialize Supabase client
   */
  private async initSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  /**
   * Synchronize all WhatsApp instances between Evolution API and database
   */
  async syncAllInstances(organizationId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      synchronized: 0,
      created: 0,
      updated: 0,
      errors: [],
      details: {
        evolutionInstances: 0,
        databaseInstances: 0,
        orphanedInDatabase: [],
        orphanedInEvolution: []
      }
    };

    try {
      const supabase = await this.initSupabase();

      // Get instances from both sources
      const [evolutionInstances, databaseInstances] = await Promise.all([
        this.evolutionAPI.fetchAllInstances(),
        this.getDatabaseInstances(organizationId)
      ]);

      result.details.evolutionInstances = evolutionInstances.length;
      result.details.databaseInstances = databaseInstances.length;

      // Analyze sync status for each instance
      const syncStatuses = this.analyzeSyncStatus(evolutionInstances, databaseInstances);

      // Perform synchronization actions
      for (const status of syncStatuses) {
        try {
          await this.performSyncAction(status, organizationId);
          
          switch (status.action) {
            case 'create_in_db':
              result.created++;
              break;
            case 'update_db':
              result.updated++;
              break;
            case 'delete_from_db':
              result.updated++;
              break;
            default:
              break;
          }
          
          result.synchronized++;
        } catch (error) {
          const errorMsg = `Failed to sync ${status.instanceName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // Identify orphaned instances
      result.details.orphanedInDatabase = syncStatuses
        .filter(s => s.action === 'delete_from_db')
        .map(s => s.instanceName);

      result.details.orphanedInEvolution = syncStatuses
        .filter(s => s.action === 'create_in_evolution')
        .map(s => s.instanceName);

      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Get database instances for organization
   */
  private async getDatabaseInstances(organizationId: string): Promise<WhatsAppInstance[]> {
    const supabase = await this.initSupabase();
    
    const { data: instances, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(`Failed to fetch database instances: ${error.message}`);
    }

    return instances || [];
  }

  /**
   * Analyze sync status between Evolution API and database instances
   */
  private analyzeSyncStatus(
    evolutionInstances: any[], 
    databaseInstances: WhatsAppInstance[]
  ): InstanceSyncStatus[] {
    const statuses: InstanceSyncStatus[] = [];
    const evolutionNames = new Set(evolutionInstances.map(i => i.name));
    const databaseNames = new Set(databaseInstances.map(i => i.instance_name));

    // Check Evolution instances
    for (const evolutionInstance of evolutionInstances) {
      const inDatabase = databaseNames.has(evolutionInstance.name);
      const dbInstance = databaseInstances.find(i => i.instance_name === evolutionInstance.name);

      statuses.push({
        instanceName: evolutionInstance.name,
        inEvolution: true,
        inDatabase,
        evolutionStatus: evolutionInstance.connectionStatus,
        databaseStatus: dbInstance?.status || undefined,
        needsSync: !inDatabase || (dbInstance?.status !== evolutionInstance.connectionStatus),
        action: !inDatabase ? 'create_in_db' : 
                (dbInstance?.status !== evolutionInstance.connectionStatus ? 'update_db' : 'none')
      });
    }

    // Check database instances not in Evolution
    for (const dbInstance of databaseInstances) {
      if (!evolutionNames.has(dbInstance.instance_name)) {
        statuses.push({
          instanceName: dbInstance.instance_name,
          inEvolution: false,
          inDatabase: true,
          databaseStatus: dbInstance.status || undefined,
          needsSync: true,
          action: 'delete_from_db'
        });
      }
    }

    return statuses;
  }

  /**
   * Perform synchronization action for a specific instance
   */
  private async performSyncAction(status: InstanceSyncStatus, organizationId: string): Promise<void> {
    const supabase = await this.initSupabase();

    switch (status.action) {
      case 'create_in_db':
        await this.createDatabaseInstance(status, organizationId);
        break;

      case 'update_db':
        await this.updateDatabaseInstance(status);
        break;

      case 'delete_from_db':
        await this.deleteDatabaseInstance(status);
        break;

      case 'none':
        // No action needed
        break;

      default:
        console.warn(`Unknown sync action: ${status.action}`);
    }
  }

  /**
   * Create database instance from Evolution API data
   */
  private async createDatabaseInstance(status: InstanceSyncStatus, organizationId: string): Promise<void> {
    const supabase = await this.initSupabase();
    
    // Get detailed instance info from Evolution API
    const evolutionInstance = await this.evolutionAPI.getInstanceInfo(status.instanceName);

    const { error } = await supabase
      .from('whatsapp_instances')
      .insert({
        organization_id: organizationId,
        instance_name: status.instanceName,
        phone_number: evolutionInstance.number || '',
        status: this.mapEvolutionStatusToDatabase(status.evolutionStatus || 'inactive'),
        evolution_api_config: {
          instance_name: status.instanceName,
          apikey: evolutionInstance.token
        },
        session_data: {
          evolutionInstanceName: status.instanceName,
          syncedAt: new Date().toISOString()
        }
      });

    if (error) {
      throw new Error(`Failed to create database instance: ${error.message}`);
    }
  }

  /**
   * Update database instance status
   */
  private async updateDatabaseInstance(status: InstanceSyncStatus): Promise<void> {
    const supabase = await this.initSupabase();

    const { error } = await supabase
      .from('whatsapp_instances')
      .update({
        status: this.mapEvolutionStatusToDatabase(status.evolutionStatus || 'inactive'),
        updated_at: new Date().toISOString()
      })
      .eq('instance_name', status.instanceName);

    if (error) {
      throw new Error(`Failed to update database instance: ${error.message}`);
    }
  }

  /**
   * Delete orphaned database instance
   */
  private async deleteDatabaseInstance(status: InstanceSyncStatus): Promise<void> {
    const supabase = await this.initSupabase();

    const { error } = await supabase
      .from('whatsapp_instances')
      .delete()
      .eq('instance_name', status.instanceName);

    if (error) {
      throw new Error(`Failed to delete database instance: ${error.message}`);
    }
  }

  /**
   * Map Evolution API status to database status
   */
  private mapEvolutionStatusToDatabase(evolutionStatus: string): string {
    switch (evolutionStatus) {
      case 'open':
        return 'active';
      case 'connecting':
        return 'connecting';
      case 'close':
        return 'inactive';
      default:
        return 'inactive';
    }
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Create and execute sync utility
 */
export async function syncWhatsAppInstances(organizationId: string): Promise<SyncResult> {
  const syncUtility = new WhatsAppSyncUtility();
  return await syncUtility.syncAllInstances(organizationId);
}

export default WhatsAppSyncUtility;
