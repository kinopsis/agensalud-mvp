/**
 * Base Channel Service
 * 
 * Abstract base class for all channel services providing common functionality
 * and enforcing consistent interface across different communication channels.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ChannelType,
  ChannelInstance,
  ChannelInstanceConfig,
  ChannelStatus,
  IncomingMessage,
  OutgoingMessage,
  MessageProcessingResult,
  ChannelConversation,
  ConversationStatus,
  ChannelMetrics,
  ChannelService
} from '@/types/channels';

// =====================================================
// ABSTRACT BASE CLASS
// =====================================================

/**
 * BaseChannelService
 * 
 * Abstract base class that provides common functionality for all channel services.
 * Each specific channel (WhatsApp, Telegram, Voice) extends this class.
 */
export abstract class BaseChannelService implements ChannelService {
  protected supabase: SupabaseClient;
  protected organizationId: string;

  constructor(supabase: SupabaseClient, organizationId: string) {
    this.supabase = supabase;
    this.organizationId = organizationId;
  }

  // =====================================================
  // ABSTRACT METHODS (Must be implemented by subclasses)
  // =====================================================

  /**
   * Get the channel type for this service
   */
  abstract getChannelType(): ChannelType;

  /**
   * Validate channel-specific configuration
   */
  abstract validateConfig(config: ChannelInstanceConfig): Promise<{ valid: boolean; errors: string[] }>;

  /**
   * Connect to the external channel API
   */
  abstract connect(instance: ChannelInstance): Promise<void>;

  /**
   * Disconnect from the external channel API
   */
  abstract disconnect(instanceId: string): Promise<void>;

  /**
   * Send message through the channel's API
   */
  abstract sendMessage(instanceId: string, message: OutgoingMessage): Promise<void>;

  /**
   * Process incoming message from the channel
   */
  abstract processIncomingMessage(message: IncomingMessage): Promise<MessageProcessingResult>;

  /**
   * Get real-time status from the channel's API
   */
  abstract getExternalStatus(instanceId: string): Promise<ChannelStatus>;

  // =====================================================
  // COMMON IMPLEMENTATION (Shared across all channels)
  // =====================================================

  /**
   * Create a new channel instance
   */
  async createInstance(organizationId: string, config: ChannelInstanceConfig): Promise<ChannelInstance> {
    try {
      // Validate configuration
      const validation = await this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      // Check if this is a two-step flow (skipConnection)
      const skipConnection = (config as any).metadata?.skipConnection ||
                           (config as any).skipConnection ||
                           false;

      // Determine initial status based on flow type
      const initialStatus = skipConnection ? 'disconnected' : 'connecting';

      // Create instance in database
      const { data: instance, error } = await this.supabase
        .from('channel_instances')
        .insert({
          organization_id: organizationId,
          channel_type: this.getChannelType(),
          instance_name: config.instance_name || `${this.getChannelType()}-${Date.now()}`,
          status: initialStatus,
          config: config,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create instance: ${error.message}`);
      }

      // Log instance creation
      await this.logActivity(instance.id, 'instance_created', {
        channelType: this.getChannelType(),
        organizationId,
        instanceName: instance.instance_name,
        skipConnection,
        flowType: skipConnection ? 'two_step' : 'direct_connection'
      });

      // Only connect to external API if not skipping connection (two-step flow)
      if (!skipConnection) {
        try {
          await this.connect(instance);
          await this.updateInstanceStatus(instance.id, 'connected');
          instance.status = 'connected';
        } catch (connectError) {
          console.error(`Failed to connect instance ${instance.id}:`, connectError);
          await this.updateInstanceStatus(instance.id, 'error', connectError.message);
          instance.status = 'error';
          instance.error_message = connectError.message;
        }
      } else {
        console.log(`✅ ${this.getChannelType()} instance created in disconnected state for two-step flow`);
      }

      return instance;
    } catch (error) {
      console.error('Error creating channel instance:', error);
      throw error;
    }
  }

  /**
   * Update an existing channel instance
   */
  async updateInstance(instanceId: string, updates: Partial<ChannelInstanceConfig>): Promise<ChannelInstance> {
    try {
      // Get current instance
      const { data: currentInstance, error: fetchError } = await this.supabase
        .from('channel_instances')
        .select('*')
        .eq('id', instanceId)
        .eq('organization_id', this.organizationId)
        .single();

      if (fetchError || !currentInstance) {
        throw new Error('Instance not found');
      }

      // Merge configurations
      const newConfig = { ...currentInstance.config, ...updates };

      // Validate new configuration
      const validation = await this.validateConfig(newConfig);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      // Update in database
      const { data: updatedInstance, error: updateError } = await this.supabase
        .from('channel_instances')
        .update({
          config: newConfig,
          updated_at: new Date().toISOString()
        })
        .eq('id', instanceId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update instance: ${updateError.message}`);
      }

      // If instance is connected, reconnect with new config
      if (currentInstance.status === 'connected') {
        try {
          await this.disconnect(instanceId);
          await this.connect(updatedInstance);
        } catch (reconnectError) {
          console.error(`Failed to reconnect instance ${instanceId}:`, reconnectError);
          await this.updateInstanceStatus(instanceId, 'error', reconnectError.message);
        }
      }

      return updatedInstance;
    } catch (error) {
      console.error('Error updating channel instance:', error);
      throw error;
    }
  }

