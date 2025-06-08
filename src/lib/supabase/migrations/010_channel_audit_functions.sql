-- =====================================================
-- UNIFIED CHANNEL AUDIT LOGGING FUNCTIONS
-- =====================================================
-- Migration: 010_channel_audit_functions.sql
-- Description: Creates stored procedures for unified channel audit logging
-- Date: 2025-01-28
-- Author: AgentSalud Development Team

-- =====================================================
-- CREATE CHANNEL AUDIT LOG FUNCTION
-- =====================================================

/**
 * Function to create unified channel audit log entries
 * 
 * @description Creates audit log entries for channel operations with proper
 * validation and error handling. Supports all channel types and operations.
 * 
 * @param p_organization_id - Organization UUID
 * @param p_channel_type - Channel type (whatsapp, telegram, voice)
 * @param p_instance_id - Channel instance UUID (optional)
 * @param p_conversation_id - Conversation UUID (optional)
 * @param p_action - Action performed (e.g., 'instance_created', 'message_sent')
 * @param p_actor_id - User who performed the action (optional)
 * @param p_actor_type - Type of actor (admin, patient, system, etc.)
 * @param p_details - Additional details as JSONB (optional)
 * @param p_ip_address - IP address of the request (optional)
 * @param p_user_agent - User agent string (optional)
 * 
 * @returns UUID of the created audit log entry
 */
