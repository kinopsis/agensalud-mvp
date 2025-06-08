-- Enhanced Tenant Isolation with Row Level Security (RLS)
-- Comprehensive audit and enhancement of RLS policies for complete data separation
-- between organization tenants across all WhatsApp-related tables.

-- =====================================================
-- UTILITY FUNCTIONS FOR TENANT CONTEXT
-- =====================================================

-- Function to get current user's organization ID
CREATE OR REPLACE FUNCTION get_current_user_organization_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT organization_id 
        FROM profiles 
        WHERE id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to specific organization
CREATE OR REPLACE FUNCTION user_has_organization_access(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Superadmin has access to all organizations
    IF EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'superadmin'
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Regular users only have access to their organization
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND organization_id = target_org_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate tenant context in API calls
CREATE OR REPLACE FUNCTION validate_tenant_context(
    target_org_id UUID,
    operation_type TEXT DEFAULT 'read'
)
RETURNS BOOLEAN AS $$
DECLARE
    user_org_id UUID;
    user_role TEXT;
BEGIN
    -- Get current user's organization and role
    SELECT organization_id, role INTO user_org_id, user_role
    FROM profiles 
    WHERE id = auth.uid();
    
    -- If no user found, deny access
    IF user_org_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Superadmin has full access
    IF user_role = 'superadmin' THEN
        RETURN TRUE;
    END IF;
    
    -- Regular users can only access their own organization
    IF user_org_id = target_org_id THEN
        RETURN TRUE;
    END IF;
    
    -- Log potential security violation
    INSERT INTO security_audit_log (
        user_id,
        user_organization_id,
        target_organization_id,
        operation_type,
        violation_type,
        timestamp,
        details
    ) VALUES (
        auth.uid(),
        user_org_id,
        target_org_id,
        operation_type,
        'cross_tenant_access_attempt',
        NOW(),
        jsonb_build_object(
            'user_role', user_role,
            'attempted_org', target_org_id,
            'user_org', user_org_id
        )
    );
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SECURITY AUDIT LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User context
    user_id UUID REFERENCES auth.users(id),
    user_organization_id UUID REFERENCES organizations(id),
    
    -- Target context
    target_organization_id UUID REFERENCES organizations(id),
    target_resource_type VARCHAR(100),
    target_resource_id VARCHAR(255),
    
    -- Operation details
    operation_type VARCHAR(50) NOT NULL, -- read, write, delete, etc.
    violation_type VARCHAR(100), -- cross_tenant_access_attempt, unauthorized_operation, etc.
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_path TEXT,
    request_method VARCHAR(10),
    
    -- Additional details
    details JSONB DEFAULT '{}',
    severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    
    -- Timestamps
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for security audit log
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_org ON security_audit_log(user_organization_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_target_org ON security_audit_log(target_organization_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_violation_type ON security_audit_log(violation_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_timestamp ON security_audit_log(timestamp);

-- =====================================================
-- ENHANCED RLS POLICIES FOR CHANNEL_INSTANCES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS channel_instances_organization_policy ON channel_instances;
DROP POLICY IF EXISTS channel_instances_service_role_policy ON channel_instances;

-- Enhanced organization-based access policy
CREATE POLICY channel_instances_tenant_isolation_policy ON channel_instances
    FOR ALL USING (
        -- Service role has full access
        current_setting('role') = 'service_role' OR
        -- Superadmin has full access
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'superadmin'
        ) OR
        -- Regular users only access their organization's instances
        (
            organization_id IS NOT NULL AND
            user_has_organization_access(organization_id)
        )
    );

-- =====================================================
-- ENHANCED RLS POLICIES FOR CONVERSATION_FLOWS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS conversation_flows_organization_policy ON conversation_flows;
DROP POLICY IF EXISTS conversation_flows_service_role_policy ON conversation_flows;

-- Enhanced tenant isolation policy
CREATE POLICY conversation_flows_tenant_isolation_policy ON conversation_flows
    FOR ALL USING (
        -- Service role has full access
        current_setting('role') = 'service_role' OR
        -- Superadmin has full access
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'superadmin'
        ) OR
        -- Regular users only access their organization's flows
        (
            organization_id IS NOT NULL AND
            user_has_organization_access(organization_id)
        )
    );

-- =====================================================
-- ENHANCED RLS POLICIES FOR BOT_CONFIGURATIONS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS bot_configurations_organization_policy ON bot_configurations;
DROP POLICY IF EXISTS bot_configurations_service_role_policy ON bot_configurations;

-- Enhanced tenant isolation policy
CREATE POLICY bot_configurations_tenant_isolation_policy ON bot_configurations
    FOR ALL USING (
        -- Service role has full access
        current_setting('role') = 'service_role' OR
        -- Superadmin has full access
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'superadmin'
        ) OR
        -- Regular users only access their organization's bot configs
        (
            organization_id IS NOT NULL AND
            user_has_organization_access(organization_id)
        )
    );

-- =====================================================
-- ENHANCED RLS POLICIES FOR WHATSAPP_NOTIFICATIONS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS whatsapp_notifications_organization_policy ON whatsapp_notifications;
DROP POLICY IF EXISTS whatsapp_notifications_service_role_policy ON whatsapp_notifications;

-- Enhanced tenant isolation policy
CREATE POLICY whatsapp_notifications_tenant_isolation_policy ON whatsapp_notifications
    FOR ALL USING (
        -- Service role has full access
        current_setting('role') = 'service_role' OR
        -- Superadmin has full access
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'superadmin'
        ) OR
        -- Regular users only access notifications for their organization's appointments
        appointment_id IN (
            SELECT a.id 
            FROM appointments a
            WHERE user_has_organization_access(a.organization_id)
        )
    );

