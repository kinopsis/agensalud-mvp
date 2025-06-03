'use client';

/**
 * AppointmentStatusBadge Component
 * 
 * Enhanced status badge with dropdown for status changes and comprehensive validation
 * Integrates with appointment status management API and provides visual feedback
 * 
 * Features:
 * - Visual status display with appropriate colors and icons
 * - Role-based status change dropdown
 * - API integration for status transitions
 * - Loading states and error handling
 * - Tooltips for status information
 * - WCAG 2.1 accessibility compliance
 * - Responsive design
 * 
 * @version 1.0.0 - MVP Implementation
 * @date 2025-01-28
 */

import React, { useState, useEffect } from 'react';
import { 
  Clock, CheckCircle, XCircle, Calendar, 
  DollarSign, AlertTriangle, Play, Users,
  ChevronDown, Loader2, Info
} from 'lucide-react';
import { 
  AppointmentStatus, 
  UserRole, 
  getStatusConfig, 
  getAvailableTransitions,
  STATUS_CONFIGS 
} from '@/types/appointment-states';

export interface AppointmentStatusBadgeProps {
  appointmentId: string;
  status: string;
  userRole: UserRole;
  canChangeStatus?: boolean;
  onStatusChange?: (newStatus: string, reason?: string) => void;
  className?: string;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

interface StatusChangeState {
  isLoading: boolean;
  error: string | null;
  availableTransitions: AppointmentStatus[];
  isDropdownOpen: boolean;
}

/**
 * Map legacy status values to new AppointmentStatus enum
 */
const mapLegacyStatus = (status: string): AppointmentStatus => {
  switch (status) {
    case 'scheduled':
      return AppointmentStatus.CONFIRMED;
    case 'no_show':
      return AppointmentStatus.NO_SHOW;
    case 'no-show':
      return AppointmentStatus.NO_SHOW;
    default:
      return status as AppointmentStatus;
  }
};

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
 * AppointmentStatusBadge Component
 */
export default function AppointmentStatusBadge({
  appointmentId,
  status,
  userRole,
  canChangeStatus = false,
  onStatusChange,
  className = '',
  showTooltip = true,
  size = 'md',
  disabled = false
}: AppointmentStatusBadgeProps) {
  const [state, setState] = useState<StatusChangeState>({
    isLoading: false,
    error: null,
    availableTransitions: [],
    isDropdownOpen: false
  });

  const [selectedReason, setSelectedReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState(false);

  // Map legacy status to new enum
  const mappedStatus = mapLegacyStatus(status);
  const statusConfig = STATUS_CONFIGS[mappedStatus] || STATUS_CONFIGS[AppointmentStatus.PENDING];
  const IconComponent = getIconComponent(statusConfig.icon);

  // Size configurations
  const sizeConfig = {
    sm: {
      badge: 'px-2 py-1 text-xs',
      icon: 'h-3 w-3',
      dropdown: 'text-xs',
      button: 'px-2 py-1'
    },
    md: {
      badge: 'px-3 py-1 text-sm',
      icon: 'h-4 w-4',
      dropdown: 'text-sm',
      button: 'px-3 py-2'
    },
    lg: {
      badge: 'px-4 py-2 text-base',
      icon: 'h-5 w-5',
      dropdown: 'text-base',
      button: 'px-4 py-2'
    }
  };

  const currentSize = sizeConfig[size];

  /**
   * Fetch available transitions when component mounts or when status changes
   */
  useEffect(() => {
    if (canChangeStatus && !disabled) {
      fetchAvailableTransitions();
    }
  }, [appointmentId, status, userRole, canChangeStatus, disabled]);

  /**
   * Fetch available status transitions from API
   */
  const fetchAvailableTransitions = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(`/api/appointments/${appointmentId}/status`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch available transitions');
      }

      const data = await response.json();
      
      if (data.success) {
        setState(prev => ({
          ...prev,
          availableTransitions: data.data.availableTransitions || [],
          isLoading: false
        }));
      } else {
        throw new Error(data.error || 'Failed to fetch transitions');
      }
    } catch (error) {
      console.error('Error fetching available transitions:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      }));
    }
  };

  /**
   * Handle status change
   */
  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    if (disabled || state.isLoading) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Check if reason is required for certain transitions
      const requiresReason = ['cancelada_paciente', 'cancelada_clinica', 'no_show'].includes(newStatus);
      
      if (requiresReason && !selectedReason.trim()) {
        setShowReasonInput(true);
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const response = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          reason: selectedReason.trim() || undefined,
          metadata: {
            source: 'status_badge',
            userRole,
            previousStatus: mappedStatus
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change status');
      }

      const data = await response.json();
      
      if (data.success) {
        // Call parent callback
        onStatusChange?.(newStatus, selectedReason.trim() || undefined);
        
        // Reset state
        setSelectedReason('');
        setShowReasonInput(false);
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          isDropdownOpen: false 
        }));
        
