# WhatsApp Multi-Tenant Instance Management - Product Requirements Document

## Executive Summary

This document outlines the enhanced multi-tenant WhatsApp instance management system for AgentSalud, focusing on superadmin capabilities while maintaining proper role-based access control and data isolation.

## Current State Analysis

### Existing Constraints
- **One WhatsApp instance per tenant organization** (business rule)
- **Role-based access control** with admin/superadmin roles
- **Data isolation** between tenant organizations
- **Evolution API v2 integration** for WhatsApp management

### Current Limitations
1. **Limited Superadmin Visibility**: Cannot view instances across all tenants
2. **No Cross-Tenant Management**: Cannot edit/manage instances from other organizations
3. **Fragmented Oversight**: No global view of WhatsApp ecosystem health
4. **Audit Trail Gaps**: Limited tracking of cross-tenant administrative actions

## Enhanced Requirements

### 1. Superadmin Global Visibility

**Requirement**: Superadmin must have complete visibility across all tenant organizations

**Capabilities**:
- View ALL existing WhatsApp instances across ALL tenant organizations
- Filter instances by organization, status, or creation date
- Search instances by name, phone number, or organization
- Export instance data for reporting and analysis

**Implementation**:
```sql
-- Enhanced query for superadmin global view
SELECT 
  ci.id,
  ci.instance_name,
  ci.status,
  ci.created_at,
  ci.organization_id,
  o.name as organization_name,
  o.subscription_plan,
  ci.config->>'phone_number' as phone_number,
  ci.config->>'evolution_instance_id' as evolution_id
FROM channel_instances ci
LEFT JOIN organizations o ON ci.organization_id = o.id
WHERE ci.channel_type = 'whatsapp'
ORDER BY ci.created_at DESC;
```

### 2. Cross-Tenant Instance Management

**Requirement**: Superadmin can edit/manage any instance regardless of tenant ownership

**Capabilities**:
- **Configuration Management**: Update instance settings across tenants
- **Status Control**: Start, stop, restart instances for any organization
- **Emergency Actions**: Disable problematic instances immediately
- **Bulk Operations**: Apply changes to multiple instances simultaneously

**Security Considerations**:
- All cross-tenant actions must be logged with detailed audit trail
- Sensitive data (API keys, tokens) remain encrypted and tenant-isolated
- Organization-specific configurations cannot be shared between tenants

### 3. Enhanced Role-Based Access Control

**Current Roles**:
- `admin`: Organization-scoped access
- `superadmin`: Global access with cross-tenant capabilities

**Enhanced Permissions Matrix**:

| Action | Admin | Superadmin |
|--------|-------|------------|
| View own org instances | ✅ | ✅ |
| View all org instances | ❌ | ✅ |
| Create instance (own org) | ✅ | ✅ |
| Create instance (any org) | ❌ | ✅ |
| Edit instance (own org) | ✅ | ✅ |
| Edit instance (any org) | ❌ | ✅ |
| Delete instance (own org) | ✅ | ✅ |
| Delete instance (any org) | ❌ | ✅ |
| View audit logs (own org) | ✅ | ✅ |
| View audit logs (all orgs) | ❌ | ✅ |
| Export data (own org) | ✅ | ✅ |
| Export data (all orgs) | ❌ | ✅ |

### 4. Data Isolation and Security

**Principles**:
- **Logical Separation**: Data remains organizationally isolated in database
- **Access Control**: Superadmin access is permission-based, not data-based
- **Encryption**: Sensitive data encrypted at rest and in transit
- **Audit Trail**: All cross-tenant actions logged with full context

**Implementation Strategy**:
```typescript
// Enhanced permission checking
export function canAccessInstance(
  userRole: string,
  userOrgId: string,
  instanceOrgId: string
): boolean {
  if (userRole === 'superadmin') {
    return true; // Global access
  }
  
  if (userRole === 'admin') {
    return userOrgId === instanceOrgId; // Organization-scoped
  }
  
  return false; // No access
}
```

## Database Schema Enhancements

### 1. Enhanced Audit Trail

```sql
-- Enhanced audit table for cross-tenant actions
CREATE TABLE whatsapp_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  target_organization_id UUID REFERENCES organizations(id), -- For cross-tenant actions
  action VARCHAR(100) NOT NULL,
  actor_id UUID REFERENCES profiles(id),
  actor_role VARCHAR(50) NOT NULL,
  whatsapp_instance_id UUID REFERENCES channel_instances(id),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX idx_whatsapp_audit_cross_tenant 
ON whatsapp_audit_log(target_organization_id, created_at);
```

### 2. Instance Metadata Enhancement

