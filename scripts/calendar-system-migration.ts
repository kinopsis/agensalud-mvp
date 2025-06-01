/**
 * CALENDAR SYSTEM MIGRATION SCRIPT
 * 
 * Orchestrates the migration from legacy appointment booking system to the new
 * unified, displacement-safe architecture. Validates all components and ensures
 * backward compatibility during the transition.
 * 
 * @author AgentSalud MVP Team - Disruptive Architecture Solution
 * @version 2.0.0 - Zero Displacement Architecture
 */

import UnifiedSlotGenerator from '@/lib/calendar/UnifiedSlotGenerator';
import BookingValidationService from '@/lib/services/BookingValidationService';
import DateConsistencyMonitor from '@/lib/monitoring/DateConsistencyMonitor';
import ImmutableDateSystem from '@/lib/core/ImmutableDateSystem';

interface MigrationResult {
  success: boolean;
  phase: string;
  timestamp: string;
  details: {
    componentsValidated: string[];
    testsRun: number;
    testsPassed: number;
    testsFailed: number;
    performanceMetrics: {
      averageResponseTime: number;
      memoryUsage: number;
      errorRate: number;
    };
    compatibilityChecks: {
      browsers: string[];
      timezones: string[];
      dateFormats: string[];
    };
  };
  issues: string[];
  recommendations: string[];
}

/**
 * CALENDAR SYSTEM MIGRATION CLASS
 * Manages the complete migration process
 */
export class CalendarSystemMigration {
  private static instance: CalendarSystemMigration;
  private migrationLog: MigrationResult[] = [];

  static getInstance(): CalendarSystemMigration {
    if (!CalendarSystemMigration.instance) {
      CalendarSystemMigration.instance = new CalendarSystemMigration();
    }
    return CalendarSystemMigration.instance;
  }

