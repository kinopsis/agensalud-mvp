/**
 * WhatsApp RBAC Permission System Tests
 * 
 * Comprehensive test suite validating role-based access control
 * for WhatsApp instance management with minimal tenant admin permissions.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { describe, it, expect } from '@jest/globals';
import {
  getWhatsAppPermissions,
  getWhatsAppUIPermissions,
  canPerformWhatsAppAction,
  shouldShowUIElement,
  canAccessCrossTenant,
  getErrorMessage,
  type WhatsAppUserRole
} from '@/lib/rbac/whatsapp-permissions';

// =====================================================
// TENANT ADMIN MINIMAL PERMISSIONS TESTS
// =====================================================

describe('Tenant Admin Minimal Permissions (REQUIREMENT 1)', () => {
  const tenantAdminRole: WhatsAppUserRole = 'admin';

  describe('Basic Instance Management - RESTRICTED', () => {
    it('should allow viewing instances', () => {
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canViewInstances')).toBe(true);
    });

    it('should BLOCK instance creation', () => {
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canCreateInstance')).toBe(false);
    });

    it('should allow connecting/disconnecting instances', () => {
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canConnectInstance')).toBe(true);
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canDisconnectInstance')).toBe(true);
    });

    it('should allow deleting instances (with confirmation)', () => {
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canDeleteInstance')).toBe(true);
    });
  });

  describe('Configuration Access - COMPLETELY BLOCKED', () => {
    it('should BLOCK all configuration access', () => {
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canViewBasicConfig')).toBe(false);
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canEditBasicConfig')).toBe(false);
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canViewAdvancedConfig')).toBe(false);
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canEditAdvancedConfig')).toBe(false);
    });
  });

  describe('Evolution API Access - COMPLETELY BLOCKED', () => {
    it('should BLOCK all Evolution API access', () => {
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canViewEvolutionApiConfig')).toBe(false);
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canEditEvolutionApiConfig')).toBe(false);
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canAccessEvolutionApiDirectly')).toBe(false);
    });
  });

  describe('AI Bot Configuration - COMPLETELY BLOCKED', () => {
    it('should BLOCK all AI bot access', () => {
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canViewAIBotConfig')).toBe(false);
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canEditAIBotConfig')).toBe(false);
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canManageAIBotSettings')).toBe(false);
    });
  });

  describe('Webhook Management - COMPLETELY BLOCKED', () => {
    it('should BLOCK all webhook access', () => {
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canViewWebhookConfig')).toBe(false);
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canEditWebhookConfig')).toBe(false);
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canManageWebhookEvents')).toBe(false);
    });
  });

  describe('Cross-Tenant Access - COMPLETELY BLOCKED', () => {
    it('should BLOCK all cross-tenant access', () => {
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canViewCrossTenantInstances')).toBe(false);
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canManageCrossTenantInstances')).toBe(false);
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canAccessGlobalDashboard')).toBe(false);
    });

    it('should only allow access to own organization', () => {
      expect(canAccessCrossTenant(tenantAdminRole, 'org-1', 'org-1')).toBe(true);
      expect(canAccessCrossTenant(tenantAdminRole, 'org-1', 'org-2')).toBe(false);
    });
  });

  describe('Technical Features - COMPLETELY BLOCKED', () => {
    it('should BLOCK all technical features', () => {
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canViewTechnicalLogs')).toBe(false);
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canAccessDebugMode')).toBe(false);
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canViewSystemMetrics')).toBe(false);
      expect(canPerformWhatsAppAction(tenantAdminRole, 'canExportInstanceData')).toBe(false);
    });
  });
});

// =====================================================
// SUPERADMIN ADVANCED CONFIGURATION TESTS
// =====================================================

describe('Superadmin Advanced Configuration (REQUIREMENT 2)', () => {
  const superadminRole: WhatsAppUserRole = 'superadmin';

  describe('Basic Instance Management - FULL ACCESS', () => {
    it('should allow all basic instance operations', () => {
      expect(canPerformWhatsAppAction(superadminRole, 'canViewInstances')).toBe(true);
      expect(canPerformWhatsAppAction(superadminRole, 'canCreateInstance')).toBe(true);
      expect(canPerformWhatsAppAction(superadminRole, 'canDeleteInstance')).toBe(true);
      expect(canPerformWhatsAppAction(superadminRole, 'canConnectInstance')).toBe(true);
      expect(canPerformWhatsAppAction(superadminRole, 'canDisconnectInstance')).toBe(true);
    });
  });

  describe('Configuration Access - FULL ACCESS', () => {
    it('should allow all configuration operations', () => {
      expect(canPerformWhatsAppAction(superadminRole, 'canViewBasicConfig')).toBe(true);
      expect(canPerformWhatsAppAction(superadminRole, 'canEditBasicConfig')).toBe(true);
      expect(canPerformWhatsAppAction(superadminRole, 'canViewAdvancedConfig')).toBe(true);
      expect(canPerformWhatsAppAction(superadminRole, 'canEditAdvancedConfig')).toBe(true);
    });
  });

  describe('Evolution API Access - FULL ACCESS', () => {
    it('should allow all Evolution API operations', () => {
      expect(canPerformWhatsAppAction(superadminRole, 'canViewEvolutionApiConfig')).toBe(true);
      expect(canPerformWhatsAppAction(superadminRole, 'canEditEvolutionApiConfig')).toBe(true);
      expect(canPerformWhatsAppAction(superadminRole, 'canAccessEvolutionApiDirectly')).toBe(true);
    });
  });

  describe('AI Bot Configuration - FULL ACCESS', () => {
    it('should allow all AI bot operations', () => {
      expect(canPerformWhatsAppAction(superadminRole, 'canViewAIBotConfig')).toBe(true);
      expect(canPerformWhatsAppAction(superadminRole, 'canEditAIBotConfig')).toBe(true);
      expect(canPerformWhatsAppAction(superadminRole, 'canManageAIBotSettings')).toBe(true);
    });
  });

  describe('Webhook Management - FULL ACCESS', () => {
    it('should allow all webhook operations', () => {
      expect(canPerformWhatsAppAction(superadminRole, 'canViewWebhookConfig')).toBe(true);
      expect(canPerformWhatsAppAction(superadminRole, 'canEditWebhookConfig')).toBe(true);
      expect(canPerformWhatsAppAction(superadminRole, 'canManageWebhookEvents')).toBe(true);
    });
  });

  describe('Cross-Tenant Access - FULL ACCESS', () => {
    it('should allow all cross-tenant operations', () => {
      expect(canPerformWhatsAppAction(superadminRole, 'canViewCrossTenantInstances')).toBe(true);
      expect(canPerformWhatsAppAction(superadminRole, 'canManageCrossTenantInstances')).toBe(true);
      expect(canPerformWhatsAppAction(superadminRole, 'canAccessGlobalDashboard')).toBe(true);
    });

    it('should allow access to any organization', () => {
      expect(canAccessCrossTenant(superadminRole, 'org-1', 'org-1')).toBe(true);
      expect(canAccessCrossTenant(superadminRole, 'org-1', 'org-2')).toBe(true);
      expect(canAccessCrossTenant(superadminRole, 'org-1', 'org-3')).toBe(true);
    });
  });

  describe('Technical Features - FULL ACCESS', () => {
    it('should allow all technical features', () => {
      expect(canPerformWhatsAppAction(superadminRole, 'canViewTechnicalLogs')).toBe(true);
      expect(canPerformWhatsAppAction(superadminRole, 'canAccessDebugMode')).toBe(true);
      expect(canPerformWhatsAppAction(superadminRole, 'canViewSystemMetrics')).toBe(true);
      expect(canPerformWhatsAppAction(superadminRole, 'canExportInstanceData')).toBe(true);
    });
  });
});

// =====================================================
// UI PERMISSION TESTS
// =====================================================

describe('UI Permission Validation', () => {
  describe('Tenant Admin UI - MINIMAL INTERFACE', () => {
    const tenantAdminRole: WhatsAppUserRole = 'admin';

    it('should HIDE all technical UI elements', () => {
      expect(shouldShowUIElement(tenantAdminRole, 'showEvolutionApiFields')).toBe(false);
      expect(shouldShowUIElement(tenantAdminRole, 'showAdvancedSettings')).toBe(false);
      expect(shouldShowUIElement(tenantAdminRole, 'showTechnicalDetails')).toBe(false);
      expect(shouldShowUIElement(tenantAdminRole, 'showDebugInformation')).toBe(false);
      expect(shouldShowUIElement(tenantAdminRole, 'showCrossTenantFeatures')).toBe(false);
    });

    it('should HIDE advanced action buttons', () => {
      expect(shouldShowUIElement(tenantAdminRole, 'showCreateInstanceButton')).toBe(false);
      expect(shouldShowUIElement(tenantAdminRole, 'showAdvancedConfigButton')).toBe(false);
    });

    it('should SHOW basic action buttons', () => {
      expect(shouldShowUIElement(tenantAdminRole, 'showDeleteInstanceButton')).toBe(true);
      expect(shouldShowUIElement(tenantAdminRole, 'showConnectButton')).toBe(true);
      expect(shouldShowUIElement(tenantAdminRole, 'showDisconnectButton')).toBe(true);
    });

    it('should use simplified error messages', () => {
      expect(shouldShowUIElement(tenantAdminRole, 'useSimplifiedErrorMessages')).toBe(true);
      expect(shouldShowUIElement(tenantAdminRole, 'hideTechnicalErrorDetails')).toBe(true);
      expect(shouldShowUIElement(tenantAdminRole, 'showUserFriendlyMessages')).toBe(true);
    });
  });

  describe('Superadmin UI - FULL INTERFACE', () => {
    const superadminRole: WhatsAppUserRole = 'superadmin';

    it('should SHOW all technical UI elements', () => {
      expect(shouldShowUIElement(superadminRole, 'showEvolutionApiFields')).toBe(true);
      expect(shouldShowUIElement(superadminRole, 'showAdvancedSettings')).toBe(true);
      expect(shouldShowUIElement(superadminRole, 'showTechnicalDetails')).toBe(true);
      expect(shouldShowUIElement(superadminRole, 'showDebugInformation')).toBe(true);
      expect(shouldShowUIElement(superadminRole, 'showCrossTenantFeatures')).toBe(true);
    });

    it('should SHOW all action buttons', () => {
      expect(shouldShowUIElement(superadminRole, 'showCreateInstanceButton')).toBe(true);
      expect(shouldShowUIElement(superadminRole, 'showAdvancedConfigButton')).toBe(true);
      expect(shouldShowUIElement(superadminRole, 'showDeleteInstanceButton')).toBe(true);
      expect(shouldShowUIElement(superadminRole, 'showConnectButton')).toBe(true);
      expect(shouldShowUIElement(superadminRole, 'showDisconnectButton')).toBe(true);
    });

    it('should use technical error messages', () => {
      expect(shouldShowUIElement(superadminRole, 'useSimplifiedErrorMessages')).toBe(false);
      expect(shouldShowUIElement(superadminRole, 'hideTechnicalErrorDetails')).toBe(false);
      expect(shouldShowUIElement(superadminRole, 'showUserFriendlyMessages')).toBe(false);
    });
  });
});

// =====================================================
// ERROR MESSAGE HANDLING TESTS
// =====================================================

describe('Error Message Handling', () => {
  const technicalError = 'Evolution API connection failed: HTTP 500 Internal Server Error';
  const userFriendlyError = 'No se pudo conectar WhatsApp. Intenta nuevamente.';

  it('should return user-friendly messages for tenant admin', () => {
    const message = getErrorMessage('admin', technicalError, userFriendlyError);
    expect(message).toBe(userFriendlyError);
  });

  it('should return technical messages for superadmin', () => {
    const message = getErrorMessage('superadmin', technicalError, userFriendlyError);
    expect(message).toBe(technicalError);
  });

  it('should return user-friendly messages for non-admin roles', () => {
    const patientMessage = getErrorMessage('patient', technicalError, userFriendlyError);
    const doctorMessage = getErrorMessage('doctor', technicalError, userFriendlyError);
    const staffMessage = getErrorMessage('staff', technicalError, userFriendlyError);

    expect(patientMessage).toBe(userFriendlyError);
    expect(doctorMessage).toBe(userFriendlyError);
    expect(staffMessage).toBe(userFriendlyError);
  });
});

// =====================================================
// ROLE HIERARCHY TESTS
// =====================================================

describe('Role Hierarchy Validation', () => {
  const roles: WhatsAppUserRole[] = ['patient', 'doctor', 'staff', 'admin', 'superadmin'];

  it('should have increasing permissions up the hierarchy', () => {
    // Test instance viewing permissions
    expect(canPerformWhatsAppAction('patient', 'canViewInstances')).toBe(false);
    expect(canPerformWhatsAppAction('doctor', 'canViewInstances')).toBe(false);
    expect(canPerformWhatsAppAction('staff', 'canViewInstances')).toBe(false);
    expect(canPerformWhatsAppAction('admin', 'canViewInstances')).toBe(true);
    expect(canPerformWhatsAppAction('superadmin', 'canViewInstances')).toBe(true);
  });

  it('should restrict advanced features to superadmin only', () => {
    const advancedPermissions = [
      'canCreateInstance',
      'canViewAdvancedConfig',
      'canViewEvolutionApiConfig',
      'canViewAIBotConfig',
      'canViewWebhookConfig',
      'canViewCrossTenantInstances'
    ];

    roles.forEach(role => {
      advancedPermissions.forEach(permission => {
        const hasPermission = canPerformWhatsAppAction(role, permission as any);
        if (role === 'superadmin') {
          expect(hasPermission).toBe(true);
        } else {
          expect(hasPermission).toBe(false);
        }
      });
    });
  });
});

// =====================================================
// SECURITY VALIDATION TESTS
// =====================================================

describe('Security Validation', () => {
  it('should prevent privilege escalation', () => {
    // Tenant admin cannot access superadmin features
    const adminPermissions = getWhatsAppPermissions('admin');
    expect(adminPermissions.canCreateInstance).toBe(false);
    expect(adminPermissions.canViewAdvancedConfig).toBe(false);
    expect(adminPermissions.canAccessEvolutionApiDirectly).toBe(false);
  });

  it('should enforce organization boundaries', () => {
    // Only superadmin can cross organization boundaries
    expect(canAccessCrossTenant('admin', 'org-1', 'org-2')).toBe(false);
    expect(canAccessCrossTenant('superadmin', 'org-1', 'org-2')).toBe(true);
  });

  it('should validate all permission combinations', () => {
    const adminPermissions = getWhatsAppPermissions('admin');
    const superadminPermissions = getWhatsAppPermissions('superadmin');

    // Count permissions for validation
    const adminTrueCount = Object.values(adminPermissions).filter(Boolean).length;
    const superadminTrueCount = Object.values(superadminPermissions).filter(Boolean).length;

    // Superadmin should have more permissions than admin
    expect(superadminTrueCount).toBeGreaterThan(adminTrueCount);

    // Admin should have minimal permissions (only 3: view, connect, disconnect, delete)
    expect(adminTrueCount).toBe(4);

    // Superadmin should have all permissions
    expect(superadminTrueCount).toBe(Object.keys(superadminPermissions).length);
  });
});

// =====================================================
// INTEGRATION TESTS
// =====================================================

describe('RBAC Integration Tests', () => {
  it('should maintain consistency between permissions and UI elements', () => {
    // If user can't create instances, create button should be hidden
    expect(canPerformWhatsAppAction('admin', 'canCreateInstance')).toBe(false);
    expect(shouldShowUIElement('admin', 'showCreateInstanceButton')).toBe(false);

    // If user can connect instances, connect button should be visible
    expect(canPerformWhatsAppAction('admin', 'canConnectInstance')).toBe(true);
    expect(shouldShowUIElement('admin', 'showConnectButton')).toBe(true);
  });

  it('should handle edge cases gracefully', () => {
    // Invalid role should default to patient permissions
    const invalidRolePermissions = getWhatsAppPermissions('invalid' as WhatsAppUserRole);
    const patientPermissions = getWhatsAppPermissions('patient');
    expect(invalidRolePermissions).toEqual(patientPermissions);
  });
});

export {};
