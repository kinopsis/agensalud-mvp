-- Migration: 008_whatsapp_integration
-- Description: WhatsApp integration tables for Evolution API v2 with multi-tenant architecture
-- Date: 2025-01-28
-- Author: AgentSalud Development Team

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- WHATSAPP INSTANCES TABLE
-- =====================================================
-- Stores WhatsApp Business API instances per organization
CREATE TABLE whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    instance_name TEXT NOT NULL UNIQUE,
    phone_number TEXT NOT NULL,
    business_id TEXT,
    access_token TEXT,
    webhook_url TEXT,
    status TEXT DEFAULT 'inactive' CHECK (status IN ('inactive', 'connecting', 'active', 'error', 'suspended')),
    qr_code TEXT,
    session_data JSONB DEFAULT '{}',
    evolution_api_config JSONB DEFAULT '{}',
    last_connected_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(organization_id, phone_number),
    UNIQUE(organization_id, instance_name)
);

-- =====================================================
-- WHATSAPP CONVERSATIONS TABLE
-- =====================================================
-- Stores conversation sessions between patients and organization
CREATE TABLE whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    whatsapp_instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE NOT NULL,
    contact_jid TEXT NOT NULL, -- WhatsApp JID format: phone@s.whatsapp.net
    contact_name TEXT,
    patient_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Linked patient if identified
    conversation_state TEXT DEFAULT 'active' CHECK (conversation_state IN ('active', 'paused', 'closed', 'archived')),
    context_data JSONB DEFAULT '{}', -- Conversation context for AI
    intent_detected TEXT, -- Current detected intent: book_appointment, check_status, cancel, etc.
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(whatsapp_instance_id, contact_jid)
);

-- =====================================================
-- WHATSAPP MESSAGES TABLE
-- =====================================================
-- Stores all WhatsApp messages for audit trail and processing
CREATE TABLE whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE NOT NULL,
    message_id TEXT NOT NULL, -- Evolution API message ID
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'audio', 'document', 'video', 'location', 'contact', 'sticker')),
    content TEXT,
    media_url TEXT,
    media_caption TEXT,
    processed BOOLEAN DEFAULT false,
    intent_detected TEXT,
    extracted_entities JSONB DEFAULT '{}',
    ai_response_generated BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(conversation_id, message_id)
);

-- =====================================================
-- WHATSAPP AUDIT LOG TABLE
-- =====================================================
-- Comprehensive audit trail for HIPAA compliance
CREATE TABLE whatsapp_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE SET NULL,
    whatsapp_instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- message_sent, message_received, appointment_created, session_started, etc.
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_type TEXT CHECK (actor_type IN ('patient', 'staff', 'admin', 'system', 'ai')),
    target_entity_type TEXT, -- appointment, patient, conversation, etc.
    target_entity_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- WhatsApp Instances indexes
CREATE INDEX idx_whatsapp_instances_organization_id ON whatsapp_instances(organization_id);
CREATE INDEX idx_whatsapp_instances_status ON whatsapp_instances(status);
CREATE INDEX idx_whatsapp_instances_phone_number ON whatsapp_instances(phone_number);

-- WhatsApp Conversations indexes
CREATE INDEX idx_whatsapp_conversations_organization_id ON whatsapp_conversations(organization_id);
CREATE INDEX idx_whatsapp_conversations_instance_id ON whatsapp_conversations(whatsapp_instance_id);
CREATE INDEX idx_whatsapp_conversations_contact_jid ON whatsapp_conversations(contact_jid);
CREATE INDEX idx_whatsapp_conversations_patient_id ON whatsapp_conversations(patient_id);
CREATE INDEX idx_whatsapp_conversations_state ON whatsapp_conversations(conversation_state);
CREATE INDEX idx_whatsapp_conversations_last_message ON whatsapp_conversations(last_message_at DESC);

-- WhatsApp Messages indexes
CREATE INDEX idx_whatsapp_messages_conversation_id ON whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_messages_direction ON whatsapp_messages(direction);
CREATE INDEX idx_whatsapp_messages_type ON whatsapp_messages(message_type);
CREATE INDEX idx_whatsapp_messages_processed ON whatsapp_messages(processed);
CREATE INDEX idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);

