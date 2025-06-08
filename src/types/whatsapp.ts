/**
 * WhatsApp Integration Types for AgentSalud MVP
 * 
 * Types for Evolution API v2 integration, WhatsApp Business API,
 * and internal WhatsApp functionality with multi-tenant support.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { Database } from './database';

// =====================================================
// DATABASE TYPES (Re-exported for convenience)
// =====================================================

export type WhatsAppInstance = Database['public']['Tables']['whatsapp_instances']['Row'];
export type WhatsAppInstanceInsert = Database['public']['Tables']['whatsapp_instances']['Insert'];
export type WhatsAppInstanceUpdate = Database['public']['Tables']['whatsapp_instances']['Update'];

export type WhatsAppConversation = Database['public']['Tables']['whatsapp_conversations']['Row'];
export type WhatsAppConversationInsert = Database['public']['Tables']['whatsapp_conversations']['Insert'];
export type WhatsAppConversationUpdate = Database['public']['Tables']['whatsapp_conversations']['Update'];

export type WhatsAppMessage = Database['public']['Tables']['whatsapp_messages']['Row'];
export type WhatsAppMessageInsert = Database['public']['Tables']['whatsapp_messages']['Insert'];
export type WhatsAppMessageUpdate = Database['public']['Tables']['whatsapp_messages']['Update'];

export type WhatsAppAuditLog = Database['public']['Tables']['whatsapp_audit_log']['Row'];
export type WhatsAppAuditLogInsert = Database['public']['Tables']['whatsapp_audit_log']['Insert'];

// =====================================================
// WHATSAPP INSTANCE TYPES
// =====================================================

export type WhatsAppInstanceStatus = 'inactive' | 'connecting' | 'active' | 'error' | 'suspended';

export type WhatsAppInstanceConfig = {
  webhookUrl?: string;
  webhookEvents?: string[];
  autoReply?: boolean;
  sessionTimeout?: number;
  maxConcurrentChats?: number;
  businessHours?: {
    enabled: boolean;
    timezone: string;
    schedule: {
      [key: string]: { start: string; end: string; enabled: boolean };
    };
  };
};

// =====================================================
// CONVERSATION TYPES
// =====================================================

export type ConversationState = 'active' | 'paused' | 'closed' | 'archived';

export type ConversationContext = {
  currentIntent?: string;
  extractedEntities?: Record<string, any>;
  appointmentInProgress?: {
    serviceId?: string;
    doctorId?: string;
    preferredDate?: string;
    preferredTime?: string;
    locationId?: string;
    step: 'service' | 'doctor' | 'date' | 'time' | 'confirmation';
  };
  patientInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    verified: boolean;
  };
  lastActivity?: string;
  messageCount?: number;
};

// =====================================================
// MESSAGE TYPES
// =====================================================

export type MessageDirection = 'inbound' | 'outbound';

export type MessageType = 'text' | 'image' | 'audio' | 'document' | 'video' | 'location' | 'contact' | 'sticker';

export type MessageIntent = 
  | 'book_appointment'
  | 'check_appointment'
  | 'cancel_appointment'
  | 'reschedule_appointment'
  | 'get_info'
  | 'greeting'
  | 'goodbye'
  | 'help'
  | 'unknown';

export type ExtractedEntities = {
  service?: string;
  doctor?: string;
  date?: string;
  time?: string;
  location?: string;
  patientName?: string;
  phone?: string;
  email?: string;
  appointmentId?: string;
  intent?: MessageIntent;
  confidence?: number;
};

// =====================================================
// EVOLUTION API TYPES
// =====================================================

export interface EvolutionAPIConfig {
  baseUrl: string;
  apiKey: string;
  version: 'v2';
}

export interface EvolutionInstanceCreateRequest {
  instanceName: string;
  token?: string;
  number?: string;
  businessId?: string;
  qrcode: boolean;
  integration: 'WHATSAPP-BUSINESS' | 'WHATSAPP-BAILEYS';
}

export interface EvolutionInstanceResponse {
  instance: {
    instanceName: string;
    instanceId: string; // Added from confirmed response structure
    integration: 'WHATSAPP-BUSINESS' | 'WHATSAPP-BAILEYS';
    webhookWaBusiness: string | null;
    accessTokenWaBusiness: string;
    status: string;
  };
  hash: string; // Updated from confirmed response structure (not an object)
  webhook: Record<string, any>; // Generic object from confirmed response
  websocket: Record<string, any>; // Added from confirmed response
  rabbitmq: Record<string, any>; // Added from confirmed response
  sqs: Record<string, any>; // Added from confirmed response
  settings: {
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
    code: string;
    base64: string;
  };
}

export interface EvolutionWebhookEvent {
  event: string;
  instance: string;
  data: {
    key?: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      imageMessage?: {
        url: string;
        caption?: string;
      };
      audioMessage?: {
        url: string;
      };
      documentMessage?: {
        url: string;
        fileName: string;
        caption?: string;
      };
    };
    messageType: string;
    messageTimestamp: number;
  };
}

export interface EvolutionSendMessageRequest {
  number: string;
  text?: string;
  media?: {
    mediatype: 'image' | 'audio' | 'video' | 'document';
    media: string; // base64 or URL
    caption?: string;
    fileName?: string;
  };
}

// =====================================================
// AUDIT TYPES
// =====================================================

export type AuditAction = 
  | 'instance_created'
  | 'instance_connected'
  | 'instance_disconnected'
  | 'message_received'
  | 'message_sent'
  | 'conversation_started'
  | 'conversation_ended'
  | 'appointment_created'
  | 'appointment_cancelled'
  | 'patient_identified'
  | 'ai_response_generated'
  | 'error_occurred';

export type ActorType = 'patient' | 'staff' | 'admin' | 'system' | 'ai';

export interface AuditDetails {
  messageId?: string;
  appointmentId?: string;
  errorCode?: string;
  errorMessage?: string;
  aiModel?: string;
  processingTime?: number;
  metadata?: Record<string, any>;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface WhatsAppAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    organizationId: string;
  };
}

export interface WhatsAppInstanceListResponse {
  instances: WhatsAppInstance[];
  total: number;
  page: number;
  limit: number;
}

export interface ConversationListResponse {
  conversations: (WhatsAppConversation & {
    lastMessage?: WhatsAppMessage;
    messageCount?: number;
    patient?: {
      id: string;
      name: string;
      phone: string;
    };
  })[];
  total: number;
  page: number;
  limit: number;
}

// =====================================================
// WEBHOOK HANDLER TYPES
// =====================================================

export interface WebhookHandlerContext {
  organizationId: string;
  instanceId: string;
  event: EvolutionWebhookEvent;
  timestamp: Date;
}

export interface MessageProcessingResult {
  success: boolean;
  messageId: string;
  conversationId: string;
  intent?: MessageIntent;
  entities?: ExtractedEntities;
  aiResponse?: string;
  appointmentCreated?: boolean;
  error?: string;
}

// =====================================================
// SERVICE TYPES
// =====================================================

export interface WhatsAppService {
  // Instance management
  createInstance(organizationId: string, config: EvolutionInstanceCreateRequest): Promise<WhatsAppInstance>;
  updateInstance(instanceId: string, updates: WhatsAppInstanceUpdate): Promise<WhatsAppInstance>;
  deleteInstance(instanceId: string): Promise<void>;
  getInstances(organizationId: string): Promise<WhatsAppInstance[]>;
  
  // Message handling
  sendMessage(instanceId: string, request: EvolutionSendMessageRequest): Promise<void>;
  processIncomingMessage(event: EvolutionWebhookEvent): Promise<MessageProcessingResult>;
  
  // Conversation management
  getConversations(organizationId: string, filters?: any): Promise<ConversationListResponse>;
  updateConversationState(conversationId: string, state: ConversationState): Promise<void>;
  
  // Audit
  createAuditLog(entry: WhatsAppAuditLogInsert): Promise<string>;
}

// =====================================================
// CONFIGURATION TYPES
// =====================================================

export interface WhatsAppIntegrationConfig {
  evolutionApi: EvolutionAPIConfig;
  webhook: {
    url: string;
    secret: string;
    events: string[];
  };
  ai: {
    enabled: boolean;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  features: {
    autoReply: boolean;
    appointmentBooking: boolean;
    patientIdentification: boolean;
    businessHours: boolean;
  };
  limits: {
    maxConcurrentChats: number;
    messageRateLimit: number;
    sessionTimeout: number;
  };
}

export default WhatsAppIntegrationConfig;
