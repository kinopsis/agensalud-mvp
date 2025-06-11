/**
 * WhatsApp Performance Metrics Service
 * 
 * Comprehensive performance monitoring for WhatsApp operations including
 * QR generation times, connection success rates, and radical solution metrics.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface PerformanceMetric {
  timestamp: Date;
  operation: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
}

interface QRGenerationMetric {
  instanceId: string;
  instanceName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  errorMessage?: string;
}

interface RadicalSolutionMetric {
  operation: 'quick_create' | 'connect_flow' | 'qr_generation' | 'full_flow';
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  steps: Array<{
    step: string;
    duration: number;
    success: boolean;
  }>;
}

interface PerformanceStats {
  totalOperations: number;
  successRate: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  qrGenerationStats: {
    averageTime: number;
    successRate: number;
    under5sRate: number;
  };
  radicalSolutionStats: {
    quickCreateAverage: number;
    fullFlowAverage: number;
    successRate: number;
  };
}

// =====================================================
// PERFORMANCE METRICS SERVICE
// =====================================================

/**
 * WhatsAppPerformanceMetrics - Comprehensive performance monitoring
 * 
 * @description Tracks and analyzes performance metrics for WhatsApp operations
 * with focus on radical solution goals and SLA compliance.
 */
export class WhatsAppPerformanceMetrics {
  private metrics: PerformanceMetric[] = [];
  private qrMetrics: QRGenerationMetric[] = [];
  private radicalMetrics: RadicalSolutionMetric[] = [];
  private maxMetricsHistory = 1000; // Keep last 1000 metrics

  // =====================================================
  // METRIC RECORDING
  // =====================================================

  /**
   * Record a general performance metric
   */
  recordMetric(
    operation: string,
    startTime: Date,
    endTime: Date,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const duration = endTime.getTime() - startTime.getTime();
    
    const metric: PerformanceMetric = {
      timestamp: endTime,
      operation,
      duration,
      success,
      metadata
    };

    this.metrics.push(metric);
    this.trimMetricsHistory();

    console.log(`📊 Recorded metric: ${operation} - ${duration}ms (${success ? 'success' : 'failure'})`);
  }

  /**
   * Record QR generation performance
   */
  recordQRGeneration(
    instanceId: string,
    instanceName: string,
    startTime: Date,
    endTime: Date,
    success: boolean,
    errorMessage?: string
  ): void {
    const duration = endTime.getTime() - startTime.getTime();
    
    const qrMetric: QRGenerationMetric = {
      instanceId,
      instanceName,
      startTime,
      endTime,
      duration,
      success,
      errorMessage
    };

    this.qrMetrics.push(qrMetric);
    this.trimMetricsHistory();

    // Also record as general metric
    this.recordMetric('qr_generation', startTime, endTime, success, {
      instanceId,
      instanceName,
      errorMessage
    });

    console.log(`🔍 QR Generation: ${instanceName} - ${duration}ms (${success ? 'success' : 'failure'})`);
  }

  /**
   * Record radical solution flow performance
   */
  recordRadicalSolutionFlow(
    operation: RadicalSolutionMetric['operation'],
    startTime: Date,
    endTime: Date,
    success: boolean,
    steps: RadicalSolutionMetric['steps']
  ): void {
    const duration = endTime.getTime() - startTime.getTime();
    
    const radicalMetric: RadicalSolutionMetric = {
      operation,
      startTime,
      endTime,
      duration,
      success,
      steps
    };

    this.radicalMetrics.push(radicalMetric);
    this.trimMetricsHistory();

    // Also record as general metric
    this.recordMetric(`radical_${operation}`, startTime, endTime, success, {
      steps: steps.length,
      totalStepTime: steps.reduce((sum, step) => sum + step.duration, 0)
    });

    console.log(`⚡ Radical Solution: ${operation} - ${duration}ms (${success ? 'success' : 'failure'})`);
  }

  // =====================================================
  // PERFORMANCE ANALYSIS
  // =====================================================

  /**
   * Get comprehensive performance statistics
   */
  getPerformanceStats(timeWindow?: number): PerformanceStats {
    const cutoffTime = timeWindow ? new Date(Date.now() - timeWindow) : null;
    
    // Filter metrics by time window
    const filteredMetrics = cutoffTime 
      ? this.metrics.filter(m => m.timestamp >= cutoffTime)
      : this.metrics;

    const filteredQRMetrics = cutoffTime
      ? this.qrMetrics.filter(m => m.endTime >= cutoffTime)
      : this.qrMetrics;

    const filteredRadicalMetrics = cutoffTime
      ? this.radicalMetrics.filter(m => m.endTime >= cutoffTime)
      : this.radicalMetrics;

    // Calculate general stats
    const totalOperations = filteredMetrics.length;
    const successfulOperations = filteredMetrics.filter(m => m.success).length;
    const successRate = totalOperations > 0 ? successfulOperations / totalOperations : 0;

    const durations = filteredMetrics.map(m => m.duration).sort((a, b) => a - b);
    const averageResponseTime = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;

    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);
    const p95ResponseTime = durations[p95Index] || 0;
    const p99ResponseTime = durations[p99Index] || 0;

    // Calculate QR generation stats
    const qrDurations = filteredQRMetrics.filter(m => m.success).map(m => m.duration);
    const qrSuccessRate = filteredQRMetrics.length > 0 
      ? filteredQRMetrics.filter(m => m.success).length / filteredQRMetrics.length 
      : 0;
    const qrAverageTime = qrDurations.length > 0 
      ? qrDurations.reduce((sum, d) => sum + d, 0) / qrDurations.length 
      : 0;
    const under5sRate = filteredQRMetrics.length > 0
      ? filteredQRMetrics.filter(m => m.success && m.duration <= 5000).length / filteredQRMetrics.length
      : 0;

