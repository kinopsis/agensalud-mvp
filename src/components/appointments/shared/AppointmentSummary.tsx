'use client';

/**
 * AppointmentSummary Component
 * Unified appointment summary/confirmation component
 * Shows appointment details before final booking
 */

import React from 'react';
import { Calendar, Clock, User, MapPin, FileText, DollarSign } from 'lucide-react';

interface AppointmentSummaryProps {
  service?: string;
  doctor?: string;
  location?: string;
  date: string;
  time: string;
  specialization?: string;
  price?: number;
  reason?: string;
  notes?: string;
  patientName?: string;
  className?: string;
  title?: string;
}

export default function AppointmentSummary({
  service,
  doctor,
  location,
  date,
  time,
  specialization,
  price,
  reason,
  notes,
  patientName,
  className = '',
  title = 'Resumen de la cita'
}: AppointmentSummaryProps) {
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string): string => {
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return timeString;
    }
  };

  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <h4 className="font-medium text-gray-900 mb-3">{title}:</h4>
      <div className="space-y-2 text-sm">
        {patientName && (
          <div className="flex items-center">
            <User className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
            <span className="text-gray-600">Paciente:</span>
            <span className="ml-1 font-medium text-blue-700">{patientName}</span>
          </div>
        )}

        {service && (
          <div className="flex items-center">
            <FileText className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0" />
            <span className="text-gray-600">Servicio:</span>
            <span className="ml-1 font-medium">{service}</span>
          </div>
        )}

        <div className="flex items-center">
          <Calendar className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0" />
          <span className="text-gray-600">Fecha:</span>
          <span className="ml-1 font-medium">{formatDate(date)}</span>
        </div>

        <div className="flex items-center">
          <Clock className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0" />
          <span className="text-gray-600">Hora:</span>
          <span className="ml-1 font-medium">{formatTime(time)}</span>
        </div>

        {doctor && (
          <div className="flex items-center">
            <User className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0" />
            <span className="text-gray-600">Doctor:</span>
            <span className="ml-1 font-medium">{doctor}</span>
          </div>
        )}

        {specialization && (
          <div className="flex items-center">
            <FileText className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0" />
            <span className="text-gray-600">Especialización:</span>
            <span className="ml-1 font-medium">{specialization}</span>
          </div>
        )}

        {location && (
          <div className="flex items-center">
            <MapPin className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0" />
            <span className="text-gray-600">Ubicación:</span>
            <span className="ml-1 font-medium">{location}</span>
          </div>
        )}

        {price !== undefined && (
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0" />
            <span className="text-gray-600">Costo:</span>
            <span className="ml-1 font-medium text-green-600">
              ${price.toLocaleString()}
            </span>
          </div>
        )}

        {reason && (
          <div className="flex items-start">
            <FileText className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0 mt-0.5" />
            <span className="text-gray-600">Motivo:</span>
            <span className="ml-1 font-medium">{reason}</span>
          </div>
        )}

        {notes && (
          <div className="flex items-start">
            <FileText className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0 mt-0.5" />
            <span className="text-gray-600">Notas:</span>
            <span className="ml-1 font-medium">{notes}</span>
          </div>
        )}
      </div>
    </div>
  );
}
