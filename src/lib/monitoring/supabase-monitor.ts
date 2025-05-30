/**
 * @fileoverview Supabase Schema Cache Monitoring System
 * @description Monitors and handles Supabase PostgREST schema cache issues
 * @author AgentSalud MVP Team
 * @version 1.0.0
 */

/**
 * Schema cache error codes that indicate PostgREST cache issues
 */
export const SCHEMA_CACHE_ERROR_CODES = {
  RELATION_NOT_EXISTS: '42P01',
  SCHEMA_CACHE_MISS: 'PGRST200',
  FUNCTION_NOT_FOUND: '42883',
  COLUMN_NOT_EXISTS: '42703',
} as const;

/**
 * Error patterns that suggest schema cache issues
 */
export const SCHEMA_CACHE_ERROR_PATTERNS = [
  'relation does not exist',
  'schema cache',
  'Could not find a relationship',
  'function does not exist',
  'column does not exist',
] as const;

/**
 * Interface for schema cache error details
 */
export interface SchemaCacheError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
  timestamp: string;
  endpoint?: string;
  table?: string;
  operation?: string;
}

/**
 * Interface for monitoring configuration
 */
export interface MonitoringConfig {
  enableLogging: boolean;
  enableAlerts: boolean;
  retryAttempts: number;
  retryDelay: number;
  alertThreshold: number;
}

/**
 * Default monitoring configuration
 */
const DEFAULT_CONFIG: MonitoringConfig = {
  enableLogging: true,
  enableAlerts: true,
  retryAttempts: 3,
  retryDelay: 1000,
  alertThreshold: 5,
};

/**
 * Schema cache error counter for alerting
 */
let errorCount = 0;
let lastResetTime = Date.now();

/**
 * Checks if an error is related to schema cache issues
 * @param error - Error object from Supabase
 * @returns True if error is schema cache related
 */
export function isSchemaCacheError(error: any): boolean {
  if (!error) return false;

  const errorCode = error.code;
  const errorMessage = error.message?.toLowerCase() || '';

  // Check error codes
  if (Object.values(SCHEMA_CACHE_ERROR_CODES).includes(errorCode)) {
    return true;
  }

  // Check error message patterns
  return SCHEMA_CACHE_ERROR_PATTERNS.some(pattern =>
    errorMessage.includes(pattern.toLowerCase())
  );
}

/**
 * Logs schema cache errors with detailed information
 * @param error - Error object
 * @param context - Additional context information
 */
export function logSchemaCacheError(
  error: any,
  context: {
    endpoint?: string;
    table?: string;
    operation?: string;
    userId?: string;
    organizationId?: string;
  } = {}
): void {
  const schemaCacheError: SchemaCacheError = {
    code: error.code || 'UNKNOWN',
    message: error.message || 'Unknown error',
    details: error.details,
    hint: error.hint,
    timestamp: new Date().toISOString(),
    endpoint: context.endpoint,
    table: context.table,
    operation: context.operation,
  };

  console.error('🚨 SCHEMA CACHE ERROR DETECTED:', {
    ...schemaCacheError,
    context: {
      userId: context.userId,
      organizationId: context.organizationId,
    },
  });

  // Increment error counter
  errorCount++;

  // Check if we need to send alerts
  if (errorCount >= DEFAULT_CONFIG.alertThreshold) {
    sendSchemaCacheAlert(schemaCacheError);
    resetErrorCount();
  }
}

/**
 * Sends alert for schema cache issues
 * @param error - Schema cache error details
 */
function sendSchemaCacheAlert(error: SchemaCacheError): void {
  console.warn('🔔 SCHEMA CACHE ALERT:', {
    message: `Schema cache errors exceeded threshold (${DEFAULT_CONFIG.alertThreshold})`,
    errorCount,
    lastError: error,
    recommendation: 'Consider restarting Supabase connection or checking schema changes',
  });

  // In production, this could send to monitoring services like:
  // - Sentry
  // - DataDog
  // - New Relic
  // - Custom webhook
}

/**
 * Resets error count (called after alert or periodically)
 */
function resetErrorCount(): void {
  errorCount = 0;
  lastResetTime = Date.now();
}

/**
 * Gets current error statistics
 * @returns Error statistics object
 */
export function getErrorStats(): {
  errorCount: number;
  lastResetTime: number;
  timeSinceReset: number;
} {
  return {
    errorCount,
    lastResetTime,
    timeSinceReset: Date.now() - lastResetTime,
  };
}

/**
 * Wrapper function for Supabase operations with schema cache monitoring
 * @param operation - Async operation to execute
 * @param context - Context information for logging
 * @returns Promise with operation result
 */
export async function withSchemaCacheMonitoring<T>(
  operation: () => Promise<{ data: T; error: any }>,
  context: {
    endpoint?: string;
    table?: string;
    operation?: string;
    userId?: string;
    organizationId?: string;
  } = {}
): Promise<{ data: T; error: any }> {
  try {
    const result = await operation();

    // Check if the result contains a schema cache error
    if (result.error && isSchemaCacheError(result.error)) {
      logSchemaCacheError(result.error, context);
    }

    return result;
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error in Supabase operation:', error);
    return { data: null as T, error };
  }
}

/**
 * Retry mechanism for schema cache errors
 * @param operation - Operation to retry
 * @param context - Context for logging
 * @param config - Retry configuration
 * @returns Promise with operation result
 */
export async function retryOnSchemaCacheError<T>(
  operation: () => Promise<{ data: T; error: any }>,
  context: {
    endpoint?: string;
    table?: string;
    operation?: string;
  } = {},
  config: Partial<MonitoringConfig> = {}
): Promise<{ data: T; error: any }> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: any = null;

  for (let attempt = 1; attempt <= finalConfig.retryAttempts; attempt++) {
    const result = await withSchemaCacheMonitoring(operation, context);

    if (!result.error || !isSchemaCacheError(result.error)) {
      // Success or non-schema-cache error
      return result;
    }

    lastError = result.error;

    if (attempt < finalConfig.retryAttempts) {
      console.log(`🔄 Retrying operation (attempt ${attempt + 1}/${finalConfig.retryAttempts}) after schema cache error`);
      await new Promise(resolve => setTimeout(resolve, finalConfig.retryDelay));
    }
  }

  // All retries failed
  console.error(`❌ All retry attempts failed for schema cache error`);
  return { data: null as T, error: lastError };
}

/**
 * Health check for schema cache
 * @param supabase - Supabase client
 * @returns Promise with health check result
 */
export async function checkSchemaCacheHealth(supabase: any): Promise<{
  healthy: boolean;
  errors: string[];
  timestamp: string;
}> {
  const errors: string[] = [];
  const timestamp = new Date().toISOString();

  // Test basic table access
  const testTables = ['profiles', 'organizations', 'doctors', 'appointments'];

  for (const table of testTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1);

      if (error && isSchemaCacheError(error)) {
        errors.push(`Schema cache error for table '${table}': ${error.message}`);
      }
    } catch (err) {
      errors.push(`Unexpected error testing table '${table}': ${err}`);
    }
  }

  return {
    healthy: errors.length === 0,
    errors,
    timestamp,
  };
}

/**
 * Initialize monitoring system
 */
export function initializeMonitoring(): void {
  console.log('🔍 Supabase Schema Cache Monitoring initialized');
  
  // Reset error count every hour
  setInterval(() => {
    if (Date.now() - lastResetTime > 3600000) { // 1 hour
      resetErrorCount();
    }
  }, 3600000);
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  initializeMonitoring();
}
