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
    status: string;
  };
  hash: {
    apikey: string;
  };
  webhook?: {
    url: string;
    events: string[];
  };
  qrcode?: {
    code: string;
    base64: string;
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
   */
  async createInstance(data: EvolutionInstanceCreateInput): Promise<EvolutionInstanceResponse> {
    try {
      const response = await this.makeRequest('POST', '/instance/create', data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Evolution API error: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error creating Evolution API instance:', error);
      throw new Error(`Failed to create WhatsApp instance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get instance connection status
   */
  async getInstanceStatus(instanceName: string): Promise<EvolutionConnectionStatus> {
    try {
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
   * Get QR code for instance connection
   */
  async getQRCode(instanceName: string): Promise<{ qrcode: string; base64: string }> {
    try {
      const response = await this.makeRequest('GET', `/instance/qrcode/${instanceName}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Evolution API error: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error getting QR code:', error);
      throw new Error(`Failed to get QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Configure webhook for instance
   */
  async configureWebhook(instanceName: string, webhookConfig: EvolutionWebhookConfigInput): Promise<void> {
    try {
      const response = await this.makeRequest('POST', `/webhook/set/${instanceName}`, webhookConfig);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Evolution API error: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Error configuring webhook:', error);
      throw new Error(`Failed to configure webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    const url = `${this.config.baseUrl}${endpoint}`;
    
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
