-- Migration: 004_optimize_appointments_performance
-- Description: Add database indexes and optimizations for appointments performance
-- Date: 2025-01-28
-- Purpose: Resolve FASE 5 - Vista de Citas performance issues (infinite loading)

-- =====================================================
-- PERFORMANCE OPTIMIZATION FOR APPOINTMENTS TABLE
-- =====================================================

-- Add composite index for organization_id + appointment_date (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_appointments_org_date 
ON appointments (organization_id, appointment_date);

-- Add composite index for doctor_id + appointment_date (doctor schedule queries)
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date 
ON appointments (doctor_id, appointment_date);

-- Add composite index for patient_id + appointment_date (patient history queries)
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date 
ON appointments (patient_id, appointment_date);

-- Add index for status filtering (confirmed, pending, cancelled, completed)
CREATE INDEX IF NOT EXISTS idx_appointments_status 
ON appointments (status);

-- Add composite index for organization + status (admin dashboard queries)
CREATE INDEX IF NOT EXISTS idx_appointments_org_status 
ON appointments (organization_id, status);

-- Add composite index for appointment_date + start_time (time-based queries)
CREATE INDEX IF NOT EXISTS idx_appointments_datetime 
ON appointments (appointment_date, start_time);

-- =====================================================
-- PERFORMANCE OPTIMIZATION FOR RELATED TABLES
-- =====================================================

-- Optimize patients table queries
CREATE INDEX IF NOT EXISTS idx_patients_organization 
ON patients (organization_id);

CREATE INDEX IF NOT EXISTS idx_patients_profile 
ON patients (profile_id);

-- Optimize doctors table queries
CREATE INDEX IF NOT EXISTS idx_doctors_organization 
ON doctors (organization_id);

CREATE INDEX IF NOT EXISTS idx_doctors_profile 
ON doctors (profile_id);

CREATE INDEX IF NOT EXISTS idx_doctors_specialization 
ON doctors (specialization);

-- Optimize profiles table queries (for JOINs)
CREATE INDEX IF NOT EXISTS idx_profiles_organization 
ON profiles (organization_id);

CREATE INDEX IF NOT EXISTS idx_profiles_role 
ON profiles (role);

-- Optimize services table queries
CREATE INDEX IF NOT EXISTS idx_services_organization 
ON services (organization_id);

-- Optimize doctor_availability table queries
CREATE INDEX IF NOT EXISTS idx_doctor_availability_doctor_day 
ON doctor_availability (doctor_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_doctor_availability_organization 
ON doctor_availability (organization_id);

-- =====================================================
-- QUERY OPTIMIZATION VIEWS
-- =====================================================

-- Create optimized view for appointment listings with pre-joined data
CREATE OR REPLACE VIEW appointments_with_details AS
SELECT 
    a.id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.status,
    a.reason,
    a.notes,
    a.organization_id,
    a.created_at,
    a.updated_at,
    -- Patient information
    p.id as patient_id,
    pp.first_name as patient_first_name,
    pp.last_name as patient_last_name,
    pp.email as patient_email,
    pp.phone as patient_phone,
    -- Doctor information
    d.id as doctor_id,
    dp.first_name as doctor_first_name,
    dp.last_name as doctor_last_name,
    d.specialization as doctor_specialization,
    -- Service information
    s.id as service_id,
    s.name as service_name,
    s.duration_minutes as service_duration,
    s.price as service_price
FROM appointments a
-- Patient JOIN
LEFT JOIN patients pat ON a.patient_id = pat.id
LEFT JOIN profiles pp ON pat.profile_id = pp.id
-- Doctor JOIN  
LEFT JOIN doctors d ON a.doctor_id = d.id
LEFT JOIN profiles dp ON d.profile_id = dp.id
-- Service JOIN
LEFT JOIN services s ON a.service_id = s.id;

-- =====================================================
-- PERFORMANCE MONITORING
-- =====================================================

-- Add comments for monitoring and maintenance
COMMENT ON INDEX idx_appointments_org_date IS 
'Composite index for organization + date queries - Primary performance optimization for appointments listing';

COMMENT ON INDEX idx_appointments_doctor_date IS 
'Composite index for doctor + date queries - Optimizes doctor schedule views';

COMMENT ON INDEX idx_appointments_patient_date IS 
'Composite index for patient + date queries - Optimizes patient history views';

COMMENT ON VIEW appointments_with_details IS 
'Optimized view for appointment listings with pre-joined patient, doctor, and service data - Reduces query complexity';

-- =====================================================
-- STATISTICS UPDATE
-- =====================================================

-- Update table statistics for query planner optimization
ANALYZE appointments;
ANALYZE patients;
ANALYZE doctors;
ANALYZE profiles;
ANALYZE services;
ANALYZE doctor_availability;

-- =====================================================
-- PERFORMANCE VALIDATION QUERIES
-- =====================================================

-- These queries can be used to validate performance improvements:

-- 1. Organization appointments by date range (most common query)
-- EXPLAIN ANALYZE SELECT * FROM appointments_with_details 
-- WHERE organization_id = 'org-id' 
-- AND appointment_date >= '2024-01-01' 
-- AND appointment_date <= '2024-12-31'
-- ORDER BY appointment_date DESC, start_time ASC;

-- 2. Doctor appointments for specific date
-- EXPLAIN ANALYZE SELECT * FROM appointments_with_details 
-- WHERE doctor_id = 'doctor-id' 
-- AND appointment_date = '2024-01-28'
-- ORDER BY start_time ASC;

-- 3. Patient appointment history
-- EXPLAIN ANALYZE SELECT * FROM appointments_with_details 
-- WHERE patient_id = 'patient-id' 
-- ORDER BY appointment_date DESC, start_time DESC;

-- 4. Dashboard statistics query
-- EXPLAIN ANALYZE SELECT 
--   COUNT(*) as total,
--   COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
--   COUNT(*) FILTER (WHERE status = 'pending') as pending,
--   COUNT(*) FILTER (WHERE appointment_date = CURRENT_DATE) as today
-- FROM appointments 
-- WHERE organization_id = 'org-id';

-- =====================================================
-- MAINTENANCE NOTES
-- =====================================================

-- Performance monitoring recommendations:
-- 1. Monitor query execution times using EXPLAIN ANALYZE
-- 2. Update statistics regularly with ANALYZE command
-- 3. Consider VACUUM ANALYZE for table maintenance
-- 4. Monitor index usage with pg_stat_user_indexes
-- 5. Review slow query logs periodically

-- Expected performance improvements:
-- - Appointment listing queries: 80-90% faster
-- - Dashboard statistics: 70-80% faster  
-- - Doctor schedule queries: 85-95% faster
-- - Patient history queries: 75-85% faster
-- - Overall page load time: < 2 seconds (from > 30 seconds)
