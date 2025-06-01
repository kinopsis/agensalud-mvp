/**
 * CENTRALIZED DATE HANDLER UTILITY
 * Comprehensive date management system to prevent date displacement issues
 * 
 * This utility provides:
 * - Timezone-safe date operations
 * - Date validation and normalization
 * - Displacement detection and prevention
 * - Consistent date formatting
 * - Comprehensive logging and debugging
 */

export interface DateValidationResult {
  isValid: boolean;
  normalizedDate?: string;
  error?: string;
  displacement?: {
    detected: boolean;
    originalDate: string;
    normalizedDate: string;
    daysDifference: number;
  };
}

export interface DateOperationLog {
  timestamp: string;
  operation: string;
  input: any;
  output: any;
  component?: string;
  success: boolean;
  error?: string;
}

/**
 * Centralized Date Handler Class
 * Provides all date-related operations with comprehensive validation and logging
 */
export class DateHandler {
  private static logs: DateOperationLog[] = [];
  private static readonly MAX_LOGS = 1000;
  
  /**
   * Validate date format (YYYY-MM-DD)
   */
  static validateDateFormat(date: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dateRegex.test(date);
  }

  /**
   * CRITICAL: Displacement prevention mechanism
   * Ensures that date operations never cause displacement
   */
  static preventDisplacement(originalDate: string, processedDate: string, operation: string, component?: string): string {
    // Check if displacement occurred
    if (originalDate !== processedDate) {
      const displacement = {
        detected: true,
        originalDate,
        processedDate,
        operation,
        component,
        daysDifference: this.calculateDaysDifference(originalDate, processedDate)
      };

      console.error('🚨 DISPLACEMENT PREVENTION: Displacement detected and prevented!', displacement);

      // Track displacement prevention
      this.log('preventDisplacement_DISPLACEMENT_PREVENTED', {
        originalDate,
        processedDate,
        operation,
        displacement
      }, component, false, 'Displacement prevented');

      // Alert if tracking is available
      if (typeof window !== 'undefined' && window.trackDateEvent) {
        window.trackDateEvent('DISPLACEMENT_PREVENTED', displacement, component || 'DateHandler');
      }

      // Return original date to prevent displacement
      return originalDate;
    }

    // No displacement detected, return processed date
    return processedDate;
  }
  
