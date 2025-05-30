/**
 * ExpressConfirmation Component
 * Shows the auto-selected appointment details with reasoning and confirmation options
 */

import React from 'react';
import { Calendar, Clock, MapPin, User, Star, ArrowRight, Settings } from 'lucide-react';
import { OptimalAppointmentResult } from '@/lib/appointments/OptimalAppointmentFinder';

interface ExpressConfirmationProps {
  appointment: OptimalAppointmentResult;
  onConfirm: () => void;
  onCustomize: () => void;
  onBack: () => void;
  loading?: boolean;
  reason?: string;
  notes?: string;
  patientName?: string;
  onReasonChange?: (reason: string) => void;
  onNotesChange?: (notes: string) => void;
}

export default function ExpressConfirmation({
  appointment,
  onConfirm,
  onCustomize,
  onBack,
  loading = false,
  reason = '',
  notes = '',
  patientName,
  onReasonChange,
  onNotesChange
}: ExpressConfirmationProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5); // Remove seconds
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreText = (score: number) => {
    if (score >= 0.8) return 'Excelente';
    if (score >= 0.6) return 'Buena';
    return 'Aceptable';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          ¡Encontramos tu cita perfecta!
        </h2>
        <p className="text-gray-600">
          Hemos seleccionado la mejor opción disponible para ti
        </p>
      </div>

      {/* Appointment Details Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Detalles de tu cita</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(appointment.score)}`}>
            {getScoreText(appointment.score)} ({Math.round(appointment.score * 100)}%)
          </div>
        </div>

        {/* Patient Name */}
        {patientName && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <User className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-blue-700 font-medium">Paciente</p>
                <p className="text-lg font-bold text-blue-900">{patientName}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {/* Doctor Info */}
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{appointment.appointment.doctorName}</p>
              <p className="text-sm text-gray-600">{appointment.appointment.specialization}</p>
              <p className="text-sm text-blue-600 font-medium">
                ${appointment.appointment.consultationFee}
              </p>
            </div>
          </div>

          {/* Location Info */}
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{appointment.appointment.locationName}</p>
              <p className="text-sm text-gray-600">{appointment.appointment.locationAddress}</p>
            </div>
          </div>

          {/* Date Info */}
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{formatDate(appointment.appointment.date)}</p>
              <p className="text-sm text-gray-600">Fecha seleccionada</p>
            </div>
          </div>

          {/* Time Info */}
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {formatTime(appointment.appointment.startTime)} - {formatTime(appointment.appointment.endTime)}
              </p>
              <p className="text-sm text-gray-600">Horario asignado</p>
            </div>
          </div>
        </div>

        {/* Reasoning */}
        <div className="bg-white rounded-lg p-4 border border-blue-200">
          <h4 className="font-semibold text-gray-900 mb-2">¿Por qué esta cita?</h4>
          <p className="text-sm text-gray-700 mb-3">{appointment.reasoning.explanation}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="text-center">
              <div className="font-medium text-gray-900">Proximidad</div>
              <div className="text-blue-600">{Math.round(appointment.reasoning.timeProximity * 100)}%</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">Ubicación</div>
              <div className="text-green-600">{Math.round(appointment.reasoning.locationDistance * 100)}%</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">Doctor</div>
              <div className="text-purple-600">{Math.round(appointment.reasoning.doctorAvailability * 100)}%</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">Servicio</div>
              <div className="text-orange-600">{Math.round(appointment.reasoning.serviceCompatibility * 100)}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Reason and Notes */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Motivo de la consulta (opcional)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => onReasonChange?.(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ej: Consulta general, dolor de cabeza, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notas adicionales (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange?.(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Información adicional que consideres importante..."
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={onConfirm}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-8 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-300 flex items-center justify-center text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Confirmando tu cita...
            </>
          ) : (
            <>
              <Star className="w-5 h-5 mr-2" />
              Confirmar Cita Express
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </button>

        <button
          onClick={onCustomize}
          disabled={loading}
          className="w-full bg-white text-gray-700 py-3 px-6 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center justify-center font-medium"
        >
          <Settings className="w-4 h-4 mr-2" />
          Personalizar en su lugar
        </button>

        <button
          onClick={onBack}
          disabled={loading}
          className="w-full text-gray-600 py-2 px-4 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors text-sm"
        >
          Volver a elegir tipo de reserva
        </button>
      </div>

      {/* Footer Note */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          Al confirmar, recibirás un email con los detalles de tu cita
        </p>
      </div>
    </div>
  );
}
