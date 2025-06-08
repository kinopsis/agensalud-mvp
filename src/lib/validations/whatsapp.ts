/**
 * WhatsApp Integration Validation Schemas
 * 
 * Zod schemas for validating WhatsApp API requests, Evolution API integration,
 * and WhatsApp instance management with multi-tenant support.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { z } from 'zod';

// =====================================================
// WHATSAPP INSTANCE SCHEMAS
// =====================================================

/**
 * Schema for creating a new WhatsApp instance
 */
export const createWhatsAppInstanceSchema = z.object({
  instance_name: z.string()
    .min(3, 'Instance name must be at least 3 characters')
    .max(50, 'Instance name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Instance name can only contain letters, numbers, underscores, and hyphens'),
  
  phone_number: z.string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in international format (+1234567890)'),
  
  business_id: z.string().optional(),
  
  webhook_url: z.string()
    .url('Webhook URL must be a valid URL')
    .optional(),
  
  evolution_api_config: z.object({
    integration: z.enum(['WHATSAPP-BUSINESS', 'WHATSAPP-BAILEYS']).default('WHATSAPP-BUSINESS'),
    qrcode: z.boolean().default(true),
    webhookEvents: z.array(z.string()).optional(),
    autoReply: z.boolean().default(false),
    sessionTimeout: z.number().min(300).max(86400).default(3600), // 5 minutes to 24 hours
    maxConcurrentChats: z.number().min(1).max(1000).default(100)
  }).optional().default({}),
  
  organization_id: z.string().uuid('Invalid organization ID').optional() // Will be set from user profile if not provided
});

/**
 * Schema for updating an existing WhatsApp instance
 */
export const updateWhatsAppInstanceSchema = z.object({
  instance_name: z.string()
    .min(3, 'Instance name must be at least 3 characters')
    .max(50, 'Instance name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Instance name can only contain letters, numbers, underscores, and hyphens')
    .optional(),
  
  phone_number: z.string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in international format (+1234567890)')
    .optional(),
  
  business_id: z.string().optional(),
  
  webhook_url: z.string()
    .url('Webhook URL must be a valid URL')
    .optional(),
  
  status: z.enum(['inactive', 'connecting', 'active', 'error', 'suspended']).optional(),
  
  evolution_api_config: z.object({
    integration: z.enum(['WHATSAPP-BUSINESS', 'WHATSAPP-BAILEYS']).optional(),
    qrcode: z.boolean().optional(),
    webhookEvents: z.array(z.string()).optional(),
    autoReply: z.boolean().optional(),
    sessionTimeout: z.number().min(300).max(86400).optional(),
    maxConcurrentChats: z.number().min(1).max(1000).optional()
  }).optional(),
  
  error_message: z.string().optional()
});

/**
 * Schema for WhatsApp instance query parameters
 */
export const whatsAppInstanceQuerySchema = z.object({
  organization_id: z.string().uuid('Invalid organization ID').optional(),
  status: z.enum(['inactive', 'connecting', 'active', 'error', 'suspended']).optional(),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
  search: z.string().optional()
});

// =====================================================
// EVOLUTION API SCHEMAS
// =====================================================

/**
 * Schema for Evolution API instance creation request
 */
export const evolutionInstanceCreateSchema = z.object({
  instanceName: z.string()
    .min(3, 'Instance name must be at least 3 characters')
    .max(50, 'Instance name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Instance name can only contain letters, numbers, underscores, and hyphens'),

  token: z.string().optional(),
  number: z.string().optional(),
  businessId: z.string().optional(),
  qrcode: z.boolean().default(true),
  integration: z.enum(['WHATSAPP-BUSINESS', 'WHATSAPP-BAILEYS', 'EVOLUTION']).default('WHATSAPP-BAILEYS')
});

/**
 * Schema for Evolution API webhook configuration
 */
export const evolutionWebhookConfigSchema = z.object({
  url: z.string().url('Webhook URL must be a valid URL'),
  events: z.array(z.string()).default([
    'messages.upsert',
    'messages.update',
    'connection.update',
    'qr.updated',
    'instance.created'
  ]),
  webhook_by_events: z.boolean().default(true)
});

/**
 * Schema for Evolution API send message request
 */
export const evolutionSendMessageSchema = z.object({
  number: z.string()
    .regex(/^\d{10,15}$/, 'Phone number must be 10-15 digits'),
  
  text: z.string()
    .min(1, 'Message text is required')
    .max(4096, 'Message text must be less than 4096 characters')
    .optional(),
  
  media: z.object({
    mediatype: z.enum(['image', 'audio', 'video', 'document']),
    media: z.string().min(1, 'Media content is required'), // base64 or URL
    caption: z.string().max(1024, 'Caption must be less than 1024 characters').optional(),
    fileName: z.string().max(255, 'File name must be less than 255 characters').optional()
  }).optional()
}).refine(data => data.text || data.media, {
  message: 'Either text or media must be provided'
});

