# 🗄️ AgentSalud MVP - Database Documentation

## 📋 Overview

The AgentSalud MVP uses PostgreSQL via Supabase as its primary database, implementing a multi-tenant architecture with Row-Level Security (RLS) for data isolation and comprehensive healthcare data management.

## 🏗️ Database Architecture

### 🎯 Design Principles
- **Multi-Tenant Isolation**: Organization-based data separation
- **Row-Level Security**: Database-level access control
- **HIPAA Compliance**: Healthcare data protection standards
- **Scalable Design**: Support for multiple healthcare organizations
- **Audit Trail**: Comprehensive logging for compliance

### 🔐 Security Model
- **RLS Policies**: Automatic data filtering by organization and role
- **Authentication Integration**: Seamless Supabase Auth integration
- **Encrypted Storage**: Sensitive data encryption at rest
- **Access Logging**: Comprehensive audit trails

## 📊 Core Entities

### 🏢 Organizations (Multi-Tenant)
Primary tenant entity for healthcare organizations:

```sql
organizations (
  id: uuid PRIMARY KEY,
  name: text NOT NULL,
  slug: text UNIQUE NOT NULL,
  description: text,
  contact_email: text,
  contact_phone: text,
  address: text,
  subscription_plan: text DEFAULT 'basic',
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
)
```

### 👥 User Profiles
Extended user information linked to Supabase Auth:

```sql
profiles (
  id: uuid PRIMARY KEY REFERENCES auth.users,
  organization_id: uuid REFERENCES organizations,
  email: text UNIQUE NOT NULL,
  first_name: text,
  last_name: text,
  phone: text,
  role: user_role NOT NULL,
  avatar_url: text,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
)
```

### 👨‍⚕️ Healthcare Professionals
Doctor-specific information and specializations:

```sql
doctors (
  id: uuid PRIMARY KEY,
  profile_id: uuid REFERENCES profiles,
  organization_id: uuid REFERENCES organizations,
  specialization: text NOT NULL,
  license_number: text,
  years_experience: integer,
  bio: text,
  consultation_fee: decimal,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
)
```

### 🏥 Patients
Patient records and contact information:

```sql
patients (
  id: uuid PRIMARY KEY,
  organization_id: uuid REFERENCES organizations,
  first_name: text NOT NULL,
  last_name: text NOT NULL,
  email: text,
  phone: text,
  date_of_birth: date,
  gender: text,
  address: text,
  emergency_contact: text,
  emergency_phone: text,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
)
```

### 📅 Appointments
Central appointment booking and management:

```sql
appointments (
  id: uuid PRIMARY KEY,
  organization_id: uuid REFERENCES organizations,
  patient_id: uuid REFERENCES patients,
  doctor_id: uuid REFERENCES doctors,
  service_id: uuid REFERENCES services,
  location_id: uuid REFERENCES locations,
  appointment_date: date NOT NULL,
  appointment_time: time NOT NULL,
  duration_minutes: integer DEFAULT 30,
  status: appointment_status DEFAULT 'scheduled',
  reason: text,
  notes: text,
  created_by: uuid REFERENCES profiles,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
)
```

### ⏰ Doctor Schedules
Doctor availability and working hours:

```sql
doctor_schedules (
  id: uuid PRIMARY KEY,
  doctor_id: uuid REFERENCES doctors,
  organization_id: uuid REFERENCES organizations,
  day_of_week: integer NOT NULL, -- 0=Sunday, 6=Saturday
  start_time: time NOT NULL,
  end_time: time NOT NULL,
  is_available: boolean DEFAULT true,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
)
```

## 🔗 Relationships & Constraints

### 📊 Entity Relationships
- **Organizations** → **Profiles** (1:N) - Users belong to organizations
- **Profiles** → **Doctors** (1:1) - Doctor profiles extend user profiles
- **Organizations** → **Patients** (1:N) - Patients registered per organization
- **Doctors** → **Appointments** (1:N) - Doctor appointment history
- **Patients** → **Appointments** (1:N) - Patient appointment history
- **Doctors** → **Doctor Schedules** (1:N) - Weekly availability patterns

