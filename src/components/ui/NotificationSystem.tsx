'use client';

/**
 * NotificationSystem Component
 * Global notification system for the application
 * Provides toast notifications and alerts
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      id,
      duration: 5000,
      ...notification,
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification after duration (unless persistent)
    if (!newNotification.persistent && newNotification.duration) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearAll
    }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      className="
        fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full
        sm:max-w-md md:max-w-lg lg:max-w-sm
        px-4 sm:px-0
      "
      role="region"
      aria-label="Notificaciones del sistema"
      aria-live="polite"
      aria-atomic="false"
    >
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 150); // Wait for animation
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClose();
    }
  };

  const getIcon = () => {
    const iconProps = { className: "h-5 w-5", "aria-hidden": true };

    switch (notification.type) {
      case 'success':
        return <CheckCircle {...iconProps} className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle {...iconProps} className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle {...iconProps} className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <Info {...iconProps} className="h-5 w-5 text-blue-600" />;
      default:
        return <Info {...iconProps} className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div
      className={`
        ${getStyles()}
        border rounded-lg shadow-lg p-4 animate-slide-in-up
        transform transition-all duration-300 ease-out
        focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      role="alert"
      aria-labelledby={`notification-title-${notification.id}`}
      aria-describedby={notification.message ? `notification-message-${notification.id}` : undefined}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1 min-w-0">
          <h4
            id={`notification-title-${notification.id}`}
            className="text-sm font-medium break-words"
          >
            {notification.title}
          </h4>
          {notification.message && (
            <p
              id={`notification-message-${notification.id}`}
              className="text-sm opacity-90 mt-1 break-words"
            >
              {notification.message}
            </p>
          )}
          {notification.action && (
            <div className="mt-2">
              <button
                type="button"
                onClick={notification.action.onClick}
                className="
                  text-sm font-medium underline hover:no-underline
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                  transition-all duration-200
                "
              >
                {notification.action.label}
              </button>
            </div>
          )}
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="
              inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2
              focus:ring-offset-2 focus:ring-blue-500 hover:bg-black hover:bg-opacity-10
              transition-colors duration-200
            "
            aria-label={`Cerrar notificación: ${notification.title}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}



// Global notification functions (for use outside React components)
let globalNotificationContext: NotificationContextType | null = null;

export function setGlobalNotificationContext(context: NotificationContextType) {
  globalNotificationContext = context;
}

export function showGlobalNotification(notification: Omit<Notification, 'id'>) {
  if (globalNotificationContext) {
    return globalNotificationContext.addNotification(notification);
  }
  console.warn('Global notification context not available');
  return '';
}

export function showGlobalSuccess(title: string, message?: string) {
  return showGlobalNotification({ type: 'success', title, message });
}

export function showGlobalError(title: string, message?: string) {
  return showGlobalNotification({ type: 'error', title, message, duration: 8000 });
}

export function showGlobalWarning(title: string, message?: string) {
  return showGlobalNotification({ type: 'warning', title, message });
}

export function showGlobalInfo(title: string, message?: string) {
  return showGlobalNotification({ type: 'info', title, message });
}

/**
 * Hook for standardized notification helpers
 * Provides convenient methods for common notification types
 */
export function useNotificationHelpers() {
  const { addNotification } = useNotifications();

  const showSuccess = (title: string, message?: string, action?: Notification['action']) => {
    addNotification({
      type: 'success',
      title,
      message,
      action,
      duration: 4000
    });
  };

  const showError = (title: string, message?: string, persistent = false) => {
    addNotification({
      type: 'error',
      title,
      message,
      persistent,
      duration: persistent ? undefined : 6000
    });
  };

  const showWarning = (title: string, message?: string) => {
    addNotification({
      type: 'warning',
      title,
      message,
      duration: 5000
    });
  };

  const showInfo = (title: string, message?: string) => {
    addNotification({
      type: 'info',
      title,
      message,
      duration: 4000
    });
  };

  const showAppointmentSuccess = (appointmentDate: string, doctorName?: string) => {
    showSuccess(
      'Cita agendada exitosamente',
      `Tu cita ha sido confirmada para ${appointmentDate}${doctorName ? ` con ${doctorName}` : ''}`,
      {
        label: 'Ver cita',
        onClick: () => window.location.href = '/appointments'
      }
    );
  };

  const showAppointmentError = (error: string) => {
    showError(
      'Error al agendar cita',
      error,
      true
    );
  };

  const showNetworkError = () => {
    showError(
      'Error de conexión',
      'No se pudo conectar al servidor. Verifica tu conexión a internet.',
      true
    );
  };

  const showPermissionError = () => {
    showError(
      'Acceso denegado',
      'No tienes permisos para realizar esta acción.'
    );
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showAppointmentSuccess,
    showAppointmentError,
    showNetworkError,
    showPermissionError
  };
}