// =====================================================
// WEBHOOK EVENT SCHEMAS
// =====================================================

/**
 * Schema for Evolution API webhook events
 */
export const evolutionWebhookEventSchema = z.object({
  event: z.string(),
  instance: z.string(),
  data: z.object({
    key: z.object({
      remoteJid: z.string(),
      fromMe: z.boolean(),
      id: z.string()
    }).optional(),
    pushName: z.string().optional(),
    message: z.object({
      conversation: z.string().optional(),
      imageMessage: z.object({
        url: z.string(),
        caption: z.string().optional()
      }).optional(),
      audioMessage: z.object({
        url: z.string()
      }).optional(),
      documentMessage: z.object({
        url: z.string(),
        fileName: z.string(),
        caption: z.string().optional()
      }).optional()
    }).optional(),
    messageType: z.string(),
    messageTimestamp: z.number()
  })
});

// =====================================================
// CONVERSATION SCHEMAS
// =====================================================

/**
 * Schema for creating a new conversation
 */
export const createConversationSchema = z.object({
  whatsapp_instance_id: z.string().uuid('Invalid WhatsApp instance ID'),
  contact_jid: z.string()
    .regex(/@s\.whatsapp\.net$/, 'Contact JID must be in WhatsApp format (phone@s.whatsapp.net)'),
  contact_name: z.string().optional(),
  patient_id: z.string().uuid('Invalid patient ID').optional(),
  context_data: z.record(z.any()).optional().default({})
});

/**
 * Schema for updating conversation state
 */
export const updateConversationSchema = z.object({
  conversation_state: z.enum(['active', 'paused', 'closed', 'archived']).optional(),
  context_data: z.record(z.any()).optional(),
  intent_detected: z.string().optional(),
  patient_id: z.string().uuid('Invalid patient ID').optional()
});

// =====================================================
// MESSAGE SCHEMAS
// =====================================================

/**
 * Schema for storing WhatsApp messages
 */
export const whatsAppMessageSchema = z.object({
  conversation_id: z.string().uuid('Invalid conversation ID'),
  message_id: z.string().min(1, 'Message ID is required'),
  direction: z.enum(['inbound', 'outbound']),
  message_type: z.enum(['text', 'image', 'audio', 'document', 'video', 'location', 'contact', 'sticker']),
  content: z.string().optional(),
  media_url: z.string().url().optional(),
  media_caption: z.string().optional(),
  intent_detected: z.string().optional(),
  extracted_entities: z.record(z.any()).optional().default({})
});

// =====================================================
// AUDIT LOG SCHEMAS
// =====================================================

/**
 * Schema for creating audit log entries
 */
export const whatsAppAuditLogSchema = z.object({
  organization_id: z.string().uuid('Invalid organization ID'),
  action: z.string().min(1, 'Action is required'),
  actor_id: z.string().uuid('Invalid actor ID').optional(),
  actor_type: z.enum(['patient', 'staff', 'admin', 'system', 'ai']).optional(),
  conversation_id: z.string().uuid('Invalid conversation ID').optional(),
  whatsapp_instance_id: z.string().uuid('Invalid WhatsApp instance ID').optional(),
  target_entity_type: z.string().optional(),
  target_entity_id: z.string().uuid().optional(),
  details: z.record(z.any()).optional().default({}),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  session_id: z.string().optional()
});

// =====================================================
// RESPONSE SCHEMAS
// =====================================================

/**
 * Schema for API response structure
 */
export const whatsAppAPIResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional()
  }).optional(),
  meta: z.object({
    timestamp: z.string(),
    requestId: z.string(),
    organizationId: z.string()
  }).optional()
});

// =====================================================
// TYPE EXPORTS
// =====================================================

export type CreateWhatsAppInstanceInput = z.infer<typeof createWhatsAppInstanceSchema>;
export type UpdateWhatsAppInstanceInput = z.infer<typeof updateWhatsAppInstanceSchema>;
export type WhatsAppInstanceQuery = z.infer<typeof whatsAppInstanceQuerySchema>;
export type EvolutionInstanceCreateInput = z.infer<typeof evolutionInstanceCreateSchema>;
export type EvolutionWebhookConfigInput = z.infer<typeof evolutionWebhookConfigSchema>;
export type EvolutionSendMessageInput = z.infer<typeof evolutionSendMessageSchema>;
export type EvolutionWebhookEvent = z.infer<typeof evolutionWebhookEventSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type WhatsAppMessageInput = z.infer<typeof whatsAppMessageSchema>;
export type WhatsAppAuditLogInput = z.infer<typeof whatsAppAuditLogSchema>;
export type WhatsAppAPIResponse = z.infer<typeof whatsAppAPIResponseSchema>;
