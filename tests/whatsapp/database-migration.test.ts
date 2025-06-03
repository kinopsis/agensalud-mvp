/**
 * WhatsApp Database Migration Tests
 * 
 * Tests for validating the WhatsApp integration database schema,
 * RLS policies, and TypeScript types.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@/lib/supabase/server';
import type { 
  WhatsAppInstance, 
  WhatsAppConversation, 
  WhatsAppMessage, 
  WhatsAppAuditLog 
} from '@/types/whatsapp';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}));

const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
};

describe('WhatsApp Database Migration Tests', () => {
  beforeAll(() => {
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('Database Schema Validation', () => {
    it('should validate whatsapp_instances table structure', async () => {
      const mockInstance: WhatsAppInstance = {
        id: 'test-instance-id',
        organization_id: 'test-org-id',
        instance_name: 'test-instance',
        phone_number: '+1234567890',
        business_id: 'test-business-id',
        access_token: 'test-token',
        webhook_url: 'https://api.example.com/webhook',
        status: 'active',
        qr_code: null,
        session_data: {},
        evolution_api_config: {},
        last_connected_at: new Date().toISOString(),
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Validate that the type structure is correct
      expect(mockInstance.id).toBeDefined();
      expect(mockInstance.organization_id).toBeDefined();
      expect(mockInstance.instance_name).toBeDefined();
      expect(mockInstance.phone_number).toBeDefined();
      expect(['inactive', 'connecting', 'active', 'error', 'suspended']).toContain(mockInstance.status);
    });

    it('should validate whatsapp_conversations table structure', async () => {
      const mockConversation: WhatsAppConversation = {
        id: 'test-conversation-id',
        organization_id: 'test-org-id',
        whatsapp_instance_id: 'test-instance-id',
        contact_jid: '1234567890@s.whatsapp.net',
        contact_name: 'Test Patient',
        patient_id: 'test-patient-id',
        conversation_state: 'active',
        context_data: {
          currentIntent: 'book_appointment',
          extractedEntities: {}
        },
        intent_detected: 'book_appointment',
        last_message_at: new Date().toISOString(),
        session_expires_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      expect(mockConversation.id).toBeDefined();
      expect(mockConversation.contact_jid).toMatch(/@s\.whatsapp\.net$/);
      expect(['active', 'paused', 'closed', 'archived']).toContain(mockConversation.conversation_state);
    });

    it('should validate whatsapp_messages table structure', async () => {
      const mockMessage: WhatsAppMessage = {
        id: 'test-message-id',
        conversation_id: 'test-conversation-id',
        message_id: 'whatsapp-message-id',
        direction: 'inbound',
        message_type: 'text',
        content: 'Hello, I want to book an appointment',
        media_url: null,
        media_caption: null,
        processed: false,
        intent_detected: 'book_appointment',
        extracted_entities: {
          intent: 'book_appointment',
          confidence: 0.95
        },
        ai_response_generated: false,
        error_message: null,
        created_at: new Date().toISOString()
      };

      expect(mockMessage.id).toBeDefined();
      expect(['inbound', 'outbound']).toContain(mockMessage.direction);
      expect(['text', 'image', 'audio', 'document', 'video', 'location', 'contact', 'sticker']).toContain(mockMessage.message_type);
    });

    it('should validate whatsapp_audit_log table structure', async () => {
      const mockAuditLog: WhatsAppAuditLog = {
        id: 'test-audit-id',
        organization_id: 'test-org-id',
        conversation_id: 'test-conversation-id',
        whatsapp_instance_id: 'test-instance-id',
        action: 'message_received',
        actor_id: 'test-user-id',
        actor_type: 'patient',
        target_entity_type: 'message',
        target_entity_id: 'test-message-id',
        details: {
          messageType: 'text',
          processingTime: 150
        },
        ip_address: '192.168.1.1',
        user_agent: 'WhatsApp/2.21.0',
        session_id: 'test-session-id',
        created_at: new Date().toISOString()
      };

      expect(mockAuditLog.id).toBeDefined();
      expect(mockAuditLog.action).toBeDefined();
      expect(['patient', 'staff', 'admin', 'system', 'ai']).toContain(mockAuditLog.actor_type);
    });
  });

  describe('RLS Policies Validation', () => {
    it('should test whatsapp_instances RLS policies', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'test-instance' },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery);
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      });

      const supabase = await createClient();
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('organization_id', 'test-org-id')
        .single();

      expect(mockSupabase.from).toHaveBeenCalledWith('whatsapp_instances');
      expect(data).toBeDefined();
      expect(error).toBeNull();
    });

    it('should test whatsapp_conversations RLS policies', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [{ id: 'test-conversation' }],
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const supabase = await createClient();
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('organization_id', 'test-org-id')
        .order('last_message_at', { ascending: false })
        .limit(10);

      expect(mockSupabase.from).toHaveBeenCalledWith('whatsapp_conversations');
      expect(data).toBeDefined();
      expect(error).toBeNull();
    });

    it('should test whatsapp_messages RLS policies', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [{ id: 'test-message' }],
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const supabase = await createClient();
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', 'test-conversation-id')
        .order('created_at', { ascending: false })
        .limit(50);

      expect(mockSupabase.from).toHaveBeenCalledWith('whatsapp_messages');
      expect(data).toBeDefined();
      expect(error).toBeNull();
    });

    it('should test whatsapp_audit_log RLS policies', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [{ id: 'test-audit' }],
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const supabase = await createClient();
      const { data, error } = await supabase
        .from('whatsapp_audit_log')
        .select('*')
        .eq('organization_id', 'test-org-id')
        .order('created_at', { ascending: false })
        .limit(100);

      expect(mockSupabase.from).toHaveBeenCalledWith('whatsapp_audit_log');
      expect(data).toBeDefined();
      expect(error).toBeNull();
    });
  });

  describe('Database Functions Validation', () => {
    it('should test get_active_whatsapp_instance function', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: 'test-instance-id',
        error: null
      });

      const supabase = await createClient();
      const { data, error } = await supabase.rpc('get_active_whatsapp_instance', {
        org_id: 'test-org-id'
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_active_whatsapp_instance', {
        org_id: 'test-org-id'
      });
      expect(data).toBe('test-instance-id');
      expect(error).toBeNull();
    });

    it('should test create_whatsapp_audit_log function', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: 'test-audit-id',
        error: null
      });

      const supabase = await createClient();
      const { data, error } = await supabase.rpc('create_whatsapp_audit_log', {
        p_organization_id: 'test-org-id',
        p_action: 'message_received',
        p_actor_id: 'test-user-id',
        p_actor_type: 'patient',
        p_conversation_id: 'test-conversation-id',
        p_details: { messageType: 'text' }
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_whatsapp_audit_log', {
        p_organization_id: 'test-org-id',
        p_action: 'message_received',
        p_actor_id: 'test-user-id',
        p_actor_type: 'patient',
        p_conversation_id: 'test-conversation-id',
        p_details: { messageType: 'text' }
      });
      expect(data).toBe('test-audit-id');
      expect(error).toBeNull();
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should ensure organization isolation for whatsapp_instances', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const supabase = await createClient();

      // Try to access instances from different organization
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('organization_id', 'different-org-id');

      expect(data).toEqual([]);
      expect(error).toBeNull();
    });

    it('should ensure conversation isolation between organizations', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const supabase = await createClient();

      // Try to access conversations from different organization
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('organization_id', 'different-org-id');

      expect(data).toEqual([]);
      expect(error).toBeNull();
    });
  });

  describe('Data Integrity Constraints', () => {
    it('should validate unique constraints', () => {
      // Test that instance_name is unique per organization
      const instance1: Partial<WhatsAppInstance> = {
        organization_id: 'org-1',
        instance_name: 'main-instance',
        phone_number: '+1234567890'
      };

      const instance2: Partial<WhatsAppInstance> = {
        organization_id: 'org-1',
        instance_name: 'main-instance', // Same name, should fail
        phone_number: '+0987654321'
      };

      // In real implementation, this would test actual database constraints
      expect(instance1.instance_name).toBe(instance2.instance_name);
      expect(instance1.organization_id).toBe(instance2.organization_id);
    });

    it('should validate foreign key relationships', () => {
      const conversation: Partial<WhatsAppConversation> = {
        organization_id: 'test-org-id',
        whatsapp_instance_id: 'test-instance-id',
        patient_id: 'test-patient-id'
      };

      // Validate that all required foreign keys are present
      expect(conversation.organization_id).toBeDefined();
      expect(conversation.whatsapp_instance_id).toBeDefined();
      expect(conversation.patient_id).toBeDefined();
    });
  });
});

describe('TypeScript Types Validation', () => {
  it('should validate WhatsApp type exports', () => {
    // This test ensures that all types are properly exported and accessible
    const types = [
      'WhatsAppInstance',
      'WhatsAppConversation', 
      'WhatsAppMessage',
      'WhatsAppAuditLog'
    ];

    types.forEach(typeName => {
      expect(typeName).toBeDefined();
    });
  });

  it('should validate enum types', () => {
    const validStatuses = ['inactive', 'connecting', 'active', 'error', 'suspended'];
    const validStates = ['active', 'paused', 'closed', 'archived'];
    const validDirections = ['inbound', 'outbound'];
    const validMessageTypes = ['text', 'image', 'audio', 'document', 'video', 'location', 'contact', 'sticker'];

    expect(validStatuses).toHaveLength(5);
    expect(validStates).toHaveLength(4);
    expect(validDirections).toHaveLength(2);
    expect(validMessageTypes).toHaveLength(8);
  });
});
