# Convenciones de Nomenclatura Multi-Canal

## 📋 **CONVENCIONES GENERALES**

### **Estructura de Archivos**
```
src/lib/channels/
├── core/                           # Abstracciones base
│   ├── BaseChannelService.ts       # Servicio base
│   ├── BaseMessageProcessor.ts     # Procesador base
│   └── BaseAppointmentService.ts   # Servicio de citas base
├── {channel}/                      # Implementaciones específicas
│   ├── {Channel}ChannelService.ts  # Servicio del canal
│   ├── {Channel}MessageProcessor.ts # Procesador del canal
│   ├── {Channel}AppointmentService.ts # Servicio de citas del canal
│   └── {Channel}Validator.ts       # Validaciones específicas
└── ChannelManager.ts               # Gestor unificado
```

### **Nomenclatura de Clases**
- **Servicios**: `{Channel}ChannelService` (ej. `WhatsAppChannelService`)
- **Procesadores**: `{Channel}MessageProcessor` (ej. `TelegramMessageProcessor`)
- **Servicios de Citas**: `{Channel}AppointmentService` (ej. `VoiceAppointmentService`)
- **Validadores**: `{Channel}Validator` (ej. `WhatsAppValidator`)

### **Nomenclatura de Componentes**
```typescript
// Componentes genéricos
ChannelDashboard.tsx
ChannelInstanceCard.tsx
ChannelMetrics.tsx
ChannelConfiguration.tsx

// Componentes específicos
src/components/channels/{channel}/
├── {Channel}InstanceCard.tsx       # WhatsAppInstanceCard.tsx
├── {Channel}Configuration.tsx      # TelegramConfiguration.tsx
└── {Channel}Metrics.tsx           # VoiceMetrics.tsx
```

### **Nomenclatura de APIs**
```
/api/channels/                      # APIs unificadas
├── route.ts                       # Lista todos los canales
├── {channel}/                     # APIs específicas por canal
│   ├── instances/
│   │   ├── route.ts              # CRUD de instancias
│   │   └── [id]/
│   │       ├── route.ts          # Operaciones específicas
│   │       ├── status/route.ts   # Estado de instancia
│   │       └── config/route.ts   # Configuración
│   ├── appointments/route.ts      # Operaciones de citas
│   └── webhook/route.ts          # Webhook del canal
└── unified/                       # APIs cross-channel
    ├── analytics/route.ts         # Métricas unificadas
    └── appointments/route.ts      # Citas cross-channel
```

### **Nomenclatura de Tipos**
```typescript
// Tipos base (en /src/types/channels.ts)
ChannelType
ChannelInstance
ChannelInstanceConfig
ChannelStatus
MessageIntent
ExtractedEntities

// Tipos específicos (en /src/types/{channel}.ts)
WhatsAppChannelConfig
TelegramChannelConfig
VoiceChannelConfig
WhatsAppMessage
TelegramUpdate
VoiceCall
```

### **Nomenclatura de Hooks**
```typescript
// Hooks genéricos
useChannelInstances()
useChannelMetrics()
useChannelStatus()

// Hooks específicos
useWhatsAppInstances()
useTelegramBots()
useVoiceNumbers()
useWhatsAppQRCode()
useTelegramCommands()
useVoiceCallStatus()
```

## 🎯 **PATRONES ESPECÍFICOS POR CANAL**

### **WhatsApp**
```typescript
// Servicios
WhatsAppChannelService
WhatsAppMessageProcessor
WhatsAppAppointmentService
WhatsAppValidator

// Componentes
WhatsAppInstanceCard
WhatsAppQRCodeDisplay
WhatsAppConfiguration
WhatsAppMetrics

// APIs
/api/channels/whatsapp/instances
/api/channels/whatsapp/qrcode
/api/channels/whatsapp/webhook

// Tipos
WhatsAppChannelConfig
WhatsAppMessage
WhatsAppConversation
WhatsAppQRCode

// Hooks
useWhatsAppInstances()
useWhatsAppQRCode()
useWhatsAppStatus()
```

### **Telegram**
```typescript
// Servicios
TelegramChannelService
TelegramMessageProcessor
TelegramAppointmentService
TelegramValidator

// Componentes
TelegramInstanceCard
TelegramBotConfiguration
TelegramCommandsManager
TelegramMetrics

// APIs
/api/channels/telegram/instances
/api/channels/telegram/commands
/api/channels/telegram/webhook

// Tipos
TelegramChannelConfig
TelegramUpdate
TelegramBot
TelegramCommand

// Hooks
useTelegramBots()
useTelegramCommands()
useTelegramUpdates()
```

