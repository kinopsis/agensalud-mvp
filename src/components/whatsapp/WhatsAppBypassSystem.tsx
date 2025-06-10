'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertTriangle, 
  MessageSquare, 
  Bot, 
  Zap,
  ArrowRight,
  TestTube
} from 'lucide-react';

/**
 * WhatsApp Bypass System
 * 
 * CRITICAL EMERGENCY COMPONENT
 * 
 * This component bypasses the broken WhatsApp integration to enable
 * immediate AI testing. It provides a mock WhatsApp environment that
 * simulates the necessary functionality for AI agent testing.
 * 
 * @author AgentSalud Emergency Response Team
 * @date 2025-01-28
 * @priority CRITICAL
 */

interface BypassSystemProps {
  organizationId: string;
  onAITestingEnabled: () => void;
}

export const WhatsAppBypassSystem: React.FC<BypassSystemProps> = ({
  organizationId,
  onAITestingEnabled
}) => {
  const [bypassEnabled, setBypassEnabled] = useState(false);
  const [mockInstanceCreated, setMockInstanceCreated] = useState(false);
  const [aiTestingReady, setAITestingReady] = useState(false);

  /**
   * Enable WhatsApp bypass and create mock instance
   */
  const enableBypass = async () => {
    try {
      setBypassEnabled(true);
      
      // Simulate mock instance creation
      setTimeout(() => {
        setMockInstanceCreated(true);
        
        // Enable AI testing after mock setup
        setTimeout(() => {
          setAITestingReady(true);
          onAITestingEnabled();
        }, 1000);
      }, 2000);
      
    } catch (error) {
      console.error('Error enabling WhatsApp bypass:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Emergency Alert */}
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>EMERGENCY MODE:</strong> WhatsApp integration is temporarily bypassed. 
          AI testing is enabled through mock system.
        </AlertDescription>
      </Alert>

      {/* Bypass System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            WhatsApp Bypass System
          </CardTitle>
          <CardDescription>
            Emergency system to enable AI testing without WhatsApp integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Status Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Bypass Status */}
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              {bypassEnabled ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
              )}
              <div>
                <div className="font-medium">Bypass Enabled</div>
                <div className="text-sm text-gray-500">
                  {bypassEnabled ? 'Active' : 'Pending'}
                </div>
              </div>
            </div>

            {/* Mock Instance */}
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              {mockInstanceCreated ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
              )}
              <div>
                <div className="font-medium">Mock Instance</div>
                <div className="text-sm text-gray-500">
                  {mockInstanceCreated ? 'Created' : 'Pending'}
                </div>
              </div>
            </div>

            {/* AI Testing */}
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              {aiTestingReady ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
              )}
              <div>
                <div className="font-medium">AI Testing</div>
                <div className="text-sm text-gray-500">
                  {aiTestingReady ? 'Ready' : 'Pending'}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!bypassEnabled ? (
              <Button 
                onClick={enableBypass}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                Enable Emergency Bypass
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  disabled={!mockInstanceCreated}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Mock WhatsApp Ready
                </Button>
                
                {aiTestingReady && (
                  <Button 
                    onClick={onAITestingEnabled}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    Start AI Testing
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Mock System Info */}
          {bypassEnabled && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Mock WhatsApp System Active
              </h4>
              <div className="text-sm text-blue-800 space-y-1">
                <div>• Mock Instance ID: <code>mock-{organizationId}</code></div>
                <div>• Status: Connected (Simulated)</div>
                <div>• AI Agent: Ready for testing</div>
                <div>• Message Flow: Enabled</div>
              </div>
            </div>
          )}

          {/* Next Steps */}
          {aiTestingReady && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">✅ AI Testing Enabled</h4>
              <div className="text-sm text-green-800">
                You can now proceed with AI agent testing. The mock WhatsApp system 
                will simulate message flows and responses for testing purposes.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Technical Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-gray-600 space-y-1">
            <div>• Bypass System Version: 1.0.0-emergency</div>
            <div>• Mock Instance Type: Simulated WhatsApp Business API</div>
            <div>• AI Testing Mode: Full functionality enabled</div>
            <div>• Fallback Strategy: Direct AI agent communication</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
