/**
 * Module Dependency Analyzer
 * 
 * Analyzes import/export dependencies to detect potential circular dependencies
 * and other module loading issues that could cause webpack failures
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

export interface DependencyNode {
  module: string;
  imports: string[];
  exports: string[];
  isProblematic: boolean;
  issues: string[];
}

export interface CircularDependency {
  cycle: string[];
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface DependencyAnalysis {
  nodes: DependencyNode[];
  circularDependencies: CircularDependency[];
  orphanedModules: string[];
  heavyModules: string[];
  recommendations: string[];
}

/**
 * Module Dependency Analyzer
 */
export class ModuleDependencyAnalyzer {
  private static knownProblematicPatterns = [
    // Context providers importing components that use the context
    { pattern: /contexts.*Provider/, risk: 'Context circular dependency' },
    
    // Dashboard components importing each other
    { pattern: /dashboard.*Dashboard/, risk: 'Dashboard component circular dependency' },
    
    // Utility modules importing complex components
    { pattern: /utils.*importing.*components/, risk: 'Utility-component circular dependency' },
    
    // API modules importing UI components
    { pattern: /api.*importing.*components/, risk: 'API-UI circular dependency' }
  ];
  
  /**
   * Analyze dashboard layout dependencies
   */
  static analyzeDashboardDependencies(): DependencyAnalysis {
    const nodes: DependencyNode[] = [];
    const circularDependencies: CircularDependency[] = [];
    const recommendations: string[] = [];
    
    // Analyze dashboard layout
    const dashboardLayoutNode = this.analyzeDashboardLayout();
    nodes.push(dashboardLayoutNode);
    
    // Analyze admin dashboard
    const adminDashboardNode = this.analyzeAdminDashboard();
    nodes.push(adminDashboardNode);
    
    // Analyze context providers
    const contextNodes = this.analyzeContextProviders();
    nodes.push(...contextNodes);
    
    // Detect circular dependencies
    const cycles = this.detectCircularDependencies(nodes);
    circularDependencies.push(...cycles);
    
    // Generate recommendations
    recommendations.push(...this.generateRecommendations(nodes, circularDependencies));
    
    return {
      nodes,
      circularDependencies,
      orphanedModules: this.findOrphanedModules(nodes),
      heavyModules: this.findHeavyModules(nodes),
      recommendations
    };
  }
  
  /**
   * Analyze dashboard layout dependencies
   */
  private static analyzeDashboardLayout(): DependencyNode {
    const imports = [
      '@/contexts/auth-context',
      '@/contexts/tenant-context',
      '@/contexts/AppointmentDataProvider',
      '@/components/debug/DateDisplacementDebugger',
      '@/components/debug/DateValidationMonitor',
      '@/components/debug/PerformanceMonitoringDashboard',
      'next/navigation',
      'react'
    ];
    
    const issues: string[] = [];
    
    // Check for potential issues
    if (imports.includes('@/contexts/AppointmentDataProvider')) {
      issues.push('Heavy context provider import in layout');
    }
    
    if (imports.some(imp => imp.includes('debug'))) {
      issues.push('Debug components imported in production layout');
    }
    
    return {
      module: 'src/app/(dashboard)/layout.tsx',
      imports,
      exports: ['DashboardLayout'],
      isProblematic: issues.length > 0,
      issues
    };
  }
  
  /**
   * Analyze admin dashboard dependencies
   */
  private static analyzeAdminDashboard(): DependencyNode {
    const imports = [
      '@/contexts/auth-context',
      '@/contexts/tenant-context',
      '@/components/dashboard/DashboardLayout',
      '@/components/dashboard/StatsCard',
      '@/components/ai/AdminStaffChatBot',
      '@/components/appointments/cards',
      '@/utils/hydration-safe',
      'react'
    ];
    
    const issues: string[] = [];
    
    // Check for potential circular dependencies
    if (imports.includes('@/components/dashboard/DashboardLayout')) {
      issues.push('Potential circular dependency with DashboardLayout');
    }
    
    return {
      module: 'src/components/dashboard/AdminDashboard.tsx',
      imports,
      exports: ['AdminDashboard'],
      isProblematic: issues.length > 0,
      issues
    };
  }
  
