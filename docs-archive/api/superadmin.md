# SuperAdmin API Documentation

## Overview

The SuperAdmin API provides system-wide management capabilities for AgentSalud. These endpoints are restricted to users with the `superadmin` role and provide oversight of organizations, users, and system health.

## Authentication

All SuperAdmin endpoints require:
- Valid JWT token in Authorization header
- User profile with `role: 'superadmin'`

### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Organizations API

### GET /api/superadmin/organizations

Retrieve all organizations in the system with statistics.

#### Response
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Organization Name",
      "slug": "organization-slug",
      "email": "contact@organization.com",
      "phone": "+1234567890",
      "address": "123 Main St",
      "city": "City Name",
      "country": "Country",
      "website": "https://organization.com",
      "subscription_plan": "basic|professional|enterprise",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "user_count": 25,
      "appointment_count": 150
    }
  ],
  "total": 1
}
```

#### Error Responses
- `401 Unauthorized`: Invalid or missing authentication
- `403 Forbidden`: User is not a SuperAdmin
- `500 Internal Server Error`: Server error

### POST /api/superadmin/organizations

Create a new organization with an admin user.

#### Request Body
```json
{
  "name": "New Organization",
  "slug": "new-organization",
  "email": "contact@neworg.com",
  "phone": "+1234567890",
  "address": "123 Business Ave",
  "city": "Business City",
  "country": "Country",
  "admin_first_name": "John",
  "admin_last_name": "Doe",
  "admin_email": "admin@neworg.com",
  "admin_phone": "+1234567891"
}
```

#### Response
```json
{
  "data": {
    "id": "uuid",
    "name": "New Organization",
    "slug": "new-organization",
    "email": "contact@neworg.com",
    "subscription_plan": "basic",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "admin_user_id": "uuid",
    "user_count": 1,
    "appointment_count": 0
  },
  "message": "Organización creada exitosamente"
}
```

#### Error Responses
- `400 Bad Request`: Missing required fields or slug already exists
- `401 Unauthorized`: Invalid authentication
- `403 Forbidden`: User is not a SuperAdmin
- `500 Internal Server Error`: Server error

## Users API

### GET /api/superadmin/users

Retrieve all users in the system with filtering and pagination.

#### Query Parameters
- `role` (optional): Filter by user role
- `status` (optional): Filter by status (`active`, `inactive`)
- `organization` (optional): Filter by organization ID
- `search` (optional): Search in name and email
- `limit` (optional): Number of results (default: 100)
- `offset` (optional): Pagination offset (default: 0)

#### Response
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+1234567890",
      "role": "admin|doctor|staff|patient",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "last_sign_in_at": "2024-01-01T12:00:00Z",
      "organization": {
        "id": "uuid",
        "name": "Organization Name",
        "slug": "organization-slug"
      }
    }
  ],
  "stats": {
    "total": 100,
    "active": 85,
    "inactive": 15,
    "byRole": {
      "admin": 5,
      "doctor": 20,
      "staff": 15,
      "patient": 60
    }
  },
  "pagination": {
    "total": 100,
    "limit": 100,
    "offset": 0,
    "hasMore": false
  }
}
```

### PUT /api/superadmin/users

Update user status or role.

#### Request Body
```json
{
  "userId": "uuid",
  "updates": {
    "is_active": false,
    "role": "staff"
  }
}
```

#### Response
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "staff",
    "is_active": false,
    "organization": {
      "id": "uuid",
      "name": "Organization Name",
      "slug": "organization-slug"
    }
  },
  "message": "Usuario actualizado exitosamente"
}
```

### DELETE /api/superadmin/users

Deactivate a user (soft delete).

#### Query Parameters
- `userId`: User ID to deactivate

#### Response
```json
{
  "message": "Usuario desactivado exitosamente"
}
```

#### Error Responses
- `400 Bad Request`: Missing user ID
- `403 Forbidden`: Cannot modify SuperAdmin users
- `500 Internal Server Error`: Server error

## System Health API

### GET /api/superadmin/system/health

Get comprehensive system health metrics.

#### Response
```json
{
  "data": {
    "status": "healthy|warning|critical",
    "uptime": "15 días, 3 horas",
    "cpu_usage": 45,
    "memory_usage": 62,
    "disk_usage": 38,
    "database_status": "connected|slow|disconnected",
    "api_response_time": 120,
    "active_connections": 24,
    "last_backup": "2024-01-15T02:00:00Z",
    "version": "1.0.0",
    "metrics": {
      "total_organizations": 10,
      "total_users": 250,
      "total_appointments": 1500,
      "database_response_time": 45
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### POST /api/superadmin/system/health

Trigger manual health check.

#### Response
```json
{
  "data": {
    // Same as GET response
  },
  "message": "Verificación de salud del sistema completada",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## System Configuration API

### GET /api/superadmin/system/config

Get system configuration settings.

#### Response
```json
{
  "data": {
    "maintenance_mode": false,
    "registration_enabled": true,
    "email_notifications": true,
    "backup_frequency": "daily",
    "max_organizations": 100,
    "max_users_per_org": 1000,
    "session_timeout": 480,
    "api_rate_limit": 1000,
    "file_upload_limit": 10,
    "default_subscription_plan": "basic"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### PUT /api/superadmin/system/config

Update system configuration.

#### Request Body
```json
{
  "maintenance_mode": true,
  "max_organizations": 150,
  "session_timeout": 600
}
```

#### Response
```json
{
  "data": {
    // Updated configuration object
  },
  "message": "Configuración del sistema actualizada exitosamente",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Validation Rules
- `maintenance_mode`: boolean
- `registration_enabled`: boolean
- `email_notifications`: boolean
- `backup_frequency`: "hourly"|"daily"|"weekly"|"monthly"
- `max_organizations`: positive integer
- `max_users_per_org`: positive integer
- `session_timeout`: positive integer (minutes)
- `api_rate_limit`: positive integer (requests per hour)
- `file_upload_limit`: positive integer (MB)
- `default_subscription_plan`: "basic"|"professional"|"enterprise"

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {
    // Additional error details when available
  }
}
```

### Common Error Codes
- `UNAUTHORIZED`: Invalid or missing authentication
- `FORBIDDEN`: Insufficient permissions
- `VALIDATION_ERROR`: Invalid request data
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource conflict (e.g., duplicate slug)
- `INTERNAL_ERROR`: Server error

## Rate Limiting

SuperAdmin endpoints have higher rate limits:
- 1000 requests per hour per user
- Burst limit: 100 requests per minute

## Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Authorization**: SuperAdmin role verification on every request
3. **Audit Logging**: All SuperAdmin actions are logged
4. **Data Validation**: Strict input validation and sanitization
5. **Rate Limiting**: Protection against abuse
6. **HTTPS Only**: All communication must be encrypted

## Examples

### Create Organization with cURL
```bash
curl -X POST https://api.agentsalud.com/api/superadmin/organizations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Clinic",
    "slug": "new-clinic",
    "email": "contact@newclinic.com",
    "admin_first_name": "Jane",
    "admin_last_name": "Smith",
    "admin_email": "admin@newclinic.com"
  }'
```

### Get System Health
```bash
curl -X GET https://api.agentsalud.com/api/superadmin/system/health \
  -H "Authorization: Bearer <token>"
```

### Update System Configuration
```bash
curl -X PUT https://api.agentsalud.com/api/superadmin/system/config \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "maintenance_mode": false,
    "max_organizations": 200
  }'
```
