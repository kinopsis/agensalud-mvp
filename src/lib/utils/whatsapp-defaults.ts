/**
 * WhatsApp Instance Auto-Configuration Utilities
 * 
 * Provides system defaults and auto-configuration for simplified WhatsApp instance creation.
 * Handles webhook URL generation, Evolution API settings, AI bot configuration, and business hours.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import type { ChannelInstanceConfig, WhatsAppChannelConfig } from '@/types/channels';

// =====================================================
// SYSTEM DEFAULTS
// =====================================================

/**
 * Default AI configuration for medical appointment booking
 */
export const DEFAULT_AI_CONFIG = {
  enabled: true,
  model: 'gpt-3.5-turbo' as const,
  temperature: 0.7,
  max_tokens: 1000,
  timeout_seconds: 30,
  custom_prompt: `Eres un asistente médico virtual especializado en agendar citas médicas. 

Tu función principal es:
1. Ayudar a los pacientes a agendar citas médicas
2. Proporcionar información sobre servicios disponibles
3. Confirmar datos del paciente (nombre, teléfono, documento)
4. Sugerir horarios disponibles
5. Confirmar la cita agendada

Instrucciones importantes:
- Siempre mantén un tono profesional y empático
- Solicita información completa antes de agendar
- Confirma todos los datos antes de proceder
- Si no puedes resolver algo, deriva al personal médico
- Responde en español de forma clara y concisa

Información que debes solicitar para agendar:
- Nombre completo del paciente
- Número de documento de identidad
- Teléfono de contacto
- Tipo de consulta o especialidad
- Preferencia de fecha y hora

Responde siempre de manera útil y profesional.`
};

/**
 * Default business hours configuration (Colombian timezone)
 */
export const DEFAULT_BUSINESS_HOURS = {
  enabled: true,
  timezone: 'America/Bogota',
  schedule: {
    monday: { start: '08:00', end: '18:00', enabled: true },
    tuesday: { start: '08:00', end: '18:00', enabled: true },
    wednesday: { start: '08:00', end: '18:00', enabled: true },
    thursday: { start: '08:00', end: '18:00', enabled: true },
    friday: { start: '08:00', end: '18:00', enabled: true },
    saturday: { start: '09:00', end: '14:00', enabled: true },
    sunday: { start: '09:00', end: '14:00', enabled: false }
  }
};

/**
 * Default webhook events for medical appointment system
 */
export const DEFAULT_WEBHOOK_EVENTS = [
  'MESSAGE_RECEIVED',
  'CONNECTION_UPDATE',
  'QR_UPDATED',
  'APPOINTMENT_CREATED',
  'APPOINTMENT_UPDATED',
  'APPOINTMENT_CANCELLED',
  'PATIENT_REGISTERED',
  'BOT_SESSION_STARTED',
  'BOT_SESSION_ENDED'
];

/**
 * Default limits for WhatsApp instances
 */
export const DEFAULT_LIMITS = {
  max_concurrent_chats: 50,
  message_rate_limit: 60, // messages per minute
  session_timeout_minutes: 30
};

/**
 * Default WhatsApp features configuration
 */
export const DEFAULT_WHATSAPP_FEATURES = {
  read_receipts: true,
  typing_indicator: true,
  presence_update: true
};

/**
 * Default QR code configuration
 */
export const DEFAULT_QR_CONFIG = {
  enabled: true,
  auto_refresh: true,
  refresh_interval_minutes: 0.5 // 30 seconds
};

// =====================================================
// AUTO-CONFIGURATION FUNCTIONS
// =====================================================

/**
 * Generate webhook URL for organization
 */
export function generateWebhookURL(organizationId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://agendia.torrecentral.com';
  return `${baseUrl}/api/channels/whatsapp/webhook/${organizationId}`;
}

/**
 * Generate webhook secret for organization
 */
