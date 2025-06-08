/**
 * Evolution API OpenAI Bot Service
 * 
 * Manages OpenAI bot integration with Evolution API v2 for natural language
 * appointment booking. Handles bot creation, configuration, session management,
 * and conversation flows for medical appointment scheduling.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { EvolutionAPIService } from './EvolutionAPIService';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface OpenAICredentials {
  name: string;
  apiKey: string;
}

export interface OpenAIBotConfig {
  enabled: boolean;
  openaiCredsId: string;
  botType: 'assistant' | 'chatCompletion';
  // For assistants
  assistantId?: string;
  functionUrl?: string;
  // For chat completion
  model?: string;
  systemMessages?: string[];
  assistantMessages?: string[];
  userMessages?: string[];
  maxTokens?: number;
  // Trigger options
  triggerType: 'all' | 'keyword';
  triggerOperator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'regex' | 'none';
  triggerValue?: string;
  expire: number;
  keywordFinish: string;
  delayMessage: number;
  unknownMessage: string;
  listeningFromMe: boolean;
  stopBotFromMe: boolean;
  keepOpen: boolean;
  debounceTime: number;
  ignoreJids: string[];
}

export interface BotSessionStatus {
  remoteJid: string;
  status: 'opened' | 'paused' | 'closed';
}

export interface OpenAIDefaultSettings {
  openaiCredsId: string;
  expire: number;
  keywordFinish: string;
  delayMessage: number;
  unknownMessage: string;
  listeningFromMe: boolean;
  stopBotFromMe: boolean;
  keepOpen: boolean;
  debounceTime: number;
  ignoreJids: string[];
  openaiIdFallback?: string;
  speechToText: boolean;
}

// =====================================================
// EVOLUTION OPENAI BOT SERVICE
// =====================================================

/**
 * Evolution OpenAI Bot Service Class
 * 
 * @description Manages OpenAI bot integration with Evolution API v2
 * for natural language appointment booking and conversation management.
 */
export class EvolutionOpenAIBotService {
  private evolutionAPI: EvolutionAPIService;

  constructor() {
    this.evolutionAPI = new EvolutionAPIService();
  }

  // =====================================================
  // CREDENTIALS MANAGEMENT
  // =====================================================

  /**
   * Create OpenAI credentials for an instance
   */
  async createCredentials(instanceName: string, credentials: OpenAICredentials): Promise<any> {
    try {
      console.log(`🔑 Creating OpenAI credentials for instance: ${instanceName}`);

      const response = await this.evolutionAPI.makeRequest(
        `/openai/creds/${instanceName}`,
        'POST',
        credentials
      );

      console.log(`✅ OpenAI credentials created successfully for ${instanceName}`);
      return response;

    } catch (error) {
      console.error(`❌ Error creating OpenAI credentials for ${instanceName}:`, error);
      throw error;
    }
  }

  /**
   * Get OpenAI credentials for an instance
   */
  async getCredentials(instanceName: string): Promise<any> {
    try {
      const response = await this.evolutionAPI.makeRequest(
        `/openai/creds/${instanceName}`,
        'GET'
      );

      return response;

    } catch (error) {
      console.error(`❌ Error getting OpenAI credentials for ${instanceName}:`, error);
      throw error;
    }
  }

  /**
   * Delete OpenAI credentials for an instance
   */
  async deleteCredentials(instanceName: string, credentialsId: string): Promise<any> {
    try {
      console.log(`🗑️ Deleting OpenAI credentials ${credentialsId} for instance: ${instanceName}`);

      const response = await this.evolutionAPI.makeRequest(
        `/openai/creds/${instanceName}`,
        'DELETE',
        { id: credentialsId }
      );

      console.log(`✅ OpenAI credentials deleted successfully`);
      return response;

    } catch (error) {
      console.error(`❌ Error deleting OpenAI credentials:`, error);
      throw error;
    }
  }

  // =====================================================
  // BOT MANAGEMENT
  // =====================================================

