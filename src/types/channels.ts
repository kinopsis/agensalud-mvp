/**
 * Unified Channel Types for AgentSalud MVP
 * 
 * Base types and interfaces for multi-channel communication system
 * supporting WhatsApp, Telegram, Voice, and future channels.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import type { Database } from './database';

// =====================================================
// CORE CHANNEL TYPES
// =====================================================

export enum ChannelType {
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  VOICE = 'voice',
  SMS = 'sms',
  EMAIL = 'email'
}

export enum ChannelStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  ERROR = 'error',
  SUSPENDED = 'suspended',
  MAINTENANCE = 'maintenance'
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
  LOCATION = 'location',
  CONTACT = 'contact',
  STICKER = 'sticker'
}

export enum MessageIntent {
  APPOINTMENT_BOOKING = 'appointment_booking',
  APPOINTMENT_INQUIRY = 'appointment_inquiry',
  APPOINTMENT_RESCHEDULE = 'appointment_reschedule',
  APPOINTMENT_CANCEL = 'appointment_cancel',
  GENERAL_INQUIRY = 'general_inquiry',
  EMERGENCY = 'emergency',
  GREETING = 'greeting',
  UNKNOWN = 'unknown'
}

// =====================================================
// CHANNEL INSTANCE TYPES
// =====================================================

export interface ChannelInstance {
  id: string;
  organization_id: string;
  channel_type: ChannelType;
  instance_name: string;
  status: ChannelStatus;
  config: ChannelInstanceConfig;
  created_at: string;
  updated_at: string;
  last_activity?: string;
  error_message?: string;
}

export interface ChannelInstanceConfig {
  // Common configuration for all channels
  auto_reply: boolean;
  business_hours: {
    enabled: boolean;
    timezone: string;
    schedule: {
      [key: string]: { start: string; end: string; enabled: boolean };
    };
  };
  ai_config: {
    enabled: boolean;
    model: string;
    temperature: number;
    max_tokens: number;
    timeout_seconds: number;
    custom_prompt?: string;
  };
  webhook: {
    url: string;
    secret: string;
    events: string[];
  };
  limits: {
    max_concurrent_chats: number;
    message_rate_limit: number;
    session_timeout_minutes: number;
  };
  
  // Channel-specific configuration
  whatsapp?: WhatsAppChannelConfig;
  telegram?: TelegramChannelConfig;
  voice?: VoiceChannelConfig;
}

// =====================================================
// CHANNEL-SPECIFIC CONFIGURATIONS
// =====================================================

export interface WhatsAppChannelConfig {
  phone_number: string;
  business_id?: string;
  evolution_api: {
    base_url: string;
    api_key: string;
    instance_name: string;
  };
  qr_code: {
    enabled: boolean;
    auto_refresh: boolean;
    refresh_interval_minutes: number;
  };
  features: {
    read_receipts: boolean;
    typing_indicator: boolean;
    presence_update: boolean;
  };
}

export interface TelegramChannelConfig {
  bot_token: string;
  bot_username: string;
  webhook_url: string;
  commands: {
    start: string;
    help: string;
    cancel: string;
    book: string;
  };
  features: {
    inline_keyboards: boolean;
    file_uploads: boolean;
    group_support: boolean;
  };
}

export interface VoiceChannelConfig {
  provider: 'twilio' | 'vonage' | 'custom';
  phone_numbers: string[];
  tts_config: {
    voice: string;
    language: string;
    speed: number;
  };
  asr_config: {
    language: string;
    model: string;
    timeout_seconds: number;
  };
  call_flow: {
    greeting_message: string;
    menu_options: string[];
    transfer_number?: string;
  };
}

// =====================================================
// MESSAGE TYPES
// =====================================================

export interface IncomingMessage {
  id: string;
  channel_type: ChannelType;
  instance_id: string;
  conversation_id: string;
  sender: MessageSender;
  content: MessageContent;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface MessageSender {
  id: string;
  name?: string;
  phone?: string;
  username?: string;
  is_verified?: boolean;
}

export interface MessageContent {
  type: MessageType;
  text?: string;
  media_url?: string;
  media_type?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  contact?: {
    name: string;
    phone: string;
    email?: string;
  };
}

export interface OutgoingMessage {
  conversation_id: string;
  content: MessageContent;
  reply_to?: string;
  metadata?: Record<string, any>;
}

// =====================================================
// CONVERSATION TYPES
// =====================================================

export interface ChannelConversation {
  id: string;
  channel_type: ChannelType;
  instance_id: string;
  patient_id?: string;
  contact_info: ContactInfo;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  message_count: number;
  ai_context?: AIConversationContext;
}

export interface ContactInfo {
  jid: string; // Channel-specific identifier
  name?: string;
  phone?: string;
  username?: string;
  profile_picture?: string;
}

export enum ConversationStatus {
  ACTIVE = 'active',
  WAITING = 'waiting',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
  ARCHIVED = 'archived'
}

export interface AIConversationContext {
  current_intent?: MessageIntent;
  extracted_entities?: Record<string, any>;
  conversation_stage?: string;
  pending_actions?: string[];
  confidence_score?: number;
}

// =====================================================
// PROCESSING TYPES
// =====================================================

export interface MessageProcessingResult {
  success: boolean;
  intent: MessageIntent;
  entities: ExtractedEntities;
  response: string;
  next_actions: string[];
  confidence: number;
  error?: string;
}

export interface ExtractedEntities {
  specialty?: string;
  date?: string;
  time?: string;
  doctor_name?: string;
  urgency?: 'low' | 'medium' | 'high' | 'emergency';
  symptoms?: string[];
  patient_info?: {
    name?: string;
    id_number?: string;
    phone?: string;
  };
}

// =====================================================
// APPOINTMENT INTEGRATION TYPES
// =====================================================

export interface ChannelBookingRequest {
  channel_type: ChannelType;
  conversation_id: string;
  patient_id?: string;
  specialty: string;
  preferred_date: string;
  preferred_time?: string;
  urgency?: 'low' | 'medium' | 'high' | 'emergency';
  symptoms?: string[];
  notes?: string;
}

export interface ChannelBookingResult {
  success: boolean;
  appointment_id?: string;
  message: string;
  available_slots?: any[];
  next_step?: 'confirm_slot' | 'provide_patient_info' | 'suggest_alternatives';
  error?: string;
}

export interface ChannelAppointmentQuery {
  channel_type: ChannelType;
  conversation_id: string;
  patient_id?: string;
  appointment_id?: string;
  status?: string[];
}

// =====================================================
// METRICS AND ANALYTICS TYPES
// =====================================================

export interface ChannelMetrics {
  channel_type: ChannelType;
  instance_id: string;
  period: {
    start: string;
    end: string;
  };
  conversations: {
    total: number;
    active: number;
    resolved: number;
    escalated: number;
  };
  messages: {
    total: number;
    incoming: number;
    outgoing: number;
    automated: number;
  };
  appointments: {
    created: number;
    confirmed: number;
    cancelled: number;
    success_rate: number;
  };
  ai_performance: {
    intent_accuracy: number;
    entity_extraction_accuracy: number;
    response_time_avg: number;
    fallback_rate: number;
  };
}

export interface UnifiedChannelMetrics {
  organization_id: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    total_channels: number;
    active_channels: number;
    total_conversations: number;
    total_appointments: number;
    overall_success_rate: number;
  };
  by_channel: {
    [key in ChannelType]?: ChannelMetrics[];
  };
  trends: {
    conversations: TimeSeriesData[];
    appointments: TimeSeriesData[];
    success_rate: TimeSeriesData[];
  };
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
  channel_type?: ChannelType;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface ChannelAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    request_id: string;
    organization_id: string;
    channel_type: ChannelType;
  };
}

export interface ChannelInstanceListResponse {
  instances: ChannelInstance[];
  total: number;
  page: number;
  limit: number;
  filters?: {
    channel_type?: ChannelType;
    status?: ChannelStatus;
    organization_id?: string;
  };
}

export interface ConversationListResponse {
  conversations: (ChannelConversation & {
    last_message?: IncomingMessage;
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
// SERVICE INTERFACES
// =====================================================

export interface ChannelService {
  // Instance management
  createInstance(organizationId: string, config: ChannelInstanceConfig): Promise<ChannelInstance>;
  updateInstance(instanceId: string, updates: Partial<ChannelInstanceConfig>): Promise<ChannelInstance>;
  deleteInstance(instanceId: string): Promise<void>;
  getInstance(instanceId: string): Promise<ChannelInstance | null>;
  getInstances(organizationId: string): Promise<ChannelInstance[]>;
  getInstanceStatus(instanceId: string): Promise<ChannelStatus>;
  
  // Message handling
  sendMessage(instanceId: string, message: OutgoingMessage): Promise<void>;
  processIncomingMessage(message: IncomingMessage): Promise<MessageProcessingResult>;
  
  // Conversation management
  getConversations(instanceId: string, filters?: any): Promise<ChannelConversation[]>;
  updateConversationStatus(conversationId: string, status: ConversationStatus): Promise<void>;
  
  // Metrics and analytics
  getMetrics(instanceId: string, period: { start: string; end: string }): Promise<ChannelMetrics>;
}

export default ChannelService;
