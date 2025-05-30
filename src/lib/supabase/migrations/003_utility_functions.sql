-- Migration: 003_utility_functions
-- Description: Utility functions for appointment scheduling and availability
-- Date: 2025-01-14

-- Function to check if a doctor is available at a specific time
CREATE OR REPLACE FUNCTION check_doctor_availability(
    p_doctor_id UUID,
    p_location_id UUID,
    p_appointment_date DATE,
    p_start_time TIME,
    p_end_time TIME
) RETURNS BOOLEAN AS $$
DECLARE
    day_of_week INTEGER;
    availability_count INTEGER;
    conflict_count INTEGER;
    block_count INTEGER;
BEGIN
    -- Get day of week (0=Sunday, 6=Saturday)
    day_of_week := EXTRACT(DOW FROM p_appointment_date);
    
    -- Check if doctor has availability for this day/time/location
    SELECT COUNT(*) INTO availability_count
    FROM doctor_availability
    WHERE doctor_id = p_doctor_id
      AND location_id = p_location_id
      AND day_of_week = day_of_week
      AND start_time <= p_start_time
      AND end_time >= p_end_time
      AND is_active = true;
    
    -- Return false if no availability
    IF availability_count = 0 THEN
        RETURN false;
    END IF;
    
    -- Check for conflicting appointments
    SELECT COUNT(*) INTO conflict_count
    FROM appointments
    WHERE doctor_id = p_doctor_id
      AND appointment_date = p_appointment_date
      AND status != 'cancelled'
      AND (
          (start_time <= p_start_time AND end_time > p_start_time) OR
          (start_time < p_end_time AND end_time >= p_end_time) OR
          (start_time >= p_start_time AND end_time <= p_end_time)
      );
    
    -- Return false if there are conflicts
    IF conflict_count > 0 THEN
        RETURN false;
    END IF;
    
    -- Check for availability blocks
    SELECT COUNT(*) INTO block_count
    FROM availability_blocks
    WHERE doctor_id = p_doctor_id
      AND start_datetime <= (p_appointment_date + p_start_time)::timestamp
      AND end_datetime >= (p_appointment_date + p_end_time)::timestamp;
    
    -- Return false if there are blocks
    IF block_count > 0 THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to get available time slots for a doctor on a specific date
CREATE OR REPLACE FUNCTION get_available_slots(
    p_doctor_id UUID,
    p_location_id UUID,
    p_appointment_date DATE,
    p_service_duration INTEGER DEFAULT 30
) RETURNS TABLE(
    start_time TIME,
    end_time TIME
) AS $$
DECLARE
    availability_record RECORD;
    current_time TIME;
    slot_end_time TIME;
    day_of_week INTEGER;
BEGIN
    -- Get day of week
    day_of_week := EXTRACT(DOW FROM p_appointment_date);
    
    -- Loop through doctor's availability for this day
    FOR availability_record IN
        SELECT da.start_time, da.end_time
        FROM doctor_availability da
        WHERE da.doctor_id = p_doctor_id
          AND da.location_id = p_location_id
          AND da.day_of_week = day_of_week
          AND da.is_active = true
        ORDER BY da.start_time
    LOOP
        current_time := availability_record.start_time;
        
        -- Generate slots within this availability window
        WHILE current_time + (p_service_duration || ' minutes')::interval <= availability_record.end_time::time LOOP
            slot_end_time := current_time + (p_service_duration || ' minutes')::interval;
            
            -- Check if this slot is available
            IF check_doctor_availability(
                p_doctor_id,
                p_location_id,
                p_appointment_date,
                current_time,
                slot_end_time
            ) THEN
                start_time := current_time;
                end_time := slot_end_time;
                RETURN NEXT;
            END IF;
            
            -- Move to next 15-minute slot
            current_time := current_time + '15 minutes'::interval;
        END LOOP;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to search for available appointments
CREATE OR REPLACE FUNCTION search_available_appointments(
    p_organization_id UUID,
    p_service_id UUID DEFAULT NULL,
    p_doctor_id UUID DEFAULT NULL,
    p_location_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_end_date DATE DEFAULT CURRENT_DATE + INTERVAL '30 days',
    p_limit INTEGER DEFAULT 20
) RETURNS TABLE(
    doctor_id UUID,
    doctor_name TEXT,
    service_id UUID,
    service_name TEXT,
    location_id UUID,
    location_name TEXT,
    appointment_date DATE,
    start_time TIME,
    end_time TIME,
    duration_minutes INTEGER
) AS $$
DECLARE
    search_date DATE;
    service_record RECORD;
    doctor_record RECORD;
    location_record RECORD;
    slot_record RECORD;
    result_count INTEGER := 0;
