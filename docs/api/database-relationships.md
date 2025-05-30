# Database Relationships and API Query Patterns

## Overview

This document describes the corrected database relationships and proper query patterns for the AgentSalud MVP system, particularly focusing on the appointment-doctor-profile relationship structure.

## Core Relationship Structure

### Appointments → Doctors → Profiles

The appointment system uses a three-tier relationship structure:

```
appointments → doctors → profiles
```

**Important**: Appointments reference the `doctors` table, which then references `profiles`. This is different from a direct appointment → profile relationship.

## Corrected Query Patterns

### 1. Upcoming Appointments with Doctor Information

**❌ Incorrect (Old Pattern):**
```javascript
const { data } = await supabase
  .from('appointments')
  .select(`
    *,
    doctor:profiles!appointments_doctor_id_fkey(first_name, last_name)
  `);
```

**✅ Correct (New Pattern):**
```javascript
const { data } = await supabase
  .from('appointments')
  .select(`
    *,
    doctor:doctors!appointments_doctor_id_fkey(
      profile_id,
      profiles(first_name, last_name)
    )
  `);
```

### 2. Data Processing for Nested Relationships

**❌ Incorrect Data Access:**
```javascript
const doctorName = appointment.doctor?.[0]?.first_name;
```

**✅ Correct Data Access:**
```javascript
const doctorRecord = appointment.doctor?.[0];
const doctorProfile = doctorRecord?.profiles?.[0];
const doctorName = doctorProfile?.first_name;
```

## Table Relationships

### Primary Relationships

```sql
-- Appointments table
appointments.patient_id → profiles.id
appointments.doctor_id → doctors.id  -- NOT profiles.id
appointments.service_id → services.id
appointments.location_id → locations.id

-- Doctors table
doctors.profile_id → profiles.id
doctors.organization_id → organizations.id

-- Doctor Availability table
doctor_availability.doctor_id → profiles.id  -- Direct to profile
doctor_availability.location_id → locations.id
```

### Foreign Key Constraints

```sql
-- Appointments foreign keys
ALTER TABLE appointments 
ADD CONSTRAINT appointments_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES profiles(id);

ALTER TABLE appointments 
ADD CONSTRAINT appointments_doctor_id_fkey 
FOREIGN KEY (doctor_id) REFERENCES doctors(id);

-- Doctors foreign keys
ALTER TABLE doctors 
ADD CONSTRAINT doctors_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES profiles(id);

-- Doctor availability foreign keys
ALTER TABLE doctor_availability 
ADD CONSTRAINT doctor_availability_doctor_id_fkey 
FOREIGN KEY (doctor_id) REFERENCES profiles(id);
```

## API Query Examples

### 1. Get Appointment with Full Details

```javascript
const { data: appointments } = await supabase
  .from('appointments')
  .select(`
    id,
    appointment_date,
    start_time,
    end_time,
    status,
    notes,
    patient:profiles!appointments_patient_id_fkey(
      first_name, 
      last_name, 
      phone
    ),
    doctor:doctors!appointments_doctor_id_fkey(
      id,
      specialization,
      profiles(first_name, last_name, email)
    ),
    service:services(name, duration, price),
    location:locations(name, address)
  `);
```

### 2. Get Doctor Schedule

```javascript
const { data: schedule } = await supabase
  .from('doctor_availability')
  .select(`
    id,
    day_of_week,
    start_time,
    end_time,
    is_active,
    notes,
    location:locations(name, address)
  `)
  .eq('doctor_id', profileId)  // Note: uses profile_id directly
  .order('day_of_week');
```

### 3. Get Doctors with Availability

```javascript
const { data: doctors } = await supabase
  .from('doctors')
  .select(`
    id,
    specialization,
    is_active,
    profiles(
      id,
      first_name,
      last_name,
      email
    ),
    doctor_availability(
      day_of_week,
      start_time,
      end_time,
      is_active
    )
  `)
  .eq('organization_id', organizationId);
```

## Common Schema Cache Issues

### Problem: "relation does not exist"

**Symptoms:**
- Error code: `42P01`
- Message: `relation "public.table_name" does not exist`

**Solutions:**
1. Verify table exists in Supabase dashboard
2. Check PostgREST schema cache refresh
3. Use monitoring system to track issues
4. Restart Supabase connection if needed

### Problem: "Could not find relationship"

**Symptoms:**
- Error code: `PGRST200`
- Message: `Could not find a relationship between tables`

**Solutions:**
1. Verify foreign key constraints exist
2. Check relationship naming in query
3. Use correct table references in joins
4. Monitor schema cache status

## Data Processing Patterns

### Safe Nested Data Access

```javascript
// Helper function for safe nested access
function safeNestedAccess(obj, path, defaultValue = null) {
  return path.reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : defaultValue;
  }, obj);
}

// Usage examples
const patientName = safeNestedAccess(
  appointment, 
  ['patient', 0, 'first_name'], 
  'Unknown Patient'
);

const doctorName = safeNestedAccess(
  appointment, 
  ['doctor', 0, 'profiles', 0, 'first_name'], 
  'Unknown Doctor'
);
```

### Array Handling for Supabase Joins

```javascript
// Supabase returns arrays for joined data
function formatAppointmentData(appointment) {
  const patient = appointment.patient?.[0];
  const doctorRecord = appointment.doctor?.[0];
  const doctorProfile = doctorRecord?.profiles?.[0];
  const service = appointment.service?.[0];
  const location = appointment.location?.[0];

  return {
    id: appointment.id,
    patient_name: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient',
    doctor_name: doctorProfile ? `${doctorProfile.first_name} ${doctorProfile.last_name}` : 'Unknown Doctor',
    service_name: service?.name || 'Unknown Service',
    location_name: location?.name || 'Unknown Location',
    // ... other fields
  };
}
```

## Monitoring and Error Handling

### Schema Cache Monitoring

```javascript
import { withSchemaCacheMonitoring, isSchemaCacheError } from '@/lib/monitoring/supabase-monitor';

// Wrap Supabase operations
const { data, error } = await withSchemaCacheMonitoring(
  () => supabase.from('appointments').select('*'),
  {
    endpoint: '/api/appointments',
    table: 'appointments',
    operation: 'SELECT'
  }
);

if (error && isSchemaCacheError(error)) {
  // Handle schema cache error specifically
  console.log('Schema cache issue detected');
}
```

## Best Practices

1. **Always use monitoring**: Wrap Supabase operations with schema cache monitoring
2. **Handle nested data safely**: Use safe access patterns for joined data
3. **Verify relationships**: Ensure foreign key constraints match your queries
4. **Test edge cases**: Handle empty arrays and null values
5. **Monitor errors**: Track schema cache issues for proactive resolution

## Migration Considerations

When adding new tables or relationships:

1. Create tables with proper foreign key constraints
2. Add RLS policies immediately
3. Test API queries with monitoring enabled
4. Update documentation with new relationship patterns
5. Add appropriate indexes for performance