  /**
   * Create OpenAI bot for appointment booking
   */
  async createAppointmentBot(instanceName: string, config: Partial<OpenAIBotConfig>): Promise<any> {
    try {
      console.log(`🤖 Creating appointment bot for instance: ${instanceName}`);

      // Default configuration for appointment booking
      const defaultConfig: OpenAIBotConfig = {
        enabled: true,
        openaiCredsId: config.openaiCredsId!,
        botType: 'chatCompletion',
        model: 'gpt-4',
        systemMessages: [
          `Eres un asistente virtual especializado en agendar citas médicas para una clínica de optometría.

CONTEXTO:
- Trabajas para una clínica de optometría especializada en salud visual
- Puedes ayudar con: agendar citas, reagendar, cancelar, consultar disponibilidad
- Servicios disponibles: Examen Visual Completo, Terapia Visual, Adaptación de Lentes de Contacto, Control Visual Rápido
- Doctores disponibles: Dr. Elena López (Optometría Pediátrica), Dr. Ana Rodríguez (Optometría Clínica), Dr. Pedro Sánchez (Contactología Avanzada)

REGLAS IMPORTANTES:
1. Las citas deben agendarse con al menos 24 horas de anticipación
2. Horario de atención: Lunes a Viernes 8:00 AM - 6:00 PM, Sábados 8:00 AM - 2:00 PM
3. Siempre confirma los datos antes de proceder
4. Si no puedes resolver algo, deriva a un humano

FLUJO DE CONVERSACIÓN:
1. Saluda cordialmente
2. Pregunta qué necesita (agendar, reagendar, cancelar, consultar)
3. Para agendar: solicita servicio, fecha preferida, hora preferida, doctor preferido (opcional)
4. Confirma disponibilidad
5. Confirma todos los datos antes de finalizar
6. Proporciona número de confirmación

Responde siempre en español de manera profesional y amigable.`
        ],
        assistantMessages: [
          '¡Hola! 👋 Soy el asistente virtual de la clínica. Estoy aquí para ayudarte con tus citas de optometría. ¿En qué puedo asistirte hoy?\n\n• Agendar una nueva cita\n• Reagendar una cita existente\n• Cancelar una cita\n• Consultar disponibilidad'
        ],
        userMessages: [
          'Hola, quiero agendar una cita'
        ],
        maxTokens: 500,
        triggerType: 'all',
        triggerOperator: 'none',
        expire: 30, // 30 minutes
        keywordFinish: '#SALIR',
        delayMessage: 2000,
        unknownMessage: 'Disculpa, no entendí tu mensaje. ¿Podrías reformularlo? Si necesitas ayuda inmediata, escribe #HUMANO para hablar con nuestro personal.',
        listeningFromMe: false,
        stopBotFromMe: false,
        keepOpen: true,
        debounceTime: 5,
        ignoreJids: [],
        ...config
      };

      const response = await this.evolutionAPI.makeRequest(
        `/openai/create/${instanceName}`,
        'POST',
        defaultConfig
      );

      console.log(`✅ Appointment bot created successfully for ${instanceName}`);
      return response;

    } catch (error) {
      console.error(`❌ Error creating appointment bot for ${instanceName}:`, error);
      throw error;
    }
  }

  /**
   * Get all OpenAI bots for an instance
   */
  async getBots(instanceName: string): Promise<any> {
    try {
      const response = await this.evolutionAPI.makeRequest(
        `/openai/find/${instanceName}`,
        'GET'
      );

      return response;

    } catch (error) {
      console.error(`❌ Error getting bots for ${instanceName}:`, error);
      throw error;
    }
  }

  /**
   * Get specific OpenAI bot
   */
  async getBot(instanceName: string, botId: string): Promise<any> {
    try {
      const response = await this.evolutionAPI.makeRequest(
        `/openai/fetch/${instanceName}`,
        'GET',
        { id: botId }
      );

      return response;

    } catch (error) {
      console.error(`❌ Error getting bot ${botId} for ${instanceName}:`, error);
      throw error;
    }
  }

