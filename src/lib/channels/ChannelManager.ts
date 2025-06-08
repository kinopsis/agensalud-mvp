/**
 * Channel Manager
 * 
 * Unified manager for all communication channels in AgentSalud MVP.
 * Provides centralized registration, management, and metrics aggregation
 * across WhatsApp, Telegram, Voice, and future channels.
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
  UnifiedChannelMetrics,
  ChannelMetrics,
  IncomingMessage,
  MessageProcessingResult,
  ChannelConversation
} from '@/types/channels';
import { BaseChannelService } from './core/BaseChannelService';
import { BaseMessageProcessor } from './core/BaseMessageProcessor';
import { BaseAppointmentService } from './core/BaseAppointmentService';

// =====================================================
// CHANNEL MANAGER CLASS
// =====================================================

/**
 * ChannelManager
 * 
 * Central manager for all communication channels providing:
 * - Dynamic channel registration
 * - Unified metrics aggregation
 * - Cross-channel operations
 * - Factory pattern for service instantiation
 */
export class ChannelManager {
  private supabase: SupabaseClient;
  private organizationId: string;
  private channelServices: Map<ChannelType, typeof BaseChannelService> = new Map();
  private channelProcessors: Map<ChannelType, typeof BaseMessageProcessor> = new Map();
  private channelAppointmentServices: Map<ChannelType, typeof BaseAppointmentService> = new Map();
  private serviceInstances: Map<string, BaseChannelService> = new Map();

  constructor(supabase: SupabaseClient, organizationId: string) {
    this.supabase = supabase;
    this.organizationId = organizationId;
  }

  // =====================================================
  // CHANNEL REGISTRATION
  // =====================================================

  /**
   * Register a channel service class
   */
  registerChannelService(type: ChannelType, serviceClass: typeof BaseChannelService): void {
    if (!this.channelServices.has(type)) {
      this.channelServices.set(type, serviceClass);
      console.log(`📱 Registered channel service: ${type}`);
    }
  }

  /**
   * Register a message processor class
   */
  registerMessageProcessor(type: ChannelType, processorClass: typeof BaseMessageProcessor): void {
    if (!this.channelProcessors.has(type)) {
      this.channelProcessors.set(type, processorClass);
      console.log(`🔄 Registered message processor: ${type}`);
    }
  }

  /**
   * Register an appointment service class
   */
  registerAppointmentService(type: ChannelType, serviceClass: typeof BaseAppointmentService): void {
    if (!this.channelAppointmentServices.has(type)) {
      this.channelAppointmentServices.set(type, serviceClass);
      console.log(`📅 Registered appointment service: ${type}`);
    }
  }

  /**
   * Get available channel types
   */
  getAvailableChannels(): ChannelType[] {
    return Array.from(this.channelServices.keys());
  }

  /**
   * Check if channel type is supported
   */
  isChannelSupported(type: ChannelType): boolean {
    return this.channelServices.has(type);
  }

  // =====================================================
  // SERVICE FACTORY
  // =====================================================

  /**
   * Get channel service instance
   */
  getChannelService(type: ChannelType): BaseChannelService {
    const serviceClass = this.channelServices.get(type);
    if (!serviceClass) {
      throw new Error(`Channel service not found for type: ${type}`);
    }

    // Use singleton pattern for service instances
    const instanceKey = `${type}-${this.organizationId}`;
    if (!this.serviceInstances.has(instanceKey)) {
      this.serviceInstances.set(instanceKey, new serviceClass(this.supabase, this.organizationId));
    }

    return this.serviceInstances.get(instanceKey)!;
  }

  /**
   * Create message processor instance
   */
  createMessageProcessor(type: ChannelType, channelInstance: ChannelInstance): BaseMessageProcessor {
    const processorClass = this.channelProcessors.get(type);
    if (!processorClass) {
      throw new Error(`Message processor not found for type: ${type}`);
    }

    return new processorClass(this.supabase, channelInstance);
  }

