/**
 * Quick Create WhatsApp Button Component
 * 
 * Single-click WhatsApp instance creation with auto-naming and immediate navigation
 * to connection view. Part of the WhatsApp Radical Solution implementation.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Loader2, Plus, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface QuickCreateWhatsAppButtonProps {
  /** Additional CSS classes */
  className?: string;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'outline';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Show icon */
  showIcon?: boolean;
  /** Custom button text */
  buttonText?: string;
  /** Callback when instance is created successfully */
  onSuccess?: (instanceId: string, connectUrl: string) => void;
  /** Callback when creation fails */
  onError?: (error: string) => void;
  /** Disabled state */
  disabled?: boolean;
}

interface QuickCreateResponse {
  instanceId: string;
  instanceName: string;
  connectUrl: string;
  status: 'disconnected';
}

// =====================================================
// COMPONENT
// =====================================================

/**
 * QuickCreateWhatsAppButton - Single-click WhatsApp instance creation
 * 
 * @description Creates WhatsApp instances with auto-naming and immediate navigation
 * to connection view. Implements the radical solution UX pattern.
 */
export const QuickCreateWhatsAppButton: React.FC<QuickCreateWhatsAppButtonProps> = ({
  className = '',
  variant = 'primary',
  size = 'md',
  showIcon = true,
  buttonText = 'Crear Instancia WhatsApp',
  onSuccess,
  onError,
  disabled = false
}) => {
  // =====================================================
  // HOOKS AND CONTEXT
  // =====================================================

  const router = useRouter();
  const { profile } = useAuth();
  const { organization } = useTenant();
  
  // =====================================================
  // STATE MANAGEMENT
  // =====================================================

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================

  /**
   * Generate auto-naming pattern for instance
   */
  const generateInstanceName = (): string => {
    const timestamp = Date.now();
    const orgName = organization?.name || 'org';
    
    // Clean organization name for use in instance name
    const cleanOrgName = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20); // Limit length
    
    return `${cleanOrgName}-whatsapp-${timestamp}`;
  };

  /**
   * Validate prerequisites for instance creation
   */
  const validatePrerequisites = (): { valid: boolean; error?: string } => {
    if (!profile) {
      return { valid: false, error: 'Usuario no autenticado' };
    }

    if (!organization) {
      return { valid: false, error: 'Organización no encontrada' };
    }

    // Check user permissions (tenant admin or superadmin)
    const hasPermission = profile.role === 'admin' || profile.role === 'superadmin';
    if (!hasPermission) {
      return { valid: false, error: 'Permisos insuficientes para crear instancias' };
    }

    return { valid: true };
  };

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  /**
   * Handle quick create button click
   */
  const handleQuickCreate = async () => {
    // Clear previous errors
    setError(null);

    // Validate prerequisites
    const validation = validatePrerequisites();
    if (!validation.valid) {
      const errorMessage = validation.error || 'Error de validación';
      setError(errorMessage);
      onError?.(errorMessage);
      return;
    }

    setIsCreating(true);

    try {
      console.log('🚀 Starting quick WhatsApp instance creation...');

      // Generate auto-naming
      const instanceName = generateInstanceName();
      console.log(`📝 Generated instance name: ${instanceName}`);

      // Call quick-create API endpoint
      const response = await fetch('/api/channels/whatsapp/instances/quick-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Auto-naming - no user input required
          instanceName,
          organizationId: organization!.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: QuickCreateResponse = await response.json();
      
      console.log('✅ Instance created successfully:', {
        instanceId: result.instanceId,
        instanceName: result.instanceName,
        connectUrl: result.connectUrl
      });

      // Call success callback
      onSuccess?.(result.instanceId, result.connectUrl);

      // Immediate navigation to connect view (no intermediate screens)
      console.log(`🔄 Navigating to connect view: ${result.connectUrl}`);
      router.push(result.connectUrl);

    } catch (error) {
      console.error('❌ Quick create failed:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Error desconocido al crear la instancia';
      
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  // =====================================================
  // STYLE HELPERS
  // =====================================================

  /**
   * Get button CSS classes based on variant and size
   */
  const getButtonClasses = (): string => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    // Size classes
    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    };

    // Variant classes
    const variantClasses = {
      primary: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
      secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
      outline: 'border border-green-600 text-green-600 hover:bg-green-50 focus:ring-green-500'
    };

    return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;
  };

  /**
   * Get icon size based on button size
   */
  const getIconSize = (): string => {
    const iconSizes = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6'
    };
    return iconSizes[size];
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-2">
      {/* Quick Create Button */}
      <button
        type="button"
        onClick={handleQuickCreate}
        disabled={disabled || isCreating}
        className={getButtonClasses()}
        title="Crear instancia WhatsApp con un solo clic"
      >
        {/* Loading State */}
        {isCreating ? (
          <>
            <Loader2 className={`${getIconSize()} mr-2 animate-spin`} />
            Creando...
          </>
        ) : (
          <>
            {/* Icon */}
            {showIcon && (
              <div className="flex items-center mr-2">
                <MessageSquare className={getIconSize()} />
                <Zap className="h-3 w-3 -ml-1 text-yellow-400" />
              </div>
            )}
            {buttonText}
          </>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-2">
              {error}
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      {!isCreating && !error && (
        <p className="text-xs text-gray-500">
          ⚡ Creación instantánea con auto-configuración
        </p>
      )}
    </div>
  );
};

export default QuickCreateWhatsAppButton;
