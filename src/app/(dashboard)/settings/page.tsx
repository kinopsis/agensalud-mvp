'use client';

/**
 * Settings Page
 * Role-specific configuration options for all user types
 * Provides personalized settings based on user role and permissions
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Globe,
  Palette,
  Clock,
  Mail,
  Phone,
  Save,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Building2,
  Calendar,
  Stethoscope
} from 'lucide-react';

interface UserSettings {
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    appointment_reminders: boolean;
    system_updates: boolean;
  };
  preferences: {
    language: string;
    timezone: string;
    theme: string;
    date_format: string;
    time_format: string;
  };
  privacy: {
    profile_visibility: string;
    data_sharing: boolean;
    analytics: boolean;
  };
  professional?: {
    specialization?: string;
    license_number?: string;
    consultation_duration?: number;
    availability_buffer?: number;
  };
}

export default function SettingsPage() {
  const { profile, updateProfile } = useAuth();
  const { organization } = useTenant();
  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      email: true,
      sms: false,
      push: true,
      appointment_reminders: true,
      system_updates: false
    },
    preferences: {
      language: 'es',
      timezone: 'America/Bogota',
      theme: 'light',
      date_format: 'DD/MM/YYYY',
      time_format: '24h'
    },
    privacy: {
      profile_visibility: 'organization',
      data_sharing: false,
      analytics: true
    }
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  useEffect(() => {
    fetchSettings();
  }, [profile?.id]);

  const fetchSettings = async () => {
    if (!profile?.id) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${profile.id}/settings`);
      if (response.ok) {
        const result = await response.json();
        setSettings({ ...settings, ...result.data });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/users/${profile?.id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setSuccess('Configuración guardada exitosamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Error al guardar la configuración. Por favor intenta de nuevo.');
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.new !== passwordData.confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.current,
          newPassword: passwordData.new
        })
      });

      if (!response.ok) {
        throw new Error('Failed to change password');
      }

      setSuccess('Contraseña cambiada exitosamente');
      setPasswordData({ current: '', new: '', confirm: '' });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Error al cambiar la contraseña. Verifica tu contraseña actual.');
      console.error('Error changing password:', err);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Perfil', icon: User },
    { id: 'notifications', name: 'Notificaciones', icon: Bell },
    { id: 'preferences', name: 'Preferencias', icon: Settings },
    { id: 'privacy', name: 'Privacidad', icon: Shield },
    ...(profile?.role === 'doctor' ? [{ id: 'professional', name: 'Profesional', icon: Stethoscope }] : []),
    ...(profile?.role === 'admin' || profile?.role === 'superadmin' ? [{ id: 'organization', name: 'Organización', icon: Building2 }] : [])
  ];

  const actions = (
    <button
      type="button"
      onClick={handleSaveSettings}
      disabled={saving}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
    >
      <Save className="h-4 w-4 mr-2" />
      {saving ? 'Guardando...' : 'Guardar Cambios'}
    </button>
  );

  return (
    <DashboardLayout
      title="Configuración"
      subtitle={`${profile?.first_name} ${profile?.last_name} • ${organization?.name}`}
      actions={actions}
    >
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
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
        <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Éxito</h3>
              <p className="text-sm text-green-700 mt-1">{success}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Información Personal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                    <input
                      type="text"
                      value={profile?.first_name || ''}
                      onChange={(e) => updateProfile({ first_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Apellido</label>
                    <input
                      type="text"
                      value={profile?.last_name || ''}
                      onChange={(e) => updateProfile({ last_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">El email no se puede cambiar</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                    <input
                      type="tel"
                      value={profile?.phone || ''}
                      onChange={(e) => updateProfile({ phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Cambiar Contraseña</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña Actual</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.current}
                        onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nueva Contraseña</label>
                    <input
                      type="password"
                      value={passwordData.new}
                      onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar Contraseña</label>
                    <input
                      type="password"
                      value={passwordData.confirm}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlePasswordChange}
                  disabled={!passwordData.current || !passwordData.new || !passwordData.confirm || saving}
                  className="mt-4 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Cambiar Contraseña
                </button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Preferencias de Notificación</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Notificaciones por Email</p>
                        <p className="text-sm text-gray-500">Recibir notificaciones importantes por correo</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.email}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, email: e.target.checked }
                      })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Phone className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Notificaciones SMS</p>
                        <p className="text-sm text-gray-500">Recibir recordatorios por mensaje de texto</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.sms}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, sms: e.target.checked }
                      })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Recordatorios de Citas</p>
                        <p className="text-sm text-gray-500">Recordatorios automáticos de próximas citas</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.appointment_reminders}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, appointment_reminders: e.target.checked }
                      })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Preferencias de la Aplicación</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Idioma</label>
                    <select
                      value={settings.preferences.language}
                      onChange={(e) => setSettings({
                        ...settings,
                        preferences: { ...settings.preferences, language: e.target.value }
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="es">Español</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Zona Horaria</label>
                    <select
                      value={settings.preferences.timezone}
                      onChange={(e) => setSettings({
                        ...settings,
                        preferences: { ...settings.preferences, timezone: e.target.value }
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="America/Bogota">Bogotá (GMT-5)</option>
                      <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                      <option value="America/Lima">Lima (GMT-5)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tema</label>
                    <select
                      value={settings.preferences.theme}
                      onChange={(e) => setSettings({
                        ...settings,
                        preferences: { ...settings.preferences, theme: e.target.value }
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="light">Claro</option>
                      <option value="dark">Oscuro</option>
                      <option value="auto">Automático</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Formato de Hora</label>
                    <select
                      value={settings.preferences.time_format}
                      onChange={(e) => setSettings({
                        ...settings,
                        preferences: { ...settings.preferences, time_format: e.target.value }
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="24h">24 horas</option>
                      <option value="12h">12 horas (AM/PM)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración de Privacidad</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Visibilidad del Perfil</label>
                    <select
                      value={settings.privacy.profile_visibility}
                      onChange={(e) => setSettings({
                        ...settings,
                        privacy: { ...settings.privacy, profile_visibility: e.target.value }
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="public">Público</option>
                      <option value="organization">Solo mi organización</option>
                      <option value="private">Privado</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Compartir datos para mejoras</p>
                      <p className="text-sm text-gray-500">Ayudar a mejorar la aplicación compartiendo datos anónimos</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.privacy.analytics}
                      onChange={(e) => setSettings({
                        ...settings,
                        privacy: { ...settings.privacy, analytics: e.target.checked }
                      })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
