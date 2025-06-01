'use client';

/**
 * Booking Settings Manager Component
 * Admin interface for configuring tenant-specific booking rules
 * 
 * @description Provides comprehensive UI for managing advance booking rules,
 * time windows, weekend policies, and other booking configurations
 */

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Settings,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Info,
  Clock3,
  CalendarDays,
  Shield,
  Zap
} from 'lucide-react';
import { useTenant } from '@/contexts/tenant-context';
import type { BookingSettings } from '@/lib/services/BookingConfigService';

interface BookingSettingsManagerProps {
  className?: string;
  onSettingsChange?: (settings: BookingSettings) => void;
}

interface ValidationError {
  field: string;
  message: string;
}

const BookingSettingsManager: React.FC<BookingSettingsManagerProps> = ({
  className = '',
  onSettingsChange
}) => {
  const { organization } = useTenant();
  const [settings, setSettings] = useState<BookingSettings>({
    advance_booking_hours: 4,
    max_advance_booking_days: 90,
    allow_same_day_booking: true,
    booking_window_start: '08:00',
    booking_window_end: '18:00',
    weekend_booking_enabled: false,
    auto_confirmation: true,
    cancellation_deadline_hours: 2,
    reschedule_deadline_hours: 2
  });

  const [originalSettings, setOriginalSettings] = useState<BookingSettings>(settings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  /**
   * Load current booking settings
   */
  useEffect(() => {
    if (organization?.id) {
      loadSettings();
    }
  }, [organization?.id]);

  const loadSettings = async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/booking-settings?organizationId=${organization.id}`);
      const data = await response.json();

      if (data.success) {
        setSettings(data.data);
        setOriginalSettings(data.data);
      } else {
        console.error('Failed to load booking settings:', data.error);
      }
    } catch (error) {
      console.error('Error loading booking settings:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Validate settings before saving
   */
  const validateSettings = (settingsToValidate: BookingSettings): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Validate advance booking hours
    if (settingsToValidate.advance_booking_hours < 0 || settingsToValidate.advance_booking_hours > 72) {
      errors.push({
        field: 'advance_booking_hours',
        message: 'Las horas de anticipación deben estar entre 0 y 72'
      });
    }

    // Validate max advance booking days
    if (settingsToValidate.max_advance_booking_days < 1 || settingsToValidate.max_advance_booking_days > 365) {
      errors.push({
        field: 'max_advance_booking_days',
        message: 'Los días máximos de anticipación deben estar entre 1 y 365'
      });
    }

    // Validate time format and logic
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (!timeRegex.test(settingsToValidate.booking_window_start)) {
      errors.push({
        field: 'booking_window_start',
        message: 'Formato de hora inválido (use HH:MM)'
      });
    }

    if (!timeRegex.test(settingsToValidate.booking_window_end)) {
      errors.push({
        field: 'booking_window_end',
        message: 'Formato de hora inválido (use HH:MM)'
      });
    }

    // Validate booking window logic
    if (timeRegex.test(settingsToValidate.booking_window_start) && 
        timeRegex.test(settingsToValidate.booking_window_end)) {
      const [startHour, startMin] = settingsToValidate.booking_window_start.split(':').map(Number);
      const [endHour, endMin] = settingsToValidate.booking_window_end.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      if (startMinutes >= endMinutes) {
        errors.push({
          field: 'booking_window',
          message: 'La hora de inicio debe ser anterior a la hora de fin'
        });
      }
    }

    return errors;
  };

  /**
   * Handle settings change
   */
  const handleSettingChange = (field: keyof BookingSettings, value: any) => {
    const updatedSettings = { ...settings, [field]: value };
    setSettings(updatedSettings);
    
    // Clear validation errors for this field
    setValidationErrors(prev => prev.filter(error => error.field !== field));
    
    // Notify parent component
    onSettingsChange?.(updatedSettings);
  };

  /**
   * Save settings
   */
  const handleSave = async () => {
    if (!organization?.id) return;

    // Validate settings
    const errors = validateSettings(settings);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSaving(true);
    setSaveStatus('idle');

    try {
      const response = await fetch('/api/admin/booking-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: organization.id,
          settings
        }),
      });

      const data = await response.json();

      if (data.success) {
        setOriginalSettings(settings);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
        console.error('Failed to save booking settings:', data.error);
      }
    } catch (error) {
      setSaveStatus('error');
      console.error('Error saving booking settings:', error);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Reset to original settings
   */
  const handleReset = () => {
    setSettings(originalSettings);
    setValidationErrors([]);
    setSaveStatus('idle');
  };

  /**
   * Check if settings have changed
   */
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  /**
   * Get validation error for field
   */
  const getFieldError = (field: string): string | undefined => {
    return validationErrors.find(error => error.field === field)?.message;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Configuración de Reservas
              </h3>
              <p className="text-sm text-gray-500">
                Gestiona las reglas de reserva para tu organización
              </p>
            </div>
          </div>
          
          {/* Save Status */}
          {saveStatus === 'success' && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Guardado</span>
            </div>
          )}
          
          {saveStatus === 'error' && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Error al guardar</span>
            </div>
          )}
        </div>
      </div>

      {/* Settings Form */}
      <div className="p-6 space-y-6">
        {/* Advance Booking Rules */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Clock3 className="h-5 w-5 text-gray-400" />
            <h4 className="text-md font-medium text-gray-900">Reglas de Anticipación</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Advance Booking Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Horas mínimas de anticipación
              </label>
              <input
                type="number"
                min="0"
                max="72"
                value={settings.advance_booking_hours}
                onChange={(e) => handleSettingChange('advance_booking_hours', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  getFieldError('advance_booking_hours') ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {getFieldError('advance_booking_hours') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('advance_booking_hours')}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Tiempo mínimo requerido entre la reserva y la cita
              </p>
            </div>

            {/* Max Advance Booking Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Días máximos de anticipación
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={settings.max_advance_booking_days}
                onChange={(e) => handleSettingChange('max_advance_booking_days', parseInt(e.target.value) || 1)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  getFieldError('max_advance_booking_days') ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {getFieldError('max_advance_booking_days') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('max_advance_booking_days')}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Máximo tiempo de anticipación permitido para reservas
              </p>
            </div>
          </div>
        </div>

        {/* Booking Window */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-gray-400" />
            <h4 className="text-md font-medium text-gray-900">Ventana de Reservas</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Booking Window Start */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora de inicio
              </label>
              <input
                type="time"
                value={settings.booking_window_start}
                onChange={(e) => handleSettingChange('booking_window_start', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  getFieldError('booking_window_start') ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {getFieldError('booking_window_start') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('booking_window_start')}</p>
              )}
            </div>

            {/* Booking Window End */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora de fin
              </label>
              <input
                type="time"
                value={settings.booking_window_end}
                onChange={(e) => handleSettingChange('booking_window_end', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  getFieldError('booking_window_end') ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {getFieldError('booking_window_end') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('booking_window_end')}</p>
              )}
            </div>
          </div>
          
          {getFieldError('booking_window') && (
            <p className="text-sm text-red-600">{getFieldError('booking_window')}</p>
          )}
        </div>

        {/* Booking Policies */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-gray-400" />
            <h4 className="text-md font-medium text-gray-900">Políticas de Reserva</h4>
          </div>
          
          <div className="space-y-3">
            {/* Same Day Booking */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Permitir reservas el mismo día
                </label>
                <p className="text-xs text-gray-500">
                  Los pacientes pueden reservar citas para el día actual
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.allow_same_day_booking}
                onChange={(e) => handleSettingChange('allow_same_day_booking', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            {/* Weekend Booking */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Permitir reservas de fin de semana
                </label>
                <p className="text-xs text-gray-500">
                  Habilitar reservas para sábados y domingos
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.weekend_booking_enabled}
                onChange={(e) => handleSettingChange('weekend_booking_enabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            {/* Auto Confirmation */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Confirmación automática
                </label>
                <p className="text-xs text-gray-500">
                  Las citas se confirman automáticamente sin revisión manual
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.auto_confirmation}
                onChange={(e) => handleSettingChange('auto_confirmation', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* Cancellation & Reschedule Rules */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <CalendarDays className="h-5 w-5 text-gray-400" />
            <h4 className="text-md font-medium text-gray-900">Reglas de Cancelación y Reagendamiento</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cancellation Deadline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plazo para cancelación (horas)
              </label>
              <input
                type="number"
                min="0"
                max="168"
                value={settings.cancellation_deadline_hours}
                onChange={(e) => handleSettingChange('cancellation_deadline_hours', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Tiempo mínimo antes de la cita para permitir cancelación
              </p>
            </div>

            {/* Reschedule Deadline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plazo para reagendamiento (horas)
              </label>
              <input
                type="number"
                min="0"
                max="168"
                value={settings.reschedule_deadline_hours}
                onChange={(e) => handleSettingChange('reschedule_deadline_hours', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Tiempo mínimo antes de la cita para permitir reagendamiento
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <>
                <Info className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-amber-600">Tienes cambios sin guardar</span>
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleReset}
              disabled={!hasChanges || saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restablecer
            </button>
            
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving || validationErrors.length > 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSettingsManager;
