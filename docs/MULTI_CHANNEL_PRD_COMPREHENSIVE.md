# 📋 Multi-Channel Communication Platform PRD
## AgentSalud MVP - Comprehensive Product Requirements Document

**Version**: 2.0  
**Date**: January 28, 2025  
**Author**: AgentSalud Product Team  
**Status**: Implementation Ready

---

## 🎯 **EXECUTIVE SUMMARY**

### **Vision Statement**
Transform AgentSalud into a unified healthcare communication platform that enables seamless patient engagement across multiple channels (WhatsApp, Telegram, Voice) with AI-powered appointment booking and natural language processing.

### **Business Impact**
- **Patient Engagement**: 40% increase in appointment bookings through preferred communication channels
- **Operational Efficiency**: 60% reduction in manual appointment scheduling overhead
- **User Satisfaction**: Target >4.5/5 rating across all communication channels
- **Market Differentiation**: First healthcare platform in LATAM with unified multi-channel AI integration

### **Scope & Timeline**
- **Phase 1**: WhatsApp Optimization (2 weeks) - Radical UX improvements
- **Phase 2**: Telegram Integration (4 weeks) - Full bot implementation  
- **Phase 3**: Voice Channel (6 weeks) - TTS/STT integration
- **Phase 4**: Advanced Features (4 weeks) - Analytics, AI improvements

---

## 🏗️ **TECHNICAL ARCHITECTURE**

### **Unified API Structure**
```
/api/channels/
├── whatsapp/
│   ├── instances/          # CRUD operations
│   ├── webhook/           # Event handling
│   └── appointments/      # Booking integration
├── telegram/
│   ├── bots/             # Bot management
│   ├── webhook/          # Telegram events
│   └── commands/         # Bot commands
└── voice/
    ├── agents/           # Voice agent config
    ├── calls/            # Call management
    └── tts/              # Text-to-speech
```

### **Core Abstractions**
- **BaseChannelService**: Abstract service layer for all channels
- **BaseMessageProcessor**: Unified message handling and AI processing
- **BaseAppointmentService**: Channel-agnostic appointment operations
- **ChannelManager**: Factory pattern for channel instantiation

### **Data Architecture**
- **Multi-tenant Isolation**: Organization-based data separation with RLS policies
- **Unified Audit Trail**: Cross-channel activity logging for HIPAA compliance
- **Real-time Metrics**: WebSocket-based status updates and analytics
- **Scalable Storage**: Optimized for 100+ concurrent conversations per channel

---

## 🚀 **IMPLEMENTATION STRATEGY**

### **Phase 1: WhatsApp Radical Solution (2 weeks)**

#### **Current State Analysis**
- ✅ Technical foundation complete (Evolution API v2, webhooks, message processing)
- ⚠️ UX friction: 4-step creation process with manual input requirements
- ⚠️ Multiple QR components indicate reliability issues
- 🎯 Focus: Streamline user experience, not rebuild architecture

#### **Radical Solution Components**

**A. Single-Click Instance Creation**
```typescript
// Auto-naming pattern: {tenant-name}-whatsapp-{timestamp}
// Example: "clinica-salud-whatsapp-20250128143022"
const autoName = `${tenantName}-whatsapp-${Date.now()}`;
```

**B. Immediate Transition Flow**
- Remove intermediate success screens
- Direct navigation to connection view
- Eliminate form validation steps

**C. Optimized QR Generation**
- Target: <5 second QR display
- Auto-refresh: Every 30 seconds
- Clear status indicators: generating → ready → connected

#### **Technical Implementation**
1. **New API Endpoint**: `POST /api/channels/whatsapp/instances/quick-create`
2. **Consolidated QR Component**: Single, robust QR display implementation
3. **Optimized Connection Flow**: Streamlined Evolution API integration
4. **Enhanced Error Handling**: Circuit breaker patterns and fallbacks

### **Phase 2: Telegram Integration (4 weeks)**

