/**
 * Evolution API v2 Integration Service
 * 
 * Service for managing WhatsApp Business API integration through Evolution API v2.
 * Handles instance creation, connection management, message sending, and webhook configuration.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import type {
  EvolutionInstanceCreateInput,
  EvolutionWebhookConfigInput,
  EvolutionSendMessageInput
} from '@/lib/validations/whatsapp';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface EvolutionAPIConfig {
  baseUrl: string;
  apiKey: string;
  version: 'v2';
}

export interface EvolutionInstanceResponse {
  instance: {
    instanceName: string;
    instanceId: string; // Added from manual test response
    integration: string; // Added from manual test response
    status: string;
    webhookWaBusiness?: any;
    accessTokenWaBusiness?: string;
  };
  hash: string | { apikey: string }; // Can be string or object
  webhook?: {
    url?: string;
    events?: string[];
  };
  websocket?: any;
  rabbitmq?: any;
  sqs?: any;
  settings?: {
    rejectCall: boolean;
    msgCall: string;
    groupsIgnore: boolean;
    alwaysOnline: boolean;
    readMessages: boolean;
    readStatus: boolean;
    syncFullHistory: boolean;
    wavoipToken: string;
  };
  qrcode?: {
    pairingCode?: string | null;
    code: string;
    base64: string;
    count?: number;
  };
}

export interface EvolutionConnectionStatus {
  instance: string;
  state: 'close' | 'connecting' | 'open';
  qr?: string;
}

export interface EvolutionMessageResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: any;
  messageTimestamp: number;
}

// =====================================================
// EVOLUTION API SERVICE CLASS
// =====================================================

/**
 * Evolution API v2 Service
 * Manages WhatsApp Business API integration through Evolution API
 */
export class EvolutionAPIService {
  private config: EvolutionAPIConfig;
  private static instance: EvolutionAPIService;

  // Intelligent circuit breaker for failed instances
  private static failedInstances = new Map<string, { count: number; lastFailed: number }>();
  private static readonly MAX_FAILURES = 3;
  private static readonly FAILURE_WINDOW = 5 * 60 * 1000; // 5 minutes

  constructor(config: EvolutionAPIConfig) {
    this.config = config;
  }

  /**
   * Get singleton instance of Evolution API Service
   */
  static getInstance(config?: EvolutionAPIConfig): EvolutionAPIService {
    if (!EvolutionAPIService.instance) {
      if (!config) {
        throw new Error('Evolution API configuration is required for first initialization');
      }
      EvolutionAPIService.instance = new EvolutionAPIService(config);
    }
    return EvolutionAPIService.instance;
  }

