# WhatsApp RBAC Permission Matrix - AgentSalud MVP

## Executive Summary

This document defines the comprehensive role-based access control (RBAC) system for WhatsApp instance management in AgentSalud MVP, implementing minimal tenant admin permissions and superadmin-only advanced configuration.

## 🎯 MVP Requirements Implementation

### **REQUIREMENT 1: Minimal Admin Tenant Permissions** ✅

**Tenant Admin (`admin`) - RESTRICTED ACCESS:**

| Permission Category | Allowed Actions | Blocked Actions |
|-------------------|-----------------|-----------------|
| **Basic Instance Management** | ✅ View own org's instance<br>✅ Connect/disconnect instance<br>✅ Delete instance (with confirmation) | ❌ Create new instances<br>❌ View other org's instances |
| **Configuration Access** | ❌ No configuration access | ❌ All configuration blocked |
| **Evolution API Access** | ❌ Completely blocked | ❌ All Evolution API access blocked |
| **AI Bot Configuration** | ❌ Completely blocked | ❌ All AI bot access blocked |
| **Webhook Management** | ❌ Completely blocked | ❌ All webhook access blocked |
| **Technical Features** | ❌ Completely blocked | ❌ All technical features blocked |

### **REQUIREMENT 2: Superadmin-Only Advanced Configuration** ✅

**Superadmin (`superadmin`) - FULL ACCESS:**

| Permission Category | Available Actions |
|-------------------|------------------|
| **Basic Instance Management** | ✅ All instance operations across all organizations |
| **Configuration Access** | ✅ View and edit all configuration settings |
| **Evolution API Access** | ✅ Full Evolution API configuration and direct access |
| **AI Bot Configuration** | ✅ Complete AI bot management and settings |
| **Webhook Management** | ✅ Full webhook configuration and event management |
| **Cross-Tenant Access** | ✅ Global dashboard and cross-tenant management |
| **Technical Features** | ✅ Debug mode, logs, metrics, and system management |

## 📊 Detailed Permission Matrix

### Core Permissions

| Permission | Patient | Doctor | Staff | **Admin** | **Superadmin** |
|------------|---------|--------|-------|-----------|----------------|
| `canViewInstances` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `canCreateInstance` | ❌ | ❌ | ❌ | **❌** | ✅ |
| `canDeleteInstance` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `canConnectInstance` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `canDisconnectInstance` | ❌ | ❌ | ❌ | ✅ | ✅ |

### Configuration Access

| Permission | Patient | Doctor | Staff | **Admin** | **Superadmin** |
|------------|---------|--------|-------|-----------|----------------|
| `canViewBasicConfig` | ❌ | ❌ | ❌ | **❌** | ✅ |
| `canEditBasicConfig` | ❌ | ❌ | ❌ | **❌** | ✅ |
| `canViewAdvancedConfig` | ❌ | ❌ | ❌ | **❌** | ✅ |
| `canEditAdvancedConfig` | ❌ | ❌ | ❌ | **❌** | ✅ |

### Evolution API Access (BLOCKED for Tenant Admin)

| Permission | Patient | Doctor | Staff | **Admin** | **Superadmin** |
|------------|---------|--------|-------|-----------|----------------|
| `canViewEvolutionApiConfig` | ❌ | ❌ | ❌ | **❌** | ✅ |
| `canEditEvolutionApiConfig` | ❌ | ❌ | ❌ | **❌** | ✅ |
| `canAccessEvolutionApiDirectly` | ❌ | ❌ | ❌ | **❌** | ✅ |

### AI Bot Configuration (BLOCKED for Tenant Admin)

| Permission | Patient | Doctor | Staff | **Admin** | **Superadmin** |
|------------|---------|--------|-------|-----------|----------------|
| `canViewAIBotConfig` | ❌ | ❌ | ❌ | **❌** | ✅ |
| `canEditAIBotConfig` | ❌ | ❌ | ❌ | **❌** | ✅ |
| `canManageAIBotSettings` | ❌ | ❌ | ❌ | **❌** | ✅ |

### Webhook Management (BLOCKED for Tenant Admin)