  /**
   * Delete a channel instance
   */
  async deleteInstance(instanceId: string): Promise<void> {
    try {
      // Get instance to check if it's connected and get full config
      const { data: instance } = await this.supabase
        .from('channel_instances')
        .select('*')
        .eq('id', instanceId)
        .eq('organization_id', this.organizationId)
        .single();

      if (!instance) {
        throw new Error('Instance not found');
      }

      console.log(`🗑️ Deleting channel instance: ${instance.instance_name} (${instanceId})`);

      // Disconnect if connected
      if (instance.status === 'connected' || instance.status === 'connecting') {
        try {
          console.log(`🔌 Disconnecting instance before deletion...`);
          await this.disconnect(instanceId);
        } catch (disconnectError) {
          console.error(`Failed to disconnect instance ${instanceId} before deletion:`, disconnectError);
        }
      }

      // CRITICAL FIX: Clean up any monitoring loops by broadcasting deletion event
      // This will be picked up by frontend components to stop monitoring
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('instance-deleted', {
          detail: { instanceId, instanceName: instance.instance_name }
        }));
      }

      // Clean up any global instance mappings for development instances
      if ((global as any).devInstanceMapping) {
        delete (global as any).devInstanceMapping[instanceId];
        console.log(`🧹 Cleaned up global instance mapping for ${instanceId}`);
      }

      // Delete from database
      const { error } = await this.supabase
        .from('channel_instances')
        .delete()
        .eq('id', instanceId)
        .eq('organization_id', this.organizationId);

      if (error) {
        throw new Error(`Failed to delete instance: ${error.message}`);
      }

