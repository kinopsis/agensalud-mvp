/**
 * WhatsApp Defaults Utility Functions Tests
 * 
 * Comprehensive test suite for enhanced phone number validation and QR code flow support.
 * Tests the critical fixes implemented for phone number validation flexibility.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { describe, it, expect } from '@jest/globals';
import {
  validatePhoneNumber,
  normalizePhoneNumber,
  validateInstanceName,
  getValidationErrors
} from '@/lib/utils/whatsapp-defaults';

// =====================================================
// PHONE NUMBER VALIDATION TESTS
// =====================================================

describe('validatePhoneNumber', () => {
  describe('with allowEmpty = false (strict validation)', () => {
    it('should validate international format with + prefix', () => {
      expect(validatePhoneNumber('+57300123456', false)).toBe(true);
      expect(validatePhoneNumber('+1234567890', false)).toBe(true);
      expect(validatePhoneNumber('+34600222111', false)).toBe(true);
      expect(validatePhoneNumber('+521234567890', false)).toBe(true);
    });

    it('should validate international format without + prefix (auto-normalized)', () => {
      expect(validatePhoneNumber('57300123456', false)).toBe(true);
      expect(validatePhoneNumber('1234567890', false)).toBe(true);
      expect(validatePhoneNumber('34600222111', false)).toBe(true);
      expect(validatePhoneNumber('521234567890', false)).toBe(true);
    });

    it('should reject empty or whitespace-only numbers', () => {
      expect(validatePhoneNumber('', false)).toBe(false);
      expect(validatePhoneNumber('   ', false)).toBe(false);
      expect(validatePhoneNumber('\t\n', false)).toBe(false);
    });

    it('should reject invalid formats', () => {
      expect(validatePhoneNumber('+1-234-567-8900', false)).toBe(false);
      expect(validatePhoneNumber('+1 234 567 8900', false)).toBe(false);
      expect(validatePhoneNumber('123', false)).toBe(false); // Too short
      expect(validatePhoneNumber('+1234567890123456', false)).toBe(false); // Too long
      expect(validatePhoneNumber('abc123456789', false)).toBe(false); // Contains letters
    });
  });

  describe('with allowEmpty = true (QR code flow)', () => {
    it('should allow empty phone numbers for QR code flow', () => {
      expect(validatePhoneNumber('', true)).toBe(true);
      expect(validatePhoneNumber('   ', true)).toBe(true);
      expect(validatePhoneNumber('\t\n', true)).toBe(true);
    });

    it('should still validate provided phone numbers', () => {
      expect(validatePhoneNumber('+57300123456', true)).toBe(true);
      expect(validatePhoneNumber('57300123456', true)).toBe(true);
      expect(validatePhoneNumber('+1-234-567-8900', true)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle minimum and maximum length numbers', () => {
      expect(validatePhoneNumber('+1234567890', false)).toBe(true); // 10 digits
      expect(validatePhoneNumber('+123456789012345', false)).toBe(true); // 15 digits
      expect(validatePhoneNumber('+123456789', false)).toBe(false); // 9 digits (too short)
      expect(validatePhoneNumber('+1234567890123456', false)).toBe(false); // 16 digits (too long)
    });

    it('should handle numbers with leading/trailing whitespace', () => {
      expect(validatePhoneNumber('  +57300123456  ', false)).toBe(true);
      expect(validatePhoneNumber('\t57300123456\n', false)).toBe(true);
    });
  });
});

// =====================================================
// PHONE NUMBER NORMALIZATION TESTS
// =====================================================

describe('normalizePhoneNumber', () => {
  it('should add + prefix to numbers without it', () => {
    expect(normalizePhoneNumber('57300123456')).toBe('+57300123456');
    expect(normalizePhoneNumber('1234567890')).toBe('+1234567890');
    expect(normalizePhoneNumber('34600222111')).toBe('+34600222111');
  });

  it('should preserve + prefix when already present', () => {
    expect(normalizePhoneNumber('+57300123456')).toBe('+57300123456');
    expect(normalizePhoneNumber('+1234567890')).toBe('+1234567890');
    expect(normalizePhoneNumber('+34600222111')).toBe('+34600222111');
  });

  it('should handle empty and whitespace-only inputs', () => {
    expect(normalizePhoneNumber('')).toBe('');
    expect(normalizePhoneNumber('   ')).toBe('');
    expect(normalizePhoneNumber('\t\n')).toBe('');
  });

  it('should trim whitespace before normalization', () => {
    expect(normalizePhoneNumber('  57300123456  ')).toBe('+57300123456');
    expect(normalizePhoneNumber('\t+1234567890\n')).toBe('+1234567890');
  });
});

// =====================================================
// INSTANCE NAME VALIDATION TESTS
// =====================================================

describe('validateInstanceName', () => {
  it('should validate correct instance names', () => {
    expect(validateInstanceName('MyInstance')).toBe(true);
    expect(validateInstanceName('Test Instance 123')).toBe(true);
    expect(validateInstanceName('WhatsApp Bot')).toBe(true);
    expect(validateInstanceName('123')).toBe(true); // Minimum length
  });

  it('should reject invalid instance names', () => {
    expect(validateInstanceName('')).toBe(false); // Empty
    expect(validateInstanceName('AB')).toBe(false); // Too short
    expect(validateInstanceName('A'.repeat(51))).toBe(false); // Too long
    expect(validateInstanceName('Test@Instance')).toBe(false); // Special characters
    expect(validateInstanceName('Test-Instance')).toBe(false); // Hyphens not allowed
  });
});

// =====================================================
// VALIDATION ERRORS TESTS
// =====================================================

describe('getValidationErrors', () => {
  describe('QR code flow (isQRCodeFlow = true)', () => {
    it('should allow empty phone number', () => {
      const errors = getValidationErrors('ValidInstance', '', true);
      expect(errors.phone_number).toBeUndefined();
    });

    it('should validate provided phone numbers', () => {
      const errors1 = getValidationErrors('ValidInstance', '+57300123456', true);
      expect(errors1.phone_number).toBeUndefined();

      const errors2 = getValidationErrors('ValidInstance', '57300123456', true);
      expect(errors2.phone_number).toBeUndefined();
    });

    it('should reject invalid phone numbers with helpful message', () => {
      const errors = getValidationErrors('ValidInstance', 'invalid-phone', true);
      expect(errors.phone_number).toBe('Formato inválido. Usa formato internacional (ej: +57300123456) o déjalo vacío para detectar automáticamente');
    });
  });

  describe('strict validation (isQRCodeFlow = false)', () => {
    it('should require phone number', () => {
      const errors = getValidationErrors('ValidInstance', '', false);
      expect(errors.phone_number).toBe('Ingresa un número válido en formato internacional (ej: +57300123456)');
    });

    it('should validate provided phone numbers', () => {
      const errors = getValidationErrors('ValidInstance', '+57300123456', false);
      expect(errors.phone_number).toBeUndefined();
    });
  });

  describe('instance name validation', () => {
    it('should validate instance names regardless of QR code flow', () => {
      const errors1 = getValidationErrors('', '+57300123456', true);
      expect(errors1.instance_name).toBe('El nombre debe tener entre 3 y 50 caracteres (solo letras, números y espacios)');

      const errors2 = getValidationErrors('', '+57300123456', false);
      expect(errors2.instance_name).toBe('El nombre debe tener entre 3 y 50 caracteres (solo letras, números y espacios)');
    });
  });

  describe('combined validation', () => {
    it('should return multiple errors when both fields are invalid', () => {
      const errors = getValidationErrors('AB', 'invalid-phone', false);
      expect(errors.instance_name).toBeDefined();
      expect(errors.phone_number).toBeDefined();
      expect(Object.keys(errors)).toHaveLength(2);
    });

    it('should return empty object when all fields are valid', () => {
      const errors1 = getValidationErrors('ValidInstance', '+57300123456', true);
      expect(Object.keys(errors1)).toHaveLength(0);

      const errors2 = getValidationErrors('ValidInstance', '', true); // QR code flow
      expect(Object.keys(errors2)).toHaveLength(0);
    });
  });
});

// =====================================================
// INTEGRATION TESTS
// =====================================================

describe('Integration scenarios', () => {
  it('should support typical QR code flow scenarios', () => {
    // User enters only instance name (QR code flow)
    const errors1 = getValidationErrors('MyWhatsAppBot', '', true);
    expect(Object.keys(errors1)).toHaveLength(0);

    // User enters instance name and phone number
    const errors2 = getValidationErrors('MyWhatsAppBot', '57300123456', true);
    expect(Object.keys(errors2)).toHaveLength(0);

    // User enters instance name and phone number with +
    const errors3 = getValidationErrors('MyWhatsAppBot', '+57300123456', true);
    expect(Object.keys(errors3)).toHaveLength(0);
  });

  it('should support phone number auto-normalization', () => {
    const testCases = [
      '57300123456',
      '1234567890',
      '34600222111',
      '521234567890'
    ];

    testCases.forEach(phoneNumber => {
      const normalized = normalizePhoneNumber(phoneNumber);
      expect(normalized).toMatch(/^\+\d{10,15}$/);
      expect(validatePhoneNumber(normalized, false)).toBe(true);
    });
  });

  it('should handle real-world user input patterns', () => {
    const realWorldInputs = [
      { instance: 'Mi Bot de WhatsApp', phone: '300 123 4567', shouldNormalize: true },
      { instance: 'WhatsApp Business', phone: '+57 300 123 4567', shouldNormalize: false },
      { instance: 'Consultorio Médico', phone: '', shouldNormalize: false }, // QR code flow
      { instance: 'Clínica ABC', phone: '  +57300123456  ', shouldNormalize: true }
    ];

    realWorldInputs.forEach(({ instance, phone, shouldNormalize }) => {
      if (shouldNormalize && phone.trim()) {
        const normalized = normalizePhoneNumber(phone);
        expect(normalized).toMatch(/^\+\d+$/);
      }
      
      // All should be valid in QR code flow
      const errors = getValidationErrors(instance, phone, true);
      expect(errors.instance_name).toBeUndefined();
      // Phone validation depends on the specific input format
    });
  });
});
