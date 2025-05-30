'use client';

/**
 * WeeklySchedule Component
 * Displays doctor schedules in a weekly calendar view
 * Optimized for visual schedule management
 */

import React from 'react';
import { Clock, User, Calendar } from 'lucide-react';

// Types
interface DoctorSchedule {
  id: string;
  day_of_week: number;
  day_name: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  notes?: string;
  doctor?: {
    id: string;
    name: string;
    specialization: string;
  };
}

interface WeeklyScheduleProps {
  schedules: DoctorSchedule[];
  doctorName?: string;
  onScheduleClick?: (schedule: DoctorSchedule) => void;
  showDoctorInfo?: boolean;
  compact?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 0, label: 'Domingo', short: 'Dom' },
];

export default function WeeklySchedule({
  schedules,
  doctorName,
  onScheduleClick,
  showDoctorInfo = false,
  compact = false
}: WeeklyScheduleProps) {

  // Group schedules by day of week
  const schedulesByDay = schedules.reduce((acc, schedule) => {
    if (!acc[schedule.day_of_week]) {
      acc[schedule.day_of_week] = [];
    }
    acc[schedule.day_of_week]?.push(schedule);
    return acc;
  }, {} as Record<number, DoctorSchedule[]>);

  // Sort schedules within each day by start time
  Object.keys(schedulesByDay).forEach(day => {
    schedulesByDay[Number(day)]?.sort((a, b) =>
      a.start_time.localeCompare(b.start_time)
    );
  });

  const formatTime = (time: string) => {
    try {
      // Convert 24h format to 12h format for better readability
      const parts = time.split(':');
      const hours = parts[0] || '0';
      const minutes = parts[1] || '00';
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return time; // Return original time if parsing fails
    }
  };

  const getScheduleDuration = (startTime: string, endTime: string) => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return `${diffHours}h`;
  };

  if (schedules.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay horarios configurados
        </h3>
        <p className="text-gray-600">
          Los horarios aparecerán aquí una vez que sean configurados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {(doctorName || showDoctorInfo) && (
        <div className="flex items-center space-x-3 mb-6">
          <User className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Horarios Semanales
            </h3>
            {doctorName && (
              <p className="text-sm text-gray-600">{doctorName}</p>
            )}
          </div>
        </div>
      )}

      {/* Weekly Grid */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className={`grid ${compact ? 'grid-cols-7' : 'grid-cols-1 md:grid-cols-7'} divide-x divide-gray-200`}>
          {DAYS_OF_WEEK.map((day) => {
            const daySchedules = schedulesByDay[day.value] || [];

            return (
              <div key={day.value} className="min-h-[200px]">
                {/* Day Header */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h4 className={`font-medium text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
                    {compact ? day.short : day.label}
                  </h4>
                </div>

                {/* Day Content */}
                <div className="p-3 space-y-2">
                  {daySchedules.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                      <p className={`text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>
                        Sin horarios
                      </p>
                    </div>
                  ) : (
                    daySchedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        onClick={() => onScheduleClick?.(schedule)}
                        className={`
                          p-3 rounded-lg border transition-all duration-200
                          ${schedule.is_available
                            ? 'bg-green-50 border-green-200 hover:bg-green-100'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }
                          ${onScheduleClick ? 'cursor-pointer' : ''}
                        `}
                      >
                        {/* Time Range */}
                        <div className="flex items-center justify-between mb-2">
                          <div className={`font-medium ${
                            schedule.is_available ? 'text-green-800' : 'text-gray-600'
                          } ${compact ? 'text-xs' : 'text-sm'}`}>
                            {compact ? (
                              <div>
                                <div>{schedule.start_time}</div>
                                <div>{schedule.end_time}</div>
                              </div>
                            ) : (
                              `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`
                            )}
                          </div>

                          {!compact && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              schedule.is_available
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {getScheduleDuration(schedule.start_time, schedule.end_time)}
                            </span>
                          )}
                        </div>

                        {/* Status Indicator */}
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            schedule.is_available ? 'bg-green-400' : 'bg-gray-400'
                          }`} />
                          <span className={`${compact ? 'text-xs' : 'text-sm'} ${
                            schedule.is_available ? 'text-green-700' : 'text-gray-600'
                          }`}>
                            {schedule.is_available ? 'Disponible' : 'No disponible'}
                          </span>
                        </div>

                        {/* Doctor Info (if showing multiple doctors) */}
                        {showDoctorInfo && schedule.doctor && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className={`font-medium ${compact ? 'text-xs' : 'text-sm'} text-gray-900`}>
                              {schedule.doctor.name}
                            </p>
                            <p className={`${compact ? 'text-xs' : 'text-sm'} text-gray-600`}>
                              {schedule.doctor.specialization}
                            </p>
                          </div>
                        )}

                        {/* Notes */}
                        {!compact && schedule.notes && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {schedule.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      {!compact && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-400 rounded-full" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Horarios Disponibles
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {schedules.filter(s => s.is_available).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Total de Horarios
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {schedules.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Días Activos
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {Object.keys(schedulesByDay).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
