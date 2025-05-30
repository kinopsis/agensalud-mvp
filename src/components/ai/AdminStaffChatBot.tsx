'use client';

/**
 * AdminStaffChatBot Component - FASE 2 MVP
 * Enhanced AI chatbot for Admin and Staff roles with specific functionalities
 * Provides intelligent assistance for administrative and operational tasks
 */

import React, { useState, useEffect } from 'react';
import { useChat } from 'ai/react';
import { X, MessageCircle, Send, Bot, User, Calendar, Users, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';

interface AdminStaffChatBotProps {
  organizationId?: string;
  userId?: string;
  userRole: 'admin' | 'staff';
  className?: string;
  onClose?: () => void;
}

/**
 * Enhanced ChatBot for Admin and Staff with role-specific capabilities
 * Features:
 * - Appointment management assistance
 * - Patient information queries
 * - Doctor schedule management
 * - Operational task automation
 * - Quick actions and shortcuts
 */
export default function AdminStaffChatBot({
  organizationId,
  userId,
  userRole,
  className = '',
  onClose
}: AdminStaffChatBotProps) {
  const { profile } = useAuth();
  const { organization } = useTenant();
  const [isMinimized, setIsMinimized] = useState(false);

  // Role-specific initial messages
  const getInitialMessage = () => {
    if (userRole === 'admin') {
      return '¡Hola! Soy tu asistente administrativo de IA. Puedo ayudarte con:\n\n• Gestión de citas y horarios\n• Información de pacientes y doctores\n• Reportes y estadísticas\n• Configuración del sistema\n\n¿En qué puedo asistirte hoy?';
    } else {
      return '¡Hola! Soy tu asistente operativo de IA. Puedo ayudarte con:\n\n• Agendar y confirmar citas\n• Buscar información de pacientes\n• Verificar disponibilidad de doctores\n• Gestionar tareas diarias\n\n¿Cómo puedo ayudarte?';
    }
  };

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: '/api/ai/admin-staff-chat',
    body: {
      organizationId: organizationId || organization?.id,
      userId: userId || profile?.id,
      userRole,
    },
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: getInitialMessage()
      }
    ],
    onFinish: async (message) => {
      // Process role-specific actions
      await processRoleSpecificMessage(message.content);
    }
  });

  /**
   * Process messages for role-specific actions
   */
  const processRoleSpecificMessage = async (content: string) => {
    const lowerContent = content.toLowerCase();
    
    // Common appointment-related actions
    if (lowerContent.includes('agendar') || lowerContent.includes('cita') || lowerContent.includes('reservar')) {
      // Could trigger appointment booking flow
      console.log('Appointment booking intent detected');
    }
    
    // Admin-specific actions
    if (userRole === 'admin') {
      if (lowerContent.includes('reporte') || lowerContent.includes('estadística')) {
        console.log('Report generation intent detected');
      }
      if (lowerContent.includes('configurar') || lowerContent.includes('configuración')) {
        console.log('Configuration intent detected');
      }
    }
    
    // Staff-specific actions
    if (userRole === 'staff') {
      if (lowerContent.includes('confirmar') || lowerContent.includes('pendiente')) {
        console.log('Confirmation task intent detected');
      }
      if (lowerContent.includes('paciente') || lowerContent.includes('buscar')) {
        console.log('Patient search intent detected');
      }
    }
  };

  /**
   * Quick action buttons for common tasks
   */
  const getQuickActions = () => {
    if (userRole === 'admin') {
      return [
        { label: 'Ver reportes', action: () => window.location.href = '/admin/reports' },
        { label: 'Gestionar doctores', action: () => window.location.href = '/users?role=doctor' },
        { label: 'Configuración', action: () => window.location.href = '/admin/settings' },
      ];
    } else {
      return [
        { label: 'Nueva cita', action: () => window.location.href = '/appointments/book' },
        { label: 'Citas pendientes', action: () => window.location.href = '/appointments?status=pending' },
        { label: 'Buscar paciente', action: () => window.location.href = '/patients' },
      ];
    }
  };

  if (isMinimized) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-50 ${className}`}>
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center">
          <Bot className="h-5 w-5 mr-2" />
          <span className="font-medium">
            Asistente {userRole === 'admin' ? 'Administrativo' : 'Operativo'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="text-blue-100 hover:text-white transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-blue-100 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.role === 'assistant' && (
                  <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                )}
                {message.role === 'user' && (
                  <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                )}
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 mb-2">Acciones rápidas:</div>
        <div className="flex flex-wrap gap-2">
          {getQuickActions().map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder={`Pregunta algo al asistente ${userRole === 'admin' ? 'administrativo' : 'operativo'}...`}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-2 rounded-md transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
