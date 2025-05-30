'use client';

/**
 * ScheduleManager Component
 * Manages doctor schedules with CRUD operations
 * Follows atomic design principles and TypeScript best practices
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Clock, Calendar, User } from 'lucide-react';

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

interface ScheduleFormData {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  notes?: string;
}

interface ScheduleManagerProps {
  doctorId: string;
  doctorName?: string;
  onScheduleChange?: (schedules: DoctorSchedule[]) => void;
  readOnly?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

export default function ScheduleManager({ 
  doctorId, 
  doctorName, 
  onScheduleChange,
  readOnly = false 
}: ScheduleManagerProps) {
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<DoctorSchedule | null>(null);
  const [formData, setFormData] = useState<ScheduleFormData>({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    is_available: true,
    notes: ''
  });

  // Fetch schedules on component mount
  useEffect(() => {
    fetchSchedules();
  }, [doctorId]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/doctors/${doctorId}/schedule`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch schedules');
      }

      setSchedules(result.data || []);
      onScheduleChange?.(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError(null);

      // Validate form data
      if (formData.start_time >= formData.end_time) {
        setError('La hora de inicio debe ser anterior a la hora de fin');
        return;
      }

      const url = editingSchedule 
        ? `/api/doctors/${doctorId}/schedule`
        : `/api/doctors/${doctorId}/schedule`;

      const method = editingSchedule ? 'PUT' : 'POST';
      const body = editingSchedule 
        ? { ...formData, id: editingSchedule.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save schedule');
      }

      // Refresh schedules
      await fetchSchedules();
      
      // Reset form
      setShowForm(false);
      setEditingSchedule(null);
      setFormData({
        day_of_week: 1,
        start_time: '09:00',
        end_time: '17:00',
        is_available: true,
        notes: ''
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error saving schedule:', err);
    }
  };

  const handleEdit = (schedule: DoctorSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      is_available: schedule.is_available,
      notes: schedule.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este horario?')) {
      return;
    }

    try {
      setError(null);

      const response = await fetch(
        `/api/doctors/${doctorId}/schedule?scheduleId=${scheduleId}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete schedule');
      }

      // Refresh schedules
      await fetchSchedules();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error deleting schedule:', err);
    }
  };

  const getDayLabel = (dayOfWeek: number) => {
    return DAYS_OF_WEEK.find(day => day.value === dayOfWeek)?.label || 'Desconocido';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando horarios...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calendar className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Gestión de Horarios
            </h2>
            {doctorName && (
              <p className="text-sm text-gray-600">
                <User className="inline h-4 w-4 mr-1" />
                {doctorName}
              </p>
            )}
          </div>
        </div>
        
        {!readOnly && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar Horario</span>
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Schedule Form */}
      {showForm && !readOnly && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingSchedule ? 'Editar Horario' : 'Nuevo Horario'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Day of Week */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Día de la semana
                </label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({ ...formData, day_of_week: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {DAYS_OF_WEEK.map(day => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de inicio
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de fin
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas (opcional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Información adicional sobre este horario..."
              />
            </div>

            {/* Available Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_available"
                checked={formData.is_available}
                onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_available" className="ml-2 text-sm text-gray-700">
                Disponible para citas
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingSchedule(null);
                  setError(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingSchedule ? 'Actualizar' : 'Crear'} Horario
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schedules List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {schedules.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay horarios configurados
            </h3>
            <p className="text-gray-600 mb-4">
              Agrega horarios para que los pacientes puedan reservar citas.
            </p>
            {!readOnly && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Agregar Primer Horario
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {schedules
              .sort((a, b) => a.day_of_week - b.day_of_week)
              .map((schedule) => (
                <div key={schedule.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`w-3 h-3 rounded-full ${
                          schedule.is_available ? 'bg-green-400' : 'bg-gray-400'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {getDayLabel(schedule.day_of_week)}
                          </span>
                          <span className="text-gray-600">
                            {schedule.start_time} - {schedule.end_time}
                          </span>
                        </div>
                        {schedule.notes && (
                          <p className="text-sm text-gray-600 mt-1">
                            {schedule.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {!readOnly && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(schedule)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Editar horario"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(schedule.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Eliminar horario"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
