# 🔄 **Appointment Status API Endpoints Documentation**

## 📋 **Overview**

The Appointment Status API provides secure endpoints for managing appointment status changes with comprehensive validation, audit trail, and role-based access control.

**Base URL**: `/api/appointments/[id]/`  
**Authentication**: Required (Supabase Auth)  
**Authorization**: Role-based with organization boundaries  

## 🔐 **Security Features**

### **Multi-Level Access Control**
1. **Authentication**: Valid Supabase session required
2. **Appointment Access**: User must have access to specific appointment
3. **Role Permissions**: Actions restricted by user role
4. **Organization Boundaries**: Multi-tenant data isolation

### **Audit Trail**
- **Complete Logging**: All status changes tracked
- **Metadata Capture**: IP address, user agent, timestamps
- **Compliance Ready**: HIPAA audit trail requirements

## 📡 **Endpoints**

### **1. PATCH /api/appointments/[id]/status**

**Purpose**: Change appointment status with validation and audit trail

#### **Request**

```http
PATCH /api/appointments/123e4567-e89b-12d3-a456-426614174000/status
Content-Type: application/json
Authorization: Bearer <supabase-jwt>

{
  "status": "confirmed",
  "reason": "Manual confirmation by staff",
  "metadata": {
    "source": "dashboard",
    "priority": "normal"
  }
}
```

#### **Request Schema**

```typescript
{
  status: 'pending' | 'pendiente_pago' | 'confirmed' | 'reagendada' | 
          'cancelada_paciente' | 'cancelada_clinica' | 'en_curso' | 
          'completed' | 'cancelled' | 'no_show' | 'no-show';
  reason?: string;
  metadata?: Record<string, any>;
}
```

#### **Response - Success (200)**

```json
{
  "success": true,
  "message": "Appointment status updated successfully",
  "data": {
    "appointmentId": "123e4567-e89b-12d3-a456-426614174000",
    "newStatus": "confirmed",
    "auditId": "audit-uuid",
    "timestamp": "2025-01-28T10:30:00Z"
  }
}
```

#### **Response - Error (400)**

```json
{
  "error": "Invalid status transition",
  "code": "STATUS_CHANGE_FAILED"
}
```

#### **Role Permissions**

| Status Change | Patient | Doctor | Staff | Admin | SuperAdmin |
|---------------|---------|--------|-------|-------|------------|
| → `confirmed` | ❌ | ❌ | ✅ | ✅ | ✅ |
| → `en_curso` | ❌ | ✅ | ✅ | ✅ | ✅ |
| → `completed` | ❌ | ✅ | ✅ | ✅ | ✅ |
| → `cancelada_paciente` | ✅ | ❌ | ✅ | ✅ | ✅ |
| → `cancelada_clinica` | ❌ | ❌ | ✅ | ✅ | ✅ |

---

### **2. GET /api/appointments/[id]/status**

**Purpose**: Get available status transitions for current user and appointment

#### **Request**

```http
GET /api/appointments/123e4567-e89b-12d3-a456-426614174000/status
Authorization: Bearer <supabase-jwt>
```

#### **Response - Success (200)**

```json
{
  "success": true,
  "data": {
    "appointmentId": "123e4567-e89b-12d3-a456-426614174000",
    "userRole": "patient",
    "availableTransitions": [
      "cancelada_paciente",
      "reagendada"
    ],
    "timestamp": "2025-01-28T10:30:00Z"
  }
}
```

#### **Use Cases**

- **Dynamic UI**: Show only valid status options in dropdowns
- **Permission Validation**: Check if user can perform specific transitions
- **Workflow Guidance**: Guide users through valid appointment states

---

### **3. GET /api/appointments/[id]/audit**

**Purpose**: Retrieve audit trail for appointment status changes

#### **Request**

```http
GET /api/appointments/123e4567-e89b-12d3-a456-426614174000/audit?limit=10&offset=0
Authorization: Bearer <supabase-jwt>
```

#### **Query Parameters**

- `limit` (optional): Number of records to return (default: 50, max: 100)
- `offset` (optional): Number of records to skip (default: 0)

#### **Response - Success (200)**

