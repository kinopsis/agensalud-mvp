/**
 * Error Handling Utilities
 * 
 * Centralized error handling utilities for consistent error message extraction
 * across the application, particularly for API responses and user feedback.
 * 
 * @fileoverview Error handling utilities for AgentSalud
 */

/**
 * Extract error message from API response or error object
 * 
 * This function handles various error formats that can come from:
 * - API responses with structured error objects
 * - JavaScript Error objects
 * - Network errors
 * - Validation errors
 * 
 * @param error - The error object, response, or value to extract message from
 * @returns A human-readable error message string
 */
export const extractErrorMessage = (error: any): string => {
  // If it's already an Error object, return its message
  if (error instanceof Error) {
    return error.message;
  }

  // If it's an API error response object
  if (error && typeof error === 'object') {
    // Handle API error format: { code: 'ERROR_CODE', message: 'Error message' }
    if (error.message && typeof error.message === 'string') {
      return error.message;
    }
    
    // Handle nested error format: { error: { message: 'Error message' } }
    if (error.error && typeof error.error === 'object' && error.error.message) {
      return error.error.message;
    }
    
    // Handle simple error format: { error: 'Error message' }
    if (error.error && typeof error.error === 'string') {
      return error.error;
    }

    // If error object has a code, include it in the message
    if (error.code && error.message) {
      return `${error.code}: ${error.message}`;
    }

    // Try to stringify the object if it has useful information
    if (error.code || error.message || error.details) {
      const parts = [];
      if (error.code) parts.push(`Código: ${error.code}`);
      if (error.message) parts.push(error.message);
      if (error.details) parts.push(`Detalles: ${error.details}`);
      return parts.join(' - ');
    }

    // Handle validation errors with details array
    if (error.details && Array.isArray(error.details)) {
      const validationMessages = error.details.map((detail: any) => {
        if (typeof detail === 'string') return detail;
        if (detail.message) return detail.message;
        if (detail.path && detail.message) return `${detail.path}: ${detail.message}`;
        return JSON.stringify(detail);
      });
      return `Errores de validación: ${validationMessages.join(', ')}`;
    }
  }

  // If it's a string, return it directly
  if (typeof error === 'string') {
    return error;
  }

  // Fallback for any other case
  return 'Ha ocurrido un error inesperado';
};

/**
 * Extract error message specifically for WhatsApp instance operations
 * 
 * @param error - The error object from WhatsApp API operations
 * @returns A user-friendly error message for WhatsApp operations
 */
export const extractWhatsAppErrorMessage = (error: any): string => {
  const baseMessage = extractErrorMessage(error);
  
  // Add context for common WhatsApp errors
  if (typeof error === 'object' && error.code) {
    switch (error.code) {
      case 'PERMISSION_DENIED':
        return 'No tienes permisos para realizar esta acción en WhatsApp';
      case 'INSTANCE_LIMIT_EXCEEDED':
        return 'Solo se permite una instancia de WhatsApp por organización';
      case 'VALIDATION_ERROR':
        return `Error de validación: ${baseMessage}`;
      case 'INTERNAL_ERROR':
        return 'Error interno del servidor. Por favor, inténtalo de nuevo';
      case 'UNAUTHORIZED':
        return 'Debes iniciar sesión para realizar esta acción';
      case 'FORBIDDEN':
        return 'No tienes permisos suficientes para esta operación';
      default:
        return baseMessage;
    }
  }
  
  return baseMessage;
};

/**
 * Handle API response errors consistently
 * 
 * @param response - The fetch Response object
 * @returns Promise that resolves to the parsed JSON or throws with proper error message
 */
export const handleApiResponse = async (response: Response): Promise<any> => {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (parseError) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const errorMessage = extractErrorMessage(errorData);
    throw new Error(errorMessage);
  }
  
  return response.json();
};

/**
 * Show user-friendly error message
 * 
 * @param error - The error to display
 * @param context - Optional context for the error (e.g., 'creating WhatsApp instance')
 */
export const showErrorMessage = (error: any, context?: string): void => {
  const message = extractErrorMessage(error);
  const fullMessage = context ? `Error ${context}: ${message}` : message;
  
  console.error('Error:', error);
  alert(fullMessage);
};

/**
 * Show user-friendly WhatsApp error message
 * 
 * @param error - The error to display
 * @param context - Optional context for the error
 */
export const showWhatsAppErrorMessage = (error: any, context?: string): void => {
  const message = extractWhatsAppErrorMessage(error);
  const fullMessage = context ? `Error ${context}: ${message}` : message;
  
  console.error('WhatsApp Error:', error);
  alert(fullMessage);
};
