-- Migration: 002_rls_policies
-- Description: Row Level Security policies for multi-tenant architecture
-- Date: 2025-01-14

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization
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

-- Helper function to get user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
BEGIN
    RETURN (
        SELECT role
        FROM profiles
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations policies
-- Superadmin can see all organizations
CREATE POLICY "superadmin_all_organizations" ON organizations
    FOR ALL TO authenticated
    USING (get_user_role() = 'superadmin');

-- Admin can only see their own organization
CREATE POLICY "admin_own_organization" ON organizations
    FOR SELECT TO authenticated
    USING (
        id = get_user_organization_id() AND
        get_user_role() IN ('admin', 'doctor', 'staff', 'patient')
    );

-- Profiles policies
-- Users can see profiles from their own organization
CREATE POLICY "profiles_same_organization" ON profiles
    FOR SELECT TO authenticated
    USING (
        organization_id = get_user_organization_id() OR
        get_user_role() = 'superadmin'
    );

-- Users can update their own profile
CREATE POLICY "users_update_own_profile" ON profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid());

-- Admins can update profiles in their organization
CREATE POLICY "admin_update_organization_profiles" ON profiles
    FOR UPDATE TO authenticated
    USING (
        organization_id = get_user_organization_id() AND
        get_user_role() = 'admin'
    );

-- Superadmin can insert new profiles
CREATE POLICY "superadmin_insert_profiles" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (get_user_role() = 'superadmin');

-- Admins can insert profiles in their organization
CREATE POLICY "admin_insert_organization_profiles" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = get_user_organization_id() AND
        get_user_role() = 'admin'
    );

-- Locations policies
-- Users can see locations from their organization
CREATE POLICY "locations_same_organization" ON locations
    FOR SELECT TO authenticated
    USING (
        organization_id = get_user_organization_id() OR
        get_user_role() = 'superadmin'
    );

-- Admins can manage locations in their organization
CREATE POLICY "admin_manage_locations" ON locations
    FOR ALL TO authenticated
    USING (
        organization_id = get_user_organization_id() AND
        get_user_role() = 'admin'
    );

-- Services policies
-- Users can see services from their organization
CREATE POLICY "services_same_organization" ON services
    FOR SELECT TO authenticated
    USING (
        organization_id = get_user_organization_id() OR
        get_user_role() = 'superadmin'
    );

-- Admins can manage services in their organization
CREATE POLICY "admin_manage_services" ON services
    FOR ALL TO authenticated
    USING (
        organization_id = get_user_organization_id() AND
        get_user_role() = 'admin'
    );

-- Service-Location relationship policies
CREATE POLICY "service_locations_same_organization" ON service_locations
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM services s
            WHERE s.id = service_id
            AND (s.organization_id = get_user_organization_id() OR get_user_role() = 'superadmin')
        )
    );

-- Doctor-Service relationship policies
CREATE POLICY "doctor_services_same_organization" ON doctor_services
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = doctor_id
            AND (p.organization_id = get_user_organization_id() OR get_user_role() = 'superadmin')
        )
    );

-- Doctor availability policies
-- Doctors can manage their own availability
CREATE POLICY "doctors_own_availability" ON doctor_availability
    FOR ALL TO authenticated
    USING (
        doctor_id = auth.uid() OR
        get_user_role() IN ('admin', 'superadmin')
    );

-- Users can see availability from their organization
CREATE POLICY "availability_same_organization" ON doctor_availability
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = doctor_id
            AND (p.organization_id = get_user_organization_id() OR get_user_role() = 'superadmin')
        )
    );

-- Availability blocks policies
-- Doctors can manage their own blocks
CREATE POLICY "doctors_own_blocks" ON availability_blocks
    FOR ALL TO authenticated
    USING (
        doctor_id = auth.uid() OR
        get_user_role() IN ('admin', 'superadmin')
    );

-- Appointments policies
-- Patients can see their own appointments
CREATE POLICY "patients_own_appointments" ON appointments
    FOR SELECT TO authenticated
    USING (
        patient_id = auth.uid() OR
        doctor_id = auth.uid() OR
        get_user_role() IN ('admin', 'staff', 'superadmin')
    );

-- Staff and admins can manage appointments in their organization
CREATE POLICY "staff_manage_appointments" ON appointments
    FOR ALL TO authenticated
    USING (
        organization_id = get_user_organization_id() AND
        get_user_role() IN ('admin', 'staff', 'doctor') OR
        get_user_role() = 'superadmin'
    );

-- Patients can create appointments in their organization
CREATE POLICY "patients_create_appointments" ON appointments
    FOR INSERT TO authenticated
    WITH CHECK (
        patient_id = auth.uid() AND
        organization_id = get_user_organization_id()
    );

-- Doctors table policies
-- Users can see doctors from their organization
CREATE POLICY "doctors_same_organization" ON doctors
    FOR SELECT TO authenticated
    USING (
        organization_id = get_user_organization_id() OR
        get_user_role() = 'superadmin'
    );

-- Admins can manage doctors in their organization
CREATE POLICY "admin_manage_doctors" ON doctors
    FOR ALL TO authenticated
    USING (
        organization_id = get_user_organization_id() AND
        get_user_role() IN ('admin', 'superadmin')
    );

-- Doctors can update their own profile
CREATE POLICY "doctors_update_own_profile" ON doctors
    FOR UPDATE TO authenticated
    USING (profile_id = auth.uid());

-- Patients table policies
-- Users can see patients from their organization (for staff/admin/doctors)
CREATE POLICY "patients_same_organization" ON patients
    FOR SELECT TO authenticated
    USING (
        organization_id = get_user_organization_id() AND
        get_user_role() IN ('admin', 'staff', 'doctor', 'superadmin') OR
        profile_id = auth.uid()
    );

-- Patients can see their own record
CREATE POLICY "patients_own_record" ON patients
    FOR SELECT TO authenticated
    USING (profile_id = auth.uid());

-- Staff and admins can manage patients in their organization
CREATE POLICY "staff_manage_patients" ON patients
    FOR ALL TO authenticated
    USING (
        organization_id = get_user_organization_id() AND
        get_user_role() IN ('admin', 'staff', 'superadmin')
    );

-- Patients can create their own patient record
CREATE POLICY "patients_create_own_record" ON patients
    FOR INSERT TO authenticated
    WITH CHECK (
        profile_id = auth.uid() AND
        organization_id = get_user_organization_id()
    );

-- Patients can update their own record
CREATE POLICY "patients_update_own_record" ON patients
    FOR UPDATE TO authenticated
    USING (profile_id = auth.uid());
