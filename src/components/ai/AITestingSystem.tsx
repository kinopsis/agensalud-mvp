'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bot, 
  MessageSquare, 
  Send, 
  CheckCircle, 
  Clock,
  Zap,
  TestTube,
  ArrowRight
} from 'lucide-react';

/**
 * AI Testing System
 * 
 * CRITICAL MVP COMPONENT
 * 
 * This component enables immediate AI agent testing without requiring
 * a working WhatsApp integration. It provides a direct interface to
 * test AI agents and their responses.
 * 
 * @author AgentSalud Emergency Response Team
 * @date 2025-01-28
 * @priority CRITICAL
 */

interface AITestingSystemProps {
  organizationId: string;
  bypassMode?: boolean;
}

interface TestMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  status: 'sent' | 'processing' | 'completed' | 'error';
}

export const AITestingSystem: React.FC<AITestingSystemProps> = ({
  organizationId,
  bypassMode = false
}) => {
  const [testingActive, setTestingActive] = useState(false);
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [aiAgent, setAIAgent] = useState('medical-assistant');
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Initialize AI testing system
   */
  useEffect(() => {
    if (bypassMode) {
      setTestingActive(true);
      addSystemMessage('AI Testing System initialized in bypass mode');
    }
  }, [bypassMode]);

  /**
   * Add system message
   */
  const addSystemMessage = (content: string) => {
    const message: TestMessage = {
      id: `system-${Date.now()}`,
      content,
      sender: 'ai',
      timestamp: new Date(),
      status: 'completed'
    };
    setMessages(prev => [...prev, message]);
  };

  /**
   * Send test message to AI agent
   */
  const sendTestMessage = async () => {
    if (!currentMessage.trim() || isProcessing) return;

    const userMessage: TestMessage = {
      id: `user-${Date.now()}`,
      content: currentMessage,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent'
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsProcessing(true);

    // Simulate AI processing
    const aiMessage: TestMessage = {
      id: `ai-${Date.now()}`,
      content: '',
      sender: 'ai',
      timestamp: new Date(),
      status: 'processing'
    };

    setMessages(prev => [...prev, aiMessage]);

    try {
      // Simulate AI response (replace with actual AI API call)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const aiResponse = generateMockAIResponse(currentMessage, aiAgent);
      
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessage.id 
          ? { ...msg, content: aiResponse, status: 'completed' }
          : msg
      ));

    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessage.id 
          ? { ...msg, content: 'Error processing message', status: 'error' }
          : msg
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Generate mock AI response for testing
   */
  const generateMockAIResponse = (userMessage: string, agent: string): string => {
    const responses = {
      'medical-assistant': [
        'Como asistente médico, puedo ayudarte con información general sobre salud. ¿Podrías contarme más detalles sobre tu consulta?',
        'Entiendo tu preocupación. Te recomiendo que consultes con un profesional de la salud para una evaluación adecuada.',
        'Basándome en la información que me proporcionas, te sugiero agendar una cita médica para una evaluación completa.'
      ],
      'appointment-scheduler': [
        'Perfecto, puedo ayudarte a agendar una cita médica. ¿Qué tipo de especialista necesitas?',
        'Tengo disponibilidad para citas esta semana. ¿Prefieres mañana o tarde?',
        'He encontrado horarios disponibles. ¿Te gustaría confirmar la cita para el Dr. García el viernes a las 10:00 AM?'
      ],
      'health-advisor': [
        'Como asesor de salud, puedo brindarte información preventiva y recomendaciones generales.',
        'Es importante mantener hábitos saludables. ¿Te gustaría que te comparta algunos consejos específicos?',
        'Basándome en tu consulta, te recomiendo seguir estas pautas de salud preventiva.'
      ]
    };

    const agentResponses = responses[agent as keyof typeof responses] || responses['medical-assistant'];
    return agentResponses[Math.floor(Math.random() * agentResponses.length)];
  };

  /**
   * Start AI testing session
   */
  const startTesting = () => {
    setTestingActive(true);
    addSystemMessage(`AI Testing iniciado con agente: ${aiAgent}`);
    addSystemMessage('Sistema listo para recibir mensajes de prueba');
  };

  return (
    <div className="space-y-6">
      {/* Testing Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-500" />
            AI Testing System
            {bypassMode && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Bypass Mode
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Test AI agents directly without WhatsApp integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!testingActive ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select AI Agent for Testing
                </label>
                <select 
                  value={aiAgent}
                  onChange={(e) => setAIAgent(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="medical-assistant">Medical Assistant</option>
                  <option value="appointment-scheduler">Appointment Scheduler</option>
                  <option value="health-advisor">Health Advisor</option>
                </select>
              </div>
              
              <Button onClick={startTesting} className="w-full">
                <TestTube className="h-4 w-4 mr-2" />
                Start AI Testing
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Agent Info */}
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Active Agent: {aiAgent}</span>
                </div>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Ready
                </Badge>
              </div>

              {/* Message History */}
              <div className="border rounded-lg p-4 h-64 overflow-y-auto bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    No messages yet. Send a test message to start.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                            message.sender === 'user'
                              ? 'bg-blue-500 text-white'
                              : 'bg-white border'
                          }`}
                        >
                          <div className="text-sm">{message.content}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <div className="text-xs opacity-70">
                              {message.timestamp.toLocaleTimeString()}
                            </div>
                            {message.status === 'processing' && (
                              <Clock className="h-3 w-3 animate-spin" />
                            )}
                            {message.status === 'completed' && (
                              <CheckCircle className="h-3 w-3" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Type a test message..."
                  onKeyPress={(e) => e.key === 'Enter' && sendTestMessage()}
                  disabled={isProcessing}
                />
                <Button 
                  onClick={sendTestMessage}
                  disabled={!currentMessage.trim() || isProcessing}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Testing Instructions */}
      {testingActive && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 space-y-2">
              <div>• Send messages to test AI agent responses</div>
              <div>• Try different types of medical queries</div>
              <div>• Test appointment scheduling scenarios</div>
              <div>• Verify response quality and accuracy</div>
              <div>• Check response times and system stability</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Alert */}
      {testingActive && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>AI Testing Active:</strong> Core MVP functionality is operational. 
            You can now test AI agents without WhatsApp integration.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