  /**
   * Create appointment service instance
   */
  createAppointmentService(type: ChannelType, channelInstance: ChannelInstance): BaseAppointmentService {
    const serviceClass = this.channelAppointmentServices.get(type);
    if (!serviceClass) {
      throw new Error(`Appointment service not found for type: ${type}`);
    }

    return new serviceClass(this.supabase, channelInstance);
  }

  // =====================================================
  // UNIFIED OPERATIONS
  // =====================================================

  /**
   * Get all channel instances across all types
   */
  async getAllInstances(): Promise<ChannelInstance[]> {
    try {
      const { data: instances, error } = await this.supabase
        .from('channel_instances')
        .select('*')
        .eq('organization_id', this.organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch instances: ${error.message}`);
      }

      return instances || [];
    } catch (error) {
      console.error('Error fetching all instances:', error);
      return [];
    }
  }

  /**
   * Get instances by channel type
   */
  async getInstancesByType(type: ChannelType): Promise<ChannelInstance[]> {
    try {
      const service = this.getChannelService(type);
      return await service.getInstances(this.organizationId);
    } catch (error) {
      console.error(`Error fetching instances for ${type}:`, error);
      return [];
    }
  }

  /**
   * Create instance for any channel type
   */
  async createInstance(type: ChannelType, config: ChannelInstanceConfig): Promise<ChannelInstance> {
    try {
      if (!this.isChannelSupported(type)) {
        throw new Error(`Unsupported channel type: ${type}`);
      }

      const service = this.getChannelService(type);
      return await service.createInstance(this.organizationId, config);
    } catch (error) {
      console.error(`Error creating ${type} instance:`, error);
      throw error;
    }
  }

  /**
   * Process message from any channel
   */
  async processMessage(message: IncomingMessage): Promise<MessageProcessingResult> {
    try {
      // Get channel instance
      const { data: instance } = await this.supabase
        .from('channel_instances')
        .select('*')
        .eq('id', message.instance_id)
        .eq('organization_id', this.organizationId)
        .single();

      if (!instance) {
        throw new Error('Channel instance not found');
      }

      // Create message processor
      const processor = this.createMessageProcessor(message.channel_type, instance);
      
      // Process message
      return await processor.processMessage(message);
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        success: false,
        intent: 'unknown',
        entities: {},
        response: 'Error processing message',
        next_actions: ['escalate_to_human'],
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // =====================================================
  // UNIFIED METRICS
  // =====================================================

  /**
   * Get unified metrics across all channels
   */
  async getUnifiedMetrics(period: { start: string; end: string }): Promise<UnifiedChannelMetrics> {
    try {
      const instances = await this.getAllInstances();
      const channelMetrics: { [key in ChannelType]?: ChannelMetrics[] } = {};
      
      let totalChannels = 0;
      let activeChannels = 0;
      let totalConversations = 0;
      let totalAppointments = 0;
      let totalSuccessRate = 0;
      let channelCount = 0;

      // Aggregate metrics from each channel type
      for (const channelType of this.getAvailableChannels()) {
        try {
          const typeInstances = instances.filter(i => i.channel_type === channelType);
          const typeMetrics: ChannelMetrics[] = [];

          for (const instance of typeInstances) {
            try {
              const service = this.getChannelService(channelType);
              const metrics = await service.getMetrics(instance.id, period);
              typeMetrics.push(metrics);

              // Aggregate totals
              totalConversations += metrics.conversations.total;
              totalAppointments += metrics.appointments.created;
              totalSuccessRate += metrics.ai_performance.intent_accuracy;
              channelCount++;

              if (instance.status === 'connected') {
                activeChannels++;
              }
            } catch (error) {
              console.error(`Error getting metrics for instance ${instance.id}:`, error);
            }
          }

          if (typeMetrics.length > 0) {
            channelMetrics[channelType] = typeMetrics;
            totalChannels += typeInstances.length;
          }
        } catch (error) {
          console.error(`Error processing metrics for ${channelType}:`, error);
        }
      }

      // Calculate average success rate
      const overallSuccessRate = channelCount > 0 ? Math.round(totalSuccessRate / channelCount) : 0;

      // Generate time series data (simplified for now)
      const trends = {
        conversations: this.generateTrendData(period, totalConversations),
        appointments: this.generateTrendData(period, totalAppointments),
        success_rate: this.generateTrendData(period, overallSuccessRate)
      };

      return {
        organization_id: this.organizationId,
        period,
        summary: {
          total_channels: totalChannels,
          active_channels: activeChannels,
          total_conversations: totalConversations,
          total_appointments: totalAppointments,
          overall_success_rate: overallSuccessRate
        },
        by_channel: channelMetrics,
        trends
      };

    } catch (error) {
      console.error('Error getting unified metrics:', error);
      
      // Return empty metrics on error
      return {
        organization_id: this.organizationId,
        period,
        summary: {
          total_channels: 0,
          active_channels: 0,
          total_conversations: 0,
          total_appointments: 0,
          overall_success_rate: 0
        },
        by_channel: {},
        trends: {
          conversations: [],
          appointments: [],
          success_rate: []
        }
      };
    }
  }

  /**
   * Get channel health status
   */
  async getChannelHealthStatus(): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    channels: { type: ChannelType; status: ChannelStatus; instances: number }[];
  }> {
    try {
      const instances = await this.getAllInstances();
      const channelHealth: { type: ChannelType; status: ChannelStatus; instances: number }[] = [];
      
      let healthyChannels = 0;
      let totalChannels = 0;

      for (const channelType of this.getAvailableChannels()) {
        const typeInstances = instances.filter(i => i.channel_type === channelType);
        const connectedInstances = typeInstances.filter(i => i.status === 'connected').length;
        
        let overallStatus: ChannelStatus = 'disconnected';
        if (connectedInstances === typeInstances.length && typeInstances.length > 0) {
          overallStatus = 'connected';
          healthyChannels++;
        } else if (connectedInstances > 0) {
          overallStatus = 'connecting';
        } else if (typeInstances.some(i => i.status === 'error')) {
          overallStatus = 'error';
        }

        channelHealth.push({
          type: channelType,
          status: overallStatus,
          instances: typeInstances.length
        });

        totalChannels++;
      }

      // Determine overall health
      let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (healthyChannels === 0) {
        overall = 'critical';
      } else if (healthyChannels < totalChannels * 0.8) {
        overall = 'warning';
      }

      return {
        overall,
        channels: channelHealth
      };

    } catch (error) {
      console.error('Error getting channel health status:', error);
      return {
        overall: 'critical',
        channels: []
      };
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Generate simplified trend data
   */
  private generateTrendData(period: { start: string; end: string }, totalValue: number): any[] {
    // This is a simplified implementation
    // In a real scenario, you would query historical data from the database
    const days = Math.ceil((new Date(period.end).getTime() - new Date(period.start).getTime()) / (1000 * 60 * 60 * 24));
    const dailyAverage = Math.round(totalValue / Math.max(days, 1));
    
    const trends = [];
    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(period.start);
      date.setDate(date.getDate() + i);
      
      trends.push({
        timestamp: date.toISOString(),
        value: dailyAverage + Math.floor(Math.random() * 10 - 5) // Add some variance
      });
    }
    
    return trends;
  }

  /**
   * Cleanup inactive service instances
   */
  cleanup(): void {
    this.serviceInstances.clear();
    console.log('🧹 Channel manager cleanup completed');
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let globalChannelManager: ChannelManager | null = null;

/**
 * Get or create global channel manager instance
 */
export function getChannelManager(supabase: SupabaseClient, organizationId: string): ChannelManager {
  if (!globalChannelManager) {
    globalChannelManager = new ChannelManager(supabase, organizationId);
  }
  return globalChannelManager;
}

/**
 * Initialize channel manager with default channels
 */
export function initializeChannelManager(supabase: SupabaseClient, organizationId: string): ChannelManager {
  const manager = getChannelManager(supabase, organizationId);
  
  // Register default channels (WhatsApp will be registered when migrated)
  // manager.registerChannelService('whatsapp', WhatsAppChannelService);
  // manager.registerChannelService('telegram', TelegramChannelService);
  // manager.registerChannelService('voice', VoiceChannelService);
  
  return manager;
}

export default ChannelManager;
