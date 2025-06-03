'use client';

/**
 * StatusChangeDropdown Component
 * 
 * Specialized dropdown component for appointment status changes
 * Provides enhanced UX with status previews, validation, and confirmation
 * 
 * Features:
 * - Visual status previews with colors and icons
 * - Validation of transitions before display
 * - Confirmation dialogs for critical changes
 * - Keyboard navigation support
 * - Loading states and error handling
 * - Accessibility compliance
 * 
 * @version 1.0.0 - MVP Implementation
 * @date 2025-01-28
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Clock, CheckCircle, XCircle, Calendar, 
  DollarSign, AlertTriangle, Play, Users,
  ChevronDown, Loader2, Check, X
} from 'lucide-react';
import { 
  AppointmentStatus, 
  UserRole, 
  STATUS_CONFIGS,
  getAvailableTransitions 
} from '@/types/appointment-states';

export interface StatusChangeDropdownProps {
  appointmentId: string;
  currentStatus: AppointmentStatus;
  userRole: UserRole;
  availableTransitions: AppointmentStatus[];
  onStatusChange: (newStatus: AppointmentStatus, reason?: string) => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface DropdownState {
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  selectedStatus: AppointmentStatus | null;
  showConfirmation: boolean;
  reason: string;
}

/**
 * Get icon component from icon name string
 */
const getIconComponent = (iconName: string) => {
  const iconMap = {
    Clock,
    CheckCircle,
    XCircle,
    Calendar,
    DollarSign,
    AlertTriangle,
    Play,
    Users
  };
  return iconMap[iconName as keyof typeof iconMap] || Clock;
};

/**
 * Check if status change requires confirmation
 */
const requiresConfirmation = (status: AppointmentStatus): boolean => {
  return [
    AppointmentStatus.CANCELADA_PACIENTE,
    AppointmentStatus.CANCELADA_CLINICA,
    AppointmentStatus.NO_SHOW,
    AppointmentStatus.COMPLETED
  ].includes(status);
};

/**
 * StatusChangeDropdown Component
 */