### 🔒 Foreign Key Constraints
- **Cascading Deletes**: Proper cleanup when organizations are removed
- **Referential Integrity**: Ensures data consistency across relationships
- **Multi-Tenant Isolation**: Organization ID required for all tenant data

## 🛡️ Row-Level Security (RLS)

### 🎯 Security Policies
All tables implement comprehensive RLS policies for multi-tenant isolation:

#### Organization-Level Policies
```sql
-- Users can only access data from their organization
CREATE POLICY "organization_isolation" ON {table_name}
  FOR ALL USING (organization_id = get_user_organization_id());
```

#### Role-Based Policies
```sql
-- Admins can manage all data within their organization
CREATE POLICY "admin_full_access" ON {table_name}
  FOR ALL USING (
    get_user_role() = 'admin' AND 
    organization_id = get_user_organization_id()
  );

-- Patients can only access their own data
CREATE POLICY "patient_own_data" ON appointments
  FOR ALL USING (
    get_user_role() = 'patient' AND 
    patient_id = get_current_patient_id()
  );
```

### 🔧 Helper Functions
Custom PostgreSQL functions for RLS policy enforcement:

```sql
-- Get current user's organization
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid AS $$
  SELECT organization_id FROM profiles 
  WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles 
  WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;
```

## 📈 Performance Optimization

### 🔍 Indexing Strategy
Critical indexes for optimal query performance:

```sql
-- Multi-tenant queries
CREATE INDEX idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX idx_appointments_organization_id ON appointments(organization_id);
CREATE INDEX idx_doctors_organization_id ON doctors(organization_id);

-- Appointment queries
CREATE INDEX idx_appointments_date_time ON appointments(appointment_date, appointment_time);
CREATE INDEX idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);

-- Schedule queries
CREATE INDEX idx_doctor_schedules_doctor_day ON doctor_schedules(doctor_id, day_of_week);
```

### ⚡ Query Optimization
- **Composite Indexes**: Multi-column indexes for complex queries
- **Partial Indexes**: Filtered indexes for specific conditions
- **Query Planning**: Regular EXPLAIN ANALYZE for performance monitoring

## 🔄 Data Migration

### 📋 Migration History
Comprehensive migration tracking and versioning:

- **Initial Schema**: Base tables and relationships
- **RLS Implementation**: Security policies and helper functions
- **Performance Optimization**: Indexes and query improvements
- **Feature Additions**: New columns and tables for enhanced functionality

### 🛠️ Migration Tools
- **Supabase Migrations**: Version-controlled schema changes
- **Rollback Support**: Safe migration rollback procedures
- **Data Validation**: Post-migration data integrity checks

## 🧪 Testing & Validation

### 🔬 Database Testing
- **RLS Policy Testing**: Verify multi-tenant isolation
- **Constraint Testing**: Validate referential integrity
- **Performance Testing**: Query performance benchmarks
- **Data Consistency**: Cross-table relationship validation

### 📊 Monitoring & Maintenance
- **Query Performance**: Regular performance analysis
- **Index Usage**: Monitor and optimize index effectiveness
- **Storage Growth**: Track database size and growth patterns
- **Backup Verification**: Regular backup and restore testing

## 📚 Additional Resources

### 📖 Detailed Documentation
- **[Schema Reference](schema.md)** - Complete database schema
- **[Migration Guide](migrations.md)** - Migration procedures and history
- **[RLS Policies](rls-policies.md)** - Security policy documentation

### 🔗 External Resources
- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**Database Version**: 1.0  
**Last Updated**: January 2025  
**Status**: Production Ready  
**Backup Schedule**: Daily automated backups with 30-day retention