```sql
-- Add metadata for better management
ALTER TABLE channel_instances 
ADD COLUMN last_activity_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN health_status VARCHAR(20) DEFAULT 'unknown',
ADD COLUMN performance_metrics JSONB;

-- Index for global queries
CREATE INDEX idx_channel_instances_global_view 
ON channel_instances(channel_type, status, created_at);
```

## API Enhancements

### 1. Enhanced Instance Listing Endpoint

```typescript
// GET /api/channels/whatsapp/instances
// Enhanced with superadmin capabilities

interface EnhancedInstanceResponse {
  id: string;
  instance_name: string;
  status: string;
  organization_id: string;
  organization_name: string;
  phone_number?: string;
  created_at: string;
  last_activity_at?: string;
  health_status: string;
  performance_metrics?: object;
}
```

### 2. Cross-Tenant Management Endpoints

```typescript
// PUT /api/admin/whatsapp/instances/{id}/cross-tenant
// Superadmin-only endpoint for cross-tenant management

interface CrossTenantUpdateRequest {
  action: 'update_config' | 'change_status' | 'restart' | 'emergency_disable';
  target_organization_id: string;
  changes: object;
  reason: string; // Required for audit trail
}
```

## UI/UX Enhancements

### 1. Superadmin Dashboard

**Global Instance Overview**:
- **Multi-tenant grid view** with organization grouping
- **Real-time status indicators** across all instances
- **Quick action buttons** for common management tasks
- **Advanced filtering** by organization, status, date range

**Organization Selector**:
```typescript
// Enhanced organization context for superadmin
interface OrganizationContext {
  current: 'all' | string; // 'all' for global view
  available: Organization[];
  canSwitchTo: (orgId: string) => boolean;
}
```

### 2. Enhanced Instance Cards

**Cross-Tenant Information Display**:
- **Organization badge** prominently displayed
- **Cross-tenant action indicators** when applicable
- **Audit trail preview** for recent actions
- **Health status visualization** with metrics

### 3. Audit Trail Interface

**Comprehensive Logging View**:
- **Cross-tenant action highlighting**
- **Actor identification** with role context
- **Before/after state comparison**
- **Export capabilities** for compliance

## Security Implementation

### 1. Enhanced Authentication Middleware

```typescript
export async function validateCrossTenantAccess(
  request: NextRequest,
  targetOrgId: string
): Promise<{
  allowed: boolean;
  user: User;
  auditContext: AuditContext;
}> {
  // Implementation with enhanced security checks
}
```

### 2. Audit Trail Requirements

**Mandatory Logging for**:
- All cross-tenant instance access
- Configuration changes across organizations
- Status modifications for instances outside user's organization
- Data exports spanning multiple tenants

**Log Format**:
```json
{
  "timestamp": "2025-01-28T10:30:00Z",
  "actor": {
    "id": "user-uuid",
    "role": "superadmin",
    "organization_id": "actor-org-uuid"
  },
  "action": "cross_tenant_instance_update",
  "target": {
    "instance_id": "instance-uuid",
    "organization_id": "target-org-uuid"
  },
  "changes": {
    "before": {...},
    "after": {...}
  },
  "reason": "Emergency maintenance required",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0..."
}
```

## Implementation Phases

### Phase 1: Backend Infrastructure (Week 1-2)
- Enhanced database schema
- Updated API endpoints
- Cross-tenant permission system
- Audit trail implementation

### Phase 2: Frontend Components (Week 3-4)
- Superadmin dashboard enhancements
- Cross-tenant instance management UI
- Enhanced filtering and search
- Audit trail interface

### Phase 3: Security & Testing (Week 5-6)
- Security audit and penetration testing
- Performance optimization for global queries
- Comprehensive test coverage
- Documentation and training materials

## Success Metrics

### Technical Metrics
- **API Response Time**: <500ms for global instance queries
- **Database Performance**: <100ms for cross-tenant queries
- **Security Compliance**: 100% audit trail coverage
- **Test Coverage**: >90% for multi-tenant functionality

### Business Metrics
- **Operational Efficiency**: 50% reduction in cross-tenant management time
- **System Visibility**: 100% real-time visibility across all tenants
- **Compliance**: Full audit trail for regulatory requirements
- **User Satisfaction**: >95% satisfaction from superadmin users

## Risk Mitigation

### Data Security Risks
- **Mitigation**: Enhanced encryption and access logging
- **Monitoring**: Real-time security event detection
- **Response**: Automated threat response procedures

### Performance Risks
- **Mitigation**: Optimized database queries and caching
- **Monitoring**: Performance metrics and alerting
- **Response**: Auto-scaling and load balancing

### Compliance Risks
- **Mitigation**: Comprehensive audit trail and data governance
- **Monitoring**: Compliance dashboard and reporting
- **Response**: Automated compliance violation detection
