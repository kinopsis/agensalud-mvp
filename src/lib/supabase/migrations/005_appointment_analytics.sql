-- Migration: 005_appointment_analytics
-- Description: Add analytics tables for appointment cancellations and rescheduling data
-- Date: 2025-01-28
-- Purpose: Enable AI-powered insights and service optimization

-- =====================================================
-- APPOINTMENT ANALYTICS TABLE
-- =====================================================

-- Table to store detailed analytics for appointment actions
CREATE TABLE appointment_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('cancelled', 'rescheduled', 'completed', 'no_show')),
    
    -- Cancellation/Rescheduling reasons
    reason_category VARCHAR(100), -- Predefined reason (schedule_conflict, health_issue, etc.)
    reason_text TEXT, -- Custom reason text
    
    -- Original appointment details
    original_date DATE,
    original_time TIME,
    
    -- New appointment details (for rescheduling)
    new_date DATE,
    new_time TIME,
    
    -- Timing analytics
    time_to_action INTERVAL, -- Time between booking and action
    action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- User context
    user_id UUID REFERENCES profiles(id),
    user_role VARCHAR(50),
    user_agent TEXT, -- For device/browser analytics
    
    -- Additional metadata
    metadata JSONB, -- Flexible field for additional data
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PATIENT BEHAVIOR PATTERNS TABLE
-- =====================================================

-- Table to store learned patient behavior patterns for AI recommendations
CREATE TABLE patient_behavior_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    
    -- Preference patterns
    preferred_time_slots JSONB, -- ['09:00-11:00', '14:00-16:00']
    preferred_days JSONB, -- ['monday', 'wednesday', 'friday']
    preferred_services JSONB, -- Service IDs ranked by frequency
    preferred_doctors JSONB, -- Doctor IDs ranked by frequency
    
    -- Behavioral metrics
    cancellation_frequency INTEGER DEFAULT 0,
    reschedule_frequency INTEGER DEFAULT 0,
    no_show_frequency INTEGER DEFAULT 0,
    total_appointments INTEGER DEFAULT 0,
    
    -- Calculated scores
    reliability_score DECIMAL(3,2) DEFAULT 1.00, -- 0.00 - 1.00
    satisfaction_score DECIMAL(3,2), -- Average satisfaction rating
    
    -- Temporal patterns
    seasonal_patterns JSONB, -- Monthly/quarterly preferences
    time_patterns JSONB, -- Hourly preferences
    
    -- Last calculation timestamp
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SERVICE ANALYTICS TABLE
-- =====================================================

-- Table to store service-level analytics for optimization
CREATE TABLE service_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    
    -- Performance metrics
    total_appointments INTEGER DEFAULT 0,
    cancellation_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage
    reschedule_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage
    no_show_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage
    completion_rate DECIMAL(5,2) DEFAULT 100.00, -- Percentage
    
    -- Timing analytics
    avg_duration_minutes INTEGER,
    avg_time_to_cancellation INTERVAL,
    avg_time_to_reschedule INTERVAL,
    
    -- Satisfaction metrics
    avg_satisfaction_score DECIMAL(3,2),
    total_reviews INTEGER DEFAULT 0,
    
    -- Demand patterns
    peak_hours JSONB, -- Hours with highest demand
    peak_days JSONB, -- Days with highest demand
    seasonal_demand JSONB, -- Monthly demand patterns
    
    -- Financial metrics
    avg_revenue_per_appointment DECIMAL(10,2),
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    
    -- Calculation period
    calculation_period_start DATE,
    calculation_period_end DATE,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- DOCTOR ANALYTICS TABLE
-- =====================================================

-- Table to store doctor-level analytics for performance insights
CREATE TABLE doctor_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    
    -- Performance metrics
    total_appointments INTEGER DEFAULT 0,
    cancellation_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage
    reschedule_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage
    no_show_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage
    completion_rate DECIMAL(5,2) DEFAULT 100.00, -- Percentage
    
    -- Patient satisfaction
    avg_satisfaction_score DECIMAL(3,2),
    total_reviews INTEGER DEFAULT 0,
    patient_retention_rate DECIMAL(5,2), -- Percentage of returning patients
    
    -- Efficiency metrics
    avg_appointment_duration INTEGER, -- Minutes
    punctuality_score DECIMAL(3,2), -- On-time performance
    utilization_rate DECIMAL(5,2), -- Percentage of available slots filled
    
    -- Specialization performance
    top_services JSONB, -- Most requested services
    service_satisfaction JSONB, -- Satisfaction by service type
    
    -- Temporal patterns
    peak_performance_hours JSONB,
    preferred_patient_types JSONB,
    
    -- Calculation period
    calculation_period_start DATE,
    calculation_period_end DATE,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Appointment analytics indexes
CREATE INDEX idx_appointment_analytics_appointment_id ON appointment_analytics(appointment_id);
CREATE INDEX idx_appointment_analytics_organization_id ON appointment_analytics(organization_id);
CREATE INDEX idx_appointment_analytics_action_type ON appointment_analytics(action_type);
CREATE INDEX idx_appointment_analytics_action_timestamp ON appointment_analytics(action_timestamp);
CREATE INDEX idx_appointment_analytics_user_id ON appointment_analytics(user_id);

