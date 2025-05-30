-- Migration: 005_add_missing_tables
-- Description: Add missing doctors and patients tables referenced in RLS policies
-- Date: 2025-01-14

-- Doctors table (extends profiles for doctor-specific information)
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    specialization TEXT,
    license_number TEXT,
    consultation_fee DECIMAL(10,2),
    bio TEXT,
    education TEXT,
    experience_years INTEGER,
    languages TEXT[], -- Array of languages spoken
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id)
);

-- Patients table (extends profiles for patient-specific information)
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    date_of_birth DATE,
    gender TEXT,
    address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    medical_notes TEXT,
    allergies TEXT,
    medications TEXT,
    insurance_provider TEXT,
    insurance_number TEXT,
    status TEXT DEFAULT 'active', -- active, inactive, archived
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id)
);

-- Create indexes for performance
CREATE INDEX idx_doctors_organization ON doctors(organization_id);
CREATE INDEX idx_doctors_profile ON doctors(profile_id);
CREATE INDEX idx_doctors_specialization ON doctors(specialization);
CREATE INDEX idx_patients_organization ON patients(organization_id);
CREATE INDEX idx_patients_profile ON patients(profile_id);
CREATE INDEX idx_patients_status ON patients(status);

-- Apply updated_at triggers
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on new tables
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for doctors table
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

-- Create RLS policies for patients table
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
