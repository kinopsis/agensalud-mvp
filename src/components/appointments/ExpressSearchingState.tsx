/**
 * ExpressSearchingState Component
 * Shows loading state with progress feedback during optimal appointment search
 */

import React, { useState, useEffect } from 'react';
import { Search, Calendar, MapPin, Clock, Zap } from 'lucide-react';

interface ExpressSearchingStateProps {
  onCancel?: () => void;
}

export default function ExpressSearchingState({ onCancel }: ExpressSearchingStateProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const searchSteps = [
    {
      icon: Search,
      title: 'Analizando disponibilidad',
      description: 'Revisando horarios de todos los doctores...',
      duration: 2000
    },
    {
      icon: Calendar,
      title: 'Optimizando fechas',
      description: 'Buscando las citas más próximas...',
      duration: 2500
    },
    {
      icon: MapPin,
      title: 'Evaluando ubicaciones',
      description: 'Considerando proximidad y conveniencia...',
      duration: 2000
    },
    {
      icon: Clock,
      title: 'Calculando mejor opción',
      description: 'Aplicando algoritmo de optimización...',
      duration: 1500
    }
  ];

  useEffect(() => {
    const totalDuration = searchSteps.reduce((sum, step) => sum + step.duration, 0);
    let elapsed = 0;

    const stepInterval = setInterval(() => {
      if (currentStep < searchSteps.length - 1) {
        elapsed += searchSteps[currentStep].duration;
        setCurrentStep(prev => prev + 1);
        setProgress((elapsed / totalDuration) * 100);
      } else {
        clearInterval(stepInterval);
        setProgress(100);
      }
    }, searchSteps[currentStep]?.duration || 1000);

    // Update progress within current step
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const stepProgress = (elapsed / totalDuration) * 100;
        const nextStepProgress = ((elapsed + searchSteps[currentStep]?.duration || 0) / totalDuration) * 100;
        const currentStepProgress = stepProgress + ((nextStepProgress - stepProgress) * 0.1);
        return Math.min(currentStepProgress, 100);
      });
    }, 100);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [currentStep]);

  const CurrentIcon = searchSteps[currentStep]?.icon || Search;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Zap className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Buscando tu cita perfecta
        </h2>
        <p className="text-gray-600">
          Nuestro algoritmo está encontrando la mejor opción disponible para ti
        </p>
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Current Step */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center animate-spin">
            <CurrentIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {searchSteps[currentStep]?.title}
            </h3>
            <p className="text-sm text-gray-600">
              {searchSteps[currentStep]?.description}
            </p>
          </div>
        </div>

        {/* Progress Details */}
        <div className="text-sm text-blue-700 font-medium">
          Paso {currentStep + 1} de {searchSteps.length} • {Math.round(progress)}% completado
        </div>
      </div>

      {/* Search Steps Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {searchSteps.map((step, index) => {
          const StepIcon = step.icon;
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          
          return (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                isCompleted
                  ? 'border-green-200 bg-green-50'
                  : isCurrent
                  ? 'border-blue-200 bg-blue-50 animate-pulse'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                isCompleted
                  ? 'bg-green-500'
                  : isCurrent
                  ? 'bg-blue-500 animate-spin'
                  : 'bg-gray-300'
              }`}>
                {isCompleted ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <StepIcon className="w-4 h-4 text-white" />
                )}
              </div>
              <div className={`text-xs font-medium ${
                isCompleted
                  ? 'text-green-700'
                  : isCurrent
                  ? 'text-blue-700'
                  : 'text-gray-500'
              }`}>
                {step.title}
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 text-amber-600 mt-0.5">
            ⏱️
          </div>
          <div>
            <h4 className="font-medium text-amber-800 mb-1">¿Qué estamos haciendo?</h4>
            <p className="text-sm text-amber-700">
              Estamos analizando más de 14 días de disponibilidad, considerando factores como proximidad temporal, 
              ubicación, disponibilidad del doctor y compatibilidad del servicio para encontrar tu cita ideal.
            </p>
          </div>
        </div>
      </div>

      {/* Cancel Option */}
      {onCancel && (
        <div className="text-center">
          <button
            onClick={onCancel}
            className="text-gray-600 hover:text-gray-800 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100 text-sm"
          >
            Cancelar búsqueda y elegir manualmente
          </button>
        </div>
      )}
    </div>
  );
}
