'use client';

/**
 * Calendar Component
 * Integrated calendar system with appointment visualization and booking
 * Supports multiple views: month, week, day
 * Role-based functionality for different user types
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Plus,
  Filter,
  Grid3X3,
  List,
  Eye
} from 'lucide-react';

export type CalendarView = 'month' | 'week' | 'day';

export interface CalendarAppointment {
  id: string;
  patient_name: string;
  doctor_name: string;
  service_name: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  patient_id: string;
  doctor_id: string;
  service_id: string;
}

export interface CalendarProps {
  view?: CalendarView;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onAppointmentSelect?: (appointment: CalendarAppointment) => void;
  onTimeSlotSelect?: (date: Date, time: string) => void;
  doctorId?: string; // Filter by specific doctor
  showAvailability?: boolean; // Show available time slots
  allowBooking?: boolean; // Allow booking new appointments
  className?: string;
}

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function Calendar({
  view = 'month',
  selectedDate = new Date(),
  onDateSelect,
  onAppointmentSelect,
  onTimeSlotSelect,
  doctorId,
  showAvailability = false,
  allowBooking = false,
  className = ''
}: CalendarProps) {
  const { profile } = useAuth();
  const { organization } = useTenant();
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [currentView, setCurrentView] = useState<CalendarView>(view);
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    doctor: doctorId || '',
    status: '',
    service: ''
  });

  // Calculate date ranges based on current view
  const dateRange = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    switch (currentView) {
      case 'month':
        start.setDate(1);
        end.setMonth(end.getMonth() + 1, 0);
        break;
      case 'week':
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        end.setDate(start.getDate() + 6);
        break;
      case 'day':
        // Same day
        break;
    }

    return { start, end };
  }, [currentDate, currentView]);

  // Fetch appointments for the current date range
  useEffect(() => {
    if (organization?.id) {
      fetchAppointments();
    }
  }, [organization?.id, dateRange, selectedFilters]);

  // FIXED: Fetch available slots for day view and when showAvailability is enabled
  // This ensures availability is always fetched when needed
  useEffect(() => {
    if (organization?.id && (showAvailability || currentView === 'day')) {
      console.log('🔄 CALENDAR: Triggering availability fetch due to:', {
        showAvailability,
        currentView,
        date: currentDate.toISOString().split('T')[0],
        doctorFilter: selectedFilters.doctor || 'all'
      });
      fetchAvailableSlots();
    }
  }, [organization?.id, showAvailability, currentDate, currentView, selectedFilters.doctor]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append('organizationId', organization!.id);

      const startDateStr = dateRange.start.toISOString().split('T')[0];
      const endDateStr = dateRange.end.toISOString().split('T')[0];

      if (startDateStr) {
        params.append('startDate', startDateStr);
      }
      if (endDateStr) {
        params.append('endDate', endDateStr);
      }

      if (selectedFilters.doctor) {
        params.append('doctorId', selectedFilters.doctor);
      }
      if (selectedFilters.status) {
        params.append('status', selectedFilters.status);
      }
      if (selectedFilters.service) {
        params.append('serviceId', selectedFilters.service);
      }

      const response = await fetch(`/api/calendar/appointments?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }

      const data = await response.json();
      setAppointments(data.data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    // FIXED: Fetch availability for all doctors when no specific doctor is selected
    // This enables the calendar to show general availability for the organization

    try {
      const params = new URLSearchParams();
      params.append('organizationId', organization!.id);

      // Only add doctorId if a specific doctor is selected
      if (selectedFilters.doctor) {
        params.append('doctorId', selectedFilters.doctor);
      }

      const dateStr = currentDate.toISOString().split('T')[0];
      if (dateStr) {
        params.append('date', dateStr);
      }
      params.append('duration', '30');

      // Apply role-based booking rules
      const userRole = profile?.role as 'patient' | 'admin' | 'staff' | 'doctor' | 'superadmin';
      const isPrivilegedUser = ['admin', 'staff', 'doctor', 'superadmin'].includes(userRole || 'patient');

      if (!isPrivilegedUser) {
        params.append('useStandardRules', 'true');
      }

      console.log('🔍 CALENDAR: Fetching availability with params:', {
        organizationId: organization!.id,
        doctorId: selectedFilters.doctor || 'all',
        date: dateStr,
        userRole,
        useStandardRules: !isPrivilegedUser
      });

      const response = await fetch(`/api/doctors/availability?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }

      const data = await response.json();
      const slots = data.data?.map((slot: any) => slot.start_time) || [];

      console.log('✅ CALENDAR: Availability fetched successfully:', {
        slotsCount: slots.length,
        date: dateStr,
        doctorFilter: selectedFilters.doctor || 'all'
      });

      setAvailableSlots(slots);
    } catch (error) {
      console.error('❌ CALENDAR: Error fetching availability:', error);
      setAvailableSlots([]);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);

    switch (currentView) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
    }

    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    setCurrentDate(date);
    onDateSelect?.(date);
  };

  const handleAppointmentClick = (appointment: CalendarAppointment) => {
    onAppointmentSelect?.(appointment);
  };

  const handleTimeSlotClick = (time: string) => {
    onTimeSlotSelect?.(currentDate, time);
  };

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter(apt => apt.appointment_date === dateStr);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatViewTitle = () => {
    switch (currentView) {
      case 'month':
        return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
      case 'week':
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.getDate()} - ${weekEnd.getDate()} ${MONTHS[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
      case 'day':
        return `${currentDate.getDate()} ${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
      default:
        return '';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">{formatViewTitle()}</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Hoy
            </button>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* View Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['month', 'week', 'day'] as CalendarView[]).map((viewType) => (
              <button
                key={viewType}
                onClick={() => setCurrentView(viewType)}
                className={`px-3 py-1 text-sm rounded-md capitalize ${
                  currentView === viewType
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {viewType === 'month' ? 'Mes' : viewType === 'week' ? 'Semana' : 'Día'}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          {allowBooking && (
            <button
              onClick={() => onTimeSlotSelect?.(currentDate, '09:00')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cita
            </button>
          )}
        </div>
      </div>

      {/* Calendar Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {currentView === 'month' && (
              <MonthView
                currentDate={currentDate}
                appointments={appointments}
                onDateClick={handleDateClick}
                onAppointmentClick={handleAppointmentClick}
                getAppointmentsForDate={getAppointmentsForDate}
                getStatusColor={getStatusColor}
              />
            )}
            {currentView === 'week' && (
              <WeekView
                currentDate={currentDate}
                appointments={appointments}
                onAppointmentClick={handleAppointmentClick}
                getStatusColor={getStatusColor}
              />
            )}
            {currentView === 'day' && (
              <DayView
                currentDate={currentDate}
                appointments={getAppointmentsForDate(currentDate)}
                availableSlots={availableSlots}
                showAvailability={showAvailability}
                allowBooking={allowBooking}
                onAppointmentClick={handleAppointmentClick}
                onTimeSlotClick={handleTimeSlotClick}
                getStatusColor={getStatusColor}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Month View Component
function MonthView({ currentDate, appointments, onDateClick, onAppointmentClick, getAppointmentsForDate, getStatusColor }: any) {
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Generate calendar grid
  const calendarDays = [];

  // Previous month's trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(firstDayOfMonth);
    date.setDate(date.getDate() - (i + 1));
    calendarDays.push({ date, isCurrentMonth: false });
  }

  // Current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    calendarDays.push({ date, isCurrentMonth: true });
  }

  // Next month's leading days
  const remainingDays = 42 - calendarDays.length; // 6 weeks * 7 days
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day);
    calendarDays.push({ date, isCurrentMonth: false });
  }

  const today = new Date();
  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
      {/* Day headers */}
      {DAYS_OF_WEEK.map((day) => (
        <div key={day} className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-700">
          {day}
        </div>
      ))}

      {/* Calendar days */}
      {calendarDays.map(({ date, isCurrentMonth }, index) => {
        const dayAppointments = getAppointmentsForDate(date);
        const isSelected = date.toDateString() === currentDate.toDateString();

        return (
          <div
            key={index}
            onClick={() => onDateClick(date)}
            className={`bg-white p-2 min-h-[100px] cursor-pointer hover:bg-gray-50 ${
              !isCurrentMonth ? 'text-gray-400' : ''
            } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className={`text-sm font-medium mb-1 ${
              isToday(date) ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''
            }`}>
              {date.getDate()}
            </div>

            {/* Appointments for this day */}
            <div className="space-y-1">
              {dayAppointments.slice(0, 3).map((appointment: CalendarAppointment) => (
                <div
                  key={appointment.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAppointmentClick(appointment);
                  }}
                  className={`text-xs p-1 rounded border cursor-pointer hover:shadow-sm ${getStatusColor(appointment.status)}`}
                >
                  <div className="font-medium truncate">{appointment.start_time}</div>
                  <div className="truncate">{appointment.patient_name}</div>
                  {appointment.location_name && (
                    <div className="truncate text-gray-600">📍 {appointment.location_name}</div>
                  )}
                </div>
              ))}
              {dayAppointments.length > 3 && (
                <div className="text-xs text-gray-500 text-center">
                  +{dayAppointments.length - 3} más
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Week View Component
function WeekView({ currentDate, appointments, onAppointmentClick, getStatusColor }: any) {
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());

  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    weekDays.push(date);
  }

  const timeSlots: string[] = [];
  for (let hour = 8; hour < 20; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
  }

  const getAppointmentsForDateTime = (date: Date, time: string) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter((apt: CalendarAppointment) =>
      apt.appointment_date === dateStr && apt.start_time === time
    );
  };

  const today = new Date();
  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="flex flex-col">
      {/* Week header */}
      <div className="grid grid-cols-8 gap-px bg-gray-200 rounded-t-lg overflow-hidden">
        <div className="bg-gray-50 p-3"></div>
        {weekDays.map((date, index) => (
          <div key={index} className={`bg-gray-50 p-3 text-center ${isToday(date) ? 'bg-blue-50' : ''}`}>
            <div className="text-sm font-medium text-gray-700">{DAYS_OF_WEEK[index]}</div>
            <div className={`text-lg font-semibold ${isToday(date) ? 'text-blue-600' : 'text-gray-900'}`}>
              {date.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Time slots grid */}
      <div className="grid grid-cols-8 gap-px bg-gray-200 max-h-96 overflow-y-auto">
        {timeSlots.map((time) => (
          <React.Fragment key={time}>
            {/* Time label */}
            <div className="bg-gray-50 p-2 text-xs text-gray-600 text-right border-r">
              {time}
            </div>

            {/* Day columns */}
            {weekDays.map((date, dayIndex) => {
              const dayAppointments = getAppointmentsForDateTime(date, time);

              return (
                <div key={`${time}-${dayIndex}`} className="bg-white p-1 min-h-[40px] border-b border-gray-100">
                  {dayAppointments.map((appointment: CalendarAppointment) => (
                    <div
                      key={appointment.id}
                      onClick={() => onAppointmentClick(appointment)}
                      className={`text-xs p-1 rounded cursor-pointer hover:shadow-sm mb-1 ${getStatusColor(appointment.status)}`}
                    >
                      <div className="font-medium truncate">{appointment.patient_name}</div>
                      <div className="truncate">{appointment.service_name}</div>
                      {appointment.location_name && (
                        <div className="truncate text-gray-600">📍 {appointment.location_name}</div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// Day View Component
function DayView({ currentDate, appointments, availableSlots, showAvailability, allowBooking, onAppointmentClick, onTimeSlotClick, getStatusColor }: any) {
  const timeSlots: string[] = [];
  for (let hour = 8; hour < 20; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
  }

  const getAppointmentsForTime = (time: string) => {
    return appointments.filter((apt: CalendarAppointment) => apt.start_time === time);
  };

  const isTimeAvailable = (time: string) => {
    return availableSlots.includes(time);
  };

  const today = new Date();
  const isToday = currentDate.toDateString() === today.toDateString();

  return (
    <div className="space-y-4">
      {/* Day header */}
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900">
          {currentDate.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </h3>
        {isToday && (
          <p className="text-sm text-blue-600 mt-1">Hoy</p>
        )}
      </div>

      {/* Time slots */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {timeSlots.map((time) => {
          const timeAppointments = getAppointmentsForTime(time);
          const isAvailable = showAvailability && isTimeAvailable(time);
          const isEmpty = timeAppointments.length === 0;

          return (
            <div key={time} className="flex items-start space-x-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              {/* Time label */}
              <div className="w-16 text-sm font-medium text-gray-600 pt-1">
                {time}
              </div>

              {/* Content area */}
              <div className="flex-1">
                {timeAppointments.length > 0 ? (
                  <div className="space-y-2">
                    {timeAppointments.map((appointment: CalendarAppointment) => (
                      <div
                        key={appointment.id}
                        onClick={() => onAppointmentClick(appointment)}
                        className={`p-3 rounded-lg cursor-pointer hover:shadow-md transition-shadow ${getStatusColor(appointment.status)}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{appointment.patient_name}</div>
                            <div className="text-sm text-gray-600">{appointment.service_name}</div>
                            <div className="text-sm text-gray-600">Dr. {appointment.doctor_name}</div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {appointment.start_time} - {appointment.end_time}
                          </div>
                        </div>
                        {appointment.notes && (
                          <div className="text-xs text-gray-600 mt-2">{appointment.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">
                      {isAvailable ? 'Disponible' : 'Sin citas'}
                    </span>

                    {/* Available slot or booking button */}
                    {isAvailable && allowBooking && (
                      <button
                        type="button"
                        onClick={() => onTimeSlotClick(time)}
                        className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                      >
                        Reservar
                      </button>
                    )}

                    {!isAvailable && showAvailability && isEmpty && (
                      <span className="text-xs text-gray-400">No disponible</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Total de citas:</span>
            <span className="ml-2 text-gray-900">{appointments.length}</span>
          </div>
          {showAvailability && (
            <div>
              <span className="font-medium text-gray-700">Slots disponibles:</span>
              <span className="ml-2 text-green-600">{availableSlots.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
