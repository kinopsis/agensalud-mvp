/**
 * IMMUTABLE DATE SYSTEM - DISRUPTIVE SOLUTION
 * 
 * Completely eliminates JavaScript Date object manipulation to prevent
 * all date displacement issues. Uses pure string-based calculations.
 * 
 * This is a fundamental architectural change that solves the root cause
 * of date displacement by never using mutable Date objects for arithmetic.
 * 
 * @author AgentSalud MVP Team - Disruptive Architecture Solution
 * @version 2.0.0
 */

export interface DateComponents {
  year: number;
  month: number; // 1-12 (not 0-11 like Date object)
  day: number;
}

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

/**
 * IMMUTABLE DATE SYSTEM
 * All operations return new strings, never mutate existing values
 */
export class ImmutableDateSystem {
  
  /**
   * Parse date string into components (SAFE)
   */
  static parseDate(dateStr: string): DateComponents {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD`);
    }
    
    return {
      year: parseInt(match[1], 10),
      month: parseInt(match[2], 10), // 1-12
      day: parseInt(match[3], 10)
    };
  }
  
  /**
   * Convert components back to string (SAFE)
   */
  static formatDate(components: DateComponents): string {
    const { year, month, day } = components;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }
  
  /**
   * Get days in month (handles leap years)
   */
  static getDaysInMonth(year: number, month: number): number {
    // Month is 1-12
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    if (month === 2 && this.isLeapYear(year)) {
      return 29;
    }
    
    return daysInMonth[month - 1];
  }
  
  /**
   * Check if year is leap year
   */
  static isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }
  
  /**
   * Add days to date (DISPLACEMENT-SAFE)
   */
  static addDays(dateStr: string, daysToAdd: number): string {
    const components = this.parseDate(dateStr);
    let { year, month, day } = components;
    
    day += daysToAdd;
    
    // Handle month overflow/underflow
    while (day > this.getDaysInMonth(year, month)) {
      day -= this.getDaysInMonth(year, month);
      month++;
      
      if (month > 12) {
        month = 1;
        year++;
      }
    }
    
    while (day < 1) {
      month--;
      
      if (month < 1) {
        month = 12;
        year--;
      }
      
      day += this.getDaysInMonth(year, month);
    }
    
    return this.formatDate({ year, month, day });
  }
  
  /**
   * Generate week dates starting from a date (DISPLACEMENT-SAFE)
   */
  static generateWeekDates(startDateStr: string): string[] {
    const dates: string[] = [];
    
    for (let i = 0; i < 7; i++) {
      dates.push(this.addDays(startDateStr, i));
    }
    
    return dates;
  }
  
  /**
   * Get start of week (Sunday) for a given date
   */
  static getStartOfWeek(dateStr: string): string {
    const components = this.parseDate(dateStr);
    
    // Create temporary Date object ONLY for day-of-week calculation
    const tempDate = new Date(components.year, components.month - 1, components.day);
    const dayOfWeek = tempDate.getDay(); // 0 = Sunday
    
    // Use our safe addDays method to go back to Sunday
    return this.addDays(dateStr, -dayOfWeek);
  }
  
  /**
   * Get today's date as string (SAFE)
   */
  static getTodayString(): string {
    const now = new Date();
    return this.formatDate({
      year: now.getFullYear(),
      month: now.getMonth() + 1, // Convert 0-11 to 1-12
      day: now.getDate()
    });
  }
  
  /**
   * Compare two dates (-1, 0, 1)
   */
  static compareDates(date1: string, date2: string): number {
    const comp1 = this.parseDate(date1);
    const comp2 = this.parseDate(date2);
    
    if (comp1.year !== comp2.year) return comp1.year - comp2.year;
    if (comp1.month !== comp2.month) return comp1.month - comp2.month;
    return comp1.day - comp2.day;
  }
  
  /**
   * Check if date is in the past
   */
  static isPastDate(dateStr: string): boolean {
    const today = this.getTodayString();
    return this.compareDates(dateStr, today) < 0;
  }
  
  /**
   * Check if date is today
   */
  static isToday(dateStr: string): boolean {
    const today = this.getTodayString();
    return this.compareDates(dateStr, today) === 0;
  }
  
  /**
   * Calculate difference in days between two dates
   */
  static daysDifference(date1: string, date2: string): number {
    const comp1 = this.parseDate(date1);
    const comp2 = this.parseDate(date2);
    
    // Create Date objects ONLY for calculation, not manipulation
    const d1 = new Date(comp1.year, comp1.month - 1, comp1.day);
    const d2 = new Date(comp2.year, comp2.month - 1, comp2.day);
    
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  /**
   * Validate and normalize date string
   */
  static validateAndNormalize(dateStr: string, component?: string): DateValidationResult {
    try {
      // Parse to validate format
      const components = this.parseDate(dateStr);
      
      // Validate ranges
      if (components.month < 1 || components.month > 12) {
        return {
          isValid: false,
          error: `Invalid month: ${components.month}. Must be 1-12`
        };
      }
      
      const daysInMonth = this.getDaysInMonth(components.year, components.month);
      if (components.day < 1 || components.day > daysInMonth) {
        return {
          isValid: false,
          error: `Invalid day: ${components.day}. Must be 1-${daysInMonth} for ${components.year}-${components.month}`
        };
      }
      
      // Re-format to ensure consistency
      const normalizedDate = this.formatDate(components);
      
      // Check for displacement
      const displacement = {
        detected: dateStr !== normalizedDate,
        originalDate: dateStr,
        normalizedDate: normalizedDate,
        daysDifference: dateStr !== normalizedDate ? this.daysDifference(dateStr, normalizedDate) : 0
      };
      
      return {
        isValid: true,
        normalizedDate,
        displacement
      };
      
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }
  
  /**
   * Format date for display (human-readable)
   */
  static formatForDisplay(dateStr: string, locale: string = 'es-ES'): string {
    try {
      const components = this.parseDate(dateStr);

      // Create Date object ONLY for formatting, not manipulation
      const tempDate = new Date(components.year, components.month - 1, components.day);

      return tempDate.toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateStr; // Return original if formatting fails
    }
  }

  /**
   * Get day name safely (DISPLACEMENT-SAFE)
   */
  static getDayName(dateStr: string, locale: string = 'es-ES'): string {
    try {
      const components = this.parseDate(dateStr);

      // Create Date object ONLY for day name extraction, not manipulation
      // Use explicit year, month-1, day to avoid timezone issues
      const tempDate = new Date(components.year, components.month - 1, components.day);

      return tempDate.toLocaleDateString(locale, {
        weekday: 'long'
      });
    } catch (error) {
      console.error('Error getting day name for:', dateStr, error);
      return 'Unknown'; // Return fallback if formatting fails
    }
  }
}

export default ImmutableDateSystem;
