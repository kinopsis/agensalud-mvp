'use client';

/**
 * SmartSuggestionsDisplay Component
 * 
 * Componente para mostrar sugerencias inteligentes de IA con explicaciones
 * contextuales, métricas de confianza y acciones interactivas.
 * 
 * Características principales:
 * - Visualización de sugerencias con explicaciones contextuales
 * - Indicadores de confianza y métricas de rendimiento
 * - Acciones rápidas (reservar, comparar, modificar)
 * - Diseño adaptativo y accesible
 * - Integración con WeeklyAvailabilitySelector
 * 
 * @author AgentSalud MVP Team - UX Enhancement Phase 3
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { 
  Zap, 
  Clock, 
  TrendingUp, 
  Star, 
  CheckCircle, 
  Info, 
  Calendar,
  User,
  MapPin,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import { SmartSuggestion, SuggestionsResult, SuggestionType } from '@/lib/ai/SmartSuggestionsEngine';

/**
 * Props del componente SmartSuggestionsDisplay
 */
interface SmartSuggestionsDisplayProps {
  /** Resultado completo de sugerencias */
  suggestionsResult: SuggestionsResult;
  /** Callback cuando se selecciona una sugerencia */
  onSuggestionSelect: (suggestion: SmartSuggestion) => void;
  /** Callback para comparar sugerencias */
  onCompare?: (suggestions: SmartSuggestion[]) => void;
  /** Callback para ver más detalles */
  onViewDetails?: (suggestion: SmartSuggestion) => void;
  /** Estado de carga */
  loading?: boolean;
  /** Mostrar métricas detalladas */
  showMetrics?: boolean;
  /** Modo compacto */
  compact?: boolean;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Iconos para diferentes tipos de sugerencias
 */
const getSuggestionIcon = (type: SuggestionType) => {
  switch (type) {
    case 'optimal_time': return Clock;
    case 'popular_choice': return TrendingUp;
    case 'user_pattern': return User;
    case 'ai_recommended': return Zap;
    case 'urgency_based': return CheckCircle;
    case 'flexibility_match': return Star;
    case 'doctor_specialty': return User;
    case 'location_optimal': return MapPin;
    default: return Info;
  }
};

/**
 * Colores para diferentes tipos de sugerencias
 */
const getSuggestionColor = (type: SuggestionType) => {
  switch (type) {
    case 'optimal_time': return 'blue';
    case 'popular_choice': return 'green';
    case 'user_pattern': return 'purple';
    case 'ai_recommended': return 'indigo';
    case 'urgency_based': return 'red';
    case 'flexibility_match': return 'yellow';
    case 'doctor_specialty': return 'teal';
    case 'location_optimal': return 'orange';
    default: return 'gray';
  }
};

/**
 * Componente para mostrar métricas de confianza
 */
const ConfidenceIndicator: React.FC<{ confidence: number; size?: 'sm' | 'md' | 'lg' }> = ({ 
  confidence, 
  size = 'md' 
}) => {
  const percentage = Math.round(confidence * 100);
  const color = confidence >= 0.8 ? 'green' : confidence >= 0.6 ? 'yellow' : 'red';
  
  const sizeClasses = {
    sm: 'w-12 h-2',
    md: 'w-16 h-3',
    lg: 'w-20 h-4'
  };
  
  return (
    <div className="flex items-center space-x-2">
      <div className={`bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div 
          className={`h-full rounded-full bg-${color}-500 transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-${color}-600 font-medium ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        {percentage}%
      </span>
    </div>
  );
};

/**
 * Componente para mostrar una sugerencia individual
 */
const SuggestionCard: React.FC<{
  suggestion: SmartSuggestion;
  isRecommended?: boolean;
  showMetrics?: boolean;
  compact?: boolean;
  onSelect: () => void;
  onViewDetails?: () => void;
}> = ({ 
  suggestion, 
  isRecommended = false, 
  showMetrics = false, 
  compact = false,
  onSelect,
  onViewDetails 
}) => {
  const Icon = getSuggestionIcon(suggestion.type);
  const color = getSuggestionColor(suggestion.type);
  
  return (
    <div className={`
      relative bg-white rounded-lg border transition-all duration-200 hover:shadow-sm
      ${isRecommended ? `border-${color}-300 bg-${color}-50` : 'border-gray-200 hover:border-gray-300'}
      ${compact ? 'p-2' : 'p-4'}
    `}>
      {/* Badge de recomendado */}
      {isRecommended && (
        <div className={`absolute -top-2 -right-2 bg-${color}-500 text-white text-xs px-2 py-1 rounded-full font-medium`}>
          ⭐ Recomendado
        </div>
      )}
      
      {/* Header */}
      <div className={`flex items-start justify-between ${compact ? 'mb-2' : 'mb-3'}`}>
        <div className="flex items-center space-x-2">
          {!compact && (
            <div className={`p-2 bg-${color}-100 rounded-lg`}>
              <Icon className={`h-4 w-4 text-${color}-600`} />
            </div>
          )}
          <div>
            <h4 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : ''}`}>
              {compact && <Icon className={`inline h-3 w-3 text-${color}-600 mr-1`} />}
              {suggestion.title}
            </h4>
            {!compact && (
              <p className="text-sm text-gray-600">{suggestion.description}</p>
            )}
          </div>
        </div>

        {!compact && (
          <ConfidenceIndicator confidence={suggestion.confidence} size="sm" />
        )}
      </div>

      {/* Explicación */}
      {!compact && (
        <div className="mb-3">
          <p className="text-sm text-gray-700 italic">
            💡 {suggestion.explanation}
          </p>
        </div>
      )}
      
      {/* Detalles de la cita */}
      <div className={`grid ${compact ? 'grid-cols-1 gap-1' : 'grid-cols-2 gap-2'} mb-3 ${compact ? 'text-xs' : 'text-sm'}`}>
        {suggestion.data.date && (
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3 text-gray-400" />
            <span>{suggestion.data.date}</span>
          </div>
        )}
        {suggestion.data.time && (
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3 text-gray-400" />
            <span>{suggestion.data.time}</span>
          </div>
        )}
        {suggestion.data.doctorName && !compact && (
          <div className="flex items-center space-x-1">
            <User className="h-3 w-3 text-gray-400" />
            <span className="truncate">{suggestion.data.doctorName}</span>
          </div>
        )}
        {suggestion.data.price && !compact && (
          <div className="flex items-center space-x-1">
            <span className="text-green-600 font-medium">${suggestion.data.price}</span>
          </div>
        )}
      </div>
      
      {/* Métricas (si están habilitadas) */}
      {showMetrics && !compact && (
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="flex items-center space-x-1">
            <BarChart3 className="h-3 w-3 text-gray-400" />
            <span>Éxito: {Math.round(suggestion.metrics.successRate * 100)}%</span>
          </div>
          <div className="flex items-center space-x-1">
            <Star className="h-3 w-3 text-gray-400" />
            <span>Satisfacción: {suggestion.metrics.userSatisfaction.toFixed(1)}/5</span>
          </div>
        </div>
      )}
      
      {/* Acciones */}
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={onSelect}
          className={`
            flex-1 bg-${color}-600 hover:bg-${color}-700 text-white rounded-md font-medium
            flex items-center justify-center transition-colors
            ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'}
          `}
        >
          <CheckCircle className={`${compact ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-1'}`} />
          {compact ? 'Elegir' : 'Seleccionar'}
        </button>

        {onViewDetails && !compact && (
          <button
            type="button"
            onClick={onViewDetails}
            title="Ver detalles de la sugerencia"
            aria-label="Ver detalles de la sugerencia"
            className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Info className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Componente principal SmartSuggestionsDisplay
 */
const SmartSuggestionsDisplay: React.FC<SmartSuggestionsDisplayProps> = ({
  suggestionsResult,
  onSuggestionSelect,
  onCompare,
  onViewDetails,
  loading = false,
  showMetrics = false,
  compact = false,
  className = ''
}) => {
  const [selectedForComparison, setSelectedForComparison] = useState<SmartSuggestion[]>([]);
  
  const { suggestions, insights, uxRecommendations } = suggestionsResult;
  
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (suggestions.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center ${className}`}>
        <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Sin sugerencias disponibles</h3>
        <p className="text-gray-600">
          No pudimos generar sugerencias personalizadas en este momento. 
          Puedes continuar con la selección manual.
        </p>
      </div>
    );
  }
  
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-purple-600" />
            Sugerencias Inteligentes
          </h3>
          <div className="text-sm text-gray-500">
            Confianza: {Math.round(suggestionsResult.confidence * 100)}%
          </div>
        </div>
        
        <p className="text-gray-600">
          Basado en tu conversación y preferencias, estas son nuestras mejores recomendaciones:
        </p>
        
        {/* Insights del usuario */}
        {!compact && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="font-medium text-blue-900">Perfil</div>
              <div className="text-blue-700 capitalize">{insights.userProfile}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="font-medium text-green-900">Preferencias</div>
              <div className="text-green-700 capitalize">{insights.preferenceStrength}</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3">
              <div className="font-medium text-yellow-900">Urgencia</div>
              <div className="text-yellow-700 capitalize">{insights.urgencyLevel}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="font-medium text-purple-900">Flexibilidad</div>
              <div className="text-purple-700">{Math.round(insights.flexibilityScore * 100)}%</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Sugerencias */}
      <div className={compact ? 'grid grid-cols-1 md:grid-cols-3 gap-3' : 'grid grid-cols-1 md:grid-cols-3 gap-4'}>
        {suggestions.slice(0, 3).map((suggestion, index) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            isRecommended={index === 0 && uxRecommendations.highlightBestOption}
            showMetrics={showMetrics}
            compact={compact}
            onSelect={() => onSuggestionSelect(suggestion)}
            onViewDetails={onViewDetails ? () => onViewDetails(suggestion) : undefined}
          />
        ))}
      </div>
      
      {/* Acciones adicionales */}
      {!compact && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-3">
            {uxRecommendations.showComparison && onCompare && (
              <button
                type="button"
                onClick={() => onCompare(suggestions)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Comparar opciones
              </button>
            )}
            
            {uxRecommendations.suggestAlternatives && (
              <button
                type="button"
                className="flex items-center px-4 py-2 text-blue-600 hover:text-blue-700 text-sm transition-colors"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Ver más alternativas
              </button>
            )}
          </div>
          
          {/* Información adicional */}
          <div className="mt-4 text-xs text-gray-500">
            <p>
              💡 Sugerencias generadas en {suggestionsResult.processingTime}ms • 
              Analizadas {suggestionsResult.totalAnalyzed} opciones • 
              Satisfacción predicha: {Math.round(insights.predictedSatisfaction * 100)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartSuggestionsDisplay;
