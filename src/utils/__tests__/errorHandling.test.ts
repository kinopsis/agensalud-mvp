/**
 * Error Handling Utilities Tests
 * 
 * Tests for the error handling utilities to ensure proper error message extraction
 * from various error formats that can occur in the application.
 */

import { extractErrorMessage, extractWhatsAppErrorMessage } from '../errorHandling';

describe('Error Handling Utilities', () => {
  describe('extractErrorMessage', () => {
    it('should extract message from Error objects', () => {
      const error = new Error('Test error message');
      expect(extractErrorMessage(error)).toBe('Test error message');
    });

    it('should extract message from API error format', () => {
      const error = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data'
      };
      expect(extractErrorMessage(error)).toBe('Invalid input data');
    });

    it('should extract message from nested error format', () => {
      const error = {
        error: {
          message: 'Nested error message'
        }
      };
      expect(extractErrorMessage(error)).toBe('Nested error message');
    });

    it('should extract message from simple error format', () => {
      const error = {
        error: 'Simple error message'
      };
      expect(extractErrorMessage(error)).toBe('Simple error message');
    });

    it('should handle error with code and message', () => {
      const error = {
        code: 'NOT_FOUND',
        message: 'Resource not found'
      };
      expect(extractErrorMessage(error)).toBe('NOT_FOUND: Resource not found');
    });

    it('should handle validation errors with details', () => {
      const error = {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: 'Field is required'
      };
      expect(extractErrorMessage(error)).toBe('Código: VALIDATION_ERROR - Validation failed - Detalles: Field is required');
    });

    it('should handle string errors', () => {
      expect(extractErrorMessage('String error message')).toBe('String error message');
    });

    it('should handle unknown error types', () => {
      expect(extractErrorMessage(null)).toBe('Ha ocurrido un error inesperado');
      expect(extractErrorMessage(undefined)).toBe('Ha ocurrido un error inesperado');
      expect(extractErrorMessage(123)).toBe('Ha ocurrido un error inesperado');
    });

    it('should handle the "[object Object]" case', () => {
      const error = {
        someProperty: 'value',
        anotherProperty: 123
      };
      expect(extractErrorMessage(error)).toBe('Ha ocurrido un error inesperado');
    });
  });

  describe('extractWhatsAppErrorMessage', () => {
    it('should provide context for PERMISSION_DENIED errors', () => {
      const error = {
        code: 'PERMISSION_DENIED',
        message: 'Access denied'
      };
      expect(extractWhatsAppErrorMessage(error)).toBe('No tienes permisos para realizar esta acción en WhatsApp');
    });

    it('should provide context for INSTANCE_LIMIT_EXCEEDED errors', () => {
      const error = {
        code: 'INSTANCE_LIMIT_EXCEEDED',
        message: 'Limit exceeded'
      };
      expect(extractWhatsAppErrorMessage(error)).toBe('Solo se permite una instancia de WhatsApp por organización');
    });

    it('should provide context for VALIDATION_ERROR errors', () => {
      const error = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid data'
      };
      expect(extractWhatsAppErrorMessage(error)).toBe('Error de validación: Invalid data');
    });

    it('should provide context for INTERNAL_ERROR errors', () => {
      const error = {
        code: 'INTERNAL_ERROR',
        message: 'Server error'
      };
      expect(extractWhatsAppErrorMessage(error)).toBe('Error interno del servidor. Por favor, inténtalo de nuevo');
    });

    it('should provide context for UNAUTHORIZED errors', () => {
      const error = {
        code: 'UNAUTHORIZED',
        message: 'Not authenticated'
      };
      expect(extractWhatsAppErrorMessage(error)).toBe('Debes iniciar sesión para realizar esta acción');
    });

    it('should provide context for FORBIDDEN errors', () => {
      const error = {
        code: 'FORBIDDEN',
        message: 'Access forbidden'
      };
      expect(extractWhatsAppErrorMessage(error)).toBe('No tienes permisos suficientes para esta operación');
    });

    it('should fall back to base message for unknown codes', () => {
      const error = {
        code: 'UNKNOWN_ERROR',
        message: 'Unknown error occurred'
      };
      expect(extractWhatsAppErrorMessage(error)).toBe('Unknown error occurred');
    });

    it('should handle non-object errors', () => {
      expect(extractWhatsAppErrorMessage('String error')).toBe('String error');
      expect(extractWhatsAppErrorMessage(new Error('Error object'))).toBe('Error object');
    });
  });

  describe('Real-world error scenarios', () => {
    it('should handle typical API 403 response', () => {
      const apiResponse = {
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Permission denied: canCreateInstances'
        }
      };
      expect(extractWhatsAppErrorMessage(apiResponse)).toBe('No tienes permisos para realizar esta acción en WhatsApp');
    });

    it('should handle typical API 400 response', () => {
      const apiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid instance name',
          details: ['Instance name is required', 'Instance name must be unique']
        }
      };
      expect(extractWhatsAppErrorMessage(apiResponse)).toBe('Error de validación: Invalid instance name');
    });

    it('should handle network error', () => {
      const networkError = new Error('Failed to fetch');
      expect(extractWhatsAppErrorMessage(networkError)).toBe('Failed to fetch');
    });

    it('should handle malformed JSON response', () => {
      const malformedResponse = {
        error: 'Malformed response'
      };
      expect(extractWhatsAppErrorMessage(malformedResponse)).toBe('Malformed response');
    });
  });
});