    // Calculate radical solution stats
    const quickCreateMetrics = filteredRadicalMetrics.filter(m => m.operation === 'quick_create' && m.success);
    const fullFlowMetrics = filteredRadicalMetrics.filter(m => m.operation === 'full_flow' && m.success);
    
    const quickCreateAverage = quickCreateMetrics.length > 0
      ? quickCreateMetrics.reduce((sum, m) => sum + m.duration, 0) / quickCreateMetrics.length
      : 0;

    const fullFlowAverage = fullFlowMetrics.length > 0
      ? fullFlowMetrics.reduce((sum, m) => sum + m.duration, 0) / fullFlowMetrics.length
      : 0;

    const radicalSuccessRate = filteredRadicalMetrics.length > 0
      ? filteredRadicalMetrics.filter(m => m.success).length / filteredRadicalMetrics.length
      : 0;

    return {
      totalOperations,
      successRate,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      qrGenerationStats: {
        averageTime: qrAverageTime,
        successRate: qrSuccessRate,
        under5sRate
      },
      radicalSolutionStats: {
        quickCreateAverage,
        fullFlowAverage,
        successRate: radicalSuccessRate
      }
    };
  }

  /**
   * Check if radical solution SLA is being met
   */
  checkRadicalSolutionSLA(): {
    qrGenerationSLA: boolean; // <5s
    quickCreateSLA: boolean; // <3s
    fullFlowSLA: boolean; // <10s
    overallSLA: boolean;
    details: Record<string, any>;
  } {
    const stats = this.getPerformanceStats(300000); // Last 5 minutes

    const qrGenerationSLA = stats.qrGenerationStats.under5sRate >= 0.95; // 95% under 5s
    const quickCreateSLA = stats.radicalSolutionStats.quickCreateAverage <= 3000; // 3s average
    const fullFlowSLA = stats.radicalSolutionStats.fullFlowAverage <= 10000; // 10s average
    const overallSLA = qrGenerationSLA && quickCreateSLA && fullFlowSLA;

    return {
      qrGenerationSLA,
      quickCreateSLA,
      fullFlowSLA,
      overallSLA,
      details: {
        qrUnder5sRate: stats.qrGenerationStats.under5sRate,
        quickCreateAverage: stats.radicalSolutionStats.quickCreateAverage,
        fullFlowAverage: stats.radicalSolutionStats.fullFlowAverage,
        successRate: stats.successRate
      }
    };
  }

  /**
   * Get recent performance issues
   */
  getPerformanceIssues(timeWindow: number = 300000): Array<{
    type: string;
    message: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high';
  }> {
    const issues: Array<{
      type: string;
      message: string;
      timestamp: Date;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    const cutoffTime = new Date(Date.now() - timeWindow);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    // Check for high failure rates
    const failureRate = recentMetrics.length > 0 
      ? recentMetrics.filter(m => !m.success).length / recentMetrics.length 
      : 0;

    if (failureRate > 0.1) { // >10% failure rate
      issues.push({
        type: 'high_failure_rate',
        message: `High failure rate detected: ${(failureRate * 100).toFixed(1)}%`,
        timestamp: new Date(),
        severity: failureRate > 0.2 ? 'high' : 'medium'
      });
    }

    // Check for slow QR generation
    const recentQRMetrics = this.qrMetrics.filter(m => m.endTime >= cutoffTime);
    const slowQRRate = recentQRMetrics.length > 0
      ? recentQRMetrics.filter(m => m.duration > 5000).length / recentQRMetrics.length
      : 0;

    if (slowQRRate > 0.05) { // >5% slow QR generation
      issues.push({
        type: 'slow_qr_generation',
        message: `QR generation SLA violation: ${(slowQRRate * 100).toFixed(1)}% over 5s`,
        timestamp: new Date(),
        severity: slowQRRate > 0.2 ? 'high' : 'medium'
      });
    }

    return issues;
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Trim metrics history to prevent memory issues
   */
  private trimMetricsHistory(): void {
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
    
    if (this.qrMetrics.length > this.maxMetricsHistory) {
      this.qrMetrics = this.qrMetrics.slice(-this.maxMetricsHistory);
    }
    
    if (this.radicalMetrics.length > this.maxMetricsHistory) {
      this.radicalMetrics = this.radicalMetrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): {
    general: PerformanceMetric[];
    qrGeneration: QRGenerationMetric[];
    radicalSolution: RadicalSolutionMetric[];
  } {
    return {
      general: [...this.metrics],
      qrGeneration: [...this.qrMetrics],
      radicalSolution: [...this.radicalMetrics]
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.qrMetrics = [];
    this.radicalMetrics = [];
    console.log('🧹 Performance metrics cleared');
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let globalPerformanceMetrics: WhatsAppPerformanceMetrics | null = null;

/**
 * Get the global performance metrics instance
 */
export function getWhatsAppPerformanceMetrics(): WhatsAppPerformanceMetrics {
  if (!globalPerformanceMetrics) {
    globalPerformanceMetrics = new WhatsAppPerformanceMetrics();
  }
  
  return globalPerformanceMetrics;
}

/**
 * Performance measurement decorator
 */
export function measurePerformance(operation: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = new Date();
      const metrics = getWhatsAppPerformanceMetrics();
      
      try {
        const result = await method.apply(this, args);
        const endTime = new Date();
        
        metrics.recordMetric(operation, startTime, endTime, true);
        return result;
      } catch (error) {
        const endTime = new Date();
        
        metrics.recordMetric(operation, startTime, endTime, false, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        throw error;
      }
    };

    return descriptor;
  };
}
