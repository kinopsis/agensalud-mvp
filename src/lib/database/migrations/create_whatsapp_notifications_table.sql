-- WhatsApp Notifications Table
-- Tracks all WhatsApp notifications sent for appointments including delivery status,
-- templates used, and error handling for audit and retry mechanisms.

-- Create whatsapp_notifications table
CREATE TABLE IF NOT EXISTS whatsapp_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Appointment reference
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    
    -- Patient information
    patient_phone VARCHAR(20) NOT NULL,
    
    -- Notification details
    template_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL, -- appointment status that triggered notification
    
    -- Delivery tracking
    success BOOLEAN NOT NULL DEFAULT false,
    message_id VARCHAR(255), -- Evolution API message ID
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_appointment_id 
    ON whatsapp_notifications(appointment_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_patient_phone 
    ON whatsapp_notifications(patient_phone);

CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_status 
    ON whatsapp_notifications(status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_sent_at 
    ON whatsapp_notifications(sent_at);

CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_success 
    ON whatsapp_notifications(success);

-- Create composite index for retry queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_retry 
    ON whatsapp_notifications(success, retry_count, sent_at) 
    WHERE success = false;

-- Add RLS (Row Level Security)
ALTER TABLE whatsapp_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see notifications for appointments in their organization
CREATE POLICY whatsapp_notifications_organization_policy ON whatsapp_notifications
    FOR ALL USING (
        appointment_id IN (
            SELECT a.id 
            FROM appointments a
            JOIN profiles p ON p.organization_id = a.organization_id
            WHERE p.id = auth.uid()
        )
    );

-- RLS Policy: Service role can access all notifications
CREATE POLICY whatsapp_notifications_service_role_policy ON whatsapp_notifications
    FOR ALL TO service_role USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_whatsapp_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_whatsapp_notifications_updated_at
    BEFORE UPDATE ON whatsapp_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_notifications_updated_at();

-- Create function to get notification statistics
CREATE OR REPLACE FUNCTION get_whatsapp_notification_stats(
    p_organization_id UUID DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    total_sent BIGINT,
    successful_sent BIGINT,
    failed_sent BIGINT,
    success_rate NUMERIC,
    avg_retry_count NUMERIC,
    templates_used JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_sent,
        COUNT(*) FILTER (WHERE wn.success = true) as successful_sent,
        COUNT(*) FILTER (WHERE wn.success = false) as failed_sent,
        ROUND(
            (COUNT(*) FILTER (WHERE wn.success = true)::NUMERIC / 
             NULLIF(COUNT(*), 0) * 100), 2
        ) as success_rate,
        ROUND(AVG(wn.retry_count), 2) as avg_retry_count,
        jsonb_agg(
            DISTINCT jsonb_build_object(
                'template_id', wn.template_id,
                'count', COUNT(*) FILTER (WHERE wn.template_id = wn.template_id)
            )
        ) as templates_used
    FROM whatsapp_notifications wn
    JOIN appointments a ON a.id = wn.appointment_id
    WHERE 
        (p_organization_id IS NULL OR a.organization_id = p_organization_id)
        AND wn.sent_at >= p_start_date 
        AND wn.sent_at <= p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to retry failed notifications
CREATE OR REPLACE FUNCTION retry_failed_whatsapp_notifications(
    p_max_retries INTEGER DEFAULT 3,
    p_retry_after_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
    notification_id UUID,
    appointment_id UUID,
    patient_phone VARCHAR,
    retry_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wn.id as notification_id,
        wn.appointment_id,
        wn.patient_phone,
        wn.retry_count
    FROM whatsapp_notifications wn
    WHERE 
        wn.success = false 
        AND wn.retry_count < p_max_retries
        AND wn.sent_at < NOW() - (p_retry_after_minutes || ' minutes')::INTERVAL
    ORDER BY wn.sent_at ASC
    LIMIT 100; -- Limit to prevent overwhelming the system
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON whatsapp_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION get_whatsapp_notification_stats TO authenticated;
GRANT EXECUTE ON FUNCTION retry_failed_whatsapp_notifications TO service_role;

-- Add comments for documentation
COMMENT ON TABLE whatsapp_notifications IS 'Tracks WhatsApp notifications sent for appointment state changes';
COMMENT ON COLUMN whatsapp_notifications.template_id IS 'ID of the notification template used';
COMMENT ON COLUMN whatsapp_notifications.message_id IS 'Evolution API message ID for delivery tracking';
COMMENT ON COLUMN whatsapp_notifications.retry_count IS 'Number of retry attempts for failed notifications';
COMMENT ON FUNCTION get_whatsapp_notification_stats IS 'Returns WhatsApp notification statistics for an organization';
COMMENT ON FUNCTION retry_failed_whatsapp_notifications IS 'Returns failed notifications eligible for retry';
