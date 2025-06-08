/**
 * WhatsApp Instance RBAC Permission System
 * 
 * Comprehensive role-based access control for WhatsApp instance management
 * with minimal tenant admin permissions and superadmin-only advanced features.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export type WhatsAppUserRole = 'patient' | 'doctor' | 'staff' | 'admin' | 'superadmin';

export interface WhatsAppPermissions {
  // Basic Instance Management
  canViewInstances: boolean;
  canCreateInstance: boolean;
  canDeleteInstance: boolean;
  canConnectInstance: boolean;
  canDisconnectInstance: boolean;
  
  // Configuration Access
  canViewBasicConfig: boolean;
  canEditBasicConfig: boolean;
  canViewAdvancedConfig: boolean;
  canEditAdvancedConfig: boolean;
  
  // Evolution API Access
  canViewEvolutionApiConfig: boolean;
  canEditEvolutionApiConfig: boolean;
  canAccessEvolutionApiDirectly: boolean;
  
  // AI Bot Configuration
  canViewAIBotConfig: boolean;
  canEditAIBotConfig: boolean;
  canManageAIBotSettings: boolean;
  
  // Webhook Management
  canViewWebhookConfig: boolean;
  canEditWebhookConfig: boolean;
  canManageWebhookEvents: boolean;
  
  // Cross-Tenant Access
  canViewCrossTenantInstances: boolean;
  canManageCrossTenantInstances: boolean;
  canAccessGlobalDashboard: boolean;
  
  // Technical Features
  canViewTechnicalLogs: boolean;
  canAccessDebugMode: boolean;
  canViewSystemMetrics: boolean;
  canExportInstanceData: boolean;
  
  // Audit and Compliance
  canViewAuditTrail: boolean;
  canExportAuditData: boolean;
  canManageCompliance: boolean;
}

export interface WhatsAppUIPermissions {
  // UI Component Visibility
  showEvolutionApiFields: boolean;
  showAdvancedSettings: boolean;
  showTechnicalDetails: boolean;
  showDebugInformation: boolean;
  showCrossTenantFeatures: boolean;
  
  // Action Button Visibility
  showCreateInstanceButton: boolean;
  showAdvancedConfigButton: boolean;
  showDeleteInstanceButton: boolean;
  showConnectButton: boolean;
  showDisconnectButton: boolean;
  
  // Error Message Types
  useSimplifiedErrorMessages: boolean;
  hideTechnicalErrorDetails: boolean;
  showUserFriendlyMessages: boolean;
}

// =====================================================
// PERMISSION MATRICES
// =====================================================

/**
 * Core permissions matrix for WhatsApp instance management
 */