      console.log(`✅ Channel instance deleted successfully: ${instance.instance_name}`);
    } catch (error) {
      console.error('Error deleting channel instance:', error);
      throw error;
    }
  }

  /**
   * Get a specific instance by ID
   */
  async getInstance(instanceId: string): Promise<ChannelInstance | null> {
    try {
      const { data: instance, error } = await this.supabase
        .from('channel_instances')
        .select('*')
        .eq('id', instanceId)
        .eq('channel_type', this.getChannelType())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw new Error(`Failed to fetch instance: ${error.message}`);
      }

      return instance;
    } catch (error) {
      console.error('Error fetching channel instance:', error);
      throw error;
    }
  }

  /**
   * Get all instances for the organization
   */
  async getInstances(organizationId: string): Promise<ChannelInstance[]> {
    try {
      const { data: instances, error } = await this.supabase
        .from('channel_instances')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('channel_type', this.getChannelType())
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch instances: ${error.message}`);
      }

      return instances || [];
    } catch (error) {
      console.error('Error fetching channel instances:', error);
      throw error;
    }
  }

  /**
   * Get instance status (combines DB status with real-time check)
   */
  async getInstanceStatus(instanceId: string): Promise<ChannelStatus> {
    try {
      // Get status from database
      const { data: instance } = await this.supabase
        .from('channel_instances')
        .select('status')
        .eq('id', instanceId)
        .eq('organization_id', this.organizationId)
        .single();

      if (!instance) {
        throw new Error('Instance not found');
      }

      // If instance is supposed to be connected, verify with external API
      if (instance.status === 'connected') {
        try {
          const externalStatus = await this.getExternalStatus(instanceId);
          if (externalStatus !== 'connected') {
            await this.updateInstanceStatus(instanceId, externalStatus);
            return externalStatus;
          }
        } catch (error) {
          console.error(`Failed to check external status for ${instanceId}:`, error);
          await this.updateInstanceStatus(instanceId, 'error', error.message);
          return 'error';
        }
      }

      return instance.status;
    } catch (error) {
      console.error('Error getting instance status:', error);
      throw error;
    }
  }

  /**
   * Get conversations for an instance
   */
  async getConversations(instanceId: string, filters?: any): Promise<ChannelConversation[]> {
    try {
      let query = this.supabase
        .from('channel_conversations')
        .select('*')
        .eq('instance_id', instanceId)
        .eq('channel_type', this.getChannelType());

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.patient_id) {
        query = query.eq('patient_id', filters.patient_id);
      }
      if (filters?.since) {
        query = query.gte('created_at', filters.since);
      }

      const { data: conversations, error } = await query
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch conversations: ${error.message}`);
      }

      return conversations || [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }

  /**
   * Update conversation status
   */
  async updateConversationStatus(conversationId: string, status: ConversationStatus): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('channel_conversations')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) {
        throw new Error(`Failed to update conversation status: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating conversation status:', error);
      throw error;
    }
  }

  /**
   * Get metrics for an instance
   */
  async getMetrics(instanceId: string, period: { start: string; end: string }): Promise<ChannelMetrics> {
    try {
      // This would typically involve complex queries to aggregate metrics
      // For now, return a basic structure
      const metrics: ChannelMetrics = {
        channel_type: this.getChannelType(),
        instance_id: instanceId,
        period,
        conversations: {
          total: 0,
          active: 0,
          resolved: 0,
          escalated: 0
        },
        messages: {
          total: 0,
          incoming: 0,
          outgoing: 0,
          automated: 0
        },
        appointments: {
          created: 0,
          confirmed: 0,
          cancelled: 0,
          success_rate: 0
        },
        ai_performance: {
          intent_accuracy: 0,
          entity_extraction_accuracy: 0,
          response_time_avg: 0,
          fallback_rate: 0
        }
      };

      // TODO: Implement actual metrics calculation
      // This would involve querying conversations, messages, and appointments tables

      return metrics;
    } catch (error) {
      console.error('Error getting metrics:', error);
      throw error;
    }
  }

  // =====================================================
  // PROTECTED HELPER METHODS
  // =====================================================

  /**
   * Update instance status in database
   */
  protected async updateInstanceStatus(
    instanceId: string, 
    status: ChannelStatus, 
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (errorMessage) {
        updateData.error_message = errorMessage;
      } else if (status === 'connected') {
        updateData.error_message = null;
      }

      const { error } = await this.supabase
        .from('channel_instances')
        .update(updateData)
        .eq('id', instanceId);

      if (error) {
        console.error(`Failed to update instance status: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating instance status:', error);
    }
  }

  /**
   * Log channel activity for audit trail
   */
  protected async logActivity(
    instanceId: string,
    action: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      await this.supabase
        .from('channel_audit_logs')
        .insert({
          organization_id: this.organizationId,
          instance_id: instanceId,
          channel_type: this.getChannelType(),
          action,
          details,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging channel activity:', error);
    }
  }
}
