-- AI Bot Management Tables
-- Creates tables for conversation flows, bot configurations, handoff logs,
-- and analytics for WhatsApp AI bot functionality.

-- =====================================================
-- CONVERSATION FLOWS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS conversation_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Patient information
    patient_phone VARCHAR(20) NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Flow state
    current_step VARCHAR(50) NOT NULL DEFAULT 'greeting',
    conversation_state VARCHAR(50) NOT NULL DEFAULT 'active',
    
    -- Collected data
    collected_data JSONB DEFAULT '{}',
    context_data JSONB DEFAULT '{}',
    
    -- Flow control
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    message_count INTEGER DEFAULT 0,
    
    -- Status
    active BOOLEAN DEFAULT true,
    completed BOOLEAN DEFAULT false,
    requires_human_handoff BOOLEAN DEFAULT false,
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 minutes'),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- BOT CONFIGURATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS bot_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Instance reference
    instance_name VARCHAR(255) NOT NULL UNIQUE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Bot settings
    bot_id VARCHAR(255),
    openai_creds_id VARCHAR(255),
    enabled BOOLEAN DEFAULT false,
    
    -- Configuration
    max_conversation_turns INTEGER DEFAULT 10,
    conversation_timeout_minutes INTEGER DEFAULT 30,
    fallback_to_human BOOLEAN DEFAULT true,
    
    -- OpenAI settings
    model VARCHAR(100) DEFAULT 'gpt-4',
    max_tokens INTEGER DEFAULT 500,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    
    -- Bot behavior
    system_prompt TEXT,
    unknown_message TEXT DEFAULT 'Disculpa, no entendí tu mensaje. ¿Podrías reformularlo?',
    handoff_keywords TEXT[] DEFAULT ARRAY['#humano', '#human', 'operador', 'persona'],
    
    -- Status tracking
    last_activity TIMESTAMP WITH TIME ZONE,
    total_conversations INTEGER DEFAULT 0,
    successful_bookings INTEGER DEFAULT 0,
    human_handoffs INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- BOT HANDOFF LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS bot_handoff_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference data
    instance_name VARCHAR(255) NOT NULL,
    patient_phone VARCHAR(20) NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Handoff details
    trigger_message TEXT,
    handoff_reason VARCHAR(100),
    conversation_context JSONB,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'initiated', -- initiated, assigned, resolved, cancelled
    assigned_to UUID REFERENCES profiles(id),
    resolution_notes TEXT,
    
    -- Timestamps
    handoff_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- BOT ANALYTICS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS bot_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference data
    instance_name VARCHAR(255) NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_phone VARCHAR(20),
    
    -- Event data
    event_type VARCHAR(100) NOT NULL, -- conversation_started, message_processed, appointment_created, handoff_triggered, etc.
    event_data JSONB DEFAULT '{}',
    
    -- Metrics
    processing_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    
    -- Context
    conversation_step VARCHAR(50),
    intent_detected VARCHAR(100),
    entities_extracted JSONB,
    
    -- Timestamps
    event_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Conversation flows indexes
CREATE INDEX IF NOT EXISTS idx_conversation_flows_patient_phone 
    ON conversation_flows(patient_phone);
CREATE INDEX IF NOT EXISTS idx_conversation_flows_active 
    ON conversation_flows(active, expires_at);
CREATE INDEX IF NOT EXISTS idx_conversation_flows_organization 
    ON conversation_flows(organization_id);

-- Bot configurations indexes
CREATE INDEX IF NOT EXISTS idx_bot_configurations_instance 
    ON bot_configurations(instance_name);
CREATE INDEX IF NOT EXISTS idx_bot_configurations_organization 
    ON bot_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_bot_configurations_enabled 
    ON bot_configurations(enabled);

-- Handoff logs indexes
CREATE INDEX IF NOT EXISTS idx_bot_handoff_logs_instance 
    ON bot_handoff_logs(instance_name);
CREATE INDEX IF NOT EXISTS idx_bot_handoff_logs_patient 
    ON bot_handoff_logs(patient_phone);
CREATE INDEX IF NOT EXISTS idx_bot_handoff_logs_status 
    ON bot_handoff_logs(status);
CREATE INDEX IF NOT EXISTS idx_bot_handoff_logs_time 
    ON bot_handoff_logs(handoff_time);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_bot_analytics_instance 
    ON bot_analytics(instance_name);
CREATE INDEX IF NOT EXISTS idx_bot_analytics_event_type 
    ON bot_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_bot_analytics_time 
    ON bot_analytics(event_time);