export const WHATSAPP_PERMISSIONS: Record<WhatsAppUserRole, WhatsAppPermissions> = {
  patient: {
    // Basic Instance Management
    canViewInstances: false,
    canCreateInstance: false,
    canDeleteInstance: false,
    canConnectInstance: false,
    canDisconnectInstance: false,
    
    // Configuration Access
    canViewBasicConfig: false,
    canEditBasicConfig: false,
    canViewAdvancedConfig: false,
    canEditAdvancedConfig: false,
    
    // Evolution API Access
    canViewEvolutionApiConfig: false,
    canEditEvolutionApiConfig: false,
    canAccessEvolutionApiDirectly: false,
    
    // AI Bot Configuration
    canViewAIBotConfig: false,
    canEditAIBotConfig: false,
    canManageAIBotSettings: false,
    
    // Webhook Management
    canViewWebhookConfig: false,
    canEditWebhookConfig: false,
    canManageWebhookEvents: false,
    
    // Cross-Tenant Access
    canViewCrossTenantInstances: false,
    canManageCrossTenantInstances: false,
    canAccessGlobalDashboard: false,
    
    // Technical Features
    canViewTechnicalLogs: false,
    canAccessDebugMode: false,
    canViewSystemMetrics: false,
    canExportInstanceData: false,
    
    // Audit and Compliance
    canViewAuditTrail: false,
    canExportAuditData: false,
    canManageCompliance: false
  },

  doctor: {
    // Basic Instance Management
    canViewInstances: false,
    canCreateInstance: false,
    canDeleteInstance: false,
    canConnectInstance: false,
    canDisconnectInstance: false,
    
    // Configuration Access
    canViewBasicConfig: false,
    canEditBasicConfig: false,
    canViewAdvancedConfig: false,
    canEditAdvancedConfig: false,
    
    // Evolution API Access
    canViewEvolutionApiConfig: false,
    canEditEvolutionApiConfig: false,
    canAccessEvolutionApiDirectly: false,
    
    // AI Bot Configuration
    canViewAIBotConfig: false,
    canEditAIBotConfig: false,
    canManageAIBotSettings: false,
    
    // Webhook Management
    canViewWebhookConfig: false,
    canEditWebhookConfig: false,
    canManageWebhookEvents: false,
    
    // Cross-Tenant Access
    canViewCrossTenantInstances: false,
    canManageCrossTenantInstances: false,
    canAccessGlobalDashboard: false,
    
    // Technical Features
    canViewTechnicalLogs: false,
    canAccessDebugMode: false,
    canViewSystemMetrics: false,
    canExportInstanceData: false,
    
    // Audit and Compliance
    canViewAuditTrail: false,
    canExportAuditData: false,
    canManageCompliance: false
  },

  staff: {
    // Basic Instance Management
    canViewInstances: false,
    canCreateInstance: false,
    canDeleteInstance: false,
    canConnectInstance: false,
    canDisconnectInstance: false,
    
    // Configuration Access
    canViewBasicConfig: false,
    canEditBasicConfig: false,
    canViewAdvancedConfig: false,
    canEditAdvancedConfig: false,
    
    // Evolution API Access
    canViewEvolutionApiConfig: false,
    canEditEvolutionApiConfig: false,
    canAccessEvolutionApiDirectly: false,
    
    // AI Bot Configuration
    canViewAIBotConfig: false,
    canEditAIBotConfig: false,
    canManageAIBotSettings: false,
    
    // Webhook Management
    canViewWebhookConfig: false,
    canEditWebhookConfig: false,
    canManageWebhookEvents: false,
    
    // Cross-Tenant Access
    canViewCrossTenantInstances: false,
    canManageCrossTenantInstances: false,
    canAccessGlobalDashboard: false,
    
    // Technical Features
    canViewTechnicalLogs: false,
    canAccessDebugMode: false,
    canViewSystemMetrics: false,
    canExportInstanceData: false,
    
    // Audit and Compliance
    canViewAuditTrail: false,
    canExportAuditData: false,
    canManageCompliance: false
  },

  // MINIMAL TENANT ADMIN PERMISSIONS (MVP Requirements)
  admin: {
    // Basic Instance Management - RESTRICTED TO MINIMAL OPERATIONS
    canViewInstances: true,           // Can see their org's instance
    canCreateInstance: true,          // ENABLED - One instance per tenant
    canDeleteInstance: true,          // Can delete with confirmation
    canConnectInstance: true,         // Can connect/disconnect
    canDisconnectInstance: true,      // Can connect/disconnect
    
    // Configuration Access - HEAVILY RESTRICTED
    canViewBasicConfig: false,        // BLOCKED - No config access
    canEditBasicConfig: false,        // BLOCKED - No config access
    canViewAdvancedConfig: false,     // BLOCKED - Superadmin only
    canEditAdvancedConfig: false,     // BLOCKED - Superadmin only
    
    // Evolution API Access - COMPLETELY BLOCKED
    canViewEvolutionApiConfig: false, // BLOCKED - Superadmin only
    canEditEvolutionApiConfig: false, // BLOCKED - Superadmin only
    canAccessEvolutionApiDirectly: false, // BLOCKED - Security risk
    
    // AI Bot Configuration - COMPLETELY BLOCKED
    canViewAIBotConfig: false,        // BLOCKED - Superadmin only
    canEditAIBotConfig: false,        // BLOCKED - Superadmin only
    canManageAIBotSettings: false,    // BLOCKED - Superadmin only
    
    // Webhook Management - COMPLETELY BLOCKED
    canViewWebhookConfig: false,      // BLOCKED - Superadmin only
    canEditWebhookConfig: false,      // BLOCKED - Superadmin only
    canManageWebhookEvents: false,    // BLOCKED - Superadmin only
    
    // Cross-Tenant Access - COMPLETELY BLOCKED
    canViewCrossTenantInstances: false, // BLOCKED - Superadmin only
    canManageCrossTenantInstances: false, // BLOCKED - Superadmin only
    canAccessGlobalDashboard: false,  // BLOCKED - Superadmin only
    
    // Technical Features - COMPLETELY BLOCKED
    canViewTechnicalLogs: false,      // BLOCKED - Superadmin only
    canAccessDebugMode: false,        // BLOCKED - Superadmin only
    canViewSystemMetrics: false,      // BLOCKED - Superadmin only
    canExportInstanceData: false,     // BLOCKED - Superadmin only
    
    // Audit and Compliance - MINIMAL ACCESS
    canViewAuditTrail: false,         // BLOCKED - Superadmin only
    canExportAuditData: false,        // BLOCKED - Superadmin only
    canManageCompliance: false        // BLOCKED - Superadmin only
  },

  // FULL SUPERADMIN PERMISSIONS
  superadmin: {
    // Basic Instance Management - FULL ACCESS
    canViewInstances: true,
    canCreateInstance: true,
    canDeleteInstance: true,
    canConnectInstance: true,
    canDisconnectInstance: true,
    
    // Configuration Access - FULL ACCESS
    canViewBasicConfig: true,
    canEditBasicConfig: true,
    canViewAdvancedConfig: true,
    canEditAdvancedConfig: true,
    
    // Evolution API Access - FULL ACCESS
    canViewEvolutionApiConfig: true,
    canEditEvolutionApiConfig: true,
    canAccessEvolutionApiDirectly: true,
    
    // AI Bot Configuration - FULL ACCESS
    canViewAIBotConfig: true,
    canEditAIBotConfig: true,
    canManageAIBotSettings: true,
    
    // Webhook Management - FULL ACCESS
    canViewWebhookConfig: true,
    canEditWebhookConfig: true,
    canManageWebhookEvents: true,
    
    // Cross-Tenant Access - FULL ACCESS
    canViewCrossTenantInstances: true,
    canManageCrossTenantInstances: true,
    canAccessGlobalDashboard: true,
    
    // Technical Features - FULL ACCESS
    canViewTechnicalLogs: true,
    canAccessDebugMode: true,
    canViewSystemMetrics: true,
    canExportInstanceData: true,
    
    // Audit and Compliance - FULL ACCESS
    canViewAuditTrail: true,
    canExportAuditData: true,
    canManageCompliance: true
  }
};

