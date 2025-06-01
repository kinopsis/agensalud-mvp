-- Migration: 005_add_organization_booking_settings
-- Description: Add tenant-configurable booking settings to organizations table
-- Date: 2025-01-30

-- Add booking configuration columns to organizations table
ALTER TABLE organizations 
ADD COLUMN booking_settings JSONB DEFAULT '{
  "advance_booking_hours": 4,
  "max_advance_booking_days": 90,
  "allow_same_day_booking": true,
  "booking_window_start": "08:00",
  "booking_window_end": "18:00",
  "weekend_booking_enabled": false,
  "auto_confirmation": true,
  "cancellation_deadline_hours": 2,
  "reschedule_deadline_hours": 2
}'::jsonb;

-- Add index for booking_settings for better query performance
CREATE INDEX idx_organizations_booking_settings ON organizations USING GIN (booking_settings);

-- Update existing organizations to have default booking settings
UPDATE organizations 
SET booking_settings = '{
  "advance_booking_hours": 4,
  "max_advance_booking_days": 90,
  "allow_same_day_booking": true,
  "booking_window_start": "08:00",
  "booking_window_end": "18:00",
  "weekend_booking_enabled": false,
  "auto_confirmation": true,
  "cancellation_deadline_hours": 2,
  "reschedule_deadline_hours": 2
}'::jsonb
WHERE booking_settings IS NULL;

-- Add constraint to ensure booking_settings is not null
ALTER TABLE organizations 
ADD CONSTRAINT organizations_booking_settings_not_null 
CHECK (booking_settings IS NOT NULL);

-- Add validation function for booking settings
CREATE OR REPLACE FUNCTION validate_booking_settings(settings JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check required fields exist
  IF NOT (settings ? 'advance_booking_hours' AND 
          settings ? 'max_advance_booking_days' AND
          settings ? 'allow_same_day_booking' AND
          settings ? 'booking_window_start' AND
          settings ? 'booking_window_end') THEN
    RETURN FALSE;
  END IF;
  
  -- Validate advance_booking_hours is between 0 and 72 hours
  IF (settings->>'advance_booking_hours')::INTEGER < 0 OR 
     (settings->>'advance_booking_hours')::INTEGER > 72 THEN
    RETURN FALSE;
  END IF;
  
  -- Validate max_advance_booking_days is between 1 and 365 days
  IF (settings->>'max_advance_booking_days')::INTEGER < 1 OR 
     (settings->>'max_advance_booking_days')::INTEGER > 365 THEN
    RETURN FALSE;
  END IF;
  
  -- Validate time format for booking windows (HH:MM)
  IF NOT (settings->>'booking_window_start' ~ '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' AND
          settings->>'booking_window_end' ~ '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$') THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to validate booking settings
ALTER TABLE organizations 
ADD CONSTRAINT organizations_booking_settings_valid 
CHECK (validate_booking_settings(booking_settings));

-- Create function to get organization booking settings
CREATE OR REPLACE FUNCTION get_organization_booking_settings(org_id UUID)
RETURNS JSONB AS $$
DECLARE
  settings JSONB;
BEGIN
  SELECT booking_settings INTO settings
  FROM organizations
  WHERE id = org_id AND is_active = true;
  
  -- Return default settings if organization not found
  IF settings IS NULL THEN
    RETURN '{
      "advance_booking_hours": 4,
      "max_advance_booking_days": 90,
      "allow_same_day_booking": true,
      "booking_window_start": "08:00",
      "booking_window_end": "18:00",
      "weekend_booking_enabled": false,
      "auto_confirmation": true,
      "cancellation_deadline_hours": 2,
      "reschedule_deadline_hours": 2
    }'::jsonb;
  END IF;
  
  RETURN settings;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION validate_booking_settings(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_booking_settings(UUID) TO authenticated;
