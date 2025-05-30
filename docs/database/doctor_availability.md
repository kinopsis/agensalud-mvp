# Doctor Availability Table Documentation

## Overview

The `doctor_availability` table stores the weekly availability schedules for doctors in the AgentSalud system. This table is essential for the appointment booking functionality, allowing the system to determine when doctors are available for appointments.

## Table Structure

```sql
CREATE TABLE doctor_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES profiles(id) NOT NULL,
    location_id UUID REFERENCES locations(id) NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(doctor_id, location_id, day_of_week, start_time, end_time)
);
```

## Column Descriptions

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `doctor_id` | UUID | Foreign key to `profiles.id` (doctor's profile) |
| `location_id` | UUID | Foreign key to `locations.id` (clinic location) |
| `day_of_week` | INTEGER | Day of week (0=Sunday, 1=Monday, ..., 6=Saturday) |
| `start_time` | TIME | Start time of availability slot |
| `end_time` | TIME | End time of availability slot |
| `is_active` | BOOLEAN | Whether this availability slot is currently active |
| `notes` | TEXT | Optional notes about this availability slot |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | Record last update timestamp |

## Indexes

```sql
-- Performance index for doctor and day queries
CREATE INDEX idx_doctor_availability_doctor_day 
ON doctor_availability(doctor_id, day_of_week);

-- Performance index for location queries
CREATE INDEX idx_doctor_availability_location 
ON doctor_availability(location_id);
```

## Row Level Security (RLS)

The table has RLS enabled with the following policy:

```sql
CREATE POLICY "doctors_staff_availability_access" ON doctor_availability
    FOR ALL TO authenticated
    USING (
        doctor_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'staff', 'superadmin')
            AND profiles.organization_id = (
                SELECT organization_id FROM profiles WHERE id = doctor_availability.doctor_id
            )
        )
    );
```

### Access Rules:
- **Doctors**: Can access their own availability schedules
- **Admin/Staff/SuperAdmin**: Can access all availability schedules within their organization
- **Patients**: No direct access (access through appointment booking APIs)

## Usage Examples

### 1. Get Doctor's Weekly Schedule

```sql
SELECT 
    day_of_week,
    start_time,
    end_time,
    notes
FROM doctor_availability 
WHERE doctor_id = 'doctor-profile-id' 
AND is_active = true
ORDER BY day_of_week, start_time;
```

### 2. Find Available Doctors on Specific Day

```sql
SELECT DISTINCT
    p.first_name,
    p.last_name,
    da.start_time,
    da.end_time
FROM doctor_availability da
JOIN profiles p ON da.doctor_id = p.id
WHERE da.day_of_week = 1  -- Monday
AND da.is_active = true
AND p.organization_id = 'org-id'
ORDER BY da.start_time;
```

### 3. Insert New Availability Slot

```sql
INSERT INTO doctor_availability (
    doctor_id, 
    location_id, 
    day_of_week, 
    start_time, 
    end_time, 
    notes
) VALUES (
    'doctor-profile-id',
    'location-id',
    1,  -- Monday
    '09:00',
    '12:00',
    'Morning consultations'
);
```

## API Integration

### GET /api/doctors/[id]/schedule

Retrieves the availability schedule for a specific doctor.

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "doctor_id": "uuid",
      "location_id": "uuid",
      "day_of_week": 1,
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "is_active": true,
      "notes": "Morning consultations"
    }
  ],
  "count": 1
}
```

## Business Rules

1. **No Overlapping Slots**: The unique constraint prevents overlapping time slots for the same doctor, location, and day.

2. **Time Validation**: `end_time` must be after `start_time`.

3. **Day of Week**: Must be between 0 (Sunday) and 6 (Saturday).

4. **Multi-Location Support**: Doctors can have different schedules at different locations.

5. **Flexible Scheduling**: Doctors can have multiple non-contiguous time slots on the same day.

## Sample Data

```sql
-- Dr. Ana Rodríguez - Morning consultations Monday to Friday
INSERT INTO doctor_availability (doctor_id, location_id, day_of_week, start_time, end_time, notes) VALUES
('c923e0ec-d941-48d1-9fe6-0d75122e3cbe', '3f32d1b7-2ff4-4bfd-95f4-7964db56d7e9', 1, '08:00', '12:00', 'General optometry consultations'),
('c923e0ec-d941-48d1-9fe6-0d75122e3cbe', '3f32d1b7-2ff4-4bfd-95f4-7964db56d7e9', 2, '08:00', '12:00', 'General optometry consultations'),
('c923e0ec-d941-48d1-9fe6-0d75122e3cbe', '3f32d1b7-2ff4-4bfd-95f4-7964db56d7e9', 3, '08:00', '12:00', 'General optometry consultations'),
('c923e0ec-d941-48d1-9fe6-0d75122e3cbe', '3f32d1b7-2ff4-4bfd-95f4-7964db56d7e9', 4, '08:00', '12:00', 'General optometry consultations'),
('c923e0ec-d941-48d1-9fe6-0d75122e3cbe', '3f32d1b7-2ff4-4bfd-95f4-7964db56d7e9', 5, '08:00', '12:00', 'General optometry consultations');
```

## Troubleshooting

### Schema Cache Issues

If you encounter "relation does not exist" errors:

1. **Verify Table Exists**: Check in Supabase dashboard or run:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_name = 'doctor_availability';
   ```

2. **Check RLS Policies**: Ensure RLS policies are properly configured.

3. **Restart Connection**: PostgREST schema cache may need refresh.

4. **Monitor Logs**: Use the schema cache monitoring system to track issues.

## Related Tables

- **profiles**: Contains doctor profile information
- **locations**: Contains clinic location information  
- **appointments**: Uses availability data for booking validation
- **doctors**: Contains doctor-specific information

## Migration History

- **2024-01-10**: Initial table creation with basic structure
- **2024-01-10**: Added RLS policies and indexes
- **2024-01-10**: Added sample data for 5 doctors