### **Voice**
```typescript
// Servicios
VoiceChannelService
VoiceCallProcessor
VoiceAppointmentService
VoiceValidator

// Componentes
VoiceInstanceCard
VoiceNumberConfiguration
VoiceCallFlowManager
VoiceMetrics

// APIs
/api/channels/voice/instances
/api/channels/voice/numbers
/api/channels/voice/calls

// Tipos
VoiceChannelConfig
VoiceCall
VoiceNumber
VoiceCallFlow

// Hooks
useVoiceNumbers()
useVoiceCalls()
useVoiceCallFlow()
```

## 📁 **ESTRUCTURA DE CARPETAS DETALLADA**

```
src/
├── lib/
│   ├── channels/
│   │   ├── core/                           # Abstracciones base
│   │   │   ├── BaseChannelService.ts
│   │   │   ├── BaseMessageProcessor.ts
│   │   │   ├── BaseAppointmentService.ts
│   │   │   └── index.ts                   # Exports unificados
│   │   ├── whatsapp/                      # Canal WhatsApp
│   │   │   ├── WhatsAppChannelService.ts
│   │   │   ├── WhatsAppMessageProcessor.ts
│   │   │   ├── WhatsAppAppointmentService.ts
│   │   │   ├── WhatsAppValidator.ts
│   │   │   └── index.ts
│   │   ├── telegram/                      # Canal Telegram
│   │   │   ├── TelegramChannelService.ts
│   │   │   ├── TelegramMessageProcessor.ts
│   │   │   ├── TelegramAppointmentService.ts
│   │   │   ├── TelegramValidator.ts
│   │   │   └── index.ts
│   │   ├── voice/                         # Canal Voice
│   │   │   ├── VoiceChannelService.ts
│   │   │   ├── VoiceCallProcessor.ts
│   │   │   ├── VoiceAppointmentService.ts
│   │   │   ├── VoiceValidator.ts
│   │   │   └── index.ts
│   │   ├── ChannelManager.ts              # Gestor unificado
│   │   └── index.ts                       # Exports principales
│   └── services/                          # Servicios existentes
├── components/
│   ├── channels/                          # Componentes unificados
│   │   ├── ChannelDashboard.tsx          # Dashboard principal
│   │   ├── ChannelInstanceCard.tsx       # Tarjeta genérica
│   │   ├── ChannelMetrics.tsx            # Métricas unificadas
│   │   ├── ChannelConfiguration.tsx      # Configuración genérica
│   │   ├── whatsapp/                     # Componentes WhatsApp
│   │   │   ├── WhatsAppInstanceCard.tsx
│   │   │   ├── WhatsAppQRCodeDisplay.tsx
│   │   │   ├── WhatsAppConfiguration.tsx
│   │   │   └── index.ts
│   │   ├── telegram/                     # Componentes Telegram
│   │   │   ├── TelegramInstanceCard.tsx
│   │   │   ├── TelegramBotConfiguration.tsx
│   │   │   ├── TelegramCommandsManager.tsx
│   │   │   └── index.ts
│   │   ├── voice/                        # Componentes Voice
│   │   │   ├── VoiceInstanceCard.tsx
│   │   │   ├── VoiceNumberConfiguration.tsx
│   │   │   ├── VoiceCallFlowManager.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   └── dashboard/                         # Dashboards existentes
├── app/
│   ├── api/
│   │   ├── channels/                      # APIs unificadas
│   │   │   ├── route.ts                  # Lista canales
│   │   │   ├── whatsapp/                 # APIs WhatsApp
│   │   │   │   ├── instances/
│   │   │   │   ├── appointments/
│   │   │   │   ├── qrcode/
│   │   │   │   └── webhook/
│   │   │   ├── telegram/                 # APIs Telegram
│   │   │   │   ├── instances/
│   │   │   │   ├── appointments/
│   │   │   │   ├── commands/
│   │   │   │   └── webhook/
│   │   │   ├── voice/                    # APIs Voice
│   │   │   │   ├── instances/
│   │   │   │   ├── appointments/
│   │   │   │   ├── calls/
│   │   │   │   └── numbers/
│   │   │   └── unified/                  # APIs cross-channel
│   │   │       ├── analytics/
│   │   │       └── appointments/
│   │   └── whatsapp/                     # Mantener compatibilidad
│   └── admin/
│       └── channels/                     # Páginas administrativas
│           ├── page.tsx                  # Dashboard principal
│           ├── [channel]/
│           │   ├── page.tsx             # Lista de instancias
│           │   ├── create/
│           │   └── [id]/
│           │       ├── config/
│           │       └── metrics/
│           └── analytics/
├── types/
│   ├── channels.ts                       # Tipos unificados
│   ├── whatsapp.ts                      # Tipos WhatsApp específicos
│   ├── telegram.ts                      # Tipos Telegram específicos
│   ├── voice.ts                         # Tipos Voice específicos
│   └── index.ts
└── hooks/
    ├── channels/                         # Hooks unificados
    │   ├── useChannelInstances.ts
    │   ├── useChannelMetrics.ts
    │   ├── useChannelStatus.ts
    │   ├── whatsapp/                     # Hooks WhatsApp
    │   │   ├── useWhatsAppInstances.ts
    │   │   ├── useWhatsAppQRCode.ts
    │   │   └── index.ts
    │   ├── telegram/                     # Hooks Telegram
    │   │   ├── useTelegramBots.ts
    │   │   ├── useTelegramCommands.ts
    │   │   └── index.ts
    │   ├── voice/                        # Hooks Voice
    │   │   ├── useVoiceNumbers.ts
    │   │   ├── useVoiceCalls.ts
    │   │   └── index.ts
    │   └── index.ts
    └── dashboard/                        # Hooks existentes
```

