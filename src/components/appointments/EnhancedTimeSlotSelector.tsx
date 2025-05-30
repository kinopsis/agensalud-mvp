/**
 * EnhancedTimeSlotSelector Component
 * Time slot selection with period grouping and filtering
 */

import React, { useState, useMemo } from 'react';
import { Clock, User, Sun, Sunset, Moon } from 'lucide-react';
import { AvailabilitySlot } from './shared/types';
import LoadingState from './shared/LoadingState';

interface EnhancedTimeSlotSelectorProps {
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

type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'all';

interface TimePeriodConfig {
  id: TimePeriod;
  label: string;
  icon: React.ComponentType<any>;
  timeRange: string;
  startHour: number;
  endHour: number;
  color: string;
}

const TIME_PERIODS: TimePeriodConfig[] = [
  {
    id: 'all',
    label: 'Todos',
    icon: Clock,
    timeRange: 'Todo el día',
    startHour: 0,
    endHour: 24,
    color: 'gray'
  },
  {
    id: 'morning',
    label: 'Mañana',
    icon: Sun,
    timeRange: '6:00 - 12:00',
    startHour: 6,
    endHour: 12,
    color: 'yellow'
  },
  {
    id: 'afternoon',
    label: 'Tarde',
    icon: Sunset,
    timeRange: '12:00 - 18:00',
    startHour: 12,
    endHour: 18,
    color: 'orange'
  },
  {
    id: 'evening',
    label: 'Noche',
    icon: Moon,
    timeRange: '18:00 - 22:00',
    startHour: 18,
    endHour: 22,
    color: 'indigo'
  }
];

export default function EnhancedTimeSlotSelector({
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
}: EnhancedTimeSlotSelectorProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('all');

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

  const getTimeHour = (timeString: string): number => {
    try {
      const [hours] = timeString.split(':');
      return parseInt(hours);
    } catch {
      return 0;
    }
  };

  const filteredSlots = useMemo(() => {
    if (selectedPeriod === 'all') return slots;
    
    const period = TIME_PERIODS.find(p => p.id === selectedPeriod);
    if (!period) return slots;

    return slots.filter(slot => {
      const hour = getTimeHour(slot.start_time);
      return hour >= period.startHour && hour < period.endHour;
    });
  }, [slots, selectedPeriod]);

  const slotsByPeriod = useMemo(() => {
    const grouped = TIME_PERIODS.slice(1).reduce((acc, period) => {
      acc[period.id] = slots.filter(slot => {
        const hour = getTimeHour(slot.start_time);
        return hour >= period.startHour && hour < period.endHour;
      });
      return acc;
    }, {} as Record<TimePeriod, AvailabilitySlot[]>);
    
    return grouped;
  }, [slots]);

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

      {/* Period Filter Tabs */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {TIME_PERIODS.map((period) => {
            const PeriodIcon = period.icon;
            const isSelected = selectedPeriod === period.id;
            const slotCount = period.id === 'all' ? slots.length : slotsByPeriod[period.id as keyof typeof slotsByPeriod]?.length || 0;
            
            return (
              <button
                key={period.id}
                onClick={() => setSelectedPeriod(period.id)}
                className={`
                  flex items-center space-x-2 px-4 py-3 rounded-lg border-2 transition-all duration-300 min-w-[120px]
                  ${isSelected
                    ? `border-${period.color}-500 bg-${period.color}-50 text-${period.color}-700`
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <PeriodIcon className={`w-4 h-4 ${isSelected ? `text-${period.color}-600` : 'text-gray-500'}`} />
                <div className="text-left">
                  <div className="font-medium text-sm">{period.label}</div>
                  <div className="text-xs text-gray-500">
                    {slotCount} disponible{slotCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        
        {selectedPeriod !== 'all' && (
          <div className="mt-2 text-sm text-gray-600">
            Mostrando horarios de {TIME_PERIODS.find(p => p.id === selectedPeriod)?.timeRange}
          </div>
        )}
      </div>

      {/* Time Slots */}
      {filteredSlots.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">
            No hay horarios disponibles en este período. 
            <button 
              onClick={() => setSelectedPeriod('all')}
              className="text-blue-600 hover:text-blue-700 ml-1"
            >
              Ver todos los horarios
            </button>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="listbox" aria-label={title}>
          {filteredSlots.map((slot, index) => {
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
                  p-4 text-left border-2 rounded-xl transition-all duration-300 transform
                  min-h-[120px] focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50
                  ${isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-900 ring-4 ring-blue-200 shadow-lg scale-[1.02]'
                    : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md hover:scale-[1.01]'
                  }
                `}
              >
                <div className="flex items-start justify-between h-full">
                  <div className="flex-1">
                    {/* Time */}
                    <div className="flex items-center mb-3">
                      <div className="bg-blue-100 p-2 rounded-lg mr-3">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="font-bold text-lg text-gray-900">
                        {formatTime(slot.start_time)}
                      </span>
                    </div>

                    {/* Doctor Info */}
                    {showDoctorInfo && (
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <div className="flex items-center mb-1">
                          <User className="h-3 w-3 text-gray-600 mr-2" />
                          <span className="font-medium text-sm text-gray-900">
                            {slot.doctor_name}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {slot.specialization}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pricing */}
                  {showPricing && slot.consultation_fee && (
                    <div className="text-right ml-3 flex-shrink-0">
                      <div className="bg-green-50 p-2 rounded-lg text-center">
                        <div className="font-bold text-lg text-green-600">
                          ${slot.consultation_fee.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">Consulta</div>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {filteredSlots.length > 0 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Mostrando {filteredSlots.length} de {slots.length} horarios disponibles
        </div>
      )}
    </div>
  );
}
