/**
 * WhatsApp RBAC Middleware
 * 
 * Enhanced middleware for role-based access control validation
 * with minimal tenant admin permissions and superadmin-only advanced features.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  getWhatsAppPermissions, 
  getErrorMessage,
  canAccessCrossTenant,
  type WhatsAppUserRole 
} from '@/lib/rbac/whatsapp-permissions';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface AuthenticatedUser {
  id: string;
  role: WhatsAppUserRole;
  organization_id: string;
  first_name?: string;
  last_name?: string;
}

export interface ValidationResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: {
    code: string;
    message: string;
    technicalDetails?: string;
    userFriendlyMessage?: string;
  };
}

export interface PermissionCheckOptions {
  requireSuperadmin?: boolean;
  allowCrossTenant?: boolean;
  targetOrganizationId?: string;
  action?: string;
}

// =====================================================
// CORE MIDDLEWARE FUNCTIONS
// =====================================================

/**
 * Authenticate and validate user for WhatsApp operations
 */
export async function authenticateWhatsAppUser(request: NextRequest): Promise<ValidationResult> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          userFriendlyMessage: 'Por favor, inicia sesión para continuar'
        }
      };
    }

    // Get user profile with role and organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'User profile not found',
          userFriendlyMessage: 'No se pudo cargar tu perfil de usuario'
        }
      };
    }

    // Validate role for WhatsApp access
    if (!['admin', 'superadmin'].includes(profile.role)) {
      return {
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only administrators can access WhatsApp features',
          userFriendlyMessage: 'No tienes permisos para acceder a las funciones de WhatsApp'
        }
      };
    }

    return {
      success: true,
      user: {
        id: user.id,
        role: profile.role as WhatsAppUserRole,
        organization_id: profile.organization_id,
        first_name: profile.first_name,
        last_name: profile.last_name
      }
    };

  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication failed',
        technicalDetails: error instanceof Error ? error.message : 'Unknown error',
        userFriendlyMessage: 'Error al verificar tu identidad. Intenta nuevamente.'
      }
    };
  }
}

/**
 * Validate specific WhatsApp permissions for user
 */
export function validateWhatsAppPermissions(
  user: AuthenticatedUser,
  requiredPermissions: string[],
  options: PermissionCheckOptions = {}
): ValidationResult {
  const permissions = getWhatsAppPermissions(user.role);

  // Check if superadmin is required
  if (options.requireSuperadmin && user.role !== 'superadmin') {
    return {
      success: false,
      error: {
        code: 'SUPERADMIN_REQUIRED',
        message: 'Superadmin access required',
        userFriendlyMessage: 'Esta función requiere permisos de superadministrador'
      }
    };
  }

  // Check cross-tenant access
  if (options.targetOrganizationId && !canAccessCrossTenant(
    user.role,
    user.organization_id,
    options.targetOrganizationId
  )) {
    return {
      success: false,
      error: {
        code: 'CROSS_TENANT_ACCESS_DENIED',
        message: 'Cross-tenant access denied',
        userFriendlyMessage: 'No tienes permisos para acceder a recursos de otras organizaciones'
      }
    };
  }

  // Check specific permissions
  for (const permission of requiredPermissions) {
    if (!permissions[permission as keyof typeof permissions]) {
      const technicalMessage = `Permission denied: ${permission}`;
      const userFriendlyMessage = getUserFriendlyPermissionMessage(permission, user.role);
      
      return {
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: technicalMessage,
          technicalDetails: `User role '${user.role}' lacks permission '${permission}'`,
          userFriendlyMessage
        }
      };
    }
  }

  return { success: true };
}

/**
 * Middleware for tenant admin minimal permissions
 */
export async function validateTenantAdminMinimalAccess(
  request: NextRequest,
  allowedActions: string[] = ['canConnectInstance', 'canDisconnectInstance', 'canDeleteInstance']
): Promise<ValidationResult> {
  // Authenticate user
  const authResult = await authenticateWhatsAppUser(request);
  if (!authResult.success || !authResult.user) {
    return authResult;
  }

  const user = authResult.user;

  // For tenant admin, only allow minimal actions
  if (user.role === 'admin') {
    const permissionResult = validateWhatsAppPermissions(user, allowedActions);
    if (!permissionResult.success) {
      return permissionResult;
    }
  }

  // Superadmin has full access
  return { success: true, user };
}

/**
 * Middleware for superadmin-only advanced features
 */