-- Patient behavior patterns indexes
CREATE INDEX idx_patient_behavior_patterns_patient_id ON patient_behavior_patterns(patient_id);
CREATE INDEX idx_patient_behavior_patterns_organization_id ON patient_behavior_patterns(organization_id);
CREATE INDEX idx_patient_behavior_patterns_reliability_score ON patient_behavior_patterns(reliability_score);

-- Service analytics indexes
CREATE INDEX idx_service_analytics_service_id ON service_analytics(service_id);
CREATE INDEX idx_service_analytics_organization_id ON service_analytics(organization_id);
CREATE INDEX idx_service_analytics_cancellation_rate ON service_analytics(cancellation_rate);

-- Doctor analytics indexes
CREATE INDEX idx_doctor_analytics_doctor_id ON doctor_analytics(doctor_id);
CREATE INDEX idx_doctor_analytics_organization_id ON doctor_analytics(organization_id);
CREATE INDEX idx_doctor_analytics_satisfaction_score ON doctor_analytics(avg_satisfaction_score);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all analytics tables
ALTER TABLE appointment_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_behavior_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointment_analytics
CREATE POLICY "Users can view analytics from their organization" ON appointment_analytics
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert analytics for their organization" ON appointment_analytics
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- RLS Policies for patient_behavior_patterns
CREATE POLICY "Users can view patient patterns from their organization" ON patient_behavior_patterns
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- RLS Policies for service_analytics
CREATE POLICY "Users can view service analytics from their organization" ON service_analytics
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- RLS Policies for doctor_analytics
CREATE POLICY "Users can view doctor analytics from their organization" ON doctor_analytics
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- =====================================================
-- FUNCTIONS FOR ANALYTICS CALCULATION
-- =====================================================

-- Function to calculate reliability score for a patient
CREATE OR REPLACE FUNCTION calculate_patient_reliability_score(patient_uuid UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    total_appointments INTEGER;
    cancelled_appointments INTEGER;
    no_show_appointments INTEGER;
    reliability_score DECIMAL(3,2);
BEGIN
    -- Get total appointments for patient
    SELECT COUNT(*) INTO total_appointments
    FROM appointments
    WHERE patient_id = patient_uuid;
    
    -- Get cancelled appointments
    SELECT COUNT(*) INTO cancelled_appointments
    FROM appointment_analytics
    WHERE user_id = patient_uuid AND action_type = 'cancelled';
    
    -- Get no-show appointments
    SELECT COUNT(*) INTO no_show_appointments
    FROM appointment_analytics
    WHERE user_id = patient_uuid AND action_type = 'no_show';
    
    -- Calculate reliability score (1.0 = perfect, 0.0 = unreliable)
    IF total_appointments = 0 THEN
        reliability_score := 1.00;
    ELSE
        reliability_score := 1.0 - ((cancelled_appointments + no_show_appointments)::DECIMAL / total_appointments);
    END IF;
    
    -- Ensure score is between 0 and 1
    reliability_score := GREATEST(0.00, LEAST(1.00, reliability_score));
    
    RETURN reliability_score;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC ANALYTICS UPDATES
-- =====================================================

-- Function to update analytics when appointment status changes
CREATE OR REPLACE FUNCTION update_appointment_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track significant status changes
    IF OLD.status != NEW.status AND NEW.status IN ('cancelled', 'completed', 'no_show') THEN
        INSERT INTO appointment_analytics (
            appointment_id,
            organization_id,
            action_type,
            original_date,
            original_time,
            time_to_action,
            user_id,
            action_timestamp
        ) VALUES (
            NEW.id,
            NEW.organization_id,
            NEW.status,
            NEW.appointment_date,
            NEW.start_time,
            NOW() - NEW.created_at,
            auth.uid(),
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for appointment status changes
CREATE TRIGGER trigger_appointment_analytics
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_appointment_analytics();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE appointment_analytics IS 'Stores detailed analytics for appointment actions (cancellations, rescheduling) for AI insights';
COMMENT ON TABLE patient_behavior_patterns IS 'Stores learned patient behavior patterns for personalized recommendations';
COMMENT ON TABLE service_analytics IS 'Stores service-level performance metrics for optimization';
COMMENT ON TABLE doctor_analytics IS 'Stores doctor-level performance metrics and patient satisfaction data';

COMMENT ON FUNCTION calculate_patient_reliability_score(UUID) IS 'Calculates reliability score (0-1) for a patient based on appointment history';
COMMENT ON FUNCTION update_appointment_analytics() IS 'Automatically creates analytics records when appointment status changes';

-- =====================================================
-- INITIAL DATA VALIDATION
-- =====================================================

-- Validate that the migration was successful
DO $$
BEGIN
    -- Check if all tables were created
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointment_analytics') THEN
        RAISE EXCEPTION 'appointment_analytics table was not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_behavior_patterns') THEN
        RAISE EXCEPTION 'patient_behavior_patterns table was not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_analytics') THEN
        RAISE EXCEPTION 'service_analytics table was not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'doctor_analytics') THEN
        RAISE EXCEPTION 'doctor_analytics table was not created';
    END IF;
    
    RAISE NOTICE 'Migration 005_appointment_analytics completed successfully';
END $$;