CREATE OR REPLACE FUNCTION create_channel_audit_log(
    p_organization_id UUID,
    p_channel_type TEXT,
    p_instance_id UUID DEFAULT NULL,
    p_conversation_id UUID DEFAULT NULL,
    p_action TEXT DEFAULT 'unknown_action',
    p_actor_id UUID DEFAULT NULL,
    p_actor_type TEXT DEFAULT 'system',
    p_details JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
    validated_channel_type TEXT;
    validated_actor_type TEXT;
BEGIN
    -- Validate organization exists
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
        RAISE EXCEPTION 'Organization with ID % does not exist', p_organization_id;
    END IF;
    
    -- Validate and normalize channel type
    validated_channel_type := LOWER(TRIM(p_channel_type));
    IF validated_channel_type NOT IN ('whatsapp', 'telegram', 'voice', 'sms', 'email') THEN
        RAISE EXCEPTION 'Invalid channel type: %. Must be one of: whatsapp, telegram, voice, sms, email', p_channel_type;
    END IF;
    
    -- Validate instance exists if provided
    IF p_instance_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM channel_instances 
            WHERE id = p_instance_id 
            AND organization_id = p_organization_id
            AND channel_type = validated_channel_type
        ) THEN
            RAISE EXCEPTION 'Channel instance with ID % does not exist or does not belong to organization %', p_instance_id, p_organization_id;
        END IF;
    END IF;
    
    -- Validate conversation exists if provided
    IF p_conversation_id IS NOT NULL AND p_instance_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM channel_conversations 
            WHERE id = p_conversation_id 
            AND instance_id = p_instance_id
        ) THEN
            RAISE EXCEPTION 'Conversation with ID % does not exist for instance %', p_conversation_id, p_instance_id;
        END IF;
    END IF;
    
    -- Validate and normalize actor type
    validated_actor_type := LOWER(TRIM(COALESCE(p_actor_type, 'system')));
    IF validated_actor_type NOT IN ('patient', 'doctor', 'staff', 'admin', 'superadmin', 'system', 'ai') THEN
        validated_actor_type := 'system';
    END IF;
    
    -- Validate actor exists if provided
    IF p_actor_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_actor_id) THEN
            RAISE EXCEPTION 'Actor with ID % does not exist', p_actor_id;
        END IF;
    END IF;
    
    -- Insert audit log entry
    INSERT INTO channel_audit_logs (
        organization_id,
        instance_id,
        channel_type,
        action,
        actor_id,
        actor_type,
        details,
        timestamp,
        ip_address,
        user_agent
    ) VALUES (
        p_organization_id,
        p_instance_id,
        validated_channel_type,
        TRIM(COALESCE(p_action, 'unknown_action')),
        p_actor_id,
        validated_actor_type,
        COALESCE(p_details, '{}'),
        NOW(),
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error for debugging but don't fail the main operation
        RAISE WARNING 'Failed to create channel audit log: %', SQLERRM;
        -- Return a null UUID to indicate failure
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GET CHANNEL AUDIT LOGS FUNCTION
-- =====================================================

/**
 * Function to retrieve channel audit logs with filtering
 * 
 * @description Retrieves audit logs for channels with optional filtering
 * by organization, instance, action, date range, etc.
 * 
 * @param p_organization_id - Organization UUID (required)
 * @param p_instance_id - Filter by instance UUID (optional)
 * @param p_channel_type - Filter by channel type (optional)
 * @param p_action - Filter by action (optional)
 * @param p_actor_id - Filter by actor UUID (optional)
 * @param p_start_date - Start date for filtering (optional)
 * @param p_end_date - End date for filtering (optional)
 * @param p_limit - Maximum number of records (default: 100)
 * @param p_offset - Offset for pagination (default: 0)
 * 
 * @returns Table of audit log entries
 */
CREATE OR REPLACE FUNCTION get_channel_audit_logs(
    p_organization_id UUID,
    p_instance_id UUID DEFAULT NULL,
    p_channel_type TEXT DEFAULT NULL,
    p_action TEXT DEFAULT NULL,
    p_actor_id UUID DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    instance_id UUID,
    channel_type TEXT,
    action TEXT,
    actor_id UUID,
    actor_type TEXT,
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    actor_email TEXT,
    instance_name TEXT
) AS $$
BEGIN
    -- Validate organization exists
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
        RAISE EXCEPTION 'Organization with ID % does not exist', p_organization_id;
    END IF;
    
    -- Validate limit and offset
    IF p_limit < 1 OR p_limit > 1000 THEN
        RAISE EXCEPTION 'Limit must be between 1 and 1000, got %', p_limit;
    END IF;
    
    IF p_offset < 0 THEN
        RAISE EXCEPTION 'Offset must be non-negative, got %', p_offset;
    END IF;
    
    RETURN QUERY
    SELECT 
        cal.id,
        cal.organization_id,
        cal.instance_id,
        cal.channel_type,
        cal.action,
        cal.actor_id,
        cal.actor_type,
        cal.details,
        cal.timestamp,
        cal.ip_address,
        cal.user_agent,
        p.email as actor_email,
        ci.instance_name
    FROM channel_audit_logs cal
    LEFT JOIN profiles p ON cal.actor_id = p.id
    LEFT JOIN channel_instances ci ON cal.instance_id = ci.id
    WHERE cal.organization_id = p_organization_id
        AND (p_instance_id IS NULL OR cal.instance_id = p_instance_id)
        AND (p_channel_type IS NULL OR cal.channel_type = LOWER(TRIM(p_channel_type)))
        AND (p_action IS NULL OR cal.action ILIKE '%' || p_action || '%')
        AND (p_actor_id IS NULL OR cal.actor_id = p_actor_id)
        AND (p_start_date IS NULL OR cal.timestamp >= p_start_date)
        AND (p_end_date IS NULL OR cal.timestamp <= p_end_date)
    ORDER BY cal.timestamp DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CHANNEL AUDIT STATISTICS FUNCTION
-- =====================================================

/**
 * Function to get audit statistics for channels
 * 
 * @description Provides summary statistics for channel audit logs
 * including action counts, actor activity, and time-based metrics.
 * 
 * @param p_organization_id - Organization UUID (required)
 * @param p_start_date - Start date for statistics (optional)
 * @param p_end_date - End date for statistics (optional)
 * 
 * @returns JSONB with audit statistics
 */
CREATE OR REPLACE FUNCTION get_channel_audit_statistics(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    total_logs INTEGER;
    unique_actors INTEGER;
    unique_instances INTEGER;
    action_counts JSONB;
    channel_counts JSONB;
    actor_type_counts JSONB;
BEGIN
    -- Validate organization exists
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
        RAISE EXCEPTION 'Organization with ID % does not exist', p_organization_id;
    END IF;
    
    -- Set default date range if not provided (last 30 days)
    IF p_start_date IS NULL THEN
        p_start_date := NOW() - INTERVAL '30 days';
    END IF;
    
    IF p_end_date IS NULL THEN
        p_end_date := NOW();
    END IF;
    
    -- Get total log count
    SELECT COUNT(*) INTO total_logs
    FROM channel_audit_logs
    WHERE organization_id = p_organization_id
        AND timestamp BETWEEN p_start_date AND p_end_date;
    
    -- Get unique actors count
    SELECT COUNT(DISTINCT actor_id) INTO unique_actors
    FROM channel_audit_logs
    WHERE organization_id = p_organization_id
        AND timestamp BETWEEN p_start_date AND p_end_date
        AND actor_id IS NOT NULL;
    
    -- Get unique instances count
    SELECT COUNT(DISTINCT instance_id) INTO unique_instances
    FROM channel_audit_logs
    WHERE organization_id = p_organization_id
        AND timestamp BETWEEN p_start_date AND p_end_date
        AND instance_id IS NOT NULL;
    
    -- Get action counts
    SELECT jsonb_object_agg(action, count) INTO action_counts
    FROM (
        SELECT action, COUNT(*) as count
        FROM channel_audit_logs
        WHERE organization_id = p_organization_id
            AND timestamp BETWEEN p_start_date AND p_end_date
        GROUP BY action
        ORDER BY count DESC
        LIMIT 20
    ) action_stats;
    
    -- Get channel type counts
    SELECT jsonb_object_agg(channel_type, count) INTO channel_counts
    FROM (
        SELECT channel_type, COUNT(*) as count
        FROM channel_audit_logs
        WHERE organization_id = p_organization_id
            AND timestamp BETWEEN p_start_date AND p_end_date
        GROUP BY channel_type
        ORDER BY count DESC
    ) channel_stats;
    
    -- Get actor type counts
    SELECT jsonb_object_agg(actor_type, count) INTO actor_type_counts
    FROM (
        SELECT actor_type, COUNT(*) as count
        FROM channel_audit_logs
        WHERE organization_id = p_organization_id
            AND timestamp BETWEEN p_start_date AND p_end_date
        GROUP BY actor_type
        ORDER BY count DESC
    ) actor_stats;
    
    -- Build result JSON
    result := jsonb_build_object(
        'organization_id', p_organization_id,
        'period', jsonb_build_object(
            'start', p_start_date,
            'end', p_end_date
        ),
        'summary', jsonb_build_object(
            'total_logs', total_logs,
            'unique_actors', unique_actors,
            'unique_instances', unique_instances
        ),
        'breakdown', jsonb_build_object(
            'by_action', COALESCE(action_counts, '{}'),
            'by_channel', COALESCE(channel_counts, '{}'),
            'by_actor_type', COALESCE(actor_type_counts, '{}')
        ),
        'generated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_channel_audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION get_channel_audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_channel_audit_statistics TO authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION create_channel_audit_log IS 'Creates unified audit log entries for channel operations with validation';
COMMENT ON FUNCTION get_channel_audit_logs IS 'Retrieves channel audit logs with filtering and pagination';
COMMENT ON FUNCTION get_channel_audit_statistics IS 'Provides summary statistics for channel audit activity';

-- =====================================================
-- MIGRATION COMPLETION
-- =====================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 010_channel_audit_functions.sql completed successfully';
    RAISE NOTICE 'Created functions: create_channel_audit_log, get_channel_audit_logs, get_channel_audit_statistics';
END $$;