## 🔧 **CONVENCIONES DE CÓDIGO**

### **Imports y Exports**
```typescript
// Imports organizados por categoría
import React from 'react';
import { useState, useEffect } from 'react';

import type { ChannelType, ChannelInstance } from '@/types/channels';
import type { WhatsAppChannelConfig } from '@/types/whatsapp';

import { BaseChannelService } from '@/lib/channels/core';
import { WhatsAppChannelService } from '@/lib/channels/whatsapp';

import { Button } from '@/components/ui/button';
import { ChannelInstanceCard } from '@/components/channels';

// Exports nombrados preferidos
export { WhatsAppChannelService };
export { TelegramChannelService };
export default ChannelManager;
```

### **Constantes y Configuración**
```typescript
// Constantes por canal
export const WHATSAPP_CONFIG = {
  DEFAULT_TIMEOUT: 30000,
  MAX_MESSAGE_LENGTH: 4096,
  SUPPORTED_MEDIA_TYPES: ['image', 'audio', 'video', 'document']
} as const;

export const TELEGRAM_CONFIG = {
  DEFAULT_TIMEOUT: 30000,
  MAX_MESSAGE_LENGTH: 4096,
  SUPPORTED_COMMANDS: ['/start', '/help', '/book', '/cancel']
} as const;

// Mapas de traducción
export const CHANNEL_DISPLAY_NAMES: Record<ChannelType, string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  voice: 'Llamadas de Voz',
  sms: 'SMS',
  email: 'Email'
};

export const STATUS_TRANSLATIONS: Record<ChannelStatus, string> = {
  connected: 'Conectado',
  disconnected: 'Desconectado',
  connecting: 'Conectando',
  error: 'Error',
  suspended: 'Suspendido',
  maintenance: 'Mantenimiento'
};
```

### **Documentación JSDoc**
```typescript
/**
 * WhatsApp Channel Service
 * 
 * @description Manages WhatsApp Business API integration through Evolution API v2
 * @extends BaseChannelService
 * 
 * @example
 * ```typescript
 * const service = new WhatsAppChannelService(supabase, organizationId);
 * const instance = await service.createInstance(organizationId, config);
 * ```
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */
export class WhatsAppChannelService extends BaseChannelService {
  /**
   * Create WhatsApp instance with QR code generation
   * 
   * @param organizationId - Organization identifier
   * @param config - WhatsApp-specific configuration
   * @returns Promise resolving to created instance
   * 
   * @throws {Error} When Evolution API is unreachable
   * @throws {Error} When configuration is invalid
   */
  async createInstance(organizationId: string, config: ChannelInstanceConfig): Promise<ChannelInstance> {
    // Implementation
  }
}
```

## ✅ **CHECKLIST DE IMPLEMENTACIÓN**

### **Para cada nuevo canal:**
- [ ] Crear carpeta `/src/lib/channels/{channel}/`
- [ ] Implementar `{Channel}ChannelService.ts`
- [ ] Implementar `{Channel}MessageProcessor.ts`
- [ ] Implementar `{Channel}AppointmentService.ts`
- [ ] Crear tipos en `/src/types/{channel}.ts`
- [ ] Crear componentes en `/src/components/channels/{channel}/`
- [ ] Crear APIs en `/src/app/api/channels/{channel}/`
- [ ] Crear hooks en `/src/hooks/channels/{channel}/`
- [ ] Registrar en `ChannelManager`
- [ ] Agregar tests en `/tests/channels/{channel}/`
- [ ] Documentar en `/docs/channels/{channel}.md`

### **Validaciones:**
- [ ] Nomenclatura consistente
- [ ] Exports organizados
- [ ] JSDoc completo
- [ ] Tests >80% cobertura
- [ ] Documentación actualizada
- [ ] Compatibilidad con sistema existente