function StatusChangeDropdown({
  appointmentId,
  currentStatus,
  userRole,
  availableTransitions,
  onStatusChange,
  disabled = false,
  size = 'md',
  className = ''
}: StatusChangeDropdownProps) {
  const [state, setState] = useState<DropdownState>({
    isOpen: false,
    isLoading: false,
    error: null,
    selectedStatus: null,
    showConfirmation: false,
    reason: ''
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Size configurations
  const sizeConfig = {
    sm: {
      button: 'px-2 py-1 text-xs',
      dropdown: 'text-xs',
      icon: 'h-3 w-3'
    },
    md: {
      button: 'px-3 py-2 text-sm',
      dropdown: 'text-sm',
      icon: 'h-4 w-4'
    },
    lg: {
      button: 'px-4 py-2 text-base',
      dropdown: 'text-base',
      icon: 'h-5 w-5'
    }
  };

  const currentSize = sizeConfig[size];

  /**
   * Handle status selection
   */
  const handleStatusSelect = (newStatus: AppointmentStatus) => {
    if (disabled || state.isLoading) return;

    setState(prev => ({ ...prev, selectedStatus: newStatus }));

    if (requiresConfirmation(newStatus)) {
      setState(prev => ({ 
        ...prev, 
        showConfirmation: true,
        isOpen: false 
      }));
    } else {
      handleStatusChange(newStatus);
    }
  };

  /**
   * Handle confirmed status change
   */
  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    try {
      setState(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: null,
        isOpen: false 
      }));

      await onStatusChange(newStatus, state.reason.trim() || undefined);

      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        selectedStatus: null,
        showConfirmation: false,
        reason: ''
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error changing status'
      }));
    }
  };

  /**
   * Handle confirmation dialog
   */
  const handleConfirm = () => {
    if (state.selectedStatus) {
      handleStatusChange(state.selectedStatus);
    }
  };

  /**
   * Handle cancel confirmation
   */
  const handleCancelConfirmation = () => {
    setState(prev => ({
      ...prev,
      showConfirmation: false,
      selectedStatus: null,
      reason: ''
    }));
  };

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setState(prev => ({ ...prev, isOpen: false }));
      }
    };

    if (state.isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [state.isOpen]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setState(prev => ({ ...prev, isOpen: false }));
    }
  };

  // Don't render if no transitions available
  if (availableTransitions.length === 0) {
    return null;
  }

  return (
    <>
      <div 
        ref={dropdownRef}
        className={`relative inline-block ${className}`}
        onKeyDown={handleKeyDown}
      >
        {/* Dropdown Button */}
        <button
          ref={buttonRef}
          onClick={() => setState(prev => ({ ...prev, isOpen: !prev.isOpen }))}
          disabled={disabled || state.isLoading}
          className={`
            inline-flex items-center gap-2 border border-gray-300 rounded-md bg-white
            hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors
            ${currentSize.button}
          `}
          aria-label="Cambiar estado de la cita"
          aria-expanded={state.isOpen}
          aria-haspopup="listbox"
        >
          {state.isLoading ? (
            <Loader2 className={`${currentSize.icon} animate-spin`} />
          ) : (
            <>
              <span>Cambiar Estado</span>
              <ChevronDown className={`${currentSize.icon} transition-transform ${state.isOpen ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>

        {/* Dropdown Menu */}
        {state.isOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[220px]">
            <div className="py-1" role="listbox">
              {availableTransitions.map((transition) => {
                const config = STATUS_CONFIGS[transition];
                const IconComponent = getIconComponent(config.icon);
                
                return (
                  <button
                    key={transition}
                    onClick={() => handleStatusSelect(transition)}
                    className={`
                      w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-3
                      focus:bg-gray-50 focus:outline-none transition-colors
                      ${currentSize.dropdown}
                    `}
                    role="option"
                    aria-selected={false}
                  >
                    <div className={`
                      flex items-center justify-center w-6 h-6 rounded-full
                      ${config.color.replace('border-', 'bg-').replace('text-', 'text-').replace('bg-', 'bg-opacity-20 bg-')}
                    `}>
                      <IconComponent className="h-3 w-3" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{config.label}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {config.description}
                      </div>
                    </div>
                    {requiresConfirmation(transition) && (
                      <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        Requiere confirmación
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Error Display */}
        {state.error && (
          <div className="absolute top-full left-0 mt-1 bg-red-50 border border-red-200 rounded-md p-3 text-red-700 text-sm z-50 max-w-xs">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium">Error</div>
                <div>{state.error}</div>
              </div>
              <button
                onClick={() => setState(prev => ({ ...prev, error: null }))}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {state.showConfirmation && state.selectedStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              {(() => {
                const config = STATUS_CONFIGS[state.selectedStatus];
                const IconComponent = getIconComponent(config.icon);
                return (
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full
                    ${config.color.replace('border-', 'bg-').replace('text-', 'text-').replace('bg-', 'bg-opacity-20 bg-')}
                  `}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                );
              })()}
              <div>
                <h3 className="text-lg font-semibold">Confirmar cambio de estado</h3>
                <p className="text-gray-600">
                  ¿Cambiar estado a "{STATUS_CONFIGS[state.selectedStatus].label}"?
                </p>
              </div>
            </div>

            {/* Reason Input */}
            <div className="mb-4">
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                Motivo del cambio (opcional)
              </label>
              <textarea
                id="reason"
                value={state.reason}
                onChange={(e) => setState(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Ingrese el motivo del cambio..."
                className="w-full p-3 border border-gray-300 rounded-md resize-none h-20 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelConfirmation}
                disabled={state.isLoading}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={state.isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {state.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default StatusChangeDropdown;
