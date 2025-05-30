-- Migration: 003_staff_doctor_access
-- Description: Update RLS policies to allow Staff role access to doctor availability management
-- Date: 2025-01-28
-- Purpose: Resolve PRD2.md compliance issues for Staff role doctor management

-- Add Staff role to doctor SELECT policy for availability management
-- This allows Staff to view doctors in their organization for schedule management
CREATE POLICY "staff_view_doctors" ON doctors
    FOR SELECT TO authenticated
    USING (
        organization_id = get_user_organization_id() AND
        get_user_role() IN ('admin', 'staff', 'doctor', 'superadmin')
    );

-- Allow Staff to update doctor availability (but not create/delete doctors)
-- This enables Staff to manage doctor schedules and availability blocks
CREATE POLICY "staff_update_doctor_availability" ON doctors
    FOR UPDATE TO authenticated
    USING (
        organization_id = get_user_organization_id() AND
        get_user_role() IN ('admin', 'staff', 'superadmin')
    )
    WITH CHECK (
        organization_id = get_user_organization_id() AND
        get_user_role() IN ('admin', 'staff', 'superadmin')
    );

-- Update doctor_availability table policies to include Staff
-- Staff should be able to manage doctor availability blocks
CREATE POLICY "staff_manage_doctor_availability_blocks" ON doctor_availability
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM doctors 
            WHERE doctors.id = doctor_availability.doctor_id 
            AND doctors.organization_id = get_user_organization_id()
        ) AND
        get_user_role() IN ('admin', 'staff', 'doctor', 'superadmin')
    );

-- Update availability_blocks table policies to include Staff
-- Staff should be able to create/modify availability blocks for doctors
CREATE POLICY "staff_manage_availability_blocks" ON availability_blocks
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM doctor_availability da
            JOIN doctors d ON d.id = da.doctor_id
            WHERE da.id = availability_blocks.availability_id
            AND d.organization_id = get_user_organization_id()
        ) AND
        get_user_role() IN ('admin', 'staff', 'doctor', 'superadmin')
    );

-- Add comment for documentation
COMMENT ON POLICY "staff_view_doctors" ON doctors IS 
'Allows Staff role to view doctors in their organization for availability management per PRD2.md Section 5.5';

COMMENT ON POLICY "staff_update_doctor_availability" ON doctors IS 
'Allows Staff role to update doctor availability information but not create/delete doctors';

COMMENT ON POLICY "staff_manage_doctor_availability_blocks" ON doctor_availability IS 
'Allows Staff role to manage doctor availability blocks for schedule management';

COMMENT ON POLICY "staff_manage_availability_blocks" ON availability_blocks IS 
'Allows Staff role to create and modify availability blocks for doctors in their organization';