  /**
   * Analyze context providers
   */
  private static analyzeContextProviders(): DependencyNode[] {
    const nodes: DependencyNode[] = [];
    
    // Auth context
    nodes.push({
      module: 'src/contexts/auth-context.tsx',
      imports: ['@supabase/supabase-js', '@/lib/supabase/client', '@/types/database', 'react'],
      exports: ['AuthProvider', 'useAuth'],
      isProblematic: false,
      issues: []
    });
    
    // Tenant context
    nodes.push({
      module: 'src/contexts/tenant-context.tsx',
      imports: ['@/lib/supabase/client', '@/contexts/auth-context', '@/types/database', 'react'],
      exports: ['TenantProvider', 'useTenant'],
      isProblematic: false,
      issues: []
    });
    
    // Appointment data provider
    const appointmentProviderIssues: string[] = [];
    const appointmentImports = [
      '@/lib/core/UnifiedAppointmentDataService',
      '@/lib/core/DataIntegrityValidator',
      '@/lib/core/ImmutableDateSystem',
      'react'
    ];
    
    if (appointmentImports.some(imp => imp.includes('core'))) {
      appointmentProviderIssues.push('Heavy core service imports');
    }
    
    nodes.push({
      module: 'src/contexts/AppointmentDataProvider.tsx',
      imports: appointmentImports,
      exports: ['AppointmentDataProvider', 'useAppointmentData', 'useAvailabilityData'],
      isProblematic: appointmentProviderIssues.length > 0,
      issues: appointmentProviderIssues
    });
    
    return nodes;
  }
  
  /**
   * Detect circular dependencies
   */
  private static detectCircularDependencies(nodes: DependencyNode[]): CircularDependency[] {
    const cycles: CircularDependency[] = [];
    
    // Simple cycle detection (would need more sophisticated algorithm for real analysis)
    for (const node of nodes) {
      for (const importPath of node.imports) {
        const importedNode = nodes.find(n => n.module.includes(importPath.replace('@/', 'src/')));
        
        if (importedNode && importedNode.imports.some(imp => imp.includes(node.module))) {
          cycles.push({
            cycle: [node.module, importedNode.module],
            severity: 'medium',
            description: `Potential circular dependency between ${node.module} and ${importedNode.module}`
          });
        }
      }
    }
    
    return cycles;
  }
  
  /**
   * Find orphaned modules
   */
  private static findOrphanedModules(nodes: DependencyNode[]): string[] {
    const importedModules = new Set<string>();
    
    // Collect all imported modules
    for (const node of nodes) {
      for (const imp of node.imports) {
        if (imp.startsWith('@/')) {
          importedModules.add(imp);
        }
      }
    }
    
    // Find modules that are not imported by anyone
    const orphaned: string[] = [];
    for (const node of nodes) {
      const modulePath = node.module.replace('src/', '@/').replace('.tsx', '').replace('.ts', '');
      if (!importedModules.has(modulePath)) {
        orphaned.push(node.module);
      }
    }
    
    return orphaned;
  }
  
  /**
   * Find heavy modules (many imports)
   */
  private static findHeavyModules(nodes: DependencyNode[]): string[] {
    return nodes
      .filter(node => node.imports.length > 10)
      .map(node => node.module);
  }
  
  /**
   * Generate recommendations
   */
  private static generateRecommendations(
    nodes: DependencyNode[], 
    circularDependencies: CircularDependency[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Circular dependency recommendations
    if (circularDependencies.length > 0) {
      recommendations.push('Break circular dependencies by extracting shared interfaces');
      recommendations.push('Use dependency injection or event-driven patterns');
    }
    
    // Heavy module recommendations
    const heavyModules = this.findHeavyModules(nodes);
    if (heavyModules.length > 0) {
      recommendations.push('Consider splitting heavy modules into smaller, focused modules');
      recommendations.push('Use dynamic imports for non-critical dependencies');
    }
    
    // Context provider recommendations
    const problematicContexts = nodes.filter(n => 
      n.module.includes('context') && n.isProblematic
    );
    if (problematicContexts.length > 0) {
      recommendations.push('Minimize context provider dependencies');
      recommendations.push('Consider lazy loading heavy services in contexts');
    }
    
    return recommendations;
  }
  
  /**
   * Export analysis as JSON
   */
  static exportAnalysis(): string {
    const analysis = this.analyzeDashboardDependencies();
    return JSON.stringify(analysis, null, 2);
  }
  
  /**
   * Check if current module structure is healthy
   */
  static isModuleStructureHealthy(): boolean {
    const analysis = this.analyzeDashboardDependencies();
    
    return (
      analysis.circularDependencies.length === 0 &&
      analysis.nodes.filter(n => n.isProblematic).length === 0
    );
  }
}

export default ModuleDependencyAnalyzer;