CREATE INDEX IF NOT EXISTS idx_bot_analytics_organization 
    ON bot_analytics(organization_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE conversation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_handoff_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_flows
CREATE POLICY conversation_flows_organization_policy ON conversation_flows
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- RLS Policies for bot_configurations
CREATE POLICY bot_configurations_organization_policy ON bot_configurations
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- RLS Policies for bot_handoff_logs
CREATE POLICY bot_handoff_logs_organization_policy ON bot_handoff_logs
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- RLS Policies for bot_analytics
CREATE POLICY bot_analytics_organization_policy ON bot_analytics
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- Service role policies (full access)
CREATE POLICY conversation_flows_service_role_policy ON conversation_flows
    FOR ALL TO service_role USING (true);
CREATE POLICY bot_configurations_service_role_policy ON bot_configurations
    FOR ALL TO service_role USING (true);
CREATE POLICY bot_handoff_logs_service_role_policy ON bot_handoff_logs
    FOR ALL TO service_role USING (true);
CREATE POLICY bot_analytics_service_role_policy ON bot_analytics
    FOR ALL TO service_role USING (true);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Update triggers for conversation_flows
CREATE TRIGGER update_conversation_flows_updated_at
    BEFORE UPDATE ON conversation_flows
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_notifications_updated_at();

-- Update triggers for bot_configurations
CREATE TRIGGER update_bot_configurations_updated_at
    BEFORE UPDATE ON bot_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_notifications_updated_at();

-- Update triggers for bot_handoff_logs
CREATE TRIGGER update_bot_handoff_logs_updated_at
    BEFORE UPDATE ON bot_handoff_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_notifications_updated_at();

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to get bot statistics
CREATE OR REPLACE FUNCTION get_bot_statistics(
    p_instance_name VARCHAR DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '7 days',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    total_conversations BIGINT,
    completed_conversations BIGINT,
    successful_bookings BIGINT,
    human_handoffs BIGINT,
    avg_conversation_length NUMERIC,
    completion_rate NUMERIC,
    handoff_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT cf.id) as total_conversations,
        COUNT(DISTINCT cf.id) FILTER (WHERE cf.completed = true) as completed_conversations,
        COUNT(DISTINCT ba.id) FILTER (WHERE ba.event_type = 'appointment_created') as successful_bookings,
        COUNT(DISTINCT bhl.id) as human_handoffs,
        ROUND(AVG(cf.message_count), 2) as avg_conversation_length,
        ROUND(
            (COUNT(DISTINCT cf.id) FILTER (WHERE cf.completed = true)::NUMERIC / 
             NULLIF(COUNT(DISTINCT cf.id), 0) * 100), 2
        ) as completion_rate,
        ROUND(
            (COUNT(DISTINCT bhl.id)::NUMERIC / 
             NULLIF(COUNT(DISTINCT cf.id), 0) * 100), 2
        ) as handoff_rate
    FROM conversation_flows cf
    LEFT JOIN bot_analytics ba ON ba.patient_phone = cf.patient_phone 
        AND ba.event_time >= cf.started_at 
        AND ba.event_time <= COALESCE(cf.completed_at, cf.updated_at)
    LEFT JOIN bot_handoff_logs bhl ON bhl.patient_phone = cf.patient_phone 
        AND bhl.handoff_time >= cf.started_at 
        AND bhl.handoff_time <= COALESCE(cf.completed_at, cf.updated_at)
    WHERE 
        (p_organization_id IS NULL OR cf.organization_id = p_organization_id)
        AND cf.started_at >= p_start_date 
        AND cf.started_at <= p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired conversations
CREATE OR REPLACE FUNCTION cleanup_expired_conversations()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE conversation_flows 
    SET 
        active = false,
        conversation_state = 'expired',
        updated_at = NOW()
    WHERE 
        active = true 
        AND expires_at < NOW()
        AND completed = false;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON conversation_flows TO authenticated;
GRANT SELECT, INSERT, UPDATE ON bot_configurations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON bot_handoff_logs TO authenticated;
GRANT SELECT, INSERT ON bot_analytics TO authenticated;

GRANT EXECUTE ON FUNCTION get_bot_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_conversations TO service_role;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE conversation_flows IS 'Tracks active conversation flows for AI bot interactions';
COMMENT ON TABLE bot_configurations IS 'Stores AI bot configurations for WhatsApp instances';
COMMENT ON TABLE bot_handoff_logs IS 'Logs when conversations are handed off to human operators';
COMMENT ON TABLE bot_analytics IS 'Analytics and metrics for AI bot performance';

COMMENT ON FUNCTION get_bot_statistics IS 'Returns comprehensive statistics for AI bot performance';
COMMENT ON FUNCTION cleanup_expired_conversations IS 'Cleans up expired conversation flows';
