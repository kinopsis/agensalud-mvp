'use client';

/**
 * AvailabilityDisplay Component
 * Shows available appointment slots in an organized, user-friendly format
 * Integrates with real doctor availability data
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, MapPin, DollarSign, Filter, RefreshCw } from 'lucide-react';

interface AvailabilitySlot {
  start_time: string;
  end_time: string;
  doctor_id: string;
  doctor_name: string;
  specialization: string;
  consultation_fee: number;
  available: boolean;
}

interface AvailabilityDisplayProps {
  organizationId: string;
  selectedDate?: string;
  selectedSpecialty?: string;
  onSlotSelect?: (slot: AvailabilitySlot) => void;
  showFilters?: boolean;
  maxSlots?: number;
  compact?: boolean;
}

export default function AvailabilityDisplay({
  organizationId,
  selectedDate,
  selectedSpecialty,
  onSlotSelect,
  showFilters = true,
  maxSlots = 10,
  compact = false
}: AvailabilityDisplayProps) {
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    date: selectedDate || '',
    timeOfDay: 'all', // 'morning', 'afternoon', 'evening', 'all'
    maxPrice: '',
    doctor: 'all'
  });

  // Fetch availability data
  const fetchAvailability = async () => {
    if (!filters.date) return;

    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams({
        organizationId,
        date: filters.date,
        duration: '30'
      });

      if (selectedSpecialty) {
        // Map specialty to service if needed
        searchParams.append('specialty', selectedSpecialty);
      }

      const response = await fetch(`/api/doctors/availability?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }

      const result = await response.json();
      let slots = result.data || [];

      // Apply filters
      slots = applyFilters(slots);

      // Limit results
      if (maxSlots > 0) {
        slots = slots.slice(0, maxSlots);
      }

      setAvailability(slots);
    } catch (err) {
      setError('Error al cargar la disponibilidad');
      console.error('Error fetching availability:', err);
    } finally {
      setLoading(false);
    }
  };

  // Apply client-side filters
  const applyFilters = (slots: AvailabilitySlot[]) => {
    return slots.filter(slot => {
      // Time of day filter
      if (filters.timeOfDay !== 'all') {
        try {
          const timeParts = slot.start_time.split(':');
          const hourStr = timeParts[0] || '0';
          const hour = parseInt(hourStr, 10);

          switch (filters.timeOfDay) {
            case 'morning':
              if (hour < 8 || hour >= 12) return false;
              break;
            case 'afternoon':
              if (hour < 12 || hour >= 17) return false;
              break;
            case 'evening':
              if (hour < 17 || hour >= 20) return false;
              break;
          }
        } catch {
          return false; // Skip slot if time parsing fails
        }
      }

      // Price filter
      if (filters.maxPrice && slot.consultation_fee > parseFloat(filters.maxPrice)) {
        return false;
      }

      // Doctor filter
      if (filters.doctor !== 'all' && slot.doctor_id !== filters.doctor) {
        return false;
      }

      return true;
    });
  };

  // Get unique doctors for filter
  const getUniqueDoctors = () => {
    const doctors = availability.reduce((acc, slot) => {
      if (!acc.find(d => d.id === slot.doctor_id)) {
        acc.push({
          id: slot.doctor_id,
          name: slot.doctor_name,
          specialization: slot.specialization
        });
      }
      return acc;
    }, [] as Array<{ id: string; name: string; specialization: string }>);

    return doctors;
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    try {
      const parts = timeString.split(':');
      const hours = parts[0] || '0';
      const minutes = parts[1] || '00';
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString; // Return original string if parsing fails
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  // Get time of day label
  const getTimeOfDayLabel = (timeString: string) => {
    try {
      const parts = timeString.split(':');
      const hourStr = parts[0] || '0';
      const hour = parseInt(hourStr, 10);
      if (hour < 12) return 'Mañana';
      if (hour < 17) return 'Tarde';
      return 'Noche';
    } catch {
      return 'Desconocido';
    }
  };

  // Get next 7 days for date picker
  const getNextWeekDays = () => {
    const days = [];
    const today = new Date();

    for (let i = 0; i <= 6; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push({
        value: date.toISOString().split('T')[0],
        label: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' :
               date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
      });
    }

    return days;
  };

  // Effect to fetch data when filters change
  useEffect(() => {
    if (filters.date) {
      fetchAvailability();
    }
  }, [filters.date, organizationId, selectedSpecialty]);

  // Update date filter when prop changes
  useEffect(() => {
    if (selectedDate && selectedDate !== filters.date) {
      setFilters(prev => ({ ...prev, date: selectedDate }));
    }
  }, [selectedDate]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filtros de Búsqueda
            </h3>
            <button
              onClick={fetchAvailability}
              disabled={loading}
              className="flex items-center text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha
              </label>
              <select
                value={filters.date}
                onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar fecha</option>
                {getNextWeekDays().map(day => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Time of Day Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horario
              </label>
              <select
                value={filters.timeOfDay}
                onChange={(e) => setFilters(prev => ({ ...prev, timeOfDay: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Cualquier horario</option>
                <option value="morning">Mañana (8:00 - 12:00)</option>
                <option value="afternoon">Tarde (12:00 - 17:00)</option>
                <option value="evening">Noche (17:00 - 20:00)</option>
              </select>
            </div>

            {/* Price Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio máximo
              </label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                placeholder="Sin límite"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Doctor Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Doctor
              </label>
              <select
                value={filters.doctor}
                onChange={(e) => setFilters(prev => ({ ...prev, doctor: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Cualquier doctor</option>
                {getUniqueDoctors().map(doctor => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="bg-white border border-gray-200 rounded-lg">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              {filters.date ? `Disponibilidad para ${formatDate(filters.date)}` : 'Horarios Disponibles'}
            </h3>
            {availability.length > 0 && (
              <span className="text-sm text-gray-600">
                {availability.length} horario{availability.length !== 1 ? 's' : ''} disponible{availability.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
              <span className="text-gray-600">Cargando disponibilidad...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-2">{error}</p>
              <button
                onClick={fetchAvailability}
                className="text-blue-600 hover:text-blue-700"
              >
                Intentar de nuevo
              </button>
            </div>
          ) : !filters.date ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Selecciona una fecha para ver la disponibilidad</p>
            </div>
          ) : availability.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-2">No hay horarios disponibles para los filtros seleccionados</p>
              <button
                onClick={() => setFilters(prev => ({ ...prev, timeOfDay: 'all', maxPrice: '', doctor: 'all' }))}
                className="text-blue-600 hover:text-blue-700"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
              {availability.map((slot, index) => (
                <div
                  key={index}
                  onClick={() => onSlotSelect?.(slot)}
                  className={`
                    p-4 border border-gray-200 rounded-lg transition-all duration-200
                    ${onSlotSelect ? 'cursor-pointer hover:border-blue-300 hover:bg-blue-50' : ''}
                    ${compact ? 'p-3' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {/* Time */}
                      <div className="flex items-center mb-2">
                        <Clock className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="font-medium text-gray-900">
                          {formatTime(slot.start_time)}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({getTimeOfDayLabel(slot.start_time)})
                        </span>
                      </div>

                      {/* Doctor */}
                      <div className="flex items-center mb-1">
                        <User className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="text-sm text-gray-700">{slot.doctor_name}</span>
                      </div>

                      {/* Specialization */}
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="text-sm text-gray-600">{slot.specialization}</span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <div className="flex items-center text-green-600 font-medium">
                        <DollarSign className="h-4 w-4" />
                        <span>{slot.consultation_fee}</span>
                      </div>
                      {onSlotSelect && (
                        <button className="text-xs text-blue-600 hover:text-blue-700 mt-1">
                          Seleccionar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