BEGIN
    -- Loop through date range
    search_date := p_start_date;
    WHILE search_date <= p_end_date AND result_count < p_limit LOOP
        
        -- Loop through services (filtered if specified)
        FOR service_record IN
            SELECT s.id, s.name, s.duration_minutes
            FROM services s
            WHERE s.organization_id = p_organization_id
              AND s.is_active = true
              AND (p_service_id IS NULL OR s.id = p_service_id)
        LOOP
            
            -- Loop through doctors who can provide this service
            FOR doctor_record IN
                SELECT p.id, p.first_name || ' ' || p.last_name as name
                FROM profiles p
                JOIN doctor_services ds ON p.id = ds.doctor_id
                WHERE ds.service_id = service_record.id
                  AND p.organization_id = p_organization_id
                  AND p.role = 'doctor'
                  AND p.is_active = true
                  AND (p_doctor_id IS NULL OR p.id = p_doctor_id)
            LOOP
                
                -- Loop through locations where this doctor works
                FOR location_record IN
                    SELECT DISTINCT l.id, l.name
                    FROM locations l
                    JOIN doctor_availability da ON l.id = da.location_id
                    WHERE da.doctor_id = doctor_record.id
                      AND l.organization_id = p_organization_id
                      AND l.is_active = true
                      AND (p_location_id IS NULL OR l.id = p_location_id)
                LOOP
                    
                    -- Get available slots for this doctor/location/date
                    FOR slot_record IN
                        SELECT * FROM get_available_slots(
                            doctor_record.id,
                            location_record.id,
                            search_date,
                            service_record.duration_minutes
                        )
                        LIMIT 3 -- Limit slots per doctor per day
                    LOOP
                        doctor_id := doctor_record.id;
                        doctor_name := doctor_record.name;
                        service_id := service_record.id;
                        service_name := service_record.name;
                        location_id := location_record.id;
                        location_name := location_record.name;
                        appointment_date := search_date;
                        start_time := slot_record.start_time;
                        end_time := slot_record.end_time;
                        duration_minutes := service_record.duration_minutes;
                        
                        RETURN NEXT;
                        
                        result_count := result_count + 1;
                        IF result_count >= p_limit THEN
                            RETURN;
                        END IF;
                    END LOOP;
                    
                END LOOP;
            END LOOP;
        END LOOP;
        
        search_date := search_date + 1;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new appointment with validation
CREATE OR REPLACE FUNCTION create_appointment(
    p_organization_id UUID,
    p_patient_id UUID,
    p_doctor_id UUID,
    p_service_id UUID,
    p_location_id UUID,
    p_appointment_date DATE,
    p_start_time TIME,
    p_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    appointment_id UUID;
    service_duration INTEGER;
    end_time TIME;
BEGIN
    -- Get service duration
    SELECT duration_minutes INTO service_duration
    FROM services
    WHERE id = p_service_id;
    
    IF service_duration IS NULL THEN
        RAISE EXCEPTION 'Service not found';
    END IF;
    
    -- Calculate end time
    end_time := p_start_time + (service_duration || ' minutes')::interval;
    
    -- Check availability
    IF NOT check_doctor_availability(
        p_doctor_id,
        p_location_id,
        p_appointment_date,
        p_start_time,
        end_time
    ) THEN
        RAISE EXCEPTION 'Doctor is not available at the requested time';
    END IF;
    
    -- Create appointment
    INSERT INTO appointments (
        organization_id,
        patient_id,
        doctor_id,
        service_id,
        location_id,
        appointment_date,
        start_time,
        end_time,
        notes,
        created_by
    ) VALUES (
        p_organization_id,
        p_patient_id,
        p_doctor_id,
        p_service_id,
        p_location_id,
        p_appointment_date,
        p_start_time,
        end_time,
        p_notes,
        COALESCE(p_created_by, p_patient_id)
    ) RETURNING id INTO appointment_id;
    
    RETURN appointment_id;
END;
$$ LANGUAGE plpgsql;
