/**
 * CreateInstanceForm Component
 * 
 * Form component for creating new WhatsApp channel instances with validation
 * and integration with the unified channel architecture.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { 
  MessageSquare, 
  Phone, 
  Globe, 
  Settings, 
  Save, 
  ArrowLeft,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

// =====================================================
// TYPES AND SCHEMAS
// =====================================================

const createInstanceSchema = z.object({
  instance_name: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Solo se permiten letras, números, espacios, guiones y guiones bajos'),
  
  phone_number: z.string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Formato de teléfono inválido. Ejemplo: +573001234567'),
  
  auto_reply: z.boolean().default(true),
  
  business_hours_enabled: z.boolean().default(false),
  
  ai_enabled: z.boolean().default(true),
  
  ai_model: z.enum(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']).default('gpt-3.5-turbo'),
  
  ai_temperature: z.number().min(0).max(2).default(0.7),
  
  webhook_url: z.string().url('URL de webhook inválida').optional().or(z.literal('')),
  
  webhook_secret: z.string().min(8, 'El secreto debe tener al menos 8 caracteres').optional().or(z.literal(''))
});

type CreateInstanceFormData = z.infer<typeof createInstanceSchema>;

interface CreateInstanceFormProps {
  /** Channel type for the instance */
  channelType: 'whatsapp' | 'telegram' | 'voice';
  /** Callback when instance is created successfully */
  onSuccess?: (instanceId: string) => void;
  /** Callback when form is cancelled */
  onCancel?: () => void;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

/**
 * CreateInstanceForm - Form for creating new channel instances
 * 
 * @description Provides a comprehensive form for creating new channel instances
 * with validation, error handling, and integration with the unified API.
 * 
 * @param props - Component props
 * @returns JSX element
 */
