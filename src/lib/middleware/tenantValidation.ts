/**
 * Tenant Validation Middleware
 * 
 * Provides comprehensive tenant context validation and isolation for all API routes.
 * Ensures complete data separation between organizations and prevents cross-tenant
 * access violations with comprehensive audit logging.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface TenantContext {
  organizationId: string;
  userId: string;
  userRole: string;
  isSuperAdmin: boolean;
  hasMultiTenantAccess: boolean;
}

export interface TenantValidationOptions {
  requireOrganizationId?: boolean;
  allowSuperAdminAccess?: boolean;
  allowServiceRole?: boolean;
  logSecurityEvents?: boolean;
  validateResourceOwnership?: boolean;
}

export interface SecurityViolation {
  type: 'cross_tenant_access' | 'unauthorized_operation' | 'missing_context' | 'invalid_token';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  timestamp: string;
}

// =====================================================
// TENANT VALIDATION MIDDLEWARE
// =====================================================

/**
 * Tenant Validation Middleware Class
 * 
 * @description Provides comprehensive tenant context validation and security
 * enforcement for multi-tenant WhatsApp AI bot system.
 */
export class TenantValidationMiddleware {
  private supabase: any;

  constructor() {
    this.supabase = createClient();
  }

  // =====================================================
  // MAIN VALIDATION METHODS
  // =====================================================

  /**
   * Validate tenant context for API request
   */
  async validateTenantContext(
    request: NextRequest,
    targetOrganizationId?: string,
    options: TenantValidationOptions = {}
  ): Promise<{ valid: boolean; context?: TenantContext; error?: string; violation?: SecurityViolation }> {
    
    const defaultOptions: TenantValidationOptions = {
      requireOrganizationId: true,
      allowSuperAdminAccess: true,
      allowServiceRole: true,
      logSecurityEvents: true,
      validateResourceOwnership: true,
      ...options
    };

    try {
      // Extract request context
      const requestContext = await this.extractRequestContext(request);
      
      // Get user context
      const userContext = await this.getUserContext();
      if (!userContext) {
        const violation = this.createSecurityViolation(
          'missing_context',
          'medium',
          { reason: 'No authenticated user context', ...requestContext }
        );
        
        if (defaultOptions.logSecurityEvents) {
          await this.logSecurityViolation(violation);
        }
        
        return {
          valid: false,
          error: 'Authentication required',
          violation
        };
      }

      // Check service role access
      if (defaultOptions.allowServiceRole && userContext.userRole === 'service_role') {
        return {
          valid: true,
          context: userContext
        };
      }

      // Check superadmin access
      if (defaultOptions.allowSuperAdminAccess && userContext.isSuperAdmin) {
        return {
          valid: true,
          context: userContext
        };
      }

      // Validate organization access
      if (targetOrganizationId) {
        const hasAccess = await this.validateOrganizationAccess(
          userContext.organizationId,
          targetOrganizationId,
          userContext.userRole
        );

        if (!hasAccess) {
          const violation = this.createSecurityViolation(
            'cross_tenant_access',
            'high',
            {
              userOrganization: userContext.organizationId,
              targetOrganization: targetOrganizationId,
              userRole: userContext.userRole,
              ...requestContext
            }
          );

          if (defaultOptions.logSecurityEvents) {
            await this.logSecurityViolation(violation, userContext.userId);
          }

          return {
            valid: false,
            error: 'Access denied: Cross-tenant access not allowed',
            violation
          };
        }
      }

      // Validate required organization ID
      if (defaultOptions.requireOrganizationId && !userContext.organizationId) {
        const violation = this.createSecurityViolation(
          'missing_context',
          'medium',
          { reason: 'User has no organization context', ...requestContext }
        );

        if (defaultOptions.logSecurityEvents) {
          await this.logSecurityViolation(violation, userContext.userId);
        }

        return {
          valid: false,
          error: 'Organization context required',
          violation
        };
      }

      return {
        valid: true,
        context: userContext
      };

    } catch (error) {
      console.error('❌ Error in tenant validation:', error);
      
      const violation = this.createSecurityViolation(
        'unauthorized_operation',
        'high',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );

      return {
        valid: false,
        error: 'Internal validation error',
        violation
      };
    }
  }