export function generateWebhookSecret(): string {
  // Generate a secure random secret
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate Evolution API instance name from user input
 *
 * @param instanceName - Instance name to clean and format
 * @param organizationId - Organization ID for uniqueness
 * @returns Formatted instance name for Evolution API
 */
export function generateInstanceName(instanceName: string, organizationId: string): string {
  // Handle null/undefined instance name
  if (!instanceName || typeof instanceName !== 'string') {
    instanceName = 'whatsapp-instance';
  }

  // Clean and format instance name
  const cleanName = instanceName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 20);

  // Handle null/undefined organization ID
  const safeOrgId = organizationId && typeof organizationId === 'string' ? organizationId : 'default-org';

  // Add organization prefix for uniqueness
  const orgPrefix = safeOrgId.substring(0, 8);
  return `${orgPrefix}-${cleanName}`;
}

/**
 * Get Evolution API configuration from environment
 */
export function getEvolutionAPIConfig() {
  return {
    base_url: process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080',
    api_key: process.env.EVOLUTION_API_KEY || '',
    version: 'v2' as const
  };
}

/**
 * Create auto-configured WhatsApp channel configuration
 */
export function createAutoWhatsAppConfig(
  phoneNumber: string,
  instanceName: string,
  organizationId: string,
  skipConnection: boolean = false
): WhatsAppChannelConfig {
  const evolutionConfig = getEvolutionAPIConfig();

  return {
    phone_number: phoneNumber,
    evolution_api: {
      base_url: evolutionConfig.base_url,
      api_key: evolutionConfig.api_key,
      instance_name: generateInstanceName(instanceName, organizationId)
    },
    qr_code: {
      ...DEFAULT_QR_CONFIG,
      enabled: !skipConnection, // Disable QR code for two-step flow
      auto_refresh: !skipConnection
    },
    features: DEFAULT_WHATSAPP_FEATURES
  };
}

/**
 * Create complete auto-configured channel instance configuration
 */
export function createAutoChannelConfig(
  phoneNumber: string,
  instanceName: string,
  organizationId: string,
  skipConnection: boolean = false
): ChannelInstanceConfig {
  const webhookUrl = generateWebhookURL(organizationId);
  const webhookSecret = generateWebhookSecret();

  return {
    auto_reply: true,
    business_hours: DEFAULT_BUSINESS_HOURS,
    ai_config: DEFAULT_AI_CONFIG,
    webhook: {
      url: webhookUrl,
      secret: webhookSecret,
      events: DEFAULT_WEBHOOK_EVENTS
    },
    limits: DEFAULT_LIMITS,
    whatsapp: createAutoWhatsAppConfig(phoneNumber, instanceName, organizationId, skipConnection)
  };
}

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

/**
 * Validate phone number format (international) with enhanced flexibility
 *
 * @param phoneNumber - Phone number to validate
 * @param allowEmpty - Whether to allow empty phone numbers (for QR code flow)
 * @returns True if phone number is valid or empty (when allowed)
 *
 * @example
 * validatePhoneNumber('+57300123456') // true
 * validatePhoneNumber('57300123456') // true (auto-normalized)
 * validatePhoneNumber('', true) // true (empty allowed for QR code flow)
 * validatePhoneNumber('', false) // false (empty not allowed)
 */
export function validatePhoneNumber(phoneNumber: string, allowEmpty: boolean = false): boolean {
  // Allow empty for QR code flow where phone number is optional
  if (allowEmpty && (!phoneNumber || phoneNumber.trim() === '')) {
    return true;
  }

  // If phone number provided, validate and normalize
  if (phoneNumber && phoneNumber.trim()) {
    // Auto-normalize (add + if missing for international numbers)
    const normalized = phoneNumber.trim().startsWith('+') ? phoneNumber.trim() : `+${phoneNumber.trim()}`;

    // International format: +[country code][number] (10-15 digits)
    const phoneRegex = /^\+\d{10,15}$/;
    return phoneRegex.test(normalized);
  }

  // If not allowing empty and no valid phone number provided
  return allowEmpty;
}

/**
 * Normalize phone number to international format
 *
 * @param phoneNumber - Phone number to normalize
 * @returns Normalized phone number with + prefix, or empty string if invalid
 *
 * @example
 * normalizePhoneNumber('57300123456') // '+57300123456'
 * normalizePhoneNumber('+57300123456') // '+57300123456'
 * normalizePhoneNumber('') // ''
 * normalizePhoneNumber('   ') // ''
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber || !phoneNumber.trim()) {
    return '';
  }

  const trimmed = phoneNumber.trim();
  return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
}

/**
 * Validate instance name
 */
