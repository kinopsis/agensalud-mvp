/**
 * Webpack Module Initializer Component
 * 
 * Initializes webpack module monitoring and diagnostics
 * Prevents and handles webpack module loading failures
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import { useEffect } from 'react';
import { initializeWebpackModuleMonitoring } from '@/utils/webpack-module-monitor';
import { WebpackModuleDiagnostics } from '@/utils/webpack-diagnostics';

/**
 * WebpackModuleInitializer - Initializes webpack monitoring and diagnostics
 */
export function WebpackModuleInitializer() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    console.log('🔧 Initializing webpack module monitoring and diagnostics...');

    try {
      // Initialize webpack module monitoring
      const monitor = initializeWebpackModuleMonitoring();
      console.log('✅ Webpack module monitor initialized');

      // Initialize webpack diagnostics
      WebpackModuleDiagnostics.initialize();
      console.log('✅ Webpack diagnostics initialized');

      // Log initial health status
      const healthMetrics = monitor.getHealthMetrics();
      console.log('📊 Initial webpack health metrics:', healthMetrics);

      // Setup periodic health checks
      const healthCheckInterval = setInterval(() => {
        const currentMetrics = monitor.getHealthMetrics();
        
        if (currentMetrics.errorRate > 0.1) {
          console.warn('⚠️ Webpack module error rate elevated:', currentMetrics);
        }
        
        if (currentMetrics.problematicModules.length > 0) {
          console.warn('🚨 Problematic modules detected:', currentMetrics.problematicModules);
        }
      }, 30000); // Check every 30 seconds

      // Cleanup interval on unmount
      return () => {
        clearInterval(healthCheckInterval);
      };
    } catch (error) {
      console.error('❌ Failed to initialize webpack monitoring:', error);
    }
  }, []);

  // This component doesn't render anything
  return null;
}

export default WebpackModuleInitializer;