  /**
   * Validate WhatsApp instance ownership
   */
  async validateWhatsAppInstanceOwnership(
    instanceId: string,
    userContext: TenantContext
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Superadmin has access to all instances
      if (userContext.isSuperAdmin) {
        return { valid: true };
      }

      // Check instance ownership
      const { data: instance, error } = await this.supabase
        .from('channel_instances')
        .select('organization_id')
        .eq('id', instanceId)
        .eq('channel_type', 'whatsapp')
        .single();

      if (error || !instance) {
        return {
          valid: false,
          error: 'WhatsApp instance not found'
        };
      }

      if (instance.organization_id !== userContext.organizationId) {
        // Log security violation
        await this.logSecurityViolation(
          this.createSecurityViolation(
            'cross_tenant_access',
            'high',
            {
              instanceId,
              instanceOrganization: instance.organization_id,
              userOrganization: userContext.organizationId,
              resource: 'whatsapp_instance'
            }
          ),
          userContext.userId
        );

        return {
          valid: false,
          error: 'Access denied: Instance belongs to different organization'
        };
      }

      return { valid: true };

    } catch (error) {
      console.error('❌ Error validating WhatsApp instance ownership:', error);
      return {
        valid: false,
        error: 'Error validating instance ownership'
      };
    }
  }

  /**
   * Validate conversation flow ownership
   */
  async validateConversationFlowOwnership(
    flowId: string,
    userContext: TenantContext
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Superadmin has access to all flows
      if (userContext.isSuperAdmin) {
        return { valid: true };
      }

      // Check flow ownership
      const { data: flow, error } = await this.supabase
        .from('conversation_flows')
        .select('organization_id')
        .eq('id', flowId)
        .single();

      if (error || !flow) {
        return {
          valid: false,
          error: 'Conversation flow not found'
        };
      }

      if (flow.organization_id !== userContext.organizationId) {
        // Log security violation
        await this.logSecurityViolation(
          this.createSecurityViolation(
            'cross_tenant_access',
            'high',
            {
              flowId,
              flowOrganization: flow.organization_id,
              userOrganization: userContext.organizationId,
              resource: 'conversation_flow'
            }
          ),
          userContext.userId
        );

        return {
          valid: false,
          error: 'Access denied: Flow belongs to different organization'
        };
      }

      return { valid: true };

    } catch (error) {
      console.error('❌ Error validating conversation flow ownership:', error);
      return {
        valid: false,
        error: 'Error validating flow ownership'
      };
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Extract request context information
   */
  private async extractRequestContext(request: NextRequest): Promise<Record<string, any>> {
    const headersList = await headers();
    
    return {
      method: request.method,
      url: request.url,
      userAgent: headersList.get('user-agent') || 'unknown',
      ipAddress: headersList.get('x-forwarded-for') || 
                 headersList.get('x-real-ip') || 
                 'unknown',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get current user context (public method for service access)
   */
  async getCurrentUserContext(): Promise<TenantContext | null> {
    return this.getUserContext();
  }

  /**
   * Get current user context
   */
  private async getUserContext(): Promise<TenantContext | null> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      
      if (authError || !user) {
        return null;
      }

      // Get user profile with organization
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return null;
      }

      return {
        organizationId: profile.organization_id,
        userId: user.id,
        userRole: profile.role,
        isSuperAdmin: profile.role === 'superadmin',
        hasMultiTenantAccess: profile.role === 'superadmin'
      };

    } catch (error) {
      console.error('❌ Error getting user context:', error);
      return null;
    }
  }

  /**
   * Validate organization access
   */
  private async validateOrganizationAccess(
    userOrganizationId: string,
    targetOrganizationId: string,
    userRole: string
  ): Promise<boolean> {
    // Superadmin has access to all organizations
    if (userRole === 'superadmin') {
      return true;
    }

    // Regular users can only access their own organization
    return userOrganizationId === targetOrganizationId;
  }

  /**
   * Create security violation object
   */
  private createSecurityViolation(
    type: SecurityViolation['type'],
    severity: SecurityViolation['severity'],
    details: Record<string, any>
  ): SecurityViolation {
    return {
      type,
      severity,
      details,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log security violation to audit log
   */
  private async logSecurityViolation(
    violation: SecurityViolation,
    userId?: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('security_audit_log')
        .insert({
          user_id: userId,
          violation_type: violation.type,
          severity: violation.severity,
          operation_type: violation.details.method || 'unknown',
          ip_address: violation.details.ipAddress,
          user_agent: violation.details.userAgent,
          request_path: violation.details.url,
          request_method: violation.details.method,
          details: violation.details,
          timestamp: violation.timestamp
        });

      console.warn(`🚨 Security violation logged:`, {
        type: violation.type,
        severity: violation.severity,
        userId,
        timestamp: violation.timestamp
      });

    } catch (error) {
      console.error('❌ Error logging security violation:', error);
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Create tenant-aware Supabase client
   */
  async createTenantAwareClient(organizationId: string): Promise<any> {
    const client = createClient();
    
    // Set organization context for RLS
    await client.rpc('set_config', {
      setting_name: 'app.current_organization_id',
      setting_value: organizationId,
      is_local: true
    });

    return client;
  }

  /**
   * Inject organization context into query
   */
  injectOrganizationContext<T extends Record<string, any>>(
    data: T,
    organizationId: string
  ): T & { organization_id: string } {
    return {
      ...data,
      organization_id: organizationId
    };
  }

  /**
   * Validate and sanitize organization ID parameter
   */
  validateOrganizationIdParameter(orgId: string | null | undefined): string | null {
    if (!orgId || typeof orgId !== 'string') {
      return null;
    }

    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orgId)) {
      return null;
    }

    return orgId;
  }
}
