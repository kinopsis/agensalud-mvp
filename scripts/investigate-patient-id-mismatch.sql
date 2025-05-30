-- Patient ID Mismatch Investigation and Fix Script
-- This script investigates and resolves patient ID inconsistencies in appointments

-- ============================================================================
-- INVESTIGATION QUERIES
-- ============================================================================

-- 1. Find all profiles with the email "maria.garcia.new@example.com"
SELECT 
    id,
    first_name,
    last_name,
    email,
    role,
    organization_id,
    created_at,
    updated_at
FROM profiles 
WHERE email = 'maria.garcia.new@example.com'
ORDER BY created_at;

-- 2. Find appointments that reference any of these patient profiles
SELECT 
    a.id as appointment_id,
    a.appointment_date,
    a.start_time,
    a.status,
    a.patient_id,
    a.organization_id,
    p.id as profile_id,
    p.first_name,
    p.last_name,
    p.email,
    p.role,
    p.created_at as profile_created
FROM appointments a
LEFT JOIN profiles p ON a.patient_id = p.id
WHERE p.email = 'maria.garcia.new@example.com' 
   OR a.patient_id IN (
       SELECT id FROM profiles WHERE email = 'maria.garcia.new@example.com'
   )
ORDER BY a.appointment_date DESC;

-- 3. Find orphaned appointments (appointments with patient_id that doesn't exist)
SELECT 
    a.id as appointment_id,
    a.appointment_date,
    a.patient_id,
    a.organization_id,
    'ORPHANED - Patient profile not found' as issue
FROM appointments a
LEFT JOIN profiles p ON a.patient_id = p.id
WHERE a.patient_id IS NOT NULL 
  AND p.id IS NULL
  AND a.organization_id = '927eecbe-d0e5-43a4-b9d0-25f942eded4'  -- Replace with actual org ID
ORDER BY a.appointment_date DESC;

-- 4. Find duplicate patient profiles for the same email
SELECT 
    email,
    COUNT(*) as profile_count,
    STRING_AGG(id::text, ', ') as profile_ids,
    STRING_AGG(created_at::text, ', ') as created_dates
FROM profiles 
WHERE role = 'patient'
GROUP BY email 
HAVING COUNT(*) > 1
ORDER BY profile_count DESC;

-- 5. Detailed analysis for maria.garcia.new@example.com
WITH patient_profiles AS (
    SELECT * FROM profiles 
    WHERE email = 'maria.garcia.new@example.com' 
    AND role = 'patient'
),
appointment_analysis AS (
    SELECT 
        a.*,
        p.email as patient_email,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.created_at as patient_profile_created,
        CASE 
            WHEN p.id IS NULL THEN 'MISSING_PATIENT_PROFILE'
            WHEN p.email != 'maria.garcia.new@example.com' THEN 'EMAIL_MISMATCH'
            ELSE 'OK'
        END as status
    FROM appointments a
    LEFT JOIN profiles p ON a.patient_id = p.id
    WHERE a.organization_id = '927eecbe-d0e5-43a4-b9d0-25f942eded4'  -- Replace with actual org ID
)
SELECT 
    pp.id as correct_patient_id,
    pp.first_name,
    pp.last_name,
    pp.email,
    pp.created_at as profile_created,
    COUNT(aa.id) as total_appointments,
    COUNT(CASE WHEN aa.patient_id = pp.id THEN 1 END) as correctly_linked,
    COUNT(CASE WHEN aa.patient_id != pp.id OR aa.patient_id IS NULL THEN 1 END) as incorrectly_linked
FROM patient_profiles pp
CROSS JOIN appointment_analysis aa
GROUP BY pp.id, pp.first_name, pp.last_name, pp.email, pp.created_at;

-- ============================================================================
-- DIAGNOSTIC QUERIES FOR SPECIFIC USER
-- ============================================================================

-- 6. Check current user session (replace with actual user ID)
SELECT 
    id,
    email,
    role,
    organization_id,
    first_name,
    last_name,
    created_at
FROM profiles 
WHERE id = '5b361fe-04b6-4e40-bbb1-bd516c0e0be8';  -- Replace with actual current user ID

-- 7. Find all appointments that SHOULD belong to current user based on email
SELECT 
    a.id as appointment_id,
    a.appointment_date,
    a.start_time,
    a.status,
    a.patient_id as current_patient_id,
    p_current.email as current_patient_email,
    p_correct.id as correct_patient_id,
    p_correct.email as correct_patient_email,
    CASE 
        WHEN a.patient_id = p_correct.id THEN 'CORRECT'
        WHEN a.patient_id != p_correct.id THEN 'NEEDS_UPDATE'
        WHEN a.patient_id IS NULL THEN 'NULL_PATIENT_ID'
        ELSE 'UNKNOWN'
    END as fix_needed
FROM appointments a
LEFT JOIN profiles p_current ON a.patient_id = p_current.id
CROSS JOIN profiles p_correct 
WHERE p_correct.id = '5b361fe-04b6-4e40-bbb1-bd516c0e0be8'  -- Current user ID
  AND a.organization_id = p_correct.organization_id
  AND (
      p_current.email = p_correct.email  -- Same email
      OR a.patient_id IS NULL           -- Orphaned appointment
      OR p_current.id IS NULL           -- Missing patient reference
  )
ORDER BY a.appointment_date DESC;

-- ============================================================================
-- FIX QUERIES (RUN ONLY AFTER VERIFICATION)
-- ============================================================================

-- IMPORTANT: Review the investigation results before running these fix queries!

-- 8. Fix appointments with wrong patient_id (DRY RUN - use SELECT first)
-- SELECT 
--     a.id as appointment_id,
--     a.patient_id as old_patient_id,
--     '5b361fe-04b6-4e40-bbb1-bd516c0e0be8' as new_patient_id,
--     a.appointment_date
-- FROM appointments a
-- LEFT JOIN profiles p ON a.patient_id = p.id
-- WHERE a.organization_id = '927eecbe-d0e5-43a4-b9d0-25f942eded4'
--   AND (
--       p.email = 'maria.garcia.new@example.com' 
--       AND p.id != '5b361fe-04b6-4e40-bbb1-bd516c0e0be8'
--   );

-- 9. ACTUAL FIX - Update patient_id in appointments (UNCOMMENT AFTER VERIFICATION)
-- UPDATE appointments 
-- SET 
--     patient_id = '5b361fe-04b6-4e40-bbb1-bd516c0e0be8',
--     updated_at = NOW()
-- WHERE id IN (
--     SELECT a.id
--     FROM appointments a
--     LEFT JOIN profiles p ON a.patient_id = p.id
--     WHERE a.organization_id = '927eecbe-d0e5-43a4-b9d0-25f942eded4'
--       AND p.email = 'maria.garcia.new@example.com' 
--       AND p.id != '5b361fe-04b6-4e40-bbb1-bd516c0e0be8'
-- );

-- 10. Fix NULL patient_id appointments (if any)
-- UPDATE appointments 
-- SET 
--     patient_id = '5b361fe-04b6-4e40-bbb1-bd516c0e0be8',
--     updated_at = NOW()
-- WHERE patient_id IS NULL 
--   AND organization_id = '927eecbe-d0e5-43a4-b9d0-25f942eded4'
--   AND created_at > '2024-01-01'  -- Adjust date range as needed
--   AND id IN (
--       -- Add specific appointment IDs if known
--       SELECT id FROM appointments WHERE patient_id IS NULL LIMIT 0  -- Safety limit
--   );

-- ============================================================================
-- VERIFICATION QUERIES (RUN AFTER FIXES)
-- ============================================================================

-- 11. Verify fix results
SELECT 
    'After Fix' as status,
    COUNT(*) as total_appointments,
    COUNT(CASE WHEN patient_id = '5b361fe-04b6-4e40-bbb1-bd516c0e0be8' THEN 1 END) as correctly_assigned,
    COUNT(CASE WHEN patient_id IS NULL THEN 1 END) as null_patient_id,
    COUNT(CASE WHEN patient_id != '5b361fe-04b6-4e40-bbb1-bd516c0e0be8' THEN 1 END) as other_patients
FROM appointments 
WHERE organization_id = '927eecbe-d0e5-43a4-b9d0-25f942eded4';

-- 12. Final validation - check permission logic
SELECT 
    a.id,
    a.appointment_date,
    a.start_time,
    a.status,
    a.patient_id,
    CASE 
        WHEN a.appointment_date > CURRENT_DATE THEN 'FUTURE'
        ELSE 'PAST'
    END as date_status,
    CASE 
        WHEN a.status IN ('pending', 'confirmed') THEN 'ACTIONABLE'
        ELSE 'NOT_ACTIONABLE'
    END as status_check,
    CASE 
        WHEN a.patient_id = '5b361fe-04b6-4e40-bbb1-bd516c0e0be8' THEN 'OWNS_APPOINTMENT'
        ELSE 'NOT_OWNED'
    END as ownership,
    CASE 
        WHEN a.appointment_date > CURRENT_DATE 
         AND a.status IN ('pending', 'confirmed')
         AND a.patient_id = '5b361fe-04b6-4e40-bbb1-bd516c0e0be8' 
        THEN 'BUTTONS_SHOULD_SHOW'
        ELSE 'BUTTONS_HIDDEN'
    END as expected_ui_state
FROM appointments a
WHERE a.organization_id = '927eecbe-d0e5-43a4-b9d0-25f942eded4'
ORDER BY a.appointment_date DESC
LIMIT 20;

-- ============================================================================
-- NOTES FOR EXECUTION
-- ============================================================================

/*
EXECUTION STEPS:

1. Run investigation queries (1-7) first to understand the scope
2. Replace placeholder IDs with actual values:
   - Current user ID: 5b361fe-04b6-4e40-bbb1-bd516c0e0be8
   - Organization ID: 927eecbe-d0e5-43a4-b9d0-25f942eded4
   - Email: maria.garcia.new@example.com

3. Review results carefully before proceeding with fixes
4. Run fix queries (8-10) only after verification
5. Run verification queries (11-12) to confirm fixes

SAFETY MEASURES:
- All fix queries are commented out by default
- Use SELECT statements first to preview changes
- Test on a small subset before bulk updates
- Backup data before making changes
*/
