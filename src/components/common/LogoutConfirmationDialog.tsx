'use client';

/**
 * Enhanced Logout Confirmation Dialog
 * Universal component for confirming logout across all user roles
 * Provides better UX with session information and confirmation options
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import {
  LogOut,
  AlertTriangle,
  Clock,
  User,
  Building2,
  X,
  CheckCircle,
  Shield
} from 'lucide-react';

interface LogoutConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export default function LogoutConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar Cierre de Sesión',
  message
}: LogoutConfirmationDialogProps) {
  const { profile } = useAuth();
  const { organization } = useTenant();
  const [sessionDuration, setSessionDuration] = useState<string>('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (isOpen && profile) {
      // Calculate session duration
      const loginTime = localStorage.getItem('login_time');
      if (loginTime) {
        const loginDate = new Date(loginTime);
        const now = new Date();
        const diffMs = now.getTime() - loginDate.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (diffHours > 0) {
          setSessionDuration(`${diffHours}h ${diffMinutes}m`);
        } else {
          setSessionDuration(`${diffMinutes}m`);
        }
      } else {
        setSessionDuration('Desconocida');
      }
    }
  }, [isOpen, profile]);

  const handleConfirm = async () => {
    setIsLoggingOut(true);
    try {
      // Clear session data
      localStorage.removeItem('login_time');
      localStorage.removeItem('last_activity');
      
      // Call the logout function
      await onConfirm();
    } catch (error) {
      console.error('Error during logout:', error);
      setIsLoggingOut(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'Super Administrador';
      case 'admin':
        return 'Administrador';
      case 'doctor':
        return 'Doctor';
      case 'staff':
        return 'Personal';
      case 'patient':
        return 'Paciente';
      default:
        return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <Shield className="h-4 w-4 text-purple-600" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-600" />;
      case 'doctor':
        return <User className="h-4 w-4 text-green-600" />;
      case 'staff':
        return <User className="h-4 w-4 text-orange-600" />;
      case 'patient':
        return <User className="h-4 w-4 text-gray-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                <LogOut className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">{title}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoggingOut}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              title="Cancelar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Warning Message */}
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">
                  ¿Estás seguro de que quieres cerrar sesión?
                </h4>
                <p className="text-sm text-yellow-700 mt-1">
                  {message || 'Se cerrará tu sesión actual y tendrás que volver a iniciar sesión para acceder al sistema.'}
                </p>
              </div>
            </div>
          </div>

          {/* Session Information */}
          {profile && (
            <div className="mb-6 bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Información de la Sesión</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  {getRoleIcon(profile.role)}
                  <span className="ml-2 text-gray-700">
                    <span className="font-medium">Usuario:</span> {profile.first_name} {profile.last_name}
                  </span>
                </div>
                <div className="flex items-center">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="ml-2 text-gray-700">
                    <span className="font-medium">Rol:</span> {getRoleDisplayName(profile.role)}
                  </span>
                </div>
                {organization && (
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="ml-2 text-gray-700">
                      <span className="font-medium">Organización:</span> {organization.name}
                    </span>
                  </div>
                )}
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="ml-2 text-gray-700">
                    <span className="font-medium">Duración de sesión:</span> {sessionDuration}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Security Tips */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-blue-400" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">Consejos de Seguridad</h4>
                <ul className="text-sm text-blue-700 mt-1 list-disc list-inside space-y-1">
                  <li>Siempre cierra sesión en computadoras compartidas</li>
                  <li>No dejes tu sesión abierta sin supervisión</li>
                  <li>Usa contraseñas seguras y únicas</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoggingOut}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoggingOut}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 flex items-center"
            >
              {isLoggingOut ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Cerrando sesión...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar Sesión
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