export function validateInstanceName(instanceName: string): boolean {
  // Must be 3-50 characters, alphanumeric, spaces, hyphens, and underscores
  const nameRegex = /^[a-zA-Z0-9\s\-_]{3,50}$/;
  return nameRegex.test(instanceName);
}

/**
 * Get validation errors for simplified form with QR code flow support
 *
 * @param instanceName - Instance name to validate
 * @param phoneNumber - Phone number to validate
 * @param isQRCodeFlow - Whether this is for QR code flow (allows empty phone number)
 * @returns Object with validation errors, empty if all valid
 *
 * @example
 * getValidationErrors('MyInstance', '+57300123456', true) // {}
 * getValidationErrors('MyInstance', '57300123456', true) // {} (auto-normalized)
 * getValidationErrors('MyInstance', '', true) // {} (empty allowed for QR code)
 * getValidationErrors('MyInstance', '', false) // { phone_number: '...' }
 */
export function getValidationErrors(instanceName: string, phoneNumber: string, isQRCodeFlow: boolean = true): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!validateInstanceName(instanceName)) {
    errors.instance_name = 'El nombre debe tener entre 3 y 50 caracteres (letras, números, espacios, guiones y guiones bajos)';
  }

  // Enhanced phone number validation with QR code flow context
  if (!validatePhoneNumber(phoneNumber, isQRCodeFlow)) {
    if (isQRCodeFlow) {
      errors.phone_number = 'Formato inválido. Usa formato internacional (ej: +57300123456) o déjalo vacío para detectar automáticamente';
    } else {
      errors.phone_number = 'Ingresa un número válido en formato internacional (ej: +57300123456)';
    }
  }

  return errors;
}

// =====================================================
// MEDICAL MESSAGE TEMPLATES
// =====================================================

/**
 * Pre-configured medical appointment message templates
 */
export const MEDICAL_MESSAGE_TEMPLATES = {
  welcome: `¡Hola! 👋 Bienvenido/a al sistema de citas médicas de {organization_name}.

Soy tu asistente virtual y estoy aquí para ayudarte a:
📅 Agendar citas médicas
ℹ️ Consultar información sobre servicios
📞 Conectarte con nuestro personal

¿En qué puedo ayudarte hoy?`,

  appointment_confirmation: `✅ *Cita Confirmada*

📅 **Fecha:** {date}
🕐 **Hora:** {time}
👨‍⚕️ **Especialista:** {doctor}
📍 **Ubicación:** {location}
📞 **Teléfono:** {phone}

*Importante:*
• Llega 15 minutos antes
• Trae tu documento de identidad
• Si necesitas cancelar, hazlo con 2 horas de anticipación

¿Necesitas algo más?`,

  appointment_reminder: `🔔 *Recordatorio de Cita*

Tienes una cita médica programada para:
📅 **Mañana {date}** a las **{time}**

👨‍⚕️ **Con:** {doctor}
📍 **En:** {location}

Por favor confirma tu asistencia respondiendo "SÍ" o "NO".`,

  outside_hours: `🕐 Actualmente estamos fuera de nuestro horario de atención.

**Horarios de atención:**
Lunes a Viernes: 8:00 AM - 6:00 PM
Sábados: 9:00 AM - 2:00 PM

Para emergencias médicas, contacta al: {emergency_phone}

Te responderemos tan pronto como sea posible. ¡Gracias!`,

  error_fallback: `Lo siento, no pude procesar tu solicitud en este momento. 😔

Por favor:
• Intenta nuevamente en unos minutos
• O contacta directamente a: {phone}

Nuestro equipo te ayudará personalmente.`
};

export default {
  DEFAULT_AI_CONFIG,
  DEFAULT_BUSINESS_HOURS,
  DEFAULT_WEBHOOK_EVENTS,
  DEFAULT_LIMITS,
  DEFAULT_WHATSAPP_FEATURES,
  DEFAULT_QR_CONFIG,
  generateWebhookURL,
  generateWebhookSecret,
  generateInstanceName,
  getEvolutionAPIConfig,
  createAutoWhatsAppConfig,
  createAutoChannelConfig,
  validatePhoneNumber,
  normalizePhoneNumber,
  validateInstanceName,
  getValidationErrors,
  MEDICAL_MESSAGE_TEMPLATES
};