export const CreateInstanceForm: React.FC<CreateInstanceFormProps> = ({
  channelType,
  onSuccess,
  onCancel
}) => {
  const router = useRouter();
  
  // =====================================================
  // STATE MANAGEMENT
  // =====================================================
  
  const [formData, setFormData] = useState<CreateInstanceFormData>({
    instance_name: '',
    phone_number: '',
    auto_reply: true,
    business_hours_enabled: false,
    ai_enabled: true,
    ai_model: 'gpt-3.5-turbo',
    ai_temperature: 0.7,
    webhook_url: '',
    webhook_secret: ''
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof CreateInstanceFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  /**
   * Handle form field changes with validation
   */
  const handleFieldChange = (field: keyof CreateInstanceFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Clear submit error
    if (submitError) {
      setSubmitError(null);
    }
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    try {
      createInstanceSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof CreateInstanceFormData, string>> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof CreateInstanceFormData] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Prepare request payload
      const payload = {
        instance_name: formData.instance_name,
        auto_reply: formData.auto_reply,
        business_hours: {
          enabled: formData.business_hours_enabled,
          timezone: 'America/Bogota',
          schedule: formData.business_hours_enabled ? {
            monday: { start: '08:00', end: '18:00', enabled: true },
            tuesday: { start: '08:00', end: '18:00', enabled: true },
            wednesday: { start: '08:00', end: '18:00', enabled: true },
            thursday: { start: '08:00', end: '18:00', enabled: true },
            friday: { start: '08:00', end: '18:00', enabled: true },
            saturday: { start: '09:00', end: '14:00', enabled: true },
            sunday: { start: '09:00', end: '14:00', enabled: false }
          } : {}
        },
        ai_config: {
          enabled: formData.ai_enabled,
          model: formData.ai_model,
          temperature: formData.ai_temperature,
          max_tokens: 1000,
          timeout_seconds: 30
        },
        webhook: formData.webhook_url ? {
          url: formData.webhook_url,
          secret: formData.webhook_secret || undefined,
          events: ['MESSAGE_RECEIVED', 'CONNECTION_UPDATE', 'APPOINTMENT_CREATED']
        } : undefined,
        whatsapp: {
          phone_number: formData.phone_number,
          evolution_api: {
            base_url: process.env.NEXT_PUBLIC_EVOLUTION_API_BASE_URL || 'http://localhost:8080',
            api_key: process.env.NEXT_PUBLIC_EVOLUTION_API_KEY || 'default-api-key',
            instance_name: formData.instance_name.toLowerCase().replace(/\s+/g, '-')
          },
          qr_code: {
            enabled: true,
            auto_refresh: true,
            refresh_interval_minutes: 5
          },
          features: {
            read_receipts: true,
            typing_indicator: true,
            presence_update: true
          }
        }
      };

      // Submit to API
      const response = await fetch(`/api/channels/${channelType}/instances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error al crear la instancia');
      }

      const result = await response.json();
      const instanceId = result.data?.instance?.id;

      setSubmitSuccess(true);
      
      // Call success callback or redirect
      if (onSuccess && instanceId) {
        onSuccess(instanceId);
      } else {
        // Redirect to dashboard after short delay
        setTimeout(() => {
          router.push('/admin/channels');
        }, 2000);
      }

    } catch (error) {
      console.error('Error creating instance:', error);
      setSubmitError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle cancel action
   */
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/admin/channels');
    }
  };

  // =====================================================
  // RENDER HELPERS
  // =====================================================

  const renderFormField = (
    field: keyof CreateInstanceFormData,
    label: string,
    type: 'text' | 'tel' | 'url' | 'number' | 'select' | 'checkbox',
    options?: { value: string; label: string }[]
  ) => {
    const error = errors[field];
    const value = formData[field];

    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        
        {type === 'checkbox' ? (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={value as boolean}
              onChange={(e) => handleFieldChange(field, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-600">{label}</span>
          </div>
        ) : type === 'select' ? (
          <select
            value={value as string}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            className={`
              block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1
              ${error 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }
            `}
          >
            {options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={value as string | number}
            onChange={(e) => handleFieldChange(field, type === 'number' ? parseFloat(e.target.value) : e.target.value)}
            className={`
              block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1
              ${error 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }
            `}
            step={type === 'number' ? '0.1' : undefined}
            min={type === 'number' ? '0' : undefined}
            max={type === 'number' ? '2' : undefined}
          />
        )}
        
        {error && (
          <p className="text-sm text-red-600 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            {error}
          </p>
        )}
      </div>
    );
  };

  // =====================================================
  // MAIN RENDER
  // =====================================================

  if (submitSuccess) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow border border-gray-200">
        <div className="text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">¡Instancia creada exitosamente!</h3>
          <p className="mt-1 text-sm text-gray-500">
            Redirigiendo al dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow border border-gray-200">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          type="button"
          onClick={handleCancel}
          className="mr-4 p-2 text-gray-400 hover:text-gray-600"
          aria-label="Volver al dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center">
          <MessageSquare className="h-6 w-6 text-green-600 mr-2" />
          <h1 className="text-xl font-semibold text-gray-900">
            Nueva Instancia de WhatsApp
          </h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Información Básica
          </h3>
          
          {renderFormField('instance_name', 'Nombre de la Instancia', 'text')}
          {renderFormField('phone_number', 'Número de Teléfono', 'tel')}
        </div>

        {/* Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            Configuración
          </h3>
          
          {renderFormField('auto_reply', 'Respuesta Automática', 'checkbox')}
          {renderFormField('business_hours_enabled', 'Horarios de Atención', 'checkbox')}
        </div>

        {/* AI Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Configuración de IA</h3>
          
          {renderFormField('ai_enabled', 'Habilitar IA', 'checkbox')}
          
          {formData.ai_enabled && (
            <>
              {renderFormField('ai_model', 'Modelo de IA', 'select', [
                { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
                { value: 'gpt-4', label: 'GPT-4' },
                { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }
              ])}
              {renderFormField('ai_temperature', 'Temperatura (0-2)', 'number')}
            </>
          )}
        </div>

        {/* Webhook Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Webhook (Opcional)</h3>
          
          {renderFormField('webhook_url', 'URL del Webhook', 'url')}
          
          {formData.webhook_url && (
            renderFormField('webhook_secret', 'Secreto del Webhook', 'text')
          )}
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {submitError}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Crear Instancia
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateInstanceForm;