-- WhatsApp Audit Log indexes
CREATE INDEX idx_whatsapp_audit_organization_id ON whatsapp_audit_log(organization_id);
CREATE INDEX idx_whatsapp_audit_conversation_id ON whatsapp_audit_log(conversation_id);
CREATE INDEX idx_whatsapp_audit_action ON whatsapp_audit_log(action);
CREATE INDEX idx_whatsapp_audit_actor_id ON whatsapp_audit_log(actor_id);
CREATE INDEX idx_whatsapp_audit_created_at ON whatsapp_audit_log(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all WhatsApp tables
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_audit_log ENABLE ROW LEVEL SECURITY;

-- WhatsApp Instances RLS Policies
CREATE POLICY "Users can view instances from their organization" ON whatsapp_instances
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage instances in their organization" ON whatsapp_instances
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'superadmin')
        )
    );

-- WhatsApp Conversations RLS Policies
CREATE POLICY "Users can view conversations from their organization" ON whatsapp_conversations
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Staff and admins can manage conversations" ON whatsapp_conversations
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('staff', 'admin', 'superadmin')
        )
    );

CREATE POLICY "Patients can view their own conversations" ON whatsapp_conversations
    FOR SELECT USING (
        patient_id = auth.uid()
    );

-- WhatsApp Messages RLS Policies
CREATE POLICY "Users can view messages from conversations in their organization" ON whatsapp_messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM whatsapp_conversations 
            WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "System can insert messages" ON whatsapp_messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff and admins can manage messages" ON whatsapp_messages
    FOR ALL USING (
        conversation_id IN (
            SELECT id FROM whatsapp_conversations 
            WHERE organization_id IN (
                SELECT organization_id FROM profiles 
                WHERE id = auth.uid() 
                AND role IN ('staff', 'admin', 'superadmin')
            )
        )
    );

-- WhatsApp Audit Log RLS Policies
CREATE POLICY "Admins can view audit logs from their organization" ON whatsapp_audit_log
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "System can insert audit logs" ON whatsapp_audit_log
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update updated_at timestamp for whatsapp_instances
CREATE OR REPLACE FUNCTION update_whatsapp_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_whatsapp_instances_updated_at
    BEFORE UPDATE ON whatsapp_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_instances_updated_at();

-- Update updated_at timestamp for whatsapp_conversations
CREATE OR REPLACE FUNCTION update_whatsapp_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_whatsapp_conversations_updated_at
    BEFORE UPDATE ON whatsapp_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_conversations_updated_at();

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to get active WhatsApp instance for organization
CREATE OR REPLACE FUNCTION get_active_whatsapp_instance(org_id UUID)
RETURNS UUID AS $$
DECLARE
    instance_id UUID;
BEGIN
    SELECT id INTO instance_id
    FROM whatsapp_instances
    WHERE organization_id = org_id
    AND status = 'active'
    ORDER BY last_connected_at DESC NULLS LAST
    LIMIT 1;
    
    RETURN instance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_whatsapp_audit_log(
    p_organization_id UUID,
    p_action TEXT,
    p_actor_id UUID DEFAULT NULL,
    p_actor_type TEXT DEFAULT 'system',
    p_conversation_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO whatsapp_audit_log (
        organization_id,
        action,
        actor_id,
        actor_type,
        conversation_id,
        details
    ) VALUES (
        p_organization_id,
        p_action,
        p_actor_id,
        p_actor_type,
        p_conversation_id,
        p_details
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE whatsapp_instances IS 'WhatsApp Business API instances per organization for Evolution API v2 integration';
COMMENT ON TABLE whatsapp_conversations IS 'WhatsApp conversation sessions between patients and healthcare organizations';
COMMENT ON TABLE whatsapp_messages IS 'All WhatsApp messages for audit trail and AI processing';
COMMENT ON TABLE whatsapp_audit_log IS 'Comprehensive audit trail for HIPAA compliance and security monitoring';

COMMENT ON COLUMN whatsapp_instances.instance_name IS 'Unique identifier for Evolution API instance';
COMMENT ON COLUMN whatsapp_instances.phone_number IS 'WhatsApp Business phone number';
COMMENT ON COLUMN whatsapp_instances.session_data IS 'Evolution API session data and configuration';
COMMENT ON COLUMN whatsapp_conversations.contact_jid IS 'WhatsApp JID format: phone@s.whatsapp.net';
COMMENT ON COLUMN whatsapp_conversations.context_data IS 'AI conversation context and extracted entities';
COMMENT ON COLUMN whatsapp_messages.extracted_entities IS 'AI-extracted entities from message content';
COMMENT ON COLUMN whatsapp_audit_log.details IS 'Additional context and metadata for audit entry';

-- Migration completed successfully
SELECT 'WhatsApp integration tables created successfully' AS migration_status;
