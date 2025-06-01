/**
 * UNIFIED APPOINTMENT DATA SERVICE - DISRUPTIVE SOLUTION
 * 
 * Single source of truth for all appointment availability data.
 * Eliminates data inconsistencies by centralizing all data access.
 * 
 * This service ensures that all components get the same data,
 * preventing slot count mismatches and data integrity issues.
 * 
 * @author AgentSalud MVP Team - Disruptive Architecture Solution
 * @version 2.0.0
 */

import { ImmutableDateSystem } from './ImmutableDateSystem';

export interface AvailabilitySlot {
  id: string;
  start_time: string;
  end_time: string;
  doctor_id: string;
  doctor_name: string;
  available: boolean;
  price?: number;
  service_id?: string;
  location_id?: string;
}

export interface DayAvailabilityData {
  date: string;
  dayName: string;
  slotsCount: number;
  availabilityLevel: 'high' | 'medium' | 'low' | 'none';
  isToday: boolean;
  isTomorrow: boolean;
  isWeekend: boolean;
  slots: AvailabilitySlot[];
  totalSlots: number;
  availableSlots: number;
  isBlocked?: boolean;
  blockReason?: string;
}

export interface AvailabilityQuery {
  organizationId: string;
  startDate: string;
  endDate: string;
  serviceId?: string;
  doctorId?: string;
  locationId?: string;
  userRole?: string;
  useStandardRules?: boolean;
}

export interface DataIntegrityReport {
  isValid: boolean;
  inconsistencies: Array<{
    date: string;
    issue: string;
    expected: any;
    actual: any;
  }>;
  dataSource: 'api' | 'cache' | 'mock';
  timestamp: string;
}

/**
 * UNIFIED APPOINTMENT DATA SERVICE
 * Single source of truth for all availability data
 */
export class UnifiedAppointmentDataService {
  private static cache = new Map<string, { data: DayAvailabilityData[]; timestamp: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Get availability data with caching and validation
   */
  static async getAvailabilityData(query: AvailabilityQuery): Promise<DayAvailabilityData[]> {
    const cacheKey = this.generateCacheKey(query);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('📋 UnifiedDataService: Using cached data for', cacheKey);
      return cached.data;
    }
    
    // Fetch fresh data
    console.log('🔄 UnifiedDataService: Fetching fresh data for', query);
    const data = await this.fetchAvailabilityData(query);
    
    // Cache the result
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    // Validate data integrity
    const integrityReport = await this.validateDataIntegrity(data, query);
    if (!integrityReport.isValid) {
      console.error('🚨 Data integrity issues detected:', integrityReport);
    }
    
    return data;
  }
  
  /**
   * Fetch availability data from API
   */
  private static async fetchAvailabilityData(query: AvailabilityQuery): Promise<DayAvailabilityData[]> {
    // TEMPORARILY DISABLED - Prevent infinite polling
    console.log('🚫 UnifiedAppointmentDataService: fetchAvailabilityData DISABLED to prevent infinite polling');
    console.log('Query:', query);

    // Return empty array to prevent errors
    return [];

    /* ORIGINAL CODE - TEMPORARILY DISABLED
    try {
      // Build API URL
      let url = `/api/appointments/availability?organizationId=${query.organizationId}&startDate=${query.startDate}&endDate=${query.endDate}`;

      if (query.serviceId) url += `&serviceId=${query.serviceId}`;
      if (query.doctorId) url += `&doctorId=${query.doctorId}`;
      if (query.locationId) url += `&locationId=${query.locationId}`;
      if (query.userRole) url += `&userRole=${query.userRole}`;
      if (query.useStandardRules) url += `&useStandardRules=true`;

      console.log('🌐 UnifiedDataService: API call to', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'API returned error');
      }
      
      // Process API response into standardized format
      return this.processApiResponse(result.data, query);
      
    } catch (error) {
      console.error('🚨 UnifiedDataService: API call failed:', error);
      
      // Return mock data as fallback with clear indication
      console.warn('⚠️ UnifiedDataService: Using mock data fallback');
      return this.generateMockData(query);
    }
    */
  }

