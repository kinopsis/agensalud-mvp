/**
 * WhatsApp Audit Logs Migration
 * 
 * Utilities for migrating WhatsApp audit logs to the unified channel audit format
 * and maintaining compatibility between legacy and unified audit systems.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// =====================================================
// AUDIT LOG MIGRATION UTILITIES
// =====================================================

/**
 * Migrate WhatsApp audit logs to unified channel audit format
 */
export async function migrateWhatsAppAuditLogs(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ migrated: number; errors: string[] }> {
  const errors: string[] = [];
  let migrated = 0;

  try {
    console.log('🔄 Starting WhatsApp audit logs migration...');

    // Get existing WhatsApp audit logs
    const { data: existingLogs, error } = await supabase
      .from('whatsapp_audit_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('timestamp', { ascending: true });

    if (error) {
      errors.push(`Failed to fetch existing audit logs: ${error.message}`);
      return { migrated, errors };
    }

    if (!existingLogs || existingLogs.length === 0) {
      console.log('ℹ️ No existing WhatsApp audit logs to migrate');
      return { migrated, errors };
    }

    // Process logs in batches
    const batchSize = 100;
    for (let i = 0; i < existingLogs.length; i += batchSize) {
      const batch = existingLogs.slice(i, i + batchSize);
      
      try {
        const unifiedLogs = batch.map(log => convertToUnifiedAuditLog(log));
        
        // Insert into unified audit logs table
        const { error: insertError } = await supabase
          .from('channel_audit_logs')
          .insert(unifiedLogs);

        if (insertError) {
          errors.push(`Failed to insert batch ${i / batchSize + 1}: ${insertError.message}`);
          continue;
        }

        migrated += batch.length;
        console.log(`✅ Migrated batch ${i / batchSize + 1}: ${batch.length} logs`);

      } catch (batchError) {
        errors.push(`Error processing batch ${i / batchSize + 1}: ${batchError}`);
      }
    }

    console.log(`🎉 Migration completed: ${migrated} logs migrated, ${errors.length} errors`);

  } catch (error) {
    errors.push(`Migration failed: ${error}`);
  }

  return { migrated, errors };
}

/**
 * Convert WhatsApp audit log to unified channel audit log format
 */
function convertToUnifiedAuditLog(whatsappLog: any): any {
  return {
    id: whatsappLog.id, // Keep same ID for reference
    organization_id: whatsappLog.organization_id,
    channel_type: 'whatsapp',
    instance_id: whatsappLog.whatsapp_instance_id,
    conversation_id: whatsappLog.conversation_id,
    action: whatsappLog.action,
    actor_id: whatsappLog.actor_id,
    actor_type: whatsappLog.actor_type,
    details: {
      ...whatsappLog.details,
      migrated_from: 'whatsapp_audit_logs',
      original_timestamp: whatsappLog.timestamp
    },
    timestamp: whatsappLog.timestamp,
    created_at: whatsappLog.created_at || whatsappLog.timestamp,
    updated_at: whatsappLog.updated_at || whatsappLog.timestamp
  };
}

/**
 * Create unified audit log entry with backward compatibility
 */
export async function createUnifiedAuditLog(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    channelType: 'whatsapp';
    instanceId: string;
    conversationId?: string;
    action: string;
    actorId?: string;
    actorType: 'patient' | 'admin' | 'system' | 'doctor' | 'staff';
    details: Record<string, any>;
  }
): Promise<void> {
  try {
    // Create unified audit log
    const { error: unifiedError } = await supabase.rpc('create_channel_audit_log', {
      p_organization_id: params.organizationId,
      p_channel_type: params.channelType,
      p_instance_id: params.instanceId,
      p_conversation_id: params.conversationId || null,
      p_action: params.action,
      p_actor_id: params.actorId || null,
      p_actor_type: params.actorType,
      p_details: params.details
    });

    if (unifiedError) {
      console.error('Failed to create unified audit log:', unifiedError);
    }

    // Also create legacy audit log for backward compatibility
    const { error: legacyError } = await supabase.rpc('create_whatsapp_audit_log', {
      p_organization_id: params.organizationId,
      p_conversation_id: params.conversationId || null,
      p_action: params.action,
      p_actor_id: params.actorId || null,
      p_actor_type: params.actorType,
      p_whatsapp_instance_id: params.instanceId,
      p_details: {
        ...params.details,
        unified_audit_created: true
      }
    });

    if (legacyError) {
      console.warn('Failed to create legacy audit log (non-critical):', legacyError);
    }

  } catch (error) {
    console.error('Error creating audit logs:', error);
  }
}

/**
 * Validate audit log migration integrity
 */