-- =====================================================
-- ENHANCED RLS POLICIES FOR BOT_HANDOFF_LOGS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS bot_handoff_logs_organization_policy ON bot_handoff_logs;
DROP POLICY IF EXISTS bot_handoff_logs_service_role_policy ON bot_handoff_logs;

-- Enhanced tenant isolation policy
CREATE POLICY bot_handoff_logs_tenant_isolation_policy ON bot_handoff_logs
    FOR ALL USING (
        -- Service role has full access
        current_setting('role') = 'service_role' OR
        -- Superadmin has full access
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'superadmin'
        ) OR
        -- Regular users only access their organization's handoff logs
        (
            organization_id IS NOT NULL AND
            user_has_organization_access(organization_id)
        )
    );

-- =====================================================
-- ENHANCED RLS POLICIES FOR BOT_ANALYTICS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS bot_analytics_organization_policy ON bot_analytics;
DROP POLICY IF EXISTS bot_analytics_service_role_policy ON bot_analytics;

-- Enhanced tenant isolation policy
CREATE POLICY bot_analytics_tenant_isolation_policy ON bot_analytics
    FOR ALL USING (
        -- Service role has full access
        current_setting('role') = 'service_role' OR
        -- Superadmin has full access
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'superadmin'
        ) OR
        -- Regular users only access their organization's analytics
        (
            organization_id IS NOT NULL AND
            user_has_organization_access(organization_id)
        )
    );

-- =====================================================
-- RLS POLICY FOR SECURITY_AUDIT_LOG
-- =====================================================

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Superadmin and service role can see all audit logs
CREATE POLICY security_audit_log_access_policy ON security_audit_log
    FOR ALL USING (
        -- Service role has full access
        current_setting('role') = 'service_role' OR
        -- Superadmin has full access
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'superadmin'
        ) OR
        -- Users can only see logs related to their organization
        (
            user_organization_id IS NOT NULL AND
            user_has_organization_access(user_organization_id)
        )
    );

-- =====================================================
-- TENANT VALIDATION TRIGGERS
-- =====================================================

-- Function to validate organization context on insert/update
CREATE OR REPLACE FUNCTION validate_organization_context()
RETURNS TRIGGER AS $$
DECLARE
    user_org_id UUID;
    user_role TEXT;
BEGIN
    -- Skip validation for service role
    IF current_setting('role') = 'service_role' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Get current user's organization and role
    SELECT organization_id, role INTO user_org_id, user_role
    FROM profiles 
    WHERE id = auth.uid();
    
    -- Superadmin can access any organization
    IF user_role = 'superadmin' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- For INSERT/UPDATE operations
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        -- Validate that the organization_id matches user's organization
        IF NEW.organization_id IS NOT NULL AND NEW.organization_id != user_org_id THEN
            RAISE EXCEPTION 'Access denied: Cannot access data for organization %', NEW.organization_id;
        END IF;
        
        -- Set organization_id if not provided
        IF NEW.organization_id IS NULL THEN
            NEW.organization_id := user_org_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- For DELETE operations
    IF TG_OP = 'DELETE' THEN
        IF OLD.organization_id IS NOT NULL AND OLD.organization_id != user_org_id THEN
            RAISE EXCEPTION 'Access denied: Cannot delete data for organization %', OLD.organization_id;
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply validation triggers to key tables
CREATE TRIGGER validate_channel_instances_org_context
    BEFORE INSERT OR UPDATE OR DELETE ON channel_instances
    FOR EACH ROW EXECUTE FUNCTION validate_organization_context();

CREATE TRIGGER validate_conversation_flows_org_context
    BEFORE INSERT OR UPDATE OR DELETE ON conversation_flows
    FOR EACH ROW EXECUTE FUNCTION validate_organization_context();

CREATE TRIGGER validate_bot_configurations_org_context
    BEFORE INSERT OR UPDATE OR DELETE ON bot_configurations
    FOR EACH ROW EXECUTE FUNCTION validate_organization_context();

CREATE TRIGGER validate_bot_handoff_logs_org_context
    BEFORE INSERT OR UPDATE OR DELETE ON bot_handoff_logs
    FOR EACH ROW EXECUTE FUNCTION validate_organization_context();

CREATE TRIGGER validate_bot_analytics_org_context
    BEFORE INSERT OR UPDATE OR DELETE ON bot_analytics
    FOR EACH ROW EXECUTE FUNCTION validate_organization_context();

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant access to utility functions
GRANT EXECUTE ON FUNCTION get_current_user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_organization_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_tenant_context(UUID, TEXT) TO authenticated;

-- Grant access to security audit log
GRANT SELECT, INSERT ON security_audit_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON security_audit_log TO service_role;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION get_current_user_organization_id() IS 'Returns the organization ID for the current authenticated user';
COMMENT ON FUNCTION user_has_organization_access(UUID) IS 'Checks if the current user has access to the specified organization';
COMMENT ON FUNCTION validate_tenant_context(UUID, TEXT) IS 'Validates tenant context and logs security violations';
COMMENT ON TABLE security_audit_log IS 'Comprehensive audit log for security events and tenant isolation violations';
COMMENT ON FUNCTION validate_organization_context() IS 'Trigger function to validate organization context on data operations';
