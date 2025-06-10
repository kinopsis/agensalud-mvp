'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Zap,
  Bot,
  MessageSquare,
  Settings,
  RefreshCw,
  TestTube
} from 'lucide-react';

// Import emergency components
import { WhatsAppBypassSystem } from '@/components/whatsapp/WhatsAppBypassSystem';
import { AITestingSystem } from '@/components/ai/AITestingSystem';
import { executeEmergencyShutdown, isEmergencyShutdownActive, forceSystemReset } from '@/utils/emergencyShutdown';

/**
 * Emergency Admin Dashboard
 * 
 * CRITICAL EMERGENCY PAGE
 * 
 * This page provides emergency controls to bypass broken systems
 * and enable AI testing when WhatsApp integration fails.
 * 
 * @author AgentSalud Emergency Response Team
 * @date 2025-01-28
 * @priority CRITICAL
 */

interface SystemStatus {
  name: string;
  status: 'operational' | 'degraded' | 'failed' | 'bypassed';
  description: string;
  lastCheck: Date;
}

export default function EmergencyAdminPage() {
  const [systemStatuses, setSystemStatuses] = useState<SystemStatus[]>([
    {
      name: 'WhatsApp Integration',
      status: 'failed',
      description: 'Infinite loops detected, system bypassed',
      lastCheck: new Date()
    },
    {
      name: 'AI Testing System',
      status: 'operational',
      description: 'Ready for testing in bypass mode',
      lastCheck: new Date()
    },
    {
      name: 'Monitoring Registry',
      status: 'failed',
      description: 'Emergency shutdown active',
      lastCheck: new Date()
    },
    {
      name: 'Environment Configuration',
      status: 'degraded',
      description: 'Placeholder configuration detected',
      lastCheck: new Date()
    }
  ]);

  const [emergencyMode, setEmergencyMode] = useState(false);
  const [aiTestingEnabled, setAITestingEnabled] = useState(false);

  /**
   * Initialize emergency dashboard
   */
  useEffect(() => {
    // Check if emergency shutdown is already active
    setEmergencyMode(isEmergencyShutdownActive());
    
    // Check for emergency mode environment variable
    if (process.env.NEXT_PUBLIC_EMERGENCY_MODE === 'true') {
      setEmergencyMode(true);
    }

    // Auto-enable AI testing if bypass mode is active
    if (process.env.NEXT_PUBLIC_AI_TESTING_ENABLED === 'true') {
      setAITestingEnabled(true);
    }
  }, []);

  /**
   * Execute emergency shutdown
   */
  const handleEmergencyShutdown = () => {
    executeEmergencyShutdown();
    setEmergencyMode(true);
    
    // Update system statuses
    setSystemStatuses(prev => prev.map(status => ({
      ...status,
      status: status.name === 'WhatsApp Integration' || status.name === 'Monitoring Registry' 
        ? 'bypassed' 
        : status.status,
      lastCheck: new Date()
    })));
  };

  /**
   * Force system reset
   */
  const handleForceReset = () => {
    forceSystemReset();
    setEmergencyMode(false);
    
    // Update system statuses
    setSystemStatuses(prev => prev.map(status => ({
      ...status,
      status: 'degraded',
      lastCheck: new Date()
    })));
  };

  /**
   * Enable AI testing
   */
  const handleAITestingEnabled = () => {
    setAITestingEnabled(true);
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-green-100 text-green-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'bypassed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircle className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'bypassed': return <Zap className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Emergency Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-red-600 flex items-center justify-center gap-2">
          <AlertTriangle className="h-8 w-8" />
          Emergency Admin Dashboard
        </h1>
        <p className="text-gray-600">
          Critical system controls for bypassing failed components and enabling AI testing
        </p>
      </div>

      {/* Emergency Alert */}
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>EMERGENCY MODE ACTIVE:</strong> WhatsApp integration has critical failures. 
          Emergency bypass systems are enabled to maintain core MVP functionality.
        </AlertDescription>
      </Alert>

      {/* System Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Status Overview
          </CardTitle>
          <CardDescription>
            Current status of all system components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {systemStatuses.map((system) => (
              <div key={system.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(system.status)}
                  <div>
                    <div className="font-medium">{system.name}</div>
                    <div className="text-sm text-gray-500">{system.description}</div>
                  </div>
                </div>
                <Badge className={getStatusColor(system.status)}>
                  {system.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Emergency Controls
          </CardTitle>
          <CardDescription>
            Critical system controls for emergency situations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {!emergencyMode ? (
              <Button 
                onClick={handleEmergencyShutdown}
                className="bg-red-600 hover:bg-red-700"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Execute Emergency Shutdown
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button variant="outline" disabled>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Emergency Mode Active
                </Button>
                <Button 
                  onClick={handleForceReset}
                  variant="outline"
                  className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Force System Reset
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Emergency Systems */}
      <Tabs defaultValue="bypass" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bypass">WhatsApp Bypass</TabsTrigger>
          <TabsTrigger value="ai-testing">AI Testing</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>

        {/* WhatsApp Bypass Tab */}
        <TabsContent value="bypass">
          <WhatsAppBypassSystem 
            organizationId="emergency-org"
            onAITestingEnabled={handleAITestingEnabled}
          />
        </TabsContent>

        {/* AI Testing Tab */}
        <TabsContent value="ai-testing">
          <AITestingSystem 
            organizationId="emergency-org"
            bypassMode={emergencyMode}
          />
        </TabsContent>

        {/* Diagnostics Tab */}
        <TabsContent value="diagnostics">
          <Card>
            <CardHeader>
              <CardTitle>System Diagnostics</CardTitle>
              <CardDescription>
                Detailed system information and troubleshooting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Environment Status */}
              <div>
                <h4 className="font-medium mb-2">Environment Configuration</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>• Emergency Mode: {process.env.NEXT_PUBLIC_EMERGENCY_MODE || 'false'}</div>
                  <div>• WhatsApp Bypass: {process.env.NEXT_PUBLIC_WHATSAPP_BYPASS || 'false'}</div>
                  <div>• AI Testing: {process.env.NEXT_PUBLIC_AI_TESTING_ENABLED || 'false'}</div>
                  <div>• Monitoring Disabled: {process.env.NEXT_PUBLIC_DISABLE_MONITORING || 'false'}</div>
                </div>
              </div>

              {/* Browser Console Commands */}
              <div>
                <h4 className="font-medium mb-2">Browser Console Commands</h4>
                <div className="text-xs font-mono bg-gray-100 p-3 rounded space-y-1">
                  <div>window.executeEmergencyShutdown() - Execute emergency shutdown</div>
                  <div>window.forceSystemReset() - Force reset all systems</div>
                  <div>window.isEmergencyShutdownActive() - Check shutdown status</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reload Page
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => console.clear()}
                >
                  Clear Console
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Success Status */}
      {aiTestingEnabled && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>MVP OPERATIONAL:</strong> AI testing is enabled and functional. 
            Core MVP functionality is restored through emergency bypass systems.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