/**
 * UI permissions matrix for role-based component visibility
 */
export const WHATSAPP_UI_PERMISSIONS: Record<WhatsAppUserRole, WhatsAppUIPermissions> = {
  patient: {
    showEvolutionApiFields: false,
    showAdvancedSettings: false,
    showTechnicalDetails: false,
    showDebugInformation: false,
    showCrossTenantFeatures: false,
    showCreateInstanceButton: false,
    showAdvancedConfigButton: false,
    showDeleteInstanceButton: false,
    showConnectButton: false,
    showDisconnectButton: false,
    useSimplifiedErrorMessages: true,
    hideTechnicalErrorDetails: true,
    showUserFriendlyMessages: true
  },

  doctor: {
    showEvolutionApiFields: false,
    showAdvancedSettings: false,
    showTechnicalDetails: false,
    showDebugInformation: false,
    showCrossTenantFeatures: false,
    showCreateInstanceButton: false,
    showAdvancedConfigButton: false,
    showDeleteInstanceButton: false,
    showConnectButton: false,
    showDisconnectButton: false,
    useSimplifiedErrorMessages: true,
    hideTechnicalErrorDetails: true,
    showUserFriendlyMessages: true
  },

  staff: {
    showEvolutionApiFields: false,
    showAdvancedSettings: false,
    showTechnicalDetails: false,
    showDebugInformation: false,
    showCrossTenantFeatures: false,
    showCreateInstanceButton: false,
    showAdvancedConfigButton: false,
    showDeleteInstanceButton: false,
    showConnectButton: false,
    showDisconnectButton: false,
    useSimplifiedErrorMessages: true,
    hideTechnicalErrorDetails: true,
    showUserFriendlyMessages: true
  },

  // MINIMAL UI FOR TENANT ADMIN
  admin: {
    showEvolutionApiFields: false,        // HIDDEN - No technical details
    showAdvancedSettings: false,          // HIDDEN - Superadmin only
    showTechnicalDetails: false,          // HIDDEN - No technical complexity
    showDebugInformation: false,          // HIDDEN - Superadmin only
    showCrossTenantFeatures: false,       // HIDDEN - Superadmin only
    showCreateInstanceButton: true,       // VISIBLE - Simplified creation only
    showAdvancedConfigButton: false,      // HIDDEN - Superadmin only
    showDeleteInstanceButton: true,       // VISIBLE - With confirmation
    showConnectButton: true,              // VISIBLE - Basic operation
    showDisconnectButton: true,           // VISIBLE - Basic operation
    useSimplifiedErrorMessages: true,     // USER-FRIENDLY - No technical jargon
    hideTechnicalErrorDetails: true,      // HIDDEN - No Evolution API errors
    showUserFriendlyMessages: true        // FRIENDLY - Clear, simple messages
  },

  // FULL UI FOR SUPERADMIN
  superadmin: {
    showEvolutionApiFields: true,
    showAdvancedSettings: true,
    showTechnicalDetails: true,
    showDebugInformation: true,
    showCrossTenantFeatures: true,
    showCreateInstanceButton: true,
    showAdvancedConfigButton: true,
    showDeleteInstanceButton: true,
    showConnectButton: true,
    showDisconnectButton: true,
    useSimplifiedErrorMessages: false,
    hideTechnicalErrorDetails: false,
    showUserFriendlyMessages: false
  }
};

