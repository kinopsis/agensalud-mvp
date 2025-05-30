-- Migration: 004_add_subscription_plan
-- Description: Add subscription_plan column to organizations table
-- Date: 2025-01-14

-- Add subscription_plan column to organizations table
ALTER TABLE organizations 
ADD COLUMN subscription_plan TEXT DEFAULT 'basic';

-- Add index for subscription_plan for better query performance
CREATE INDEX idx_organizations_subscription_plan ON organizations(subscription_plan);

-- Update existing organizations to have basic plan
UPDATE organizations 
SET subscription_plan = 'basic' 
WHERE subscription_plan IS NULL;