  /**
   * Create a new WhatsApp instance in Evolution API
   * Includes validation to prevent duplicate instances
   */
  async createInstance(data: EvolutionInstanceCreateInput): Promise<EvolutionInstanceResponse> {
    try {
      // In development mode, return mock response immediately
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (isDevelopment && (!this.config.apiKey || this.config.apiKey === 'dev-api-key-placeholder')) {
        console.log('🔧 Development mode: Returning mock Evolution API response');
        return {
          instance: {
            instanceName: data.instanceName,
            instanceId: `dev-mock-${Date.now()}`,
            integration: 'WHATSAPP-BAILEYS',
            webhookWaBusiness: null,
            accessTokenWaBusiness: '',
            status: 'close'
          },
          hash: 'DEV-MOCK-HASH-' + Date.now(),
          webhook: {},
          websocket: {},
          rabbitmq: {},
          sqs: {},
          settings: {
            rejectCall: false,
            msgCall: '',
            groupsIgnore: false,
            alwaysOnline: false,
            readMessages: false,
            readStatus: false,
            syncFullHistory: false,
            wavoipToken: ''
          }
        };
      }

      // First check if instance already exists
      const existingInstances = await this.fetchAllInstances();
      const existingInstance = existingInstances.find(
        instance => instance.name === data.instanceName
      );

      if (existingInstance) {
        console.warn(`⚠️ Instance '${data.instanceName}' already exists in Evolution API`);

        // Return existing instance data in expected format
        return {
          instance: {
            instanceName: existingInstance.name,
            instanceId: existingInstance.id || `existing-${Date.now()}`,
            integration: 'WHATSAPP-BAILEYS',
            webhookWaBusiness: null,
            accessTokenWaBusiness: existingInstance.token || '',
            status: existingInstance.connectionStatus
          },
          hash: existingInstance.token || 'existing-token',
          webhook: {},
          websocket: {},
          rabbitmq: {},
          sqs: {},
          settings: {
            rejectCall: false,
            msgCall: '',
            groupsIgnore: false,
            alwaysOnline: false,
            readMessages: false,
            readStatus: false,
            syncFullHistory: false,
            wavoipToken: ''
          },
          qrcode: existingInstance.connectionStatus === 'connecting' ?
            await this.getQRCode(existingInstance.name).catch(() => ({ base64: null })) :
            { base64: null }
        };
      }

      // HYBRID APPROACH: Support both immediate QR and two-step workflow
      // Based on manual testing, Evolution API works best with qrcode: true for immediate connection
      // This matches the successful manual test payload exactly
      const useImmediateQR = data.qrcode !== false; // Allow override via data.qrcode

      const evolutionPayload = {
        instanceName: data.instanceName, // Match manual test order
        integration: data.integration ?? 'WHATSAPP-BAILEYS', // Confirmed working integration type
        qrcode: useImmediateQR // FIXED: Use immediate QR generation (matches manual test)
      };

      console.log('🎯 Using payload format that matches successful manual test:', {
        instanceName: evolutionPayload.instanceName,
        integration: evolutionPayload.integration,
        qrcode: evolutionPayload.qrcode,
        note: useImmediateQR ? 'Immediate QR generation (like manual test)' : 'Two-step workflow'
      });

      console.log('📤 Evolution API payload (minimal format):', evolutionPayload);

      console.log('🔗 Creating Evolution API instance with minimal payload:', {
        instanceName: evolutionPayload.instanceName,
        integration: evolutionPayload.integration,
        endpoint: `${this.config.baseUrl}/instance/create`,
        flowType: 'qr_code_only' // Using QR code flow with WHATSAPP-BAILEYS integration
      });

      // Create new instance if it doesn't exist
      const response = await this.makeRequest('POST', '/instance/create', evolutionPayload);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        console.error('❌ Evolution API create instance error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });

        throw new Error(`Evolution API error: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();

      // Log the complete response structure for debugging (matches manual test response)
      console.log('✅ Evolution API instance created successfully:', {
        instanceName: result.instance?.instanceName,
        instanceId: result.instance?.instanceId, // Confirmed field from manual test
        integration: result.instance?.integration,
        status: result.instance?.status, // Should be "connecting" with qrcode: true
        hash: result.hash,
        hasWebhook: !!result.webhook,
        hasSettings: !!result.settings,
        // QR code data (SHOULD be available with qrcode: true parameter)
        hasQRCode: !!result.qrcode,
        qrCodeFields: result.qrcode ? Object.keys(result.qrcode) : [],
        qrCodeCount: result.qrcode?.count || 0,
        qrCodeBase64Available: !!result.qrcode?.base64,
        qrCodeStringAvailable: !!result.qrcode?.code
      });

      // Validate the response structure matches manual test expectations
      if (!result.instance?.instanceName || !result.instance?.instanceId) {
        console.warn('⚠️ Unexpected Evolution API response structure:', result);
      }

      // Enhanced logging for QR code availability
      if (useImmediateQR && result.qrcode) {
        console.log('🎉 QR code generated immediately (matching manual test behavior):', {
          hasBase64: !!result.qrcode.base64,
          hasCode: !!result.qrcode.code,
          count: result.qrcode.count
        });
      } else if (useImmediateQR && !result.qrcode) {
        console.warn('⚠️ Expected QR code in response but not found - may need webhook delivery');
      } else {
        console.log('✅ Instance created in disconnected state - ready for connection step');
      }

      return result;
    } catch (error) {
      console.error('❌ Error creating Evolution API instance:', error);

      // In development mode, return mock response on error
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        console.log('🔧 Development mode: Returning mock response due to API error');
        return {
          instance: {
            instanceName: data.instanceName,
            instanceId: `dev-error-fallback-${Date.now()}`,
            integration: 'WHATSAPP-BAILEYS',
            webhookWaBusiness: null,
            accessTokenWaBusiness: '',
            status: 'close'
          },
          hash: 'DEV-ERROR-FALLBACK-HASH-' + Date.now(),
          webhook: {},
          websocket: {},
          rabbitmq: {},
          sqs: {},
          settings: {
            rejectCall: false,
            msgCall: '',
            groupsIgnore: false,
            alwaysOnline: false,
            readMessages: false,
            readStatus: false,
            syncFullHistory: false,
            wavoipToken: ''
          }
        };
      }

      throw new Error(`Failed to create WhatsApp instance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get instance connection status
   */
  async getInstanceStatus(instanceName: string): Promise<EvolutionConnectionStatus> {
    try {
      // ENHANCED CIRCUIT BREAKER: Completely block problematic instances causing infinite loops
      const problematicInstances = [
        '927cecbe-hhghg',
        '927cecbe-polopolo',
        '927cecbe-pticavisualcarwhatsa' // Added the main problematic instance
      ];
      const isProblematic = problematicInstances.some(name => instanceName.includes(name));

      if (isProblematic) {
        console.log(`🚨 EMERGENCY CIRCUIT BREAKER: Instance ${instanceName} is permanently blocked`);
        // Immediately return error without any processing
        return {
          instance: {
            instanceName,
            state: 'close'
          },
          status: 'error'
        };
      }

      const response = await this.makeRequest('GET', `/instance/connectionState/${instanceName}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Evolution API error: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error getting instance status:', error);
      throw new Error(`Failed to get instance status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Connect instance to start WhatsApp connection process
   * This is required before QR codes can be generated
   */
  async connectInstance(instanceName: string): Promise<any> {
    try {
      console.log(`🔗 Connecting instance to start WhatsApp: ${instanceName}`);

      const response = await this.makeRequest('GET', `/instance/connect/${instanceName}`);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        console.error('❌ Evolution API connect error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });

        throw new Error(`Evolution API connect error: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();

      console.log('✅ Instance connection initiated:', {
        instanceName,
        status: result.instance?.status || 'unknown'
      });

      return result;
    } catch (error) {
      console.error('❌ Error connecting instance:', error);
      throw new Error(`Failed to connect instance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get QR code for instance connection - Webhook-based approach
   *
   * IMPORTANT: With the two-step workflow, QR codes are delivered via webhooks
   * after calling connectInstance(). This method should primarily check status
   * and rely on webhook events for QR code delivery.
   */
  async getQRCode(instanceName: string): Promise<{ qrcode?: string; base64?: string; status?: string }> {
    try {
      console.log(`🔍 Getting QR code for instance: ${instanceName}`);

      // Check instance status first
      try {
        const statusResponse = await this.makeRequest('GET', `/instance/connectionState/${instanceName}`);
        if (statusResponse.ok) {
          const statusResult = await statusResponse.json();

          if (statusResult.instance?.state === 'open') {
            console.log('✅ Instance already connected, no QR code needed');
            return { status: 'connected' };
          }

          if (statusResult.instance?.state === 'close') {
            console.log('⚠️ Instance is closed, needs to be connected first');
            return { status: 'disconnected' };
          }

          if (statusResult.instance?.state === 'connecting') {
            console.log('🔄 Instance is connecting, getting QR code from Evolution API v2');
            // FIXED: Use correct Evolution API v2 endpoint for QR code
            try {
              const qrResponse = await this.makeRequest('GET', `/instance/connect/${instanceName}`);
              if (qrResponse.ok) {
                const qrResult = await qrResponse.json();
                console.log('📱 Evolution API QR response:', {
                  hasBase64: !!qrResult.base64,
                  hasCode: !!qrResult.code,
                  pairingCode: qrResult.pairingCode
                });

                if (qrResult.base64) {
                  // Evolution API v2 returns base64 directly
                  const qrCodeData = qrResult.base64.startsWith('data:image/') ?
                    qrResult.base64 :
                    `data:image/png;base64,${qrResult.base64}`;

                  return {
                    qrcode: qrResult.code,
                    base64: qrCodeData,
                    status: 'available'
                  };
                }
              }
            } catch (qrError) {
              console.log('⚠️ QR code not ready yet:', qrError.message);
            }
            return { status: 'generating' };
          }
        }
      } catch (statusError) {
        console.log('⚠️ Could not check instance status:', statusError.message);
      }

      // If status check failed, return loading state
      console.log('⏳ QR code status unknown, returning loading state');
      return { status: 'loading' };

    } catch (error) {
      console.error('❌ Error getting QR code:', error);
      throw new Error(`Failed to get QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get instance connection status (simplified version)
   */
  async getInstanceStatus(instanceName: string): Promise<{ state: string; status: string }> {
    try {
      // ENHANCED CIRCUIT BREAKER: Completely block problematic instances causing infinite loops
      const problematicInstances = [
        '927cecbe-hhghg',
        '927cecbe-polopolo',
        '927cecbe-pticavisualcarwhatsa' // Added the main problematic instance
      ];
      const isProblematic = problematicInstances.some(name => instanceName.includes(name));

      if (isProblematic) {
        console.log(`🚨 EMERGENCY CIRCUIT BREAKER: Instance ${instanceName} is permanently blocked`);
        // Immediately return error without any processing
        return {
          state: 'close',
          status: 'error'
        };
      }

      // Intelligent circuit breaker: Check if instance has failed too many times recently
      const failureRecord = EvolutionAPIService.failedInstances.get(instanceName);
      const now = Date.now();

      if (failureRecord &&
          failureRecord.count >= EvolutionAPIService.MAX_FAILURES &&
          (now - failureRecord.lastFailed) < EvolutionAPIService.FAILURE_WINDOW) {
        console.log(`🛑 INTELLIGENT CIRCUIT BREAKER: Instance ${instanceName} has failed ${failureRecord.count} times in the last 5 minutes. Blocking requests.`);
        return {
          state: 'close',
          status: 'error'
        };
      }

      const response = await this.makeRequest('GET', `/instance/connectionState/${instanceName}`);

      if (!response.ok) {
        // Track failures for intelligent circuit breaker
        const failureRecord = EvolutionAPIService.failedInstances.get(instanceName) || { count: 0, lastFailed: 0 };
        failureRecord.count += 1;
        failureRecord.lastFailed = now;
        EvolutionAPIService.failedInstances.set(instanceName, failureRecord);

        console.log(`📊 Instance ${instanceName} failure tracked: ${failureRecord.count}/${EvolutionAPIService.MAX_FAILURES} failures`);

        const errorData = await response.json();
        throw new Error(`Evolution API error: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();

      // Reset failure count on successful response
      if (EvolutionAPIService.failedInstances.has(instanceName)) {
        EvolutionAPIService.failedInstances.delete(instanceName);
        console.log(`✅ Instance ${instanceName} failure count reset after successful response`);
      }

      return {
        state: result.instance?.state || 'close',
        status: result.instance?.status || 'disconnected'
      };
    } catch (error) {
      console.error('Error getting instance status:', error);
      throw new Error(`Failed to get instance status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Configure webhook for instance with enhanced error handling
   */
  async configureWebhook(instanceName: string, webhookConfig: any): Promise<void> {
    try {
      // Validate webhook configuration before sending
      const validatedConfig = this.validateWebhookConfig(webhookConfig);

      console.log(`🔗 Configuring webhook for instance: ${instanceName}`, {
        url: validatedConfig.url,
        events: validatedConfig.events
      });

      const response = await this.makeRequest('POST', `/webhook/set/${instanceName}`, validatedConfig);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }

        // Handle specific Evolution API errors
        if (response.status === 400) {
          console.warn(`⚠️ Webhook configuration failed for ${instanceName}: Bad Request - ${errorData.message || 'Invalid webhook configuration'}`);
          throw new Error(`Bad Request: ${errorData.message || 'Invalid webhook configuration'}`);
        }

        throw new Error(`Evolution API error: ${errorData.message || response.statusText}`);
      }

      console.log(`✅ Webhook configured successfully for instance: ${instanceName}`);
    } catch (error) {
      console.error('Error configuring webhook:', error);
      throw new Error(`Failed to configure webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate webhook configuration
   */
  private validateWebhookConfig(config: any): any {
    const validatedConfig = {
      url: config.url || '',
      webhook_by_events: config.webhook_by_events !== false, // Default to true
      webhook_base64: config.webhook_base64 || false,
      events: config.events || ['CONNECTION_UPDATE', 'STATUS_INSTANCE', 'QRCODE_UPDATED']
    };

    // Ensure URL is valid
    if (!validatedConfig.url) {
      throw new Error('Webhook URL is required');
    }

    try {
      new URL(validatedConfig.url);
    } catch {
      throw new Error('Invalid webhook URL format');
    }

    // Ensure events is an array
    if (!Array.isArray(validatedConfig.events)) {
      validatedConfig.events = ['CONNECTION_UPDATE', 'STATUS_INSTANCE', 'QRCODE_UPDATED'];
    }

    return validatedConfig;
  }

  /**
   * Send message through WhatsApp instance
   */
  async sendMessage(instanceName: string, messageData: EvolutionSendMessageInput): Promise<EvolutionMessageResponse> {
    try {
      const response = await this.makeRequest('POST', `/message/sendText/${instanceName}`, messageData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Evolution API error: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete WhatsApp instance
   */
  async deleteInstance(instanceName: string): Promise<void> {
    try {
      const response = await this.makeRequest('DELETE', `/instance/delete/${instanceName}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Evolution API error: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting instance:', error);
      throw new Error(`Failed to delete instance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Restart WhatsApp instance
   */
  async restartInstance(instanceName: string): Promise<void> {
    try {
      const response = await this.makeRequest('PUT', `/instance/restart/${instanceName}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Evolution API error: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Error restarting instance:', error);
      throw new Error(`Failed to restart instance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all instances from Evolution API
   */
  async fetchAllInstances(): Promise<any[]> {
    try {
      const response = await this.makeRequest('GET', '/instance/fetchInstances');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Evolution API error: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching all instances:', error);
      throw new Error(`Failed to fetch instances: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get instance information
   */
  async getInstanceInfo(instanceName: string): Promise<any> {
    try {
      const response = await this.makeRequest('GET', `/instance/fetchInstances/${instanceName}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Evolution API error: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error getting instance info:', error);
      throw new Error(`Failed to get instance info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Logout from WhatsApp instance
   */
  async logoutInstance(instanceName: string): Promise<void> {
    try {
      const response = await this.makeRequest('DELETE', `/instance/logout/${instanceName}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Evolution API error: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Error logging out instance:', error);
      throw new Error(`Failed to logout instance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  /**
   * Make HTTP request to Evolution API
   */
  private async makeRequest(method: string, endpoint: string, data?: any): Promise<Response> {
    // Normalize URL construction to avoid double slashes
    const baseUrl = this.config.baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${normalizedEndpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': this.config.apiKey
    };

    const options: RequestInit = {
      method,
      headers
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    console.log(`🔗 Evolution API Request: ${method} ${url}`);

    return fetch(url, options);
  }

  /**
   * Validate Evolution API configuration
   */
  static validateConfig(config: EvolutionAPIConfig): boolean {
    if (!config.baseUrl || !config.apiKey) {
      return false;
    }

    try {
      new URL(config.baseUrl);
      return true;
    } catch {
      return false;
    }
  }
}

// =====================================================
// FACTORY FUNCTION
// =====================================================

/**
 * Create Evolution API Service instance with environment configuration
 */
export function createEvolutionAPIService(): EvolutionAPIService {
  const config: EvolutionAPIConfig = {
    baseUrl: process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080',
    apiKey: process.env.EVOLUTION_API_KEY || '',
    version: 'v2'
  };

  // In development mode, allow missing API key for testing
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hasValidConfig = EvolutionAPIService.validateConfig(config);

  if (!hasValidConfig && !isDevelopment) {
    throw new Error('Invalid Evolution API configuration. Check EVOLUTION_API_BASE_URL and EVOLUTION_API_KEY environment variables.');
  }

  // For development, use a default API key if none provided
  if (isDevelopment && !config.apiKey) {
    config.apiKey = 'dev-api-key-placeholder';
    console.warn('⚠️ Using development mode for Evolution API - some features may not work');
  }

  return EvolutionAPIService.getInstance(config);
}

export default EvolutionAPIService;
