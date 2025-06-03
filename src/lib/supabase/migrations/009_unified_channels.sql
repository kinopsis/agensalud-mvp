-- Migration: 009_unified_channels
-- Description: Create unified channel architecture tables
-- Date: 2025-01-28

-- =====================================================
-- UNIFIED CHANNEL INSTANCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS channel_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    channel_type TEXT NOT NULL CHECK (channel_type IN ('whatsapp', 'telegram', 'voice')),
    instance_name TEXT NOT NULL,
    status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'connecting', 'error', 'suspended', 'maintenance')),
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Ensure unique instance names per organization and channel type
    UNIQUE(organization_id, channel_type, instance_name)
);

-- =====================================================
-- UNIFIED CHANNEL CONVERSATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS channel_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID REFERENCES channel_instances(id) ON DELETE CASCADE NOT NULL,
    channel_type TEXT NOT NULL,
    conversation_id TEXT NOT NULL, -- External conversation ID (e.g., phone@s.whatsapp.net)
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated', 'archived')),
    context_data JSONB DEFAULT '{}',
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique conversations per instance
    UNIQUE(instance_id, conversation_id)
);

-- =====================================================
-- UNIFIED CHANNEL MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS channel_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES channel_conversations(id) ON DELETE CASCADE NOT NULL,
    channel_type TEXT NOT NULL,
    message_id TEXT NOT NULL, -- External message ID
    direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    content JSONB NOT NULL DEFAULT '{}',
    sender_id TEXT,
    recipient_id TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    processing_result JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique messages per conversation
    UNIQUE(conversation_id, message_id)
);

-- =====================================================
-- UNIFIED CHANNEL AUDIT LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS channel_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    instance_id UUID REFERENCES channel_instances(id) ON DELETE CASCADE,
    channel_type TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_type TEXT,
    details JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Channel instances indexes
CREATE INDEX IF NOT EXISTS idx_channel_instances_org_type ON channel_instances(organization_id, channel_type);
CREATE INDEX IF NOT EXISTS idx_channel_instances_status ON channel_instances(status);
CREATE INDEX IF NOT EXISTS idx_channel_instances_updated ON channel_instances(updated_at);

-- Channel conversations indexes
CREATE INDEX IF NOT EXISTS idx_channel_conversations_instance ON channel_conversations(instance_id);
CREATE INDEX IF NOT EXISTS idx_channel_conversations_patient ON channel_conversations(patient_id);
CREATE INDEX IF NOT EXISTS idx_channel_conversations_status ON channel_conversations(status);
CREATE INDEX IF NOT EXISTS idx_channel_conversations_last_message ON channel_conversations(last_message_at);

-- Channel messages indexes
CREATE INDEX IF NOT EXISTS idx_channel_messages_conversation ON channel_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_timestamp ON channel_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_channel_messages_direction ON channel_messages(direction);

-- Channel audit logs indexes
CREATE INDEX IF NOT EXISTS idx_channel_audit_logs_org ON channel_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_channel_audit_logs_instance ON channel_audit_logs(instance_id);
CREATE INDEX IF NOT EXISTS idx_channel_audit_logs_action ON channel_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_channel_audit_logs_timestamp ON channel_audit_logs(timestamp);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all unified channel tables
ALTER TABLE channel_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_audit_logs ENABLE ROW LEVEL SECURITY;

-- Channel Instances RLS Policies
CREATE POLICY "Users can view channel instances from their organization" ON channel_instances
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage channel instances in their organization" ON channel_instances
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'superadmin')
        )
    );

-- Channel Conversations RLS Policies
CREATE POLICY "Users can view conversations from their organization" ON channel_conversations
    FOR SELECT USING (
        instance_id IN (
            SELECT id FROM channel_instances 
            WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Staff can manage conversations in their organization" ON channel_conversations
    FOR ALL USING (
        instance_id IN (
            SELECT id FROM channel_instances 
            WHERE organization_id IN (
                SELECT organization_id FROM profiles 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'staff', 'doctor', 'superadmin')
            )
        )
    );

-- Channel Messages RLS Policies
CREATE POLICY "Users can view messages from their organization" ON channel_messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM channel_conversations 
            WHERE instance_id IN (
                SELECT id FROM channel_instances 
                WHERE organization_id IN (
                    SELECT organization_id FROM profiles WHERE id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Staff can manage messages in their organization" ON channel_messages
    FOR ALL USING (
        conversation_id IN (
            SELECT id FROM channel_conversations 
            WHERE instance_id IN (
                SELECT id FROM channel_instances 
                WHERE organization_id IN (
                    SELECT organization_id FROM profiles 
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'staff', 'doctor', 'superadmin')
                )
            )
        )
    );

-- Channel Audit Logs RLS Policies
CREATE POLICY "Users can view audit logs from their organization" ON channel_audit_logs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "System can insert audit logs" ON channel_audit_logs
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_channel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_channel_instances_updated_at
    BEFORE UPDATE ON channel_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_channel_updated_at();

CREATE TRIGGER trigger_channel_conversations_updated_at
    BEFORE UPDATE ON channel_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_channel_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE channel_instances IS 'Unified channel instances for all communication channels (WhatsApp, Telegram, Voice)';
COMMENT ON TABLE channel_conversations IS 'Unified conversation sessions across all channels';
COMMENT ON TABLE channel_messages IS 'Unified message storage for all channels with audit trail';
COMMENT ON TABLE channel_audit_logs IS 'Comprehensive audit trail for all channel activities';

COMMENT ON COLUMN channel_instances.config IS 'Channel-specific configuration in JSON format';
COMMENT ON COLUMN channel_conversations.context_data IS 'AI conversation context and extracted entities';
COMMENT ON COLUMN channel_messages.content IS 'Message content including text, media, and metadata';
COMMENT ON COLUMN channel_messages.processing_result IS 'AI processing results and extracted entities';
