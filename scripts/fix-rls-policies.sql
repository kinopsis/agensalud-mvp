-- Fix RLS Policies for AgentSalud MVP
-- Corrects restrictive policies that prevent management pages from showing data
-- Date: 2025-01-26

-- ============================================================================
-- PROFILES TABLE - Fix restrictive policies
-- ============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;

-- Create proper organization-based policy for profiles
CREATE POLICY "profiles_organization_access" ON profiles
    FOR SELECT TO authenticated
    USING (
        -- Users can see profiles from their own organization
        organization_id = (
            SELECT organization_id 
            FROM profiles 
            WHERE id = auth.uid()
        ) OR
        -- SuperAdmin can see all profiles
        (
            SELECT role 
            FROM profiles 
            WHERE id = auth.uid()
        ) = 'superadmin'
    );

-- ============================================================================
-- PATIENTS TABLE - Ensure proper access for management pages
-- ============================================================================

-- Drop conflicting policies
DROP POLICY IF EXISTS "Users can view patients in their organization" ON patients;

-- Keep the organization-based policy that works
-- This policy already exists and is correct:
-- "patients_same_organization" allows admin/staff/doctor to see patients in their org

-- ============================================================================
-- DOCTORS TABLE - Ensure proper access for management pages  
-- ============================================================================

-- Drop conflicting policies
DROP POLICY IF EXISTS "Users can view doctors in their organization" ON doctors;

-- Keep the organization-based policy that works
-- This policy already exists and is correct:
-- "doctors_same_organization" allows users to see doctors in their org

-- ============================================================================
-- APPOINTMENTS TABLE - Clean up duplicate policies
-- ============================================================================

-- The appointments table has good policies, just some duplicates
-- Keep the working ones, remove duplicates if needed

-- ============================================================================
-- VERIFY HELPER FUNCTIONS
-- ============================================================================

-- Ensure get_user_organization_id function is correct
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT organization_id
        FROM profiles
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure get_user_role function is correct  
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role::TEXT
        FROM profiles
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test the policies work correctly
-- These should be run after applying the fixes

/*
-- Test 1: Admin user should see all profiles in their organization
SET session role authenticated;
SET request.jwt.claims TO '{"role":"authenticated", "sub":"6318225b-d0d4-4585-9a7d-3a1e0f536d0d"}';

SELECT COUNT(*) as profiles_count 
FROM profiles 
WHERE organization_id = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';
-- Expected: 13

-- Test 2: Admin user should see all patients in their organization  
SELECT COUNT(*) as patients_count
FROM patients 
WHERE organization_id = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';
-- Expected: 3

-- Test 3: Admin user should see all doctors in their organization
SELECT COUNT(*) as doctors_count
FROM doctors 
WHERE organization_id = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';
-- Expected: 5

-- Reset session
SET session role postgres;
*/