  /**
   * Process API response into standardized format
   */
  private static processApiResponse(apiData: any, query: AvailabilityQuery): DayAvailabilityData[] {
    const processedData: DayAvailabilityData[] = [];
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    // Generate date range using ImmutableDateSystem
    const dateRange = this.generateDateRange(query.startDate, query.endDate);
    
    for (const dateStr of dateRange) {
      const dayData = apiData[dateStr];
      
      // CRITICAL: Always use pre-calculated availableSlots from API
      const availableSlots = dayData?.availableSlots || 0;
      const totalSlots = dayData?.totalSlots || 0;
      const slots = dayData?.slots || [];
      
      // Calculate availability level
      let availabilityLevel: 'high' | 'medium' | 'low' | 'none' = 'none';
      if (availableSlots === 0) availabilityLevel = 'none';
      else if (availableSlots <= 2) availabilityLevel = 'low';
      else if (availableSlots <= 5) availabilityLevel = 'medium';
      else availabilityLevel = 'high';
      
      // Calculate date properties using ImmutableDateSystem
      const isToday = ImmutableDateSystem.isToday(dateStr);
      const isPastDate = ImmutableDateSystem.isPastDate(dateStr);
      const tomorrow = ImmutableDateSystem.addDays(ImmutableDateSystem.getTodayString(), 1);
      const isTomorrow = dateStr === tomorrow;
      
      // Get day of week using safe method
      const components = ImmutableDateSystem.parseDate(dateStr);
      const tempDate = new Date(components.year, components.month - 1, components.day);
      const isWeekend = tempDate.getDay() === 0 || tempDate.getDay() === 6;
      
      processedData.push({
        date: dateStr,
        dayName: dayNames[tempDate.getDay()],
        slotsCount: availableSlots, // Use API's pre-calculated value
        availabilityLevel,
        isToday,
        isTomorrow,
        isWeekend,
        slots,
        totalSlots,
        availableSlots,
        isBlocked: isPastDate,
        blockReason: isPastDate ? 'Fecha pasada' : undefined
      });
    }
    
    console.log('✅ UnifiedDataService: Processed API data:', {
      dateRange,
      processedCount: processedData.length,
      sampleData: processedData.slice(0, 3).map(d => ({
        date: d.date,
        slotsCount: d.slotsCount,
        availableSlots: d.availableSlots,
        totalSlots: d.totalSlots
      }))
    });
    
    return processedData;
  }
  
  /**
   * Generate date range using ImmutableDateSystem
   */
  private static generateDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    let currentDate = startDate;
    
    while (ImmutableDateSystem.compareDates(currentDate, endDate) <= 0) {
      dates.push(currentDate);
      currentDate = ImmutableDateSystem.addDays(currentDate, 1);
    }
    
    return dates;
  }
  
  /**
   * Generate mock data as fallback
   */
  private static generateMockData(query: AvailabilityQuery): DayAvailabilityData[] {
    console.warn('🚨 UnifiedDataService: Generating mock data - this should not happen in production');
    
    const mockData: DayAvailabilityData[] = [];
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dateRange = this.generateDateRange(query.startDate, query.endDate);
    
    for (const dateStr of dateRange) {
      const isToday = ImmutableDateSystem.isToday(dateStr);
      const isPastDate = ImmutableDateSystem.isPastDate(dateStr);
      const tomorrow = ImmutableDateSystem.addDays(ImmutableDateSystem.getTodayString(), 1);
      const isTomorrow = dateStr === tomorrow;
      
      const components = ImmutableDateSystem.parseDate(dateStr);
      const tempDate = new Date(components.year, components.month - 1, components.day);
      const isWeekend = tempDate.getDay() === 0 || tempDate.getDay() === 6;
      
      // Simple mock availability
      const slotsCount = isPastDate ? 0 : (isWeekend ? 2 : 5);
      const availabilityLevel = slotsCount === 0 ? 'none' : slotsCount <= 2 ? 'low' : 'medium';
      
      mockData.push({
        date: dateStr,
        dayName: dayNames[tempDate.getDay()],
        slotsCount,
        availabilityLevel,
        isToday,
        isTomorrow,
        isWeekend,
        slots: [],
        totalSlots: slotsCount,
        availableSlots: slotsCount,
        isBlocked: isPastDate,
        blockReason: isPastDate ? 'Fecha pasada' : undefined
      });
    }
    
    return mockData;
  }
  
  /**
   * Validate data integrity
   */
  private static async validateDataIntegrity(data: DayAvailabilityData[], query: AvailabilityQuery): Promise<DataIntegrityReport> {
    const inconsistencies: Array<{ date: string; issue: string; expected: any; actual: any }> = [];
    
    for (const dayData of data) {
      // Validate slot count consistency
      if (dayData.slots.length > 0) {
        const actualAvailableSlots = dayData.slots.filter(slot => slot.available).length;
        if (actualAvailableSlots !== dayData.availableSlots) {
          inconsistencies.push({
            date: dayData.date,
            issue: 'Available slots count mismatch',
            expected: actualAvailableSlots,
            actual: dayData.availableSlots
          });
        }
      }
      
      // Validate date format
      try {
        ImmutableDateSystem.parseDate(dayData.date);
      } catch (error) {
        inconsistencies.push({
          date: dayData.date,
          issue: 'Invalid date format',
          expected: 'YYYY-MM-DD',
          actual: dayData.date
        });
      }
    }
    
    return {
      isValid: inconsistencies.length === 0,
      inconsistencies,
      dataSource: 'api',
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Generate cache key
   */
  private static generateCacheKey(query: AvailabilityQuery): string {
    return `${query.organizationId}-${query.startDate}-${query.endDate}-${query.serviceId || 'any'}-${query.doctorId || 'any'}-${query.locationId || 'any'}-${query.userRole || 'patient'}-${query.useStandardRules || false}`;
  }
  
  /**
   * Clear cache (for testing or manual refresh)
   */
  static clearCache(): void {
    this.cache.clear();
    console.log('🗑️ UnifiedDataService: Cache cleared');
  }
  
  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export default UnifiedAppointmentDataService;