| Permission | Patient | Doctor | Staff | **Admin** | **Superadmin** |
|------------|---------|--------|-------|-----------|----------------|
| `canViewWebhookConfig` | ❌ | ❌ | ❌ | **❌** | ✅ |
| `canEditWebhookConfig` | ❌ | ❌ | ❌ | **❌** | ✅ |
| `canManageWebhookEvents` | ❌ | ❌ | ❌ | **❌** | ✅ |

### Cross-Tenant Access (BLOCKED for Tenant Admin)

| Permission | Patient | Doctor | Staff | **Admin** | **Superadmin** |
|------------|---------|--------|-------|-----------|----------------|
| `canViewCrossTenantInstances` | ❌ | ❌ | ❌ | **❌** | ✅ |
| `canManageCrossTenantInstances` | ❌ | ❌ | ❌ | **❌** | ✅ |
| `canAccessGlobalDashboard` | ❌ | ❌ | ❌ | **❌** | ✅ |

### Technical Features (BLOCKED for Tenant Admin)

| Permission | Patient | Doctor | Staff | **Admin** | **Superadmin** |
|------------|---------|--------|-------|-----------|----------------|
| `canViewTechnicalLogs` | ❌ | ❌ | ❌ | **❌** | ✅ |
| `canAccessDebugMode` | ❌ | ❌ | ❌ | **❌** | ✅ |
| `canViewSystemMetrics` | ❌ | ❌ | ❌ | **❌** | ✅ |
| `canExportInstanceData` | ❌ | ❌ | ❌ | **❌** | ✅ |

## 🎨 UI Permission Matrix

### Component Visibility

| UI Element | Patient | Doctor | Staff | **Admin** | **Superadmin** |
|------------|---------|--------|-------|-----------|----------------|
| `showEvolutionApiFields` | ❌ | ❌ | ❌ | **❌** | ✅ |
| `showAdvancedSettings` | ❌ | ❌ | ❌ | **❌** | ✅ |
| `showTechnicalDetails` | ❌ | ❌ | ❌ | **❌** | ✅ |
| `showDebugInformation` | ❌ | ❌ | ❌ | **❌** | ✅ |
| `showCrossTenantFeatures` | ❌ | ❌ | ❌ | **❌** | ✅ |

### Action Button Visibility

| Button | Patient | Doctor | Staff | **Admin** | **Superadmin** |
|--------|---------|--------|-------|-----------|----------------|
| `showCreateInstanceButton` | ❌ | ❌ | ❌ | **❌** | ✅ |
| `showAdvancedConfigButton` | ❌ | ❌ | ❌ | **❌** | ✅ |
| `showDeleteInstanceButton` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `showConnectButton` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `showDisconnectButton` | ❌ | ❌ | ❌ | ✅ | ✅ |

### Error Message Handling

| Error Handling | Patient | Doctor | Staff | **Admin** | **Superadmin** |
|----------------|---------|--------|-------|-----------|----------------|
| `useSimplifiedErrorMessages` | ✅ | ✅ | ✅ | **✅** | ❌ |
| `hideTechnicalErrorDetails` | ✅ | ✅ | ✅ | **✅** | ❌ |
| `showUserFriendlyMessages` | ✅ | ✅ | ✅ | **✅** | ❌ |

## 🔒 Security Implementation

### API Endpoint Protection

| Endpoint | Tenant Admin Access | Superadmin Access |
|----------|-------------------|------------------|
| `GET /api/channels/whatsapp/instances` | ✅ Own org only | ✅ All orgs |
| `POST /api/channels/whatsapp/instances` | **❌ Blocked** | ✅ Full access |
| `PUT /api/channels/whatsapp/instances/{id}` | **❌ Blocked** | ✅ Full access |
| `DELETE /api/channels/whatsapp/instances/{id}` | ✅ Own org only | ✅ All orgs |
| `POST /api/channels/whatsapp/instances/{id}/connect` | ✅ Own org only | ✅ All orgs |
| `POST /api/channels/whatsapp/instances/{id}/disconnect` | ✅ Own org only | ✅ All orgs |
| `GET /api/admin/whatsapp/instances` | **❌ Blocked** | ✅ Full access |

### Validation Layers

1. **Authentication Layer**: User must be authenticated
2. **Role Validation**: User must have `admin` or `superadmin` role
3. **Permission Check**: Specific action permissions validated
4. **Organization Scope**: Data access limited to user's organization (except superadmin)
5. **Cross-Tenant Validation**: Prevents unauthorized cross-organization access