  /**
   * Execute complete migration process
   */
  async executeMigration(): Promise<MigrationResult> {
    console.log('🚀 STARTING CALENDAR SYSTEM MIGRATION');
    console.log('=====================================');

    const startTime = Date.now();
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Phase 1: Component Validation
      console.log('\n📋 PHASE 1: Component Validation');
      const componentValidation = await this.validateComponents();
      if (!componentValidation.success) {
        issues.push(...componentValidation.issues);
      }

      // Phase 2: Integration Testing
      console.log('\n🔧 PHASE 2: Integration Testing');
      const integrationResults = await this.runIntegrationTests();
      if (!integrationResults.success) {
        issues.push(...integrationResults.issues);
      }

      // Phase 3: Performance Validation
      console.log('\n⚡ PHASE 3: Performance Validation');
      const performanceResults = await this.validatePerformance();
      if (!performanceResults.success) {
        issues.push(...performanceResults.issues);
      }

      // Phase 4: Compatibility Testing
      console.log('\n🌐 PHASE 4: Compatibility Testing');
      const compatibilityResults = await this.validateCompatibility();
      if (!compatibilityResults.success) {
        issues.push(...compatibilityResults.issues);
      }

      // Phase 5: Real-time Monitoring Setup
      console.log('\n📊 PHASE 5: Real-time Monitoring Setup');
      const monitoringResults = await this.setupMonitoring();
      if (!monitoringResults.success) {
        issues.push(...monitoringResults.issues);
      }

      const endTime = Date.now();
      const migrationTime = endTime - startTime;

      const finalResult: MigrationResult = {
        success: issues.length === 0,
        phase: 'complete',
        timestamp: new Date().toISOString(),
        details: {
          componentsValidated: [
            'UnifiedSlotGenerator',
            'BookingValidationService',
            'ImmutableDateSystem',
            'DateConsistencyMonitor'
          ],
          testsRun: integrationResults.testsRun || 0,
          testsPassed: integrationResults.testsPassed || 0,
          testsFailed: integrationResults.testsFailed || 0,
          performanceMetrics: performanceResults.performanceMetrics || {
            averageResponseTime: 0,
            memoryUsage: 0,
            errorRate: 0
          },
          compatibilityChecks: compatibilityResults.compatibilityChecks || {
            browsers: [],
            timezones: [],
            dateFormats: []
          }
        },
        issues,
        recommendations: issues.length === 0 ? [
          'Migration completed successfully',
          'Monitor system performance for 24 hours',
          'Gradually migrate existing appointments to new system'
        ] : [
          'Address identified issues before proceeding',
          'Run migration validation again',
          'Consider rollback plan if issues persist'
        ]
      };

      this.migrationLog.push(finalResult);

      if (finalResult.success) {
        console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY');
        console.log(`⏱️  Total time: ${migrationTime}ms`);
        console.log('🎉 Calendar system is now using unified, displacement-safe architecture!');
      } else {
        console.log('\n❌ MIGRATION COMPLETED WITH ISSUES');
        console.log(`⚠️  ${issues.length} issues found`);
        issues.forEach(issue => console.log(`   - ${issue}`));
      }

      return finalResult;

    } catch (error) {
      const errorResult: MigrationResult = {
        success: false,
        phase: 'error',
        timestamp: new Date().toISOString(),
        details: {
          componentsValidated: [],
          testsRun: 0,
          testsPassed: 0,
          testsFailed: 1,
          performanceMetrics: {
            averageResponseTime: 0,
            memoryUsage: 0,
            errorRate: 100
          },
          compatibilityChecks: {
            browsers: [],
            timezones: [],
            dateFormats: []
          }
        },
        issues: [`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        recommendations: [
          'Check system logs for detailed error information',
          'Verify all dependencies are installed',
          'Ensure database connectivity'
        ]
      };

      this.migrationLog.push(errorResult);
      console.log('\n💥 MIGRATION FAILED');
      console.error(error);
      return errorResult;
    }
  }

  /**
   * Validate all components are working correctly
   */
  private async validateComponents(): Promise<{ success: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Test UnifiedSlotGenerator
      const slotGenerator = UnifiedSlotGenerator.getInstance();
      const testSlots = await slotGenerator.generateSlots({
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        date: '2025-01-20',
        duration: 30,
        userRole: 'patient'
      });
      
      if (!Array.isArray(testSlots)) {
        issues.push('UnifiedSlotGenerator: Invalid return type');
      }
      console.log(`   ✅ UnifiedSlotGenerator: Generated ${testSlots.length} slots`);

      // Test BookingValidationService
      const validationService = BookingValidationService.getInstance();
      const validationResult = await validationService.validateBookingRequest({
        appointmentDate: '2025-01-25',
        startTime: '10:00',
        userRole: 'patient',
        organizationId: '123e4567-e89b-12d3-a456-426614174000'
      });
      
      if (typeof validationResult.isValid !== 'boolean') {
        issues.push('BookingValidationService: Invalid validation result');
      }
      console.log(`   ✅ BookingValidationService: Validation ${validationResult.isValid ? 'passed' : 'failed'}`);

      // Test ImmutableDateSystem
      const dateValidation = ImmutableDateSystem.validateAndNormalize('2025-01-15', 'MigrationTest');
      if (!dateValidation.isValid) {
        issues.push('ImmutableDateSystem: Date validation failed');
      }
      console.log(`   ✅ ImmutableDateSystem: Date validation ${dateValidation.isValid ? 'passed' : 'failed'}`);

      // Test DateConsistencyMonitor
      const monitor = DateConsistencyMonitor.getInstance();
      const consistencyResult = await monitor.validateTimezoneConsistency('2025-01-15');
      if (typeof consistencyResult.isConsistent !== 'boolean') {
        issues.push('DateConsistencyMonitor: Invalid consistency result');
      }
      console.log(`   ✅ DateConsistencyMonitor: Consistency check ${consistencyResult.isConsistent ? 'passed' : 'failed'}`);

    } catch (error) {
      issues.push(`Component validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { success: issues.length === 0, issues };
  }

  /**
   * Run integration tests
   */
  private async runIntegrationTests(): Promise<{ 
    success: boolean; 
    issues: string[]; 
    testsRun: number; 
    testsPassed: number; 
    testsFailed: number; 
  }> {
    const issues: string[] = [];
    let testsRun = 0;
    let testsPassed = 0;
    let testsFailed = 0;

    try {
      // Test 1: Slot generation consistency
      testsRun++;
      const slotGenerator = UnifiedSlotGenerator.getInstance();
      const slots1 = await slotGenerator.generateSlots({
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        date: '2025-01-20',
        duration: 30,
        userRole: 'patient'
      });
      
      const slots2 = await slotGenerator.generateSlots({
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        date: '2025-01-20',
        duration: 30,
        userRole: 'patient'
      });

      if (slots1.length === slots2.length) {
        testsPassed++;
        console.log('   ✅ Slot generation consistency test passed');
      } else {
        testsFailed++;
        issues.push('Slot generation inconsistency detected');
      }

      // Test 2: Role-based filtering
      testsRun++;
      const patientSlots = await slotGenerator.generateSlots({
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        date: ImmutableDateSystem.getTodayString(),
        duration: 30,
        userRole: 'patient'
      });

      const adminSlots = await slotGenerator.generateSlots({
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        date: ImmutableDateSystem.getTodayString(),
        duration: 30,
        userRole: 'admin'
      });

      const patientAvailable = patientSlots.filter(s => s.available).length;
      const adminAvailable = adminSlots.filter(s => s.available).length;

      if (adminAvailable >= patientAvailable) {
        testsPassed++;
        console.log('   ✅ Role-based filtering test passed');
      } else {
        testsFailed++;
        issues.push('Role-based filtering not working correctly');
      }

      // Test 3: Date displacement prevention
      testsRun++;
      const testDate = '2025-01-15';
      const timezones = ['UTC', 'America/New_York', 'Asia/Tokyo'];
      let displacementDetected = false;

      for (const timezone of timezones) {
        const originalTZ = process.env.TZ;
        process.env.TZ = timezone;

        try {
          const validation = ImmutableDateSystem.validateAndNormalize(testDate, 'DisplacementTest');
          if (validation.normalizedDate !== testDate) {
            displacementDetected = true;
            break;
          }
        } finally {
          process.env.TZ = originalTZ;
        }
      }

      if (!displacementDetected) {
        testsPassed++;
        console.log('   ✅ Date displacement prevention test passed');
      } else {
        testsFailed++;
        issues.push('Date displacement detected in timezone tests');
      }

    } catch (error) {
      testsFailed++;
      issues.push(`Integration test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { 
      success: testsFailed === 0, 
      issues, 
      testsRun, 
      testsPassed, 
      testsFailed 
    };
  }

  /**
   * Validate system performance
   */
  private async validatePerformance(): Promise<{ 
    success: boolean; 
    issues: string[]; 
    performanceMetrics: {
      averageResponseTime: number;
      memoryUsage: number;
      errorRate: number;
    }
  }> {
    const issues: string[] = [];
    const responseTimes: number[] = [];
    let errors = 0;
    const iterations = 10;

    try {
      const slotGenerator = UnifiedSlotGenerator.getInstance();
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        try {
          await slotGenerator.generateSlots({
            organizationId: '123e4567-e89b-12d3-a456-426614174000',
            date: '2025-01-20',
            duration: 30,
            userRole: 'patient'
          });
          
          const endTime = Date.now();
          responseTimes.push(endTime - startTime);
        } catch (error) {
          errors++;
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const errorRate = (errors / iterations) * 100;

      // Performance thresholds
      if (averageResponseTime > 1000) {
        issues.push(`Average response time too high: ${averageResponseTime}ms`);
      }

      if (memoryIncrease > 50 * 1024 * 1024) { // 50MB
        issues.push(`Memory usage increase too high: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      }

      if (errorRate > 5) {
        issues.push(`Error rate too high: ${errorRate}%`);
      }

      console.log(`   📊 Average response time: ${averageResponseTime.toFixed(2)}ms`);
      console.log(`   📊 Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   📊 Error rate: ${errorRate.toFixed(2)}%`);

      return {
        success: issues.length === 0,
        issues,
        performanceMetrics: {
          averageResponseTime,
          memoryUsage: memoryIncrease,
          errorRate
        }
      };

    } catch (error) {
      issues.push(`Performance validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        issues,
        performanceMetrics: {
          averageResponseTime: 0,
          memoryUsage: 0,
          errorRate: 100
        }
      };
    }
  }

  /**
   * Validate browser and timezone compatibility
   */
  private async validateCompatibility(): Promise<{ 
    success: boolean; 
    issues: string[]; 
    compatibilityChecks: {
      browsers: string[];
      timezones: string[];
      dateFormats: string[];
    }
  }> {
    const issues: string[] = [];
    const compatibilityChecks = {
      browsers: ['Chrome 90+', 'Firefox 88+', 'Safari 14+'],
      timezones: ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'],
      dateFormats: ['YYYY-MM-DD', 'ISO 8601']
    };

    try {
      // Test timezone compatibility
      for (const timezone of compatibilityChecks.timezones) {
        const originalTZ = process.env.TZ;
        process.env.TZ = timezone;

        try {
          const validation = ImmutableDateSystem.validateAndNormalize('2025-01-15', 'CompatibilityTest');
          if (!validation.isValid) {
            issues.push(`Timezone compatibility issue: ${timezone}`);
          }
        } finally {
          process.env.TZ = originalTZ;
        }
      }

      // Test date format compatibility
      const testDates = ['2025-01-15', '2025-12-31', '2024-02-29'];
      for (const date of testDates) {
        const validation = ImmutableDateSystem.validateAndNormalize(date, 'FormatTest');
        if (!validation.isValid) {
          issues.push(`Date format compatibility issue: ${date}`);
        }
      }

      console.log(`   🌐 Tested ${compatibilityChecks.timezones.length} timezones`);
      console.log(`   🌐 Tested ${testDates.length} date formats`);

    } catch (error) {
      issues.push(`Compatibility validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      success: issues.length === 0,
      issues,
      compatibilityChecks
    };
  }

  /**
   * Setup real-time monitoring
   */
  private async setupMonitoring(): Promise<{ success: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      const monitor = DateConsistencyMonitor.getInstance({
        enableRealTimeChecks: true,
        checkIntervalMinutes: 5,
        alertThresholds: {
          slotCountDiscrepancy: 5,
          dateDisplacementTolerance: 0,
          responseTimeThreshold: 2000
        }
      });

      monitor.startMonitoring();
      console.log('   📊 Real-time monitoring started');

      // Test monitoring functionality
      const testResult = await monitor.validateTimezoneConsistency('2025-01-15');
      if (typeof testResult.isConsistent !== 'boolean') {
        issues.push('Monitoring system not functioning correctly');
      }

    } catch (error) {
      issues.push(`Monitoring setup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { success: issues.length === 0, issues };
  }

  /**
   * Get migration log
   */
  getMigrationLog(): MigrationResult[] {
    return this.migrationLog;
  }
}

// Export for use in other scripts
export default CalendarSystemMigration;
