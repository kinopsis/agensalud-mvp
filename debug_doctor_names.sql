-- Debug Doctor Names Issue
-- Investigation SQL queries to identify why doctor names are not showing

-- 1. Check appointments table structure and sample data
SELECT 
    'Appointments table structure' as test,
    a.id,
    a.appointment_date,
    a.start_time,
    a.doctor_id,
    a.patient_id,
    a.organization_id
FROM appointments a
LIMIT 3;

-- 2. Check doctors table structure and sample data
SELECT 
    'Doctors table structure' as test,
    d.id,
    d.profile_id,
    d.specialization,
    d.organization_id,
    d.is_available
FROM doctors d
LIMIT 3;

-- 3. Check profiles table for doctor profiles
SELECT 
    'Doctor profiles' as test,
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.role,
    p.organization_id
FROM profiles p
WHERE p.role = 'doctor'
LIMIT 3;

-- 4. Test the exact join used in the application
SELECT 
    'Appointments with doctor join (current query)' as test,
    a.id as appointment_id,
    a.appointment_date,
    a.start_time,
    d.id as doctor_id,
    d.specialization,
    p.first_name,
    p.last_name,
    p.email
FROM appointments a
LEFT JOIN doctors d ON a.doctor_id = d.id
LEFT JOIN profiles p ON d.profile_id = p.id
WHERE a.organization_id = (SELECT id FROM organizations LIMIT 1)
LIMIT 5;

-- 5. Check if there are appointments without doctor associations
SELECT 
    'Appointments without doctors' as test,
    COUNT(*) as count_without_doctors
FROM appointments a
LEFT JOIN doctors d ON a.doctor_id = d.id
WHERE d.id IS NULL;

-- 6. Check if there are doctors without profile associations
SELECT 
    'Doctors without profiles' as test,
    COUNT(*) as count_without_profiles
FROM doctors d
LEFT JOIN profiles p ON d.profile_id = p.id
WHERE p.id IS NULL;

-- 7. Check if there are profiles without names
SELECT 
    'Doctor profiles without names' as test,
    COUNT(*) as count_without_names
FROM profiles p
WHERE p.role = 'doctor' 
AND (p.first_name IS NULL OR p.first_name = '' OR p.last_name IS NULL OR p.last_name = '');

-- 8. Test Supabase-style query (what the app should be getting)
-- This simulates the nested JSON structure that Supabase returns
SELECT 
    'Supabase-style nested query simulation' as test,
    a.id,
    a.appointment_date,
    a.start_time,
    json_build_object(
        'id', d.id,
        'specialization', d.specialization,
        'profiles', json_build_array(
            json_build_object(
                'first_name', p.first_name,
                'last_name', p.last_name
            )
        )
    ) as doctor
FROM appointments a
LEFT JOIN doctors d ON a.doctor_id = d.id
LEFT JOIN profiles p ON d.profile_id = p.id
WHERE a.organization_id = (SELECT id FROM organizations LIMIT 1)
LIMIT 3;

-- 9. Check for data consistency issues
SELECT 
    'Data consistency check' as test,
    COUNT(DISTINCT a.id) as total_appointments,
    COUNT(DISTINCT CASE WHEN d.id IS NOT NULL THEN a.id END) as appointments_with_doctors,
    COUNT(DISTINCT CASE WHEN p.id IS NOT NULL THEN a.id END) as appointments_with_doctor_profiles,
    COUNT(DISTINCT CASE WHEN p.first_name IS NOT NULL AND p.last_name IS NOT NULL THEN a.id END) as appointments_with_doctor_names
FROM appointments a
LEFT JOIN doctors d ON a.doctor_id = d.id
LEFT JOIN profiles p ON d.profile_id = p.id
WHERE a.organization_id = (SELECT id FROM organizations LIMIT 1);

-- 10. Sample working appointment with full doctor info
SELECT 
    'Sample working appointment' as test,
    a.id,
    a.appointment_date,
    a.start_time,
    a.status,
    d.id as doctor_id,
    d.specialization,
    p.first_name || ' ' || p.last_name as doctor_full_name,
    s.name as service_name,
    l.name as location_name
FROM appointments a
LEFT JOIN doctors d ON a.doctor_id = d.id
LEFT JOIN profiles p ON d.profile_id = p.id
LEFT JOIN services s ON a.service_id = s.id
LEFT JOIN locations l ON a.location_id = l.id
WHERE a.organization_id = (SELECT id FROM organizations LIMIT 1)
AND p.first_name IS NOT NULL 
AND p.last_name IS NOT NULL
LIMIT 3;