export async function validateSuperadminAdvancedAccess(
  request: NextRequest,
  requiredPermissions: string[] = []
): Promise<ValidationResult> {
  // Authenticate user
  const authResult = await authenticateWhatsAppUser(request);
  if (!authResult.success || !authResult.user) {
    return authResult;
  }

  const user = authResult.user;

  // Require superadmin role
  if (user.role !== 'superadmin') {
    return {
      success: false,
      error: {
        code: 'SUPERADMIN_REQUIRED',
        message: 'Advanced features require superadmin access',
        userFriendlyMessage: 'Esta función avanzada requiere permisos de superadministrador'
      }
    };
  }

  // Validate specific advanced permissions
  if (requiredPermissions.length > 0) {
    const permissionResult = validateWhatsAppPermissions(user, requiredPermissions);
    if (!permissionResult.success) {
      return permissionResult;
    }
  }

  return { success: true, user };
}

/**
 * Create standardized error response
 */
export function createPermissionErrorResponse(
  validationResult: ValidationResult,
  userRole?: WhatsAppUserRole
): NextResponse {
  if (!validationResult.error) {
    return NextResponse.json({
      success: false,
      error: { code: 'UNKNOWN_ERROR', message: 'Unknown permission error' }
    }, { status: 500 });
  }

  const error = validationResult.error;
  const statusCode = getStatusCodeForError(error.code);
  
  // Use role-appropriate error message
  const message = userRole 
    ? getErrorMessage(userRole, error.message, error.userFriendlyMessage || error.message)
    : error.message;

  const responseBody: any = {
    success: false,
    error: {
      code: error.code,
      message
    }
  };

  // Include technical details only for superadmin
  if (userRole === 'superadmin' && error.technicalDetails) {
    responseBody.error.technicalDetails = error.technicalDetails;
  }

  return NextResponse.json(responseBody, { status: statusCode });
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get user-friendly permission error messages
 */
function getUserFriendlyPermissionMessage(permission: string, role: WhatsAppUserRole): string {
  const messages: Record<string, string> = {
    canCreateInstance: role === 'admin' ? 'Ya tienes una instancia de WhatsApp. Solo se permite una por organización.' : 'La creación de instancias está restringida a administradores',
    canViewAdvancedConfig: 'La configuración avanzada no está disponible para tu rol',
    canEditAdvancedConfig: 'No puedes modificar la configuración avanzada',
    canViewEvolutionApiConfig: 'La configuración de Evolution API está restringida',
    canEditEvolutionApiConfig: 'No puedes modificar la configuración de Evolution API',
    canAccessEvolutionApiDirectly: 'El acceso directo a Evolution API está bloqueado',
    canViewAIBotConfig: 'La configuración del bot de IA está restringida',
    canEditAIBotConfig: 'No puedes modificar la configuración del bot de IA',
    canManageAIBotSettings: 'La gestión del bot de IA requiere permisos especiales',
    canViewWebhookConfig: 'La configuración de webhooks está restringida',
    canEditWebhookConfig: 'No puedes modificar la configuración de webhooks',
    canManageWebhookEvents: 'La gestión de eventos webhook está restringida',
    canViewCrossTenantInstances: 'No puedes ver instancias de otras organizaciones',
    canManageCrossTenantInstances: 'No puedes gestionar instancias de otras organizaciones',
    canAccessGlobalDashboard: 'El panel global está restringido a superadministradores',
    canViewTechnicalLogs: 'Los logs técnicos están restringidos',
    canAccessDebugMode: 'El modo de depuración está restringido',
    canViewSystemMetrics: 'Las métricas del sistema están restringidas',
    canExportInstanceData: 'La exportación de datos está restringida'
  };

  return messages[permission] || 'No tienes permisos para realizar esta acción';
}

/**
 * Get appropriate HTTP status code for error type
 */
function getStatusCodeForError(errorCode: string): number {
  const statusCodes: Record<string, number> = {
    'UNAUTHORIZED': 401,
    'PROFILE_NOT_FOUND': 404,
    'INSUFFICIENT_PERMISSIONS': 403,
    'SUPERADMIN_REQUIRED': 403,
    'CROSS_TENANT_ACCESS_DENIED': 403,
    'PERMISSION_DENIED': 403,
    'AUTHENTICATION_ERROR': 500
  };

  return statusCodes[errorCode] || 500;
}

/**
 * Extract organization ID from request (for cross-tenant validation)
 */
export function extractTargetOrganizationId(request: NextRequest): string | null {
  const url = new URL(request.url);
  
  // Check query parameters
  const orgIdFromQuery = url.searchParams.get('organizationId') || 
                        url.searchParams.get('organization_id');
  
  if (orgIdFromQuery) {
    return orgIdFromQuery;
  }

  // Check request body for POST/PUT requests
  if (request.method === 'POST' || request.method === 'PUT') {
    // This would need to be called after parsing the body
    // Implementation depends on specific endpoint structure
  }

  return null;
}

export default {
  authenticateWhatsAppUser,
  validateWhatsAppPermissions,
  validateTenantAdminMinimalAccess,
  validateSuperadminAdvancedAccess,
  createPermissionErrorResponse,
  extractTargetOrganizationId
};