export async function validateAuditMigrationIntegrity(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = [];

  try {
    // Check if all WhatsApp audit logs have corresponding unified logs
    const { data: whatsappLogs } = await supabase
      .from('whatsapp_audit_logs')
      .select('id, action, timestamp')
      .eq('organization_id', organizationId);

    const { data: unifiedLogs } = await supabase
      .from('channel_audit_logs')
      .select('id, action, timestamp')
      .eq('organization_id', organizationId)
      .eq('channel_type', 'whatsapp');

    const whatsappIds = new Set(whatsappLogs?.map(log => log.id) || []);
    const unifiedIds = new Set(unifiedLogs?.map(log => log.id) || []);

    // Check for missing migrations
    for (const id of whatsappIds) {
      if (!unifiedIds.has(id)) {
        issues.push(`WhatsApp audit log ${id} not migrated to unified format`);
      }
    }

    // Check for orphaned unified logs
    for (const id of unifiedIds) {
      if (!whatsappIds.has(id)) {
        const log = unifiedLogs?.find(l => l.id === id);
        if (log && !log.details?.migrated_from) {
          issues.push(`Unified audit log ${id} has no corresponding WhatsApp log`);
        }
      }
    }

    // Check for timestamp consistency
    const whatsappCount = whatsappLogs?.length || 0;
    const unifiedCount = unifiedLogs?.length || 0;
    
    if (Math.abs(whatsappCount - unifiedCount) > whatsappCount * 0.1) {
      issues.push(`Significant count mismatch: ${whatsappCount} WhatsApp logs vs ${unifiedCount} unified logs`);
    }

  } catch (error) {
    issues.push(`Validation failed: ${error}`);
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Get audit logs in unified format with legacy fallback
 */
export async function getUnifiedAuditLogs(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    channelType?: 'whatsapp';
    instanceId?: string;
    conversationId?: string;
    action?: string;
    actorType?: string;
    limit?: number;
    offset?: number;
  }
): Promise<any[]> {
  try {
    // Try to get from unified audit logs first
    let query = supabase
      .from('channel_audit_logs')
      .select('*')
      .eq('organization_id', params.organizationId);

    if (params.channelType) {
      query = query.eq('channel_type', params.channelType);
    }

    if (params.instanceId) {
      query = query.eq('instance_id', params.instanceId);
    }

    if (params.conversationId) {
      query = query.eq('conversation_id', params.conversationId);
    }

    if (params.action) {
      query = query.eq('action', params.action);
    }

    if (params.actorType) {
      query = query.eq('actor_type', params.actorType);
    }

    query = query
      .order('timestamp', { ascending: false })
      .limit(params.limit || 50)
      .range(params.offset || 0, (params.offset || 0) + (params.limit || 50) - 1);

    const { data: unifiedLogs, error } = await query;

    if (error) {
      console.warn('Failed to get unified audit logs, falling back to legacy:', error);
      return getLegacyAuditLogs(supabase, params);
    }

    return unifiedLogs || [];

  } catch (error) {
    console.warn('Error getting unified audit logs, falling back to legacy:', error);
    return getLegacyAuditLogs(supabase, params);
  }
}

/**
 * Get legacy WhatsApp audit logs as fallback
 */
async function getLegacyAuditLogs(
  supabase: SupabaseClient,
  params: any
): Promise<any[]> {
  try {
    let query = supabase
      .from('whatsapp_audit_logs')
      .select('*')
      .eq('organization_id', params.organizationId);

    if (params.instanceId) {
      query = query.eq('whatsapp_instance_id', params.instanceId);
    }

    if (params.conversationId) {
      query = query.eq('conversation_id', params.conversationId);
    }

    if (params.action) {
      query = query.eq('action', params.action);
    }

    if (params.actorType) {
      query = query.eq('actor_type', params.actorType);
    }

    query = query
      .order('timestamp', { ascending: false })
      .limit(params.limit || 50)
      .range(params.offset || 0, (params.offset || 0) + (params.limit || 50) - 1);

    const { data: legacyLogs, error } = await query;

    if (error) {
      console.error('Failed to get legacy audit logs:', error);
      return [];
    }

    // Convert to unified format
    return (legacyLogs || []).map(log => ({
      ...log,
      channel_type: 'whatsapp',
      instance_id: log.whatsapp_instance_id,
      legacy_source: true
    }));

  } catch (error) {
    console.error('Error getting legacy audit logs:', error);
    return [];
  }
}

export default {
  migrateWhatsAppAuditLogs,
  createUnifiedAuditLog,
  validateAuditMigrationIntegrity,
  getUnifiedAuditLogs
};