// =====================================================
// PERMISSION HELPER FUNCTIONS
// =====================================================

/**
 * Get WhatsApp permissions for a user role
 */
export function getWhatsAppPermissions(role: WhatsAppUserRole): WhatsAppPermissions {
  return WHATSAPP_PERMISSIONS[role] || WHATSAPP_PERMISSIONS.patient;
}

/**
 * Get WhatsApp UI permissions for a user role
 */
export function getWhatsAppUIPermissions(role: WhatsAppUserRole): WhatsAppUIPermissions {
  return WHATSAPP_UI_PERMISSIONS[role] || WHATSAPP_UI_PERMISSIONS.patient;
}

/**
 * Check if user can perform a specific WhatsApp action
 */
export function canPerformWhatsAppAction(
  role: WhatsAppUserRole,
  action: keyof WhatsAppPermissions
): boolean {
  const permissions = getWhatsAppPermissions(role);
  return permissions[action] || false;
}

/**
 * Check if UI element should be visible for user role
 */
export function shouldShowUIElement(
  role: WhatsAppUserRole,
  element: keyof WhatsAppUIPermissions
): boolean {
  const uiPermissions = getWhatsAppUIPermissions(role);
  return uiPermissions[element] || false;
}

/**
 * Validate cross-tenant access
 */
export function canAccessCrossTenant(
  userRole: WhatsAppUserRole,
  userOrgId: string,
  targetOrgId: string
): boolean {
  if (userRole === 'superadmin') {
    return true; // Superadmin has global access
  }
  
  if (userRole === 'admin') {
    return userOrgId === targetOrgId; // Admin limited to own organization
  }
  
  return false; // Other roles have no access
}

/**
 * Get user-friendly error message based on role
 */
export function getErrorMessage(
  role: WhatsAppUserRole,
  technicalError: string,
  userFriendlyMessage: string
): string {
  const uiPermissions = getWhatsAppUIPermissions(role);
  
  if (uiPermissions.useSimplifiedErrorMessages) {
    return userFriendlyMessage;
  }
  
  return technicalError;
}

export default {
  getWhatsAppPermissions,
  getWhatsAppUIPermissions,
  canPerformWhatsAppAction,
  shouldShowUIElement,
  canAccessCrossTenant,
  getErrorMessage,
  WHATSAPP_PERMISSIONS,
  WHATSAPP_UI_PERMISSIONS
};
