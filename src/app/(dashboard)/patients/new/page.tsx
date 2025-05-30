'use client';

/**
 * New Patient Registration Page
 * Comprehensive patient registration form with multi-tenant support
 * 
 * @description Allows Staff, Admin, and Doctor users to register new patients
 * with complete medical and contact information
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import PatientForm, { PatientFormData } from '@/components/patients/PatientForm';
import { ArrowLeft, UserPlus, CheckCircle } from 'lucide-react';

/**
 * NewPatientPage Component
 * 
 * @description Main page component for patient registration
 * Handles form submission, validation, and navigation
 */
export default function NewPatientPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { organization } = useTenant();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Verify user permissions
  if (!profile || !['admin', 'staff', 'doctor', 'superadmin'].includes(profile.role)) {
    return (
      <DashboardLayout
        title="Acceso Denegado"
        subtitle="No tienes permisos para registrar pacientes"
      >
        <div className="text-center py-12">
          <div className="text-red-600 text-lg">
            No tienes permisos suficientes para acceder a esta página.
          </div>
          <button
            onClick={() => router.back()}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Volver
          </button>
        </div>
      </DashboardLayout>
    );
  }

  /**
   * Handle patient registration form submission
   * 
   * @param data - Patient form data
   */
  const handleSubmit = async (data: PatientFormData) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Validate required fields for create mode
      if (!data.email || !data.first_name || !data.last_name) {
        throw new Error('Email, nombre y apellido son requeridos');
      }

      if (!data.password || data.password.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres');
      }

      if (data.password !== data.confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
      }

      // Prepare patient data for API
      const patientData = {
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || null,
        date_of_birth: data.date_of_birth || null,
        gender: data.gender || null,
        address: data.address || null,
        city: data.city || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_phone: data.emergency_contact_phone || null,
        medical_notes: data.medical_notes || null,
        allergies: data.allergies || null,
        current_medications: data.current_medications || null,
        insurance_provider: data.insurance_provider || null,
        insurance_policy_number: data.insurance_policy_number || null
      };

      // Submit to API
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patientData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al registrar paciente');
      }

      const result = await response.json();

      if (result.success) {
        setSuccess('Paciente registrado exitosamente');
        
        // Redirect to patient details or patients list after a short delay
        setTimeout(() => {
          router.push('/patients');
        }, 2000);
      } else {
        throw new Error(result.error || 'Error al registrar paciente');
      }

    } catch (err) {
      console.error('Error registering patient:', err);
      setError(err instanceof Error ? err.message : 'Error inesperado al registrar paciente');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle form cancellation
   */
  const handleCancel = () => {
    router.push('/patients');
  };

  // Page actions
  const actions = (
    <button
      type="button"
      onClick={() => router.push('/patients')}
      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      Volver a Pacientes
    </button>
  );

  return (
    <DashboardLayout
      title="Registrar Nuevo Paciente"
      subtitle={`${organization?.name} • Formulario de registro completo`}
      actions={actions}
    >
      {/* Success Message */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">¡Éxito!</h3>
              <p className="text-sm text-green-700 mt-1">{success}</p>
              <p className="text-xs text-green-600 mt-1">
                Redirigiendo a la lista de pacientes...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center">
          <UserPlus className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nuevo Paciente</h1>
            <p className="text-gray-600 mt-1">
              Complete la información del paciente para crear su registro en el sistema
            </p>
          </div>
        </div>
      </div>

      {/* Patient Registration Form */}
      <PatientForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={loading}
        error={error}
      />

      {/* Help Information */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <UserPlus className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Información sobre el registro
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Los campos marcados con (*) son obligatorios</li>
                <li>El paciente recibirá credenciales de acceso por email</li>
                <li>La información médica es opcional pero recomendada</li>
                <li>Los datos se almacenan de forma segura y confidencial</li>
                <li>El paciente podrá actualizar su información posteriormente</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>
          Al registrar un paciente, confirmas que tienes autorización para procesar
          esta información médica de acuerdo con las políticas de privacidad y
          regulaciones de protección de datos aplicables.
        </p>
      </div>
    </DashboardLayout>
  );
}