  /**
   * Update OpenAI bot configuration
   */
  async updateBot(instanceName: string, botId: string, config: Partial<OpenAIBotConfig>): Promise<any> {
    try {
      console.log(`🔄 Updating bot ${botId} for instance: ${instanceName}`);

      const response = await this.evolutionAPI.makeRequest(
        `/openai/update/${instanceName}`,
        'PUT',
        { id: botId, ...config }
      );

      console.log(`✅ Bot updated successfully`);
      return response;

    } catch (error) {
      console.error(`❌ Error updating bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Delete OpenAI bot
   */
  async deleteBot(instanceName: string, botId: string): Promise<any> {
    try {
      console.log(`🗑️ Deleting bot ${botId} for instance: ${instanceName}`);

      const response = await this.evolutionAPI.makeRequest(
        `/openai/delete/${instanceName}`,
        'DELETE',
        { id: botId }
      );

      console.log(`✅ Bot deleted successfully`);
      return response;

    } catch (error) {
      console.error(`❌ Error deleting bot ${botId}:`, error);
      throw error;
    }
  }

  // =====================================================
  // SESSION MANAGEMENT
  // =====================================================

  /**
   * Change bot session status for a contact
   */
  async changeSessionStatus(instanceName: string, sessionStatus: BotSessionStatus): Promise<any> {
    try {
      console.log(`🔄 Changing session status for ${sessionStatus.remoteJid} to ${sessionStatus.status}`);

      const response = await this.evolutionAPI.makeRequest(
        `/openai/changeStatus/${instanceName}`,
        'POST',
        sessionStatus
      );

      console.log(`✅ Session status changed successfully`);
      return response;

    } catch (error) {
      console.error(`❌ Error changing session status:`, error);
      throw error;
    }
  }

  // =====================================================
  // DEFAULT SETTINGS
  // =====================================================

  /**
   * Set default OpenAI settings for an instance
   */
  async setDefaultSettings(instanceName: string, settings: Partial<OpenAIDefaultSettings>): Promise<any> {
    try {
      console.log(`⚙️ Setting default OpenAI settings for instance: ${instanceName}`);

      const defaultSettings: OpenAIDefaultSettings = {
        expire: 30,
        keywordFinish: '#SALIR',
        delayMessage: 2000,
        unknownMessage: 'Disculpa, no entendí tu mensaje. ¿Podrías reformularlo?',
        listeningFromMe: false,
        stopBotFromMe: false,
        keepOpen: true,
        debounceTime: 5,
        ignoreJids: [],
        speechToText: true,
        ...settings
      };

      const response = await this.evolutionAPI.makeRequest(
        `/openai/settings/${instanceName}`,
        'POST',
        defaultSettings
      );

      console.log(`✅ Default settings configured successfully`);
      return response;

    } catch (error) {
      console.error(`❌ Error setting default settings for ${instanceName}:`, error);
      throw error;
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Enable bot for an instance
   */
  async enableBot(instanceName: string, botId: string): Promise<any> {
    return this.updateBot(instanceName, botId, { enabled: true });
  }

  /**
   * Disable bot for an instance
   */
  async disableBot(instanceName: string, botId: string): Promise<any> {
    return this.updateBot(instanceName, botId, { enabled: false });
  }

  /**
   * Pause bot session for a contact
   */
  async pauseSession(instanceName: string, contactJid: string): Promise<any> {
    return this.changeSessionStatus(instanceName, {
      remoteJid: contactJid,
      status: 'paused'
    });
  }

  /**
   * Resume bot session for a contact
   */
  async resumeSession(instanceName: string, contactJid: string): Promise<any> {
    return this.changeSessionStatus(instanceName, {
      remoteJid: contactJid,
      status: 'opened'
    });
  }

  /**
   * Close bot session for a contact
   */
  async closeSession(instanceName: string, contactJid: string): Promise<any> {
    return this.changeSessionStatus(instanceName, {
      remoteJid: contactJid,
      status: 'closed'
    });
  }
}