```json
{
  "success": true,
  "data": {
    "appointmentId": "123e4567-e89b-12d3-a456-426614174000",
    "auditTrail": [
      {
        "id": "audit-uuid-1",
        "previousStatus": "pending",
        "newStatus": "confirmed",
        "changedBy": "user-uuid",
        "changedByName": "John Doe",
        "userRole": "staff",
        "reason": "Manual confirmation",
        "ipAddress": "192.168.1.100",
        "timestamp": "2025-01-28T10:30:00Z",
        "metadata": {
          "source": "dashboard",
          "trigger": "manual"
        }
      }
    ],
    "pagination": {
      "limit": 10,
      "offset": 0,
      "total": 1
    },
    "timestamp": "2025-01-28T10:30:00Z"
  }
}
```

#### **Access Restrictions**

- **Admin/Staff Only**: Only users with admin, staff, or superadmin roles can access audit trails
- **Organization Scope**: Users can only see audit trails for appointments in their organization

---

## 🔧 **Error Handling**

### **HTTP Status Codes**

| Code | Description | Example |
|------|-------------|---------|
| 200 | Success | Status changed successfully |
| 400 | Bad Request | Invalid status value, validation error |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions, access denied |
| 404 | Not Found | Appointment not found, user profile not found |
| 500 | Internal Error | Database error, service failure |

### **Error Response Format**

```json
{
  "error": "Descriptive error message",
  "code": "ERROR_CODE",
  "details": [
    {
      "field": "status",
      "message": "Invalid enum value"
    }
  ]
}
```

### **Common Error Scenarios**

#### **Invalid Appointment ID**
```json
{
  "error": "Invalid appointment ID format"
}
```

#### **Insufficient Permissions**
```json
{
  "error": "Role 'patient' does not have permission for this status change"
}
```

#### **Invalid Status Transition**
```json
{
  "error": "Transition not allowed by business rules",
  "code": "STATUS_CHANGE_FAILED"
}
```

#### **Validation Error**
```json
{
  "error": "Invalid request data",
  "details": [
    {
      "field": "status",
      "message": "Invalid enum value. Expected 'pending' | 'confirmed' | ..."
    }
  ]
}
```

---

## 🧪 **Testing**

### **Integration Tests**

```bash
# Run API endpoint tests
npm test -- src/app/api/appointments/\[id\]/status/__tests__/route.test.ts

# Run with coverage
npm test -- --coverage src/app/api/appointments/\[id\]/status/__tests__/route.test.ts
```

### **Manual Testing with cURL**

#### **Change Status**
```bash
curl -X PATCH \
  http://localhost:3000/api/appointments/123e4567-e89b-12d3-a456-426614174000/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "status": "confirmed",
    "reason": "Test status change"
  }'
```

#### **Get Available Transitions**
```bash
curl -X GET \
  http://localhost:3000/api/appointments/123e4567-e89b-12d3-a456-426614174000/status \
  -H "Authorization: Bearer <jwt-token>"
```

#### **Get Audit Trail**
```bash
curl -X GET \
  "http://localhost:3000/api/appointments/123e4567-e89b-12d3-a456-426614174000/audit?limit=5" \
  -H "Authorization: Bearer <jwt-token>"
```

---

## 📊 **Performance Considerations**

### **Optimization Features**

1. **Validation Caching**: Service layer caches validation results for 2 minutes
2. **Efficient Queries**: Optimized database queries with proper indexing
3. **Minimal Data Transfer**: Only essential data in responses
4. **Connection Pooling**: Supabase handles connection management

### **Rate Limiting Recommendations**

- **Status Changes**: 10 requests per minute per user
- **Audit Trail**: 30 requests per minute per user
- **Available Transitions**: 60 requests per minute per user

---

## 🔍 **Monitoring & Debugging**

### **Logging Levels**

- **INFO**: Successful status changes
- **WARN**: Permission denials, invalid transitions
- **ERROR**: Database errors, service failures

### **Key Metrics to Monitor**

1. **Response Times**: Target <200ms for status changes
2. **Error Rates**: <1% for valid requests
3. **Audit Trail Size**: Monitor growth for storage planning
4. **Permission Denials**: Track for security analysis

### **Debug Information**

```typescript
// Console logs for debugging
console.log(`✅ STATUS CHANGE SUCCESS - Appointment: ${id}, Status: ${status}`);
console.log(`❌ INVALID TRANSITION - From: ${current} To: ${new}`);
console.log(`🔒 ACCESS DENIED - User: ${role}, Appointment: ${id}`);
```

---

**✅ API ENDPOINTS READY FOR PRODUCTION**  
**Version**: 1.0.0 - MVP Implementation  
**Date**: 28 de Enero, 2025  
**Status**: Fully implemented and tested  
