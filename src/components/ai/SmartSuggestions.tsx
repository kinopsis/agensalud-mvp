'use client';

/**
 * SmartSuggestions Component - FASE 2 MVP
 * Intelligent suggestions for appointment booking forms
 * Provides AI-powered recommendations based on user input and context
 */

import React, { useState, useEffect } from 'react';
import { Lightbulb, Clock, User, MapPin, Sparkles, X } from 'lucide-react';

interface Suggestion {
  id: string;
  type: 'doctor' | 'time' | 'service' | 'location' | 'general';
  title: string;
  description: string;
  confidence: number;
  action?: () => void;
  data?: any;
}

interface SmartSuggestionsProps {
  context: {
    selectedService?: string;
    selectedDoctor?: string;
    selectedDate?: string;
    selectedTime?: string;
    patientHistory?: any[];
    userRole?: string;
  };
  onSuggestionApply?: (suggestion: Suggestion) => void;
  className?: string;
}

/**
 * Smart suggestions component that provides AI-powered recommendations
 * for appointment booking based on context and user behavior
 */
export default function SmartSuggestions({
  context,
  onSuggestionApply,
  className = ''
}: SmartSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * Generate intelligent suggestions based on current context
   */
  const generateSuggestions = async () => {
    setLoading(true);
    
    try {
      const contextualSuggestions: Suggestion[] = [];

      // Service-based suggestions
      if (context.selectedService) {
        contextualSuggestions.push(...generateServiceSuggestions());
      }

      // Time optimization suggestions
      if (context.selectedDate) {
        contextualSuggestions.push(...generateTimeSuggestions());
      }

      // Doctor recommendations
      if (context.selectedService && !context.selectedDoctor) {
        contextualSuggestions.push(...generateDoctorSuggestions());
      }

      // Historical pattern suggestions
      if (context.patientHistory && context.patientHistory.length > 0) {
        contextualSuggestions.push(...generateHistoricalSuggestions());
      }

      // Role-specific suggestions
      if (context.userRole) {
        contextualSuggestions.push(...generateRoleBasedSuggestions());
      }

      setSuggestions(contextualSuggestions.slice(0, 4)); // Limit to 4 suggestions
      setIsVisible(contextualSuggestions.length > 0);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate service-specific suggestions
   */
  const generateServiceSuggestions = (): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    
    if (context.selectedService?.toLowerCase().includes('consulta general')) {
      suggestions.push({
        id: 'general-time',
        type: 'time',
        title: 'Horario Recomendado',
        description: 'Las consultas generales suelen ser más eficientes en horarios matutinos (9:00-11:00 AM)',
        confidence: 0.8,
        action: () => {
          // Could auto-select morning time slots
        }
      });
    }

    if (context.selectedService?.toLowerCase().includes('especialista')) {
      suggestions.push({
        id: 'specialist-prep',
        type: 'general',
        title: 'Preparación para Especialista',
        description: 'Recuerda traer resultados de exámenes previos y referencia médica',
        confidence: 0.9
      });
    }

    return suggestions;
  };

  /**
   * Generate time-based suggestions
   */
  const generateTimeSuggestions = (): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    const selectedDate = new Date(context.selectedDate || '');
    const dayOfWeek = selectedDate.getDay();

    if (dayOfWeek === 1) { // Monday
      suggestions.push({
        id: 'monday-early',
        type: 'time',
        title: 'Lunes Temprano',
        description: 'Los lunes por la mañana suelen tener menos espera',
        confidence: 0.7
      });
    }

    if (dayOfWeek === 5) { // Friday
      suggestions.push({
        id: 'friday-afternoon',
        type: 'time',
        title: 'Viernes Tarde',
        description: 'Considera agendar temprano, los viernes se llenan rápido',
        confidence: 0.8
      });
    }

    return suggestions;
  };

  /**
   * Generate doctor recommendation suggestions
   */
  const generateDoctorSuggestions = (): Suggestion[] => {
    const suggestions: Suggestion[] = [];

    suggestions.push({
      id: 'any-doctor',
      type: 'doctor',
      title: 'Cualquier Doctor Disponible',
      description: 'Seleccionar "Sin preferencia" puede conseguirte una cita más pronto',
      confidence: 0.9,
      action: () => {
        // Could auto-select "any available doctor"
      }
    });

    return suggestions;
  };

  /**
   * Generate suggestions based on patient history
   */
  const generateHistoricalSuggestions = (): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    const history = context.patientHistory || [];

    if (history.length > 0) {
      const lastAppointment = history[0];
      const daysSinceLastVisit = Math.floor(
        (new Date().getTime() - new Date(lastAppointment.date).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastVisit > 365) {
        suggestions.push({
          id: 'annual-checkup',
          type: 'service',
          title: 'Chequeo Anual',
          description: 'Ha pasado más de un año desde tu última visita. Considera un chequeo general',
          confidence: 0.8
        });
      }
    }

    return suggestions;
  };

  /**
   * Generate role-based suggestions
   */
  const generateRoleBasedSuggestions = (): Suggestion[] => {
    const suggestions: Suggestion[] = [];

    if (context.userRole === 'staff' || context.userRole === 'admin') {
      suggestions.push({
        id: 'bulk-booking',
        type: 'general',
        title: 'Agendamiento Múltiple',
        description: 'Considera usar el asistente IA para agendar múltiples citas de forma eficiente',
        confidence: 0.7
      });
    }

    return suggestions;
  };

  /**
   * Handle suggestion application
   */
  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (suggestion.action) {
      suggestion.action();
    }
    
    if (onSuggestionApply) {
      onSuggestionApply(suggestion);
    }
  };

  /**
   * Get icon for suggestion type
   */
  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'doctor': return <User className="h-4 w-4" />;
      case 'time': return <Clock className="h-4 w-4" />;
      case 'location': return <MapPin className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  /**
   * Get confidence color
   */
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 0.6) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };

  // Generate suggestions when context changes
  useEffect(() => {
    generateSuggestions();
  }, [context.selectedService, context.selectedDate, context.selectedDoctor]);

  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Sparkles className="h-5 w-5 text-purple-600 mr-2" />
          <h3 className="text-sm font-medium text-gray-900">Sugerencias Inteligentes</h3>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-sm ${getConfidenceColor(suggestion.confidence)}`}
            onClick={() => handleSuggestionClick(suggestion)}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {getSuggestionIcon(suggestion.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">
                    {suggestion.title}
                  </h4>
                  <span className="text-xs text-gray-500">
                    {Math.round(suggestion.confidence * 100)}% confianza
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {suggestion.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-gray-500 text-center">
        💡 Sugerencias generadas por IA basadas en patrones y mejores prácticas
      </div>
    </div>
  );
}
