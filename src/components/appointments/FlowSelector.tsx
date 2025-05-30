/**
 * FlowSelector Component
 * Allows users to choose between Express (quick) and Personalized (full) booking flows
 */

import React from 'react';
import { Zap, Target, Clock, MapPin, User, Calendar } from 'lucide-react';

export type BookingFlowType = 'express' | 'personalized';

interface FlowSelectorProps {
  onFlowSelect: (flowType: BookingFlowType) => void;
  loading?: boolean;
}

export default function FlowSelector({ onFlowSelect, loading = false }: FlowSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          ¿Cómo prefieres agendar tu cita?
        </h2>
        <p className="text-gray-600">
          Elige la opción que mejor se adapte a tus necesidades
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Express Booking Option */}
        <div 
          className="relative bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 cursor-pointer hover:border-blue-300 hover:shadow-lg transition-all duration-300 group"
          onClick={() => !loading && onFlowSelect('express')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Reserva Express</h3>
                <p className="text-sm text-blue-600 font-medium">Recomendado</p>
              </div>
            </div>
            <div className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
              ⚡ RÁPIDO
            </div>
          </div>

          <p className="text-gray-700 mb-4">
            Te asignamos automáticamente la mejor cita disponible según tu ubicación y preferencias
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>Cita confirmada en menos de 1 minuto</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-blue-500" />
              <span>Optimizado por proximidad y disponibilidad</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>Cita disponible en 24-48 horas</span>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-2">Perfecto si:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Necesitas una cita pronto</li>
              <li>• No tienes preferencia de doctor</li>
              <li>• Valoras la conveniencia sobre la elección</li>
            </ul>
          </div>

          <button
            disabled={loading}
            className="w-full mt-4 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Cargando...' : 'Reserva Express'}
          </button>
        </div>

        {/* Personalized Booking Option */}
        <div 
          className="relative bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-200 rounded-xl p-6 cursor-pointer hover:border-gray-300 hover:shadow-lg transition-all duration-300 group"
          onClick={() => !loading && onFlowSelect('personalized')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center group-hover:bg-gray-700 transition-colors">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Reserva Personalizada</h3>
                <p className="text-sm text-gray-600 font-medium">Control total</p>
              </div>
            </div>
            <div className="bg-gray-100 text-gray-800 text-xs font-bold px-2 py-1 rounded-full">
              🎯 PRECISO
            </div>
          </div>

          <p className="text-gray-700 mb-4">
            Elige tu doctor preferido, sede específica y horario que mejor te convenga
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <User className="w-4 h-4 text-gray-500" />
              <span>Selecciona tu doctor de preferencia</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span>Elige la sede más conveniente</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>Horarios específicos disponibles</span>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2">Perfecto si:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Tienes un doctor de confianza</li>
              <li>• Necesitas una sede específica</li>
              <li>• Quieres elegir el horario exacto</li>
            </ul>
          </div>

          <button
            disabled={loading}
            className="w-full mt-4 bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Cargando...' : 'Personalizar Reserva'}
          </button>
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 text-amber-600 mt-0.5">
            💡
          </div>
          <div>
            <h4 className="font-medium text-amber-800 mb-1">¿No estás seguro?</h4>
            <p className="text-sm text-amber-700">
              Puedes cambiar a reserva personalizada en cualquier momento durante el proceso express.
              También puedes cancelar y empezar de nuevo si cambias de opinión.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
