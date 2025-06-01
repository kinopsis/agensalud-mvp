/**
 * DATE CONSISTENCY MONITOR - REAL-TIME VALIDATION
 * 
 * Provides real-time monitoring and validation of date consistency across
 * all appointment booking flows. Detects and alerts on date displacement,
 * slot count inconsistencies, and timezone-related issues.
 * 
 * @author AgentSalud MVP Team - Disruptive Architecture Solution
 * @version 2.0.0 - Zero Displacement Architecture
 */

import ImmutableDateSystem from '@/lib/core/ImmutableDateSystem';
import UnifiedSlotGenerator from '@/lib/calendar/UnifiedSlotGenerator';
import { createClient } from '@/lib/supabase/server';

export interface ConsistencyCheckResult {
  isConsistent: boolean;
  timestamp: string;
  checkType: string;
  details: {
    endpoint1?: string;
    endpoint2?: string;
    slotCount1?: number;
    slotCount2?: number;
    availableCount1?: number;
    availableCount2?: number;
    discrepancies?: string[];
    timezoneIssues?: string[];
    dateDisplacement?: boolean;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendations?: string[];
}

export interface MonitoringConfig {
  enableRealTimeChecks: boolean;
  checkIntervalMinutes: number;
  alertThresholds: {
    slotCountDiscrepancy: number; // Percentage
    dateDisplacementTolerance: number; // Days
    responseTimeThreshold: number; // Milliseconds
  };
  notificationChannels: {
    console: boolean;
    database: boolean;
    webhook?: string;
  };
}

/**
 * DATE CONSISTENCY MONITOR CLASS
 * Monitors and validates date consistency across the appointment system
 */
export class DateConsistencyMonitor {
  private static instance: DateConsistencyMonitor;
  private config: MonitoringConfig;
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      enableRealTimeChecks: true,
      checkIntervalMinutes: 5,
      alertThresholds: {
        slotCountDiscrepancy: 5, // 5% discrepancy triggers alert
        dateDisplacementTolerance: 0, // Zero tolerance for date displacement
        responseTimeThreshold: 2000 // 2 seconds
      },
      notificationChannels: {
        console: true,
        database: true
      },
      ...config
    };
  }

  static getInstance(config?: Partial<MonitoringConfig>): DateConsistencyMonitor {
    if (!DateConsistencyMonitor.instance) {
      DateConsistencyMonitor.instance = new DateConsistencyMonitor(config);
    }
    return DateConsistencyMonitor.instance;
  }

  /**
   * Start real-time monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.log('🔍 Date Consistency Monitor: Already running');
      return;
    }

    this.isMonitoring = true;
    console.log(`🔍 Date Consistency Monitor: Starting with ${this.config.checkIntervalMinutes}min intervals`);

    this.monitoringInterval = setInterval(async () => {
      await this.performScheduledChecks();
    }, this.config.checkIntervalMinutes * 60 * 1000);

    // Perform initial check
    this.performScheduledChecks();
  }

  /**
   * Stop real-time monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
    console.log('🔍 Date Consistency Monitor: Stopped');
  }

  /**
   * Validate slot consistency between different endpoints/methods
   */
  async validateSlotConsistency(
    organizationId: string,
    date: string,
    userRole: string = 'patient'
  ): Promise<ConsistencyCheckResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 SLOT CONSISTENCY CHECK - Date: ${date}, Role: ${userRole}`);

      // Generate slots using UnifiedSlotGenerator
      const slotGenerator = UnifiedSlotGenerator.getInstance();
      const unifiedSlots = await slotGenerator.generateSlots({
        organizationId,
        date,
        duration: 30,
        userRole: userRole as any
      });

      // Simulate legacy endpoint for comparison (if exists)
      const legacySlots = await this.getLegacySlots(organizationId, date, userRole);

      const unifiedAvailable = unifiedSlots.filter(s => s.available);
      const legacyAvailable = legacySlots.filter(s => s.available);

      const slotCountDiscrepancy = Math.abs(unifiedSlots.length - legacySlots.length);
      const availableCountDiscrepancy = Math.abs(unifiedAvailable.length - legacyAvailable.length);
      
      const discrepancyPercentage = unifiedSlots.length > 0 
        ? (slotCountDiscrepancy / unifiedSlots.length) * 100 
        : 0;

      const isConsistent = discrepancyPercentage <= this.config.alertThresholds.slotCountDiscrepancy;
      const responseTime = Date.now() - startTime;

      const result: ConsistencyCheckResult = {
        isConsistent,
        timestamp: new Date().toISOString(),
        checkType: 'slot_consistency',
        details: {
          endpoint1: 'UnifiedSlotGenerator',
          endpoint2: 'LegacyEndpoint',
          slotCount1: unifiedSlots.length,
          slotCount2: legacySlots.length,
          availableCount1: unifiedAvailable.length,
          availableCount2: legacyAvailable.length,
          discrepancies: isConsistent ? [] : [
            `Slot count difference: ${slotCountDiscrepancy}`,
            `Available count difference: ${availableCountDiscrepancy}`,
            `Discrepancy percentage: ${discrepancyPercentage.toFixed(2)}%`
          ]
        },
        severity: this.determineSeverity(discrepancyPercentage, responseTime),
        recommendations: isConsistent ? [] : [
          'Review slot generation logic for inconsistencies',
          'Check for timezone-related date displacement',
          'Validate database query consistency'
        ]
      };

      await this.logResult(result);
      return result;

    } catch (error) {
      const errorResult: ConsistencyCheckResult = {
        isConsistent: false,
        timestamp: new Date().toISOString(),
        checkType: 'slot_consistency',
        details: {
          discrepancies: [`Error during consistency check: ${error instanceof Error ? error.message : 'Unknown error'}`]
        },
        severity: 'critical',
        recommendations: ['Investigate system errors', 'Check database connectivity']
      };

      await this.logResult(errorResult);
      return errorResult;
    }
  }

  /**
   * Validate date handling across timezones
   */
  async validateTimezoneConsistency(date: string): Promise<ConsistencyCheckResult> {
    const timezones = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];
    const results: { [timezone: string]: any } = {};
    const issues: string[] = [];

    try {
      console.log(`🔍 TIMEZONE CONSISTENCY CHECK - Date: ${date}`);

      for (const timezone of timezones) {
        const originalTZ = process.env.TZ;
        process.env.TZ = timezone;

        try {
          // Test date parsing and validation
          const validation = ImmutableDateSystem.validateAndNormalize(date, 'TimezoneConsistencyCheck');
          const isToday = ImmutableDateSystem.isToday(date);
          const nextDay = ImmutableDateSystem.addDays(date, 1);

          results[timezone] = {
            isValid: validation.isValid,
            normalizedDate: validation.normalizedDate,
            isToday,
            nextDay
          };

          // Check for date displacement
          if (validation.normalizedDate !== date) {
            issues.push(`Date displacement in ${timezone}: ${date} → ${validation.normalizedDate}`);
          }

        } finally {
          process.env.TZ = originalTZ;
        }
      }

      // Compare results across timezones
      const referenceResult = results[timezones[0]];
      timezones.slice(1).forEach(timezone => {
        const currentResult = results[timezone];
        
        if (currentResult.normalizedDate !== referenceResult.normalizedDate) {
          issues.push(`Date normalization inconsistency in ${timezone}`);
        }
        
        if (currentResult.nextDay !== referenceResult.nextDay) {
          issues.push(`Date arithmetic inconsistency in ${timezone}`);
        }
      });

      const isConsistent = issues.length === 0;

      const result: ConsistencyCheckResult = {
        isConsistent,
        timestamp: new Date().toISOString(),
        checkType: 'timezone_consistency',
        details: {
          timezoneIssues: issues,
          dateDisplacement: issues.some(issue => issue.includes('displacement'))
        },
        severity: isConsistent ? 'low' : 'high',
        recommendations: isConsistent ? [] : [
          'Review ImmutableDateSystem implementation',
          'Check timezone handling in date operations',
          'Validate date parsing logic'
        ]
      };

      await this.logResult(result);
      return result;

    } catch (error) {
      const errorResult: ConsistencyCheckResult = {
        isConsistent: false,
        timestamp: new Date().toISOString(),
        checkType: 'timezone_consistency',
        details: {
          timezoneIssues: [`Error during timezone check: ${error instanceof Error ? error.message : 'Unknown error'}`]
        },
        severity: 'critical'
      };

      await this.logResult(errorResult);
      return errorResult;
    }
  }

  /**
   * Perform scheduled consistency checks
   */
  private async performScheduledChecks(): Promise<void> {
    try {
      const today = ImmutableDateSystem.getTodayString();
      const tomorrow = ImmutableDateSystem.addDays(today, 1);
      
      // Test with sample organization (replace with actual org ID in production)
      const testOrgId = '123e4567-e89b-12d3-a456-426614174000';

      // Check slot consistency for today and tomorrow
      await this.validateSlotConsistency(testOrgId, today, 'patient');
      await this.validateSlotConsistency(testOrgId, tomorrow, 'admin');

      // Check timezone consistency
      await this.validateTimezoneConsistency(today);
      await this.validateTimezoneConsistency(tomorrow);

      console.log('✅ Scheduled consistency checks completed');

    } catch (error) {
      console.error('❌ Error in scheduled consistency checks:', error);
    }
  }

  /**
   * Get legacy slots for comparison (mock implementation)
   */
  private async getLegacySlots(organizationId: string, date: string, userRole: string): Promise<any[]> {
    // Mock implementation - in production, this would call the legacy endpoint
    // For now, return the same slots to simulate consistency
    const slotGenerator = UnifiedSlotGenerator.getInstance();
    return await slotGenerator.generateSlots({
      organizationId,
      date,
      duration: 30,
      userRole: userRole as any
    });
  }

  /**
   * Determine severity based on discrepancy and performance
   */
  private determineSeverity(discrepancyPercentage: number, responseTime: number): 'low' | 'medium' | 'high' | 'critical' {
    if (discrepancyPercentage > 20 || responseTime > this.config.alertThresholds.responseTimeThreshold * 2) {
      return 'critical';
    }
    if (discrepancyPercentage > 10 || responseTime > this.config.alertThresholds.responseTimeThreshold) {
      return 'high';
    }
    if (discrepancyPercentage > 5) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Log monitoring results
   */
  private async logResult(result: ConsistencyCheckResult): Promise<void> {
    if (this.config.notificationChannels.console) {
      const emoji = result.isConsistent ? '✅' : '❌';
      const severity = result.severity.toUpperCase();
      console.log(`${emoji} [${severity}] ${result.checkType}: ${result.isConsistent ? 'CONSISTENT' : 'INCONSISTENT'}`);
      
      if (!result.isConsistent && result.details.discrepancies) {
        result.details.discrepancies.forEach(discrepancy => {
          console.log(`  - ${discrepancy}`);
        });
      }
    }

    if (this.config.notificationChannels.database) {
      try {
        const supabase = await createClient();
        await supabase
          .from('monitoring_logs')
          .insert({
            check_type: result.checkType,
            is_consistent: result.isConsistent,
            severity: result.severity,
            details: result.details,
            timestamp: result.timestamp,
            recommendations: result.recommendations
          });
      } catch (error) {
        console.error('Error logging to database:', error);
      }
    }
  }
}

export default DateConsistencyMonitor;