#### **Technical Requirements**
- **Telegram Bot API**: Official bot framework integration
- **Webhook Handling**: Real-time message processing
- **Inline Keyboards**: Interactive appointment booking interface
- **Command System**: `/book`, `/cancel`, `/status` commands

#### **Implementation Components**
```typescript
// Telegram-specific service extending base architecture
class TelegramChannelService extends BaseChannelService {
  async createBot(config: TelegramBotConfig): Promise<TelegramBot>
  async sendMessage(chatId: string, message: string): Promise<void>
  async handleCommand(command: string, context: MessageContext): Promise<void>
}
```

### **Phase 3: Voice Channel Integration (6 weeks)**

#### **Technical Requirements**
- **TTS/STT Integration**: Speech synthesis and recognition
- **Call Routing**: Intelligent call distribution
- **IVR Flows**: Interactive voice response menus
- **Voice AI**: Natural language processing for voice interactions

---

## 📊 **SUCCESS METRICS & KPIS**

### **Technical KPIs**
- **Response Time**: <3 seconds for all channel interactions
- **Uptime**: >99.5% availability across all channels
- **Error Rate**: <1% failed message processing
- **QR Generation**: <5 seconds for WhatsApp connection
- **Scalability**: Support 100+ concurrent conversations per channel

### **Business KPIs**
- **Channel Adoption**: >70% of organizations using at least 2 channels
- **Appointment Conversion**: >30% of appointments booked via channels
- **User Satisfaction**: >4.5/5 rating across all channels
- **Setup Time**: <30 minutes for new channel configuration
- **Support Reduction**: >40% decrease in manual support tickets

### **User Experience KPIs**
- **WhatsApp Connection**: <2 minutes from creation to active
- **Telegram Bot Setup**: <5 minutes for full configuration
- **Voice Agent Training**: <10 minutes for basic setup
- **Admin Dashboard**: <3 seconds page load times

---

## 🛡️ **RISK MITIGATION STRATEGIES**

### **Technical Risks**
1. **Evolution API Dependency**
   - **Risk**: Service outages or rate limiting
   - **Mitigation**: Connection pooling, circuit breakers, fallback mechanisms

2. **QR Code Generation Failures**
   - **Risk**: WhatsApp connection issues
   - **Mitigation**: Retry logic, manual fallback options, clear error messaging

3. **Webhook Reliability**
   - **Risk**: Message loss or duplicate processing
   - **Mitigation**: Queue systems, idempotency keys, dead letter handling

### **Business Risks**
1. **Channel Adoption**
   - **Risk**: Low user adoption of new channels
   - **Mitigation**: Gradual rollout, user training, feedback collection

2. **Compliance Issues**
   - **Risk**: HIPAA violations or data breaches
   - **Mitigation**: Comprehensive audit trails, encryption, access controls

3. **Support Overhead**
   - **Risk**: Increased support burden
   - **Mitigation**: Self-service documentation, automated diagnostics

---

## 🎯 **ACCEPTANCE CRITERIA**

### **WhatsApp Radical Solution**
- [ ] Single-click instance creation with auto-naming
- [ ] QR code display within 5 seconds of connect button
- [ ] Auto-refresh every 30 seconds with clear status indicators
- [ ] Zero intermediate screens or form validations
- [ ] Backward compatibility with existing instances

### **Multi-Channel Foundation**
- [ ] Unified dashboard showing all channel types
- [ ] Generic configuration modal adapting to channel requirements
- [ ] Cross-channel metrics and analytics
- [ ] Role-based access control for all channels
- [ ] Consistent UI/UX patterns across channels

### **Performance & Reliability**
- [ ] <3 second response times for all operations
- [ ] >99.5% uptime across all channels
- [ ] <1% error rate for message processing
- [ ] Graceful degradation during service outages
- [ ] Comprehensive monitoring and alerting

---

**Next Steps**: Implementation begins with WhatsApp radical solution, followed by Telegram integration planning.

**Review Schedule**: Weekly progress reviews, monthly stakeholder updates.
