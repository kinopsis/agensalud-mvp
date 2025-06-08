/**
 * Simple WhatsApp Service for MVP
 * 
 * Integración simplificada con Evolution API v2 para WhatsApp.
 * Diseñada para máxima simplicidad y funcionalidad MVP.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { createClient, createClientWithRetry } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

// =====================================================
// TYPES
// =====================================================

export interface SimpleWhatsAppInstance {
  id: string;
  organization_id: string;
  name: string;
  display_name: string;
  evolution_instance_name: string;
  evolution_instance_id?: string;
  status: 'creating' | 'connecting' | 'connected' | 'disconnected' | 'error' | 'deleted';
  connection_state?: 'open' | 'connecting' | 'close';
  qr_code_base64?: string;
  qr_code_expires_at?: string;
  whatsapp_number?: string;
  whatsapp_name?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  connected_at?: string;
}

export interface CreateInstanceRequest {
  displayName: string;
  organizationId: string;
}

export interface QRCodeResponse {
  success: boolean;
  qrCode?: string;
  status: 'available' | 'connecting' | 'connected' | 'error';
  expiresAt?: string;
  message?: string;
}

// =====================================================
// SIMPLE WHATSAPP SERVICE
// =====================================================

export class SimpleWhatsAppService {
  private supabase: SupabaseClient;
  private evolutionConfig: {
    baseUrl: string;
    apiKey: string;
  };

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    // Fix: Remove trailing slash from base URL to prevent double slashes
    const baseUrl = (process.env.EVOLUTION_API_BASE_URL || 'https://evo.torrecentral.com').replace(/\/$/, '');
    this.evolutionConfig = {
      baseUrl,
      apiKey: process.env.EVOLUTION_API_KEY || 'ixisatbi7f3p9m1ip37hibanq0vjq8nc'
    };

    // Validate configuration
    if (!this.evolutionConfig.apiKey) {
      throw new Error('EVOLUTION_API_KEY is required');
    }

    console.log('🔧 Evolution API Config:', {
      baseUrl: this.evolutionConfig.baseUrl,
      apiKey: this.evolutionConfig.apiKey.substring(0, 10) + '...'
    });
  }

  /**
   * Crear nueva instancia WhatsApp
   */
  async createInstance(request: CreateInstanceRequest): Promise<SimpleWhatsAppInstance> {
    try {
      console.log('🚀 Creating simple WhatsApp instance:', request.displayName);

      // 1. Generar nombre único para Evolution API (máximo 100 caracteres)
      const timestamp = Date.now();
      const orgPrefix = request.displayName.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);
      const evolutionName = `${orgPrefix}-wa-${timestamp}`.substring(0, 100);

      // 2. Crear instancia en Evolution API
      const evolutionResponse = await this.createEvolutionInstance(evolutionName);

      // 3. Configurar webhook para recibir actualizaciones de estado
      await this.configureWebhook(evolutionName, request.organizationId);

      // 4. Guardar en base de datos
      const { data: instance, error } = await this.supabase
        .from('whatsapp_instances_simple')
        .insert({
          organization_id: request.organizationId,
          name: evolutionName,
          display_name: request.displayName,
          evolution_instance_name: evolutionName,
          evolution_instance_id: evolutionResponse.instanceId,
          status: 'connecting'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Database error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('✅ WhatsApp instance created successfully:', instance.id);
      return instance;

    } catch (error) {
      console.error('❌ Error creating WhatsApp instance:', error);
      throw new Error(`Failed to create WhatsApp instance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtener código QR para conexión
   */
  async getQRCode(instanceId: string): Promise<QRCodeResponse> {
    try {
      console.log('📱 Getting QR code for instance:', instanceId);

      // 1. Obtener instancia de la base de datos
      const { data: instance, error } = await this.supabase
        .from('whatsapp_instances_simple')
        .select('*')
        .eq('id', instanceId)
        .single();

      if (error || !instance) {
        throw new Error('Instance not found');
      }

      // 2. Verificar estado
      if (instance.status === 'connected') {
        return {
          success: true,
          status: 'connected',
          message: 'Instance already connected'
        };
      }

      // 3. Obtener QR code de Evolution API
      const qrData = await this.getEvolutionQRCode(instance.evolution_instance_name);

      // 4. Actualizar base de datos con QR code
      if (qrData.base64) {
        const expiresAt = new Date(Date.now() + 45000).toISOString(); // 45 segundos
        
        await this.supabase
          .from('whatsapp_instances_simple')
          .update({
            qr_code_base64: qrData.base64,
            qr_code_expires_at: expiresAt,
            status: 'connecting'
          })
          .eq('id', instanceId);

        return {
          success: true,
          qrCode: qrData.base64.startsWith('data:') ? qrData.base64 : `data:image/png;base64,${qrData.base64}`,
          status: 'available',
          expiresAt,
          message: 'QR code ready for scanning'
        };
      }

      return {
        success: true,
        status: 'connecting',
        message: 'QR code is being generated'
      };

    } catch (error) {
      console.error('❌ Error getting QR code:', error);
      
      // Actualizar estado de error
      await this.supabase
        .from('whatsapp_instances_simple')
        .update({
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', instanceId);

      return {
        success: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to get QR code'
      };
    }
  }

  /**
   * Obtener estado de instancia
   */
  async getInstanceStatus(instanceId: string): Promise<SimpleWhatsAppInstance | null> {
    try {
      const { data: instance, error } = await this.supabase
        .from('whatsapp_instances_simple')
        .select('*')
        .eq('id', instanceId)
        .single();

      if (error) {
        console.error('❌ Error getting instance:', error);
        return null;
      }

      return instance;
    } catch (error) {
      console.error('❌ Error getting instance status:', error);
      return null;
    }
  }

  /**
   * Listar instancias de una organización
   */
  async listInstances(organizationId: string): Promise<SimpleWhatsAppInstance[]> {
    try {
      const { data: instances, error } = await this.supabase
        .from('whatsapp_instances_simple')
        .select('*')
        .eq('organization_id', organizationId)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error listing instances:', error);
        return [];
      }

      return instances || [];
    } catch (error) {
      console.error('❌ Error listing instances:', error);
      return [];
    }
  }

  /**
   * Obtener una instancia específica con conexión resiliente y detección de estados problemáticos
   */
  async getInstance(instanceId: string): Promise<SimpleWhatsAppInstance | null> {
    try {
      console.log('📋 Getting simple WhatsApp instance:', instanceId);

      // CRITICAL FIX: Check for problematic instances that cause infinite loops
      const problematicInstances = [
        'bc3f6952-378a-4dc4-9d1e-1e8f8f426967',
        'kinopsis'
      ];

      if (problematicInstances.some(problematic => instanceId.includes(problematic))) {
        console.log(`🛑 BLOCKED: Refusing to fetch problematic instance: ${instanceId}`);
        return null; // Return null instead of throwing to prevent infinite loops
      }

      // Try with resilient connection first
      let supabaseClient = this.supabase;
      let attempt = 1;
      const maxAttempts = 2;

      while (attempt <= maxAttempts) {
        try {
          const { data: instance, error } = await supabaseClient
            .from('whatsapp_instances_simple')
            .select('*')
            .eq('id', instanceId)
            .neq('status', 'deleted')
            .single();

          if (error) {
            if (error.code === 'PGRST116') {
              // No rows returned
              return null;
            }

            // If it's a connection error and we haven't tried the resilient client yet
            if (attempt === 1 && (error.message.includes('timeout') || error.message.includes('fetch failed'))) {
              console.warn(`⚠️ Connection error on attempt ${attempt}, trying resilient client:`, error.message);
              supabaseClient = await createClientWithRetry(2, 500); // Quick retry for WhatsApp operations
              attempt++;
              continue;
            }

            console.error('❌ Database error:', error);
            throw new Error(`Database error: ${error.message}`);
          }

          console.log('✅ Found WhatsApp instance:', instance.id);
          return instance;

        } catch (connectionError) {
          if (attempt === 1 && connectionError instanceof Error &&
              (connectionError.message.includes('timeout') || connectionError.message.includes('fetch failed'))) {
            console.warn(`⚠️ Connection error on attempt ${attempt}, trying resilient client:`, connectionError.message);
            try {
              supabaseClient = await createClientWithRetry(2, 500);
              attempt++;
              continue;
            } catch (retryError) {
              console.error('❌ Failed to create resilient client:', retryError);
              throw connectionError;
            }
          }
          throw connectionError;
        }
      }

      throw new Error('Max attempts reached');

    } catch (error) {
      console.error('❌ Error getting WhatsApp instance:', error);

      // Provide graceful degradation for connection issues
      if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('fetch failed'))) {
        console.warn('🔄 Database connection issues detected, providing fallback response');
        return null; // Graceful degradation instead of throwing
      }

      throw new Error(`Failed to get WhatsApp instance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Eliminar una instancia
   */
  async deleteInstance(instanceId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting simple WhatsApp instance:', instanceId);

      // 1. Obtener instancia para obtener el nombre de Evolution
      const instance = await this.getInstance(instanceId);
      if (!instance) {
        throw new Error('Instance not found');
      }

      // 2. Eliminar de Evolution API (opcional, puede fallar)
      try {
        await this.deleteEvolutionInstance(instance.evolution_instance_name);
      } catch (evolutionError) {
        console.warn('⚠️ Failed to delete from Evolution API (continuing):', evolutionError);
      }

      // 3. Marcar como eliminada en base de datos
      const { error } = await this.supabase
        .from('whatsapp_instances_simple')
        .update({
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .eq('id', instanceId);

      if (error) {
        console.error('❌ Database error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('✅ WhatsApp instance deleted successfully:', instanceId);

    } catch (error) {
      console.error('❌ Error deleting WhatsApp instance:', error);
      throw new Error(`Failed to delete WhatsApp instance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // =====================================================
  // EVOLUTION API METHODS
  // =====================================================

  /**
   * Crear instancia en Evolution API
   */
  private async createEvolutionInstance(instanceName: string): Promise<{ instanceId: string }> {
    try {
      console.log('🔧 Creating Evolution API instance with payload:', {
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      });

      const response = await fetch(`${this.evolutionConfig.baseUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.evolutionConfig.apiKey
        },
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        })
      });

      console.log('📡 Evolution API response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Evolution API error response:', errorText);
        throw new Error(`Evolution API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Evolution instance created successfully:', result);

      return {
        instanceId: result.instance?.instanceId || result.instanceId || instanceName
      };
    } catch (error) {
      console.error('❌ Error creating Evolution instance:', error);
      throw error;
    }
  }

  /**
   * Obtener QR code de Evolution API
   */
  private async getEvolutionQRCode(instanceName: string): Promise<{ base64?: string; status?: string }> {
    try {
      const response = await fetch(`${this.evolutionConfig.baseUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': this.evolutionConfig.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Evolution API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📱 Evolution QR response received');

      return {
        base64: result.base64,
        status: result.status || 'available'
      };
    } catch (error) {
      console.error('❌ Error getting Evolution QR code:', error);
      throw error;
    }
  }

  /**
   * Configurar webhook para recibir actualizaciones de estado
   */
  private async configureWebhook(instanceName: string, organizationId: string): Promise<void> {
    try {
      console.log('🔗 Configuring webhook for instance:', instanceName);

      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/whatsapp/simple/webhook/${organizationId}`;

      // Usar el formato correcto según la documentación de Evolution API v2
      const webhookPayload = {
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhook_by_events: true,
          webhook_base64: false,
          events: [
            'QRCODE_UPDATED',
            'CONNECTION_UPDATE',
            'MESSAGES_UPSERT'  // Usar evento válido en lugar de STATUS_INSTANCE
          ]
        }
      };

      console.log('🔧 Webhook payload:', JSON.stringify(webhookPayload, null, 2));

      const response = await fetch(`${this.evolutionConfig.baseUrl}/webhook/set/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.evolutionConfig.apiKey
        },
        body: JSON.stringify(webhookPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to configure webhook:', errorText);

        // Intentar formato alternativo si el primero falla
        console.log('🔄 Trying alternative webhook format...');
        const altResponse = await fetch(`${this.evolutionConfig.baseUrl}/webhook/set/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.evolutionConfig.apiKey
          },
          body: JSON.stringify({
            enabled: true,
            url: webhookUrl,
            events: ['QRCODE_UPDATED', 'CONNECTION_UPDATE']
          })
        });

        if (!altResponse.ok) {
          const altErrorText = await altResponse.text();
          console.warn('⚠️ Both webhook formats failed, continuing without webhook:', altErrorText);
          return;
        }

        console.log('✅ Alternative webhook format succeeded');
        return;
      }

      const result = await response.json();
      console.log('✅ Webhook configured successfully:', { url: webhookUrl, result });
    } catch (error) {
      console.warn('⚠️ Failed to configure webhook (continuing without):', error);
    }
  }

  /**
   * Eliminar instancia de Evolution API
   */
  private async deleteEvolutionInstance(instanceName: string): Promise<void> {
    try {
      console.log('🗑️ Deleting Evolution API instance:', instanceName);

      const response = await fetch(`${this.evolutionConfig.baseUrl}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': this.evolutionConfig.apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('⚠️ Failed to delete Evolution instance:', errorText);
        throw new Error(`Evolution API error: ${response.status} ${response.statusText}`);
      }

      console.log('✅ Evolution instance deleted successfully:', instanceName);
    } catch (error) {
      console.error('❌ Error deleting Evolution instance:', error);
      throw error;
    }
  }

  /**
   * Actualizar estado de instancia desde webhook
   */
  async updateInstanceStatus(
    instanceName: string,
    connectionState: string,
    whatsappData?: {
      number?: string;
      name?: string;
      profilePicUrl?: string;
    }
  ): Promise<void> {
    try {
      console.log('🔄 Updating instance status:', { instanceName, connectionState, whatsappData });

      // Determinar el estado basado en el estado de conexión
      let status: SimpleWhatsAppInstance['status'];
      const updateData: any = {
        connection_state: connectionState,
        updated_at: new Date().toISOString()
      };

      switch (connectionState) {
        case 'open':
          status = 'connected';
          updateData.connected_at = new Date().toISOString();
          updateData.error_message = null;
          updateData.error_count = 0;

          // Actualizar datos de WhatsApp si están disponibles
          if (whatsappData?.number) {
            updateData.whatsapp_number = whatsappData.number;
          }
          if (whatsappData?.name) {
            updateData.whatsapp_name = whatsappData.name;
          }
          if (whatsappData?.profilePicUrl) {
            updateData.whatsapp_profile_pic_url = whatsappData.profilePicUrl;
          }
          break;

        case 'connecting':
          status = 'connecting';
          break;

        case 'close':
          status = 'disconnected';
          updateData.disconnected_at = new Date().toISOString();
          break;

        default:
          status = 'error';
          updateData.error_message = `Unknown connection state: ${connectionState}`;
      }

      updateData.status = status;

      // Actualizar en base de datos
      const { error } = await this.supabase
        .from('whatsapp_instances_simple')
        .update(updateData)
        .eq('evolution_instance_name', instanceName);

      if (error) {
        console.error('❌ Error updating instance status:', error);
        throw error;
      }

      console.log('✅ Instance status updated successfully:', { instanceName, status, connectionState });
    } catch (error) {
      console.error('❌ Error updating instance status:', error);
      throw error;
    }
  }
}

// =====================================================
// FACTORY FUNCTION
// =====================================================

/**
 * Crear instancia del servicio WhatsApp simplificado
 */
export async function createSimpleWhatsAppService(): Promise<SimpleWhatsAppService> {
  const supabase = await createClient();
  return new SimpleWhatsAppService(supabase);
}
