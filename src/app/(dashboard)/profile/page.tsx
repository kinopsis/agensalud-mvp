'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useTenant } from '@/contexts/tenant-context'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { User, Edit, Save, X, AlertCircle, CheckCircle } from 'lucide-react'

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuth()
  const { organization } = useTenant()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    phone: profile?.phone || '',
    date_of_birth: profile?.date_of_birth || '',
    gender: profile?.gender || '',
    address: profile?.address || '',
    city: profile?.city || '',
    state: profile?.state || '',
    postal_code: profile?.postal_code || '',
    country: profile?.country || 'Colombia',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await updateProfile(formData)
      setSuccess('Perfil actualizado exitosamente')
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el perfil')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone: profile?.phone || '',
      date_of_birth: profile?.date_of_birth || '',
      gender: profile?.gender || '',
      address: profile?.address || '',
      city: profile?.city || '',
      state: profile?.state || '',
      postal_code: profile?.postal_code || '',
      country: profile?.country || 'Colombia',
    })
    setIsEditing(false)
    setError(null)
    setSuccess(null)
  }

  const actions = !isEditing ? (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
    >
      <Edit className="h-4 w-4 mr-2" />
      Editar Perfil
    </button>
  ) : (
    <div className="flex items-center space-x-3">
      <button
        type="button"
        onClick={handleCancel}
        disabled={isLoading}
        className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <X className="h-4 w-4 mr-2" />
        Cancelar
      </button>
      <button
        type="submit"
        form="profile-form"
        disabled={isLoading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <Save className="h-4 w-4 mr-2" />
        {isLoading ? 'Guardando...' : 'Guardar'}
      </button>
    </div>
  );

  if (!user || !profile) {
    return (
      <DashboardLayout title="Mi Perfil" subtitle="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando perfil...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Mi Perfil"
      subtitle={`${profile.first_name} ${profile.last_name} • ${organization?.name || ''}`}
      actions={actions}
    >
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          {/* Alerts */}
          {error && (
            <div className="mx-6 mt-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
          {success && (
            <div className="mx-6 mt-6 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Éxito</h3>
                  <p className="text-sm text-green-700 mt-1">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Profile Content */}
          <div className="px-6 py-6">
            {isEditing ? (
              <form id="profile-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Información Personal
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        id="first_name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                        Apellido *
                      </label>
                      <input
                        type="text"
                        id="last_name"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="+57 300 123 4567"
                      />
                    </div>

                    <div>
                      <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700">
                        Fecha de Nacimiento
                      </label>
                      <input
                        type="date"
                        id="date_of_birth"
                        name="date_of_birth"
                        value={formData.date_of_birth}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                        Género
                      </label>
                      <select
                        id="gender"
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="male">Masculino</option>
                        <option value="female">Femenino</option>
                        <option value="other">Otro</option>
                        <option value="prefer_not_to_say">Prefiero no decir</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Información de Dirección
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                        Dirección
                      </label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Calle 123 #45-67"
                      />
                    </div>

                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                        Ciudad
                      </label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Bogotá"
                      />
                    </div>

                    <div>
                      <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                        Departamento
                      </label>
                      <input
                        type="text"
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Cundinamarca"
                      />
                    </div>

                    <div>
                      <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
                        Código Postal
                      </label>
                      <input
                        type="text"
                        id="postal_code"
                        name="postal_code"
                        value={formData.postal_code}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="110111"
                      />
                    </div>

                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                        País
                      </label>
                      <input
                        type="text"
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Note: Action buttons are now in the header */}
              </form>
            ) : (
              /* View Mode */
              <div className="space-y-6">
                {/* Account Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Información de la Cuenta
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Rol</label>
                      <p className="mt-1 text-sm text-gray-900 capitalize">{profile.role}</p>
                    </div>
                    {organization && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Organización</label>
                        <p className="mt-1 text-sm text-gray-900">{organization.name}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Información Personal
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {profile.first_name} {profile.last_name}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                      <p className="mt-1 text-sm text-gray-900">{profile.phone || 'No especificado'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fecha de Nacimiento</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('es-CO') : 'No especificado'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Género</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {profile.gender === 'male' ? 'Masculino' :
                         profile.gender === 'female' ? 'Femenino' :
                         profile.gender === 'other' ? 'Otro' :
                         profile.gender === 'prefer_not_to_say' ? 'Prefiero no decir' :
                         'No especificado'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                {(profile.address || profile.city || profile.state) && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Información de Dirección
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Dirección</label>
                        <p className="mt-1 text-sm text-gray-900">{profile.address || 'No especificado'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Ciudad</label>
                        <p className="mt-1 text-sm text-gray-900">{profile.city || 'No especificado'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Departamento</label>
                        <p className="mt-1 text-sm text-gray-900">{profile.state || 'No especificado'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Código Postal</label>
                        <p className="mt-1 text-sm text-gray-900">{profile.postal_code || 'No especificado'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">País</label>
                        <p className="mt-1 text-sm text-gray-900">{profile.country || 'No especificado'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
