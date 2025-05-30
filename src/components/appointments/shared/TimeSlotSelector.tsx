'use client';

/**
 * TimeSlotSelector Component
 * Unified time slot selection component for appointment booking
 * Displays available slots with doctor information and pricing
 */

import React from 'react';
import { Clock, User } from 'lucide-react';
import { AvailabilitySlot } from './types';
import LoadingState from './LoadingState';

interface TimeSlotSelectorProps {
  slots: AvailabilitySlot[];
  selectedSlot?: AvailabilitySlot;
  onSlotSelect: (slot: AvailabilitySlot) => void;
  loading?: boolean;
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
  className?: string;
  showDoctorInfo?: boolean;
  showPricing?: boolean;
}

export default function TimeSlotSelector({
  slots,
  selectedSlot,
  onSlotSelect,
  loading = false,
  title = 'Horarios disponibles',
  subtitle,
  emptyMessage = 'No hay horarios disponibles para esta fecha.',
  className = '',
  showDoctorInfo = true,
  showPricing = true
}: TimeSlotSelectorProps) {
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

  if (loading) {
    return (
      <div className={className}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600 mb-4">{subtitle}</p>}
        <LoadingState message="Buscando disponibilidad..." />
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className={className}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600 mb-4">{subtitle}</p>}
        <div className="text-center py-8">
          <p className="text-gray-600">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      {subtitle && <p className="text-sm text-gray-600 mb-4">{subtitle}</p>}
      <div className="grid grid-cols-1 gap-4" role="listbox" aria-label={title}>
        {slots.map((slot, index) => {
          const isSelected = selectedSlot &&
            selectedSlot.doctor_id === slot.doctor_id &&
            selectedSlot.start_time === slot.start_time;

          return (
            <button
              key={`${slot.doctor_id}-${slot.start_time}-${index}`}
              type="button"
              onClick={() => onSlotSelect(slot)}
              role="option"
              aria-selected={isSelected ? 'true' : 'false'}
              aria-label={`${formatTime(slot.start_time)}${showDoctorInfo ? ` con ${slot.doctor_name}` : ''}${showPricing && slot.consultation_fee ? ` - $${slot.consultation_fee.toLocaleString()}` : ''}`}
              className={`
                p-5 text-left border-2 rounded-xl transition-all duration-300 transform
                min-h-[100px] focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-900 ring-4 ring-blue-200 shadow-lg scale-[1.02]'
                  : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md hover:scale-[1.01]'
                }
              `}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-3">
                  <div className="bg-blue-100 p-2 rounded-lg mr-3">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="font-bold text-xl text-gray-900">
                    {formatTime(slot.start_time)}
                  </span>
                </div>

                {showDoctorInfo && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center mb-2">
                      <User className="h-4 w-4 text-gray-600 mr-2" />
                      <span className="font-semibold text-gray-900">
                        {slot.doctor_name}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 font-medium">
                      {slot.specialization}
                    </div>
                  </div>
                )}
              </div>

              {showPricing && slot.consultation_fee && (
                <div className="text-right ml-4 flex-shrink-0">
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <div className="font-bold text-xl text-green-600">
                      ${slot.consultation_fee.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Consulta</div>
                  </div>
                </div>
              )}
            </div>
          </button>
          );
        })}
      </div>
    </div>
  );
}