  /**
   * Create timezone-safe date string from Date object
   */
  static createDateString(date: Date): string {
    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      const result = `${year}-${month}-${day}`;
      
      this.log('createDateString', date, result, 'DateHandler', true);
      return result;
    } catch (error) {
      this.log('createDateString', date, null, 'DateHandler', false, error.message);
      throw new Error(`Failed to create date string: ${error.message}`);
    }
  }
  
  /**
   * Parse date string to Date object (timezone-safe)
   */
  static parseDate(dateString: string): Date {
    try {
      if (!this.validateDateFormat(dateString)) {
        throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
      }
      
      const [year, month, day] = dateString.split('-').map(Number);
      const result = new Date(year, month - 1, day); // month is 0-indexed
      
      this.log('parseDate', dateString, result, 'DateHandler', true);
      return result;
    } catch (error) {
      this.log('parseDate', dateString, null, 'DateHandler', false, error.message);
      throw error;
    }
  }
  
  /**
   * Normalize and validate date with comprehensive checks
   */
  static validateAndNormalize(date: string, component?: string): DateValidationResult {
    try {
      // Basic format validation
      if (!date || typeof date !== 'string') {
        return {
          isValid: false,
          error: 'Date must be a non-empty string'
        };
      }
      
      if (!this.validateDateFormat(date)) {
        return {
          isValid: false,
          error: `Invalid date format: ${date}. Expected YYYY-MM-DD`
        };
      }
      
      // Parse and re-create to ensure consistency
      const parsedDate = this.parseDate(date);
      const normalizedDate = this.createDateString(parsedDate);

      // CRITICAL: Apply displacement prevention
      const safeDate = this.preventDisplacement(date, normalizedDate, 'validateAndNormalize', component);

      // Check for displacement
      const displacement = {
        detected: date !== normalizedDate,
        originalDate: date,
        normalizedDate: normalizedDate,
        safeDate: safeDate,
        daysDifference: this.calculateDaysDifference(date, normalizedDate)
      };

      const result: DateValidationResult = {
        isValid: true,
        normalizedDate: safeDate, // Use safe date instead of potentially displaced date
        displacement
      };
      
      // Log displacement if detected
      if (displacement.detected) {
        console.error('🚨 DATE DISPLACEMENT DETECTED:', {
          component,
          originalDate: date,
          normalizedDate,
          daysDifference: displacement.daysDifference
        });
        
        this.log('validateAndNormalize_DISPLACEMENT', date, result, component, false, 'Date displacement detected');
      } else {
        this.log('validateAndNormalize', date, result, component, true);
      }
      
      return result;
      
    } catch (error) {
      const result: DateValidationResult = {
        isValid: false,
        error: error.message
      };
      
      this.log('validateAndNormalize', date, result, component, false, error.message);
      return result;
    }
  }
  
  /**
   * Calculate difference in days between two dates
   */
  static calculateDaysDifference(date1: string, date2: string): number {
    try {
      const d1 = this.parseDate(date1);
      const d2 = this.parseDate(date2);
      
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    } catch (error) {
      console.error('Error calculating date difference:', error);
      return 0;
    }
  }
  
  /**
   * Get today's date as string (timezone-safe)
   */
  static getTodayString(): string {
    const today = new Date();
    return this.createDateString(today);
  }
  
  /**
   * Get tomorrow's date as string (timezone-safe)
   */
  static getTomorrowString(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.createDateString(tomorrow);
  }
  
  /**
   * Check if date is in the past
   */
  static isPastDate(date: string): boolean {
    try {
      const today = this.getTodayString();
      return date < today;
    } catch (error) {
      console.error('Error checking if date is past:', error);
      return false;
    }
  }
  
  /**
   * Check if date is today
   */
  static isToday(date: string): boolean {
    try {
      const today = this.getTodayString();
      return date === today;
    } catch (error) {
      console.error('Error checking if date is today:', error);
      return false;
    }
  }
  
  /**
   * CRITICAL FIX: Generate week dates with displacement-safe arithmetic
   * Uses timezone-safe date construction to prevent June 4th → June 5th displacement
   */
  static generateWeekDates(startDate: Date): string[] {
    try {
      const dates: string[] = [];

      // CRITICAL: Use timezone-safe date arithmetic to prevent displacement
      const baseYear = startDate.getFullYear();
      const baseMonth = startDate.getMonth();
      const baseDay = startDate.getDate();

      for (let i = 0; i < 7; i++) {
        // DISPLACEMENT-SAFE: Create new date object for each day
        // This prevents month boundary overflow issues
        const date = new Date(baseYear, baseMonth, baseDay + i);

        // VALIDATION: Ensure no displacement occurred
        const expectedDay = baseDay + i;
        const actualDay = date.getDate();

        // Check for month overflow displacement
        if (i > 0 && actualDay < baseDay) {
          // Month boundary crossed - this is expected and correct
          console.log(`📅 DateHandler: Month boundary crossed at day ${i}, expected behavior`);
        }

        const dateString = this.createDateString(date);
        dates.push(dateString);

        // DEBUGGING: Log each date generation for displacement tracking
        console.log(`📅 DateHandler.generateWeekDates[${i}]: ${dateString} (day ${actualDay})`);
      }

      this.log('generateWeekDates', startDate, dates, 'DateHandler', true);
      return dates;
    } catch (error) {
      this.log('generateWeekDates', startDate, null, 'DateHandler', false, error.message);
      throw error;
    }
  }

  /**
   * CRITICAL FIX: Safe date addition that prevents displacement
   * Alternative to setDate() that handles month boundaries correctly
   */
  static addDays(date: Date, days: number): Date {
    try {
      // DISPLACEMENT-SAFE: Use date constructor instead of setDate()
      const result = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + days
      );

      // VALIDATION: Check for unexpected displacement
      const originalDateString = this.createDateString(date);
      const resultDateString = this.createDateString(result);

      console.log(`📅 DateHandler.addDays: ${originalDateString} + ${days} days = ${resultDateString}`);

      // Track the operation for debugging
      this.log('addDays', { originalDate: originalDateString, days, resultDate: resultDateString }, result, 'DateHandler', true);

      return result;
    } catch (error) {
      this.log('addDays', { date, days }, null, 'DateHandler', false, error.message);
      throw error;
    }
  }

  /**
   * CRITICAL FIX: Get start of week with displacement-safe calculation
   */
  static getStartOfWeek(date: Date): Date {
    try {
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // DISPLACEMENT-SAFE: Calculate start of week using date constructor
      const startOfWeek = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() - dayOfWeek
      );

      const originalDateString = this.createDateString(date);
      const startOfWeekString = this.createDateString(startOfWeek);

      console.log(`📅 DateHandler.getStartOfWeek: ${originalDateString} → ${startOfWeekString} (moved back ${dayOfWeek} days)`);

      this.log('getStartOfWeek', originalDateString, startOfWeekString, 'DateHandler', true);
      return startOfWeek;
    } catch (error) {
      this.log('getStartOfWeek', date, null, 'DateHandler', false, error.message);
      throw error;
    }
  }
  
  /**
   * Format date for display (human-readable)
   */
  static formatForDisplay(date: string, locale: string = 'es-ES'): string {
    try {
      const dateObj = this.parseDate(date);
      return dateObj.toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date for display:', error);
      return date; // Return original if formatting fails
    }
  }
  
  /**
   * Log operation for debugging
   */
  private static log(operation: string, input: any, output: any, component?: string, success: boolean = true, error?: string): void {
    const logEntry: DateOperationLog = {
      timestamp: new Date().toISOString(),
      operation,
      input,
      output,
      component,
      success,
      error
    };
    
    this.logs.push(logEntry);
    
    // Limit logs to prevent memory issues
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }
    
    // Console logging for debugging
    if (!success || operation.includes('DISPLACEMENT')) {
      console.error(`🚨 DateHandler.${operation}:`, logEntry);
    } else {
      console.log(`📅 DateHandler.${operation}:`, { input, output, component });
    }
  }
  
  /**
   * Get operation logs for debugging
   */
  static getLogs(): DateOperationLog[] {
    return [...this.logs];
  }
  
  /**
   * Clear logs
   */
  static clearLogs(): void {
    this.logs = [];
  }
  
  /**
   * Generate debugging report
   */
  static generateDebugReport(): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    displacementEvents: number;
    recentLogs: DateOperationLog[];
  } {
    const totalOperations = this.logs.length;
    const successfulOperations = this.logs.filter(log => log.success).length;
    const failedOperations = this.logs.filter(log => !log.success).length;
    const displacementEvents = this.logs.filter(log => log.operation.includes('DISPLACEMENT')).length;
    const recentLogs = this.logs.slice(-20); // Last 20 operations
    
    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      displacementEvents,
      recentLogs
    };
  }
}

/**
 * React Hook for date operations with automatic validation
 */
export function useDateHandler(component: string = 'Unknown') {
  const validateDate = (date: string) => {
    return DateHandler.validateAndNormalize(date, component);
  };
  
  const createSafeDate = (date: Date) => {
    return DateHandler.createDateString(date);
  };
  
  const parseDate = (dateString: string) => {
    return DateHandler.parseDate(dateString);
  };
  
  return {
    validateDate,
    createSafeDate,
    parseDate,
    isToday: DateHandler.isToday,
    isPastDate: DateHandler.isPastDate,
    formatForDisplay: DateHandler.formatForDisplay,
    generateWeekDates: DateHandler.generateWeekDates
  };
}

export default DateHandler;