## 📱 User Experience Flows

### Tenant Admin Experience (Simplified)

1. **Dashboard View**: Simple card showing instance status
2. **Available Actions**: Connect, Disconnect, Delete (with confirmation)
3. **Error Messages**: User-friendly, non-technical language
4. **Hidden Elements**: No Evolution API, webhooks, or advanced settings
5. **Instance Creation**: Blocked - must contact superadmin

### Superadmin Experience (Full Control)

1. **Global Dashboard**: View all instances across organizations
2. **Advanced Configuration**: Full access to all technical settings
3. **Cross-Tenant Management**: Manage instances for any organization
4. **Technical Details**: Debug information, logs, and metrics
5. **Instance Creation**: Full creation with advanced configuration

## 🧪 Test Cases

### Tenant Admin Permission Tests

```typescript
// Test 1: Tenant admin cannot create instances
expect(canPerformWhatsAppAction('admin', 'canCreateInstance')).toBe(false);

// Test 2: Tenant admin cannot view Evolution API config
expect(shouldShowUIElement('admin', 'showEvolutionApiFields')).toBe(false);

// Test 3: Tenant admin gets simplified error messages
expect(shouldShowUIElement('admin', 'useSimplifiedErrorMessages')).toBe(true);

// Test 4: Tenant admin can connect/disconnect
expect(canPerformWhatsAppAction('admin', 'canConnectInstance')).toBe(true);
expect(canPerformWhatsAppAction('admin', 'canDisconnectInstance')).toBe(true);
```

### Superadmin Permission Tests

```typescript
// Test 1: Superadmin has full access
expect(canPerformWhatsAppAction('superadmin', 'canCreateInstance')).toBe(true);
expect(canPerformWhatsAppAction('superadmin', 'canViewAdvancedConfig')).toBe(true);

// Test 2: Superadmin sees technical details
expect(shouldShowUIElement('superadmin', 'showEvolutionApiFields')).toBe(true);
expect(shouldShowUIElement('superadmin', 'showTechnicalDetails')).toBe(true);

// Test 3: Superadmin gets technical error messages
expect(shouldShowUIElement('superadmin', 'useSimplifiedErrorMessages')).toBe(false);
```

### Cross-Tenant Access Tests

```typescript
// Test 1: Tenant admin cannot access other organizations
expect(canAccessCrossTenant('admin', 'org-1', 'org-2')).toBe(false);

// Test 2: Superadmin can access any organization
expect(canAccessCrossTenant('superadmin', 'org-1', 'org-2')).toBe(true);
```

## 🚀 Production Readiness

### Security Validation ✅

- [x] API endpoints protected with RBAC middleware
- [x] UI components conditionally rendered based on permissions
- [x] Error messages role-appropriate
- [x] Cross-tenant access properly restricted
- [x] Evolution API access blocked for tenant admin

### User Experience Validation ✅

- [x] Simplified interface for tenant admin
- [x] Technical complexity hidden from non-superadmin users
- [x] User-friendly error messages for tenant admin
- [x] Confirmation prompts for destructive actions
- [x] Clear status indicators and feedback

### Compliance Validation ✅

- [x] Audit trail for all actions
- [x] Role-based data isolation
- [x] Minimal privilege principle enforced
- [x] Security by design implementation

## 📋 Implementation Checklist

### Backend Implementation ✅

- [x] RBAC permission system (`/src/lib/rbac/whatsapp-permissions.ts`)
- [x] RBAC middleware (`/src/lib/middleware/whatsapp-rbac-middleware.ts`)
- [x] Updated API endpoints with permission validation
- [x] Enhanced audit logging with role context

### Frontend Implementation ✅

- [x] Tenant admin simplified dashboard component
- [x] Role-based UI element visibility
- [x] Simplified error message handling
- [x] Confirmation dialogs for destructive actions

### Documentation ✅

- [x] Comprehensive permission matrix
- [x] Security implementation guide
- [x] User experience flow documentation
- [x] Test case specifications

---

**Status**: ✅ **PRODUCTION READY**

The WhatsApp RBAC system successfully implements minimal tenant admin permissions while maintaining full superadmin control, ensuring security, usability, and compliance for the AgentSalud MVP.
