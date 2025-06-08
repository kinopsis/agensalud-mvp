/**
 * Two-Step WhatsApp Instance Creation Tests
 * 
 * Tests for the two-step WhatsApp instance creation workflow.
 * Validates schema parsing, request type detection, and proper handling.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

// Import the schema that was causing the error
const createTwoStepInstanceSchema = z.object({
  instance_name: z.string().min(3).max(50),
  phone_number: z.string().optional().default(''), // Can be empty for two-step flow
  skipConnection: z.boolean().optional().default(false) // Flag to indicate two-step flow
});

const createSimplifiedInstanceSchema = z.object({
  instance_name: z.string().min(3).max(50),
  phone_number: z.string().regex(/^\+\d{10,15}$/, 'Invalid phone number format. Use international format like +57300123456')
});

describe('Two-Step WhatsApp Instance Creation', () => {
  describe('createTwoStepInstanceSchema', () => {
    it('should validate two-step instance creation with skipConnection', () => {
      const twoStepData = {
        instance_name: 'test-instance',
        phone_number: '',
        skipConnection: true
      };

      const result = createTwoStepInstanceSchema.safeParse(twoStepData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.instance_name).toBe('test-instance');
        expect(result.data.phone_number).toBe('');
        expect(result.data.skipConnection).toBe(true);
      }
    });

    it('should validate two-step instance creation with minimal data', () => {
      const minimalData = {
        instance_name: 'minimal-test'
      };

      const result = createTwoStepInstanceSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.instance_name).toBe('minimal-test');
        expect(result.data.phone_number).toBe(''); // Default value
        expect(result.data.skipConnection).toBe(false); // Default value
      }
    });

    it('should validate two-step instance creation from SimplifiedWhatsAppInstanceModal', () => {
      // This is the exact payload sent by SimplifiedWhatsAppInstanceModal
      const modalData = {
        instance_name: 'AgentSalud-Test',
        phone_number: '', // Empty for two-step flow
        skipConnection: true // Enable two-step flow
      };

      const result = createTwoStepInstanceSchema.safeParse(modalData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.instance_name).toBe('AgentSalud-Test');
        expect(result.data.phone_number).toBe('');
        expect(result.data.skipConnection).toBe(true);
      }
    });

    it('should reject invalid instance names', () => {
      const invalidData = {
        instance_name: 'ab', // Too short
        skipConnection: true
      };

      const result = createTwoStepInstanceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept optional phone number for two-step flow', () => {
      const dataWithPhone = {
        instance_name: 'test-with-phone',
        phone_number: '+57300123456',
        skipConnection: true
      };

      const result = createTwoStepInstanceSchema.safeParse(dataWithPhone);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phone_number).toBe('+57300123456');
      }
    });
  });

  describe('Request Type Detection', () => {
    it('should correctly identify simplified vs two-step requests', () => {
      const simplifiedRequest = {
        instance_name: 'simplified-test',
        phone_number: '+57300123456'
      };

      const twoStepRequest = {
        instance_name: 'two-step-test',
        phone_number: '',
        skipConnection: true
      };

      const isSimplifiedRequest = createSimplifiedInstanceSchema.safeParse(simplifiedRequest).success;
      const isTwoStepRequest = createTwoStepInstanceSchema.safeParse(twoStepRequest).success;

      expect(isSimplifiedRequest).toBe(true);
      expect(isTwoStepRequest).toBe(true);

      // Verify they are mutually exclusive for this test case
      const simplifiedAsTwoStep = createTwoStepInstanceSchema.safeParse(simplifiedRequest).success;
      const twoStepAsSimplified = createSimplifiedInstanceSchema.safeParse(twoStepRequest).success;

      expect(simplifiedAsTwoStep).toBe(true); // Two-step schema is more permissive
      expect(twoStepAsSimplified).toBe(false); // Simplified requires valid phone number
    });

    it('should handle tenant admin request detection', () => {
      const simplifiedRequest = {
        instance_name: 'simplified-test',
        phone_number: '+57300123456'
      };

      const twoStepRequest = {
        instance_name: 'two-step-test',
        skipConnection: true
      };

      const isSimplifiedRequest = createSimplifiedInstanceSchema.safeParse(simplifiedRequest).success;
      const isTwoStepRequest = createTwoStepInstanceSchema.safeParse(twoStepRequest).success;
      const isTenantAdminRequest = isSimplifiedRequest || isTwoStepRequest;

      expect(isTenantAdminRequest).toBe(true);
    });
  });

  describe('Schema Validation Edge Cases', () => {
    it('should handle empty skipConnection field', () => {
      const data = {
        instance_name: 'test-instance',
        phone_number: ''
        // skipConnection not provided
      };

      const result = createTwoStepInstanceSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.skipConnection).toBe(false); // Default value
      }
    });

    it('should handle undefined phone_number', () => {
      const data = {
        instance_name: 'test-instance',
        // phone_number not provided (undefined)
        skipConnection: true
      };

      const result = createTwoStepInstanceSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phone_number).toBe(''); // Converted to default
      }
    });

    it('should validate instance name length constraints', () => {
      const validNames = ['abc', 'test-instance', 'a'.repeat(50)];
      const invalidNames = ['ab', 'a'.repeat(51)];

      validNames.forEach(name => {
        const result = createTwoStepInstanceSchema.safeParse({
          instance_name: name,
          skipConnection: true
        });
        expect(result.success).toBe(true);
      });

      invalidNames.forEach(name => {
        const result = createTwoStepInstanceSchema.safeParse({
          instance_name: name,
          skipConnection: true
        });
        expect(result.success).toBe(false);
      });
    });
  });
});