        // Refresh available transitions
        await fetchAvailableTransitions();
      } else {
        throw new Error(data.error || 'Status change failed');
      }
    } catch (error) {
      console.error('Error changing status:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      }));
    }
  };

  /**
   * Handle reason submission
   */
  const handleReasonSubmit = () => {
    if (selectedReason.trim()) {
      setShowReasonInput(false);
      // The status change will be handled by the pending transition
    }
  };

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-status-dropdown]')) {
        setState(prev => ({ ...prev, isDropdownOpen: false }));
        setShowReasonInput(false);
      }
    };

    if (state.isDropdownOpen || showReasonInput) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [state.isDropdownOpen, showReasonInput]);

  return (
    <div className={`relative inline-flex items-center ${className}`} data-status-dropdown>
      {/* Status Badge */}
      <div className={`
        inline-flex items-center gap-1 rounded-full font-medium border
        ${statusConfig.color}
        ${currentSize.badge}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}>
        {state.isLoading ? (
          <Loader2 className={`${currentSize.icon} animate-spin`} />
        ) : (
          <IconComponent className={currentSize.icon} />
        )}
        <span>{statusConfig.label}</span>
        
        {/* Tooltip */}
        {showTooltip && (
          <div className="group relative">
            <Info className="h-3 w-3 text-current opacity-60 hover:opacity-100 cursor-help" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {statusConfig.description}
            </div>
          </div>
        )}
        
        {/* Dropdown Arrow */}
        {canChangeStatus && !disabled && state.availableTransitions.length > 0 && (
          <button
            onClick={() => setState(prev => ({ ...prev, isDropdownOpen: !prev.isDropdownOpen }))}
            className="ml-1 hover:bg-black hover:bg-opacity-10 rounded p-0.5 transition-colors"
            aria-label="Cambiar estado"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${state.isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Dropdown Menu */}
      {canChangeStatus && !disabled && state.isDropdownOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[200px]">
          <div className="py-1">
            {state.availableTransitions.length > 0 ? (
              state.availableTransitions.map((transition) => {
                const transitionConfig = STATUS_CONFIGS[transition];
                const TransitionIcon = getIconComponent(transitionConfig.icon);
                
                return (
                  <button
                    key={transition}
                    onClick={() => handleStatusChange(transition)}
                    className={`
                      w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2
                      ${currentSize.dropdown}
                    `}
                    disabled={state.isLoading}
                  >
                    <TransitionIcon className="h-4 w-4" />
                    <span>{transitionConfig.label}</span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-gray-500 text-sm">
                No hay transiciones disponibles
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reason Input Modal */}
      {showReasonInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Motivo del cambio</h3>
            <textarea
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              placeholder="Ingrese el motivo del cambio de estado..."
              className="w-full p-3 border border-gray-300 rounded-md resize-none h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowReasonInput(false);
                  setSelectedReason('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReasonSubmit}
                disabled={!selectedReason.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="absolute top-full left-0 mt-1 bg-red-50 border border-red-200 rounded-md p-2 text-red-700 text-sm z-50 max-w-xs">
          {state.error}
          <button
            onClick={() => setState(prev => ({ ...prev, error: null }))}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
