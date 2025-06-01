# 🔌 AgentSalud MVP - API Documentation

## 📋 Overview

The AgentSalud MVP API provides comprehensive endpoints for managing healthcare appointments, user authentication, AI-powered booking, and multi-tenant operations. Built with Next.js API Routes and Supabase backend.

## 🚀 Quick Start

### 🔑 Authentication
All API endpoints require authentication via Supabase Auth. Include the authorization header:

```javascript
headers: {
  'Authorization': `Bearer ${supabaseToken}`,
  'Content-Type': 'application/json'
}
```

### 🌐 Base URL
```
Development: http://localhost:3000/api
Production: https://agensalud-mvp.vercel.app/api
```

### 📊 Response Format
All API responses follow a consistent format:

```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}
```

## 🔐 Authentication & Authorization

### 🎯 Role-Based Access Control
- **SuperAdmin**: Global access to all tenants and operations
- **Admin**: Full access within their organization
- **Staff**: Limited access to assigned operations
- **Doctor**: Access to personal schedule and appointments
- **Patient**: Access to personal appointments and booking

### 🛡️ Security Features
- **Row-Level Security (RLS)**: Database-level access control
- **Multi-Tenant Isolation**: Automatic data separation by organization
- **JWT Tokens**: Secure session management via Supabase Auth
- **API Rate Limiting**: Protection against abuse and overuse

## 📚 API Categories

### 🤖 AI & Natural Language Processing
- **[/api/ai/chat](endpoints.md#ai-chat)** - Conversational AI chatbot
- **[/api/ai/appointments](endpoints.md#ai-appointments)** - AI-powered appointment booking
- **[/api/ai/suggestions](endpoints.md#ai-suggestions)** - Intelligent scheduling recommendations

### 👥 User Management
- **[/api/auth](endpoints.md#authentication)** - Authentication and session management
- **[/api/users](endpoints.md#users)** - User profile management
- **[/api/profiles](endpoints.md#profiles)** - Extended profile information

### 🏥 Healthcare Operations
- **[/api/appointments](endpoints.md#appointments)** - Appointment CRUD operations
- **[/api/doctors](endpoints.md#doctors)** - Doctor management and schedules
- **[/api/patients](endpoints.md#patients)** - Patient registration and management
- **[/api/services](endpoints.md#services)** - Medical services configuration

### 🏢 Organization Management
- **[/api/organizations](endpoints.md#organizations)** - Multi-tenant organization management
- **[/api/locations](endpoints.md#locations)** - Clinic and hospital location management

### 📊 Analytics & Reporting
- **[/api/analytics](endpoints.md#analytics)** - Usage statistics and insights
- **[/api/reports](endpoints.md#reports)** - Comprehensive reporting endpoints

## 🔄 Common Patterns

### 📝 CRUD Operations
Most entities follow standard CRUD patterns:

```typescript
GET    /api/{entity}           # List all (with pagination)
GET    /api/{entity}/{id}      # Get specific item
POST   /api/{entity}           # Create new item
PUT    /api/{entity}/{id}      # Update existing item
DELETE /api/{entity}/{id}      # Delete item
```

### 🔍 Query Parameters
Standard query parameters for list endpoints:

```typescript
interface QueryParams {
  page?: number;        // Page number (default: 1)
  limit?: number;       // Items per page (default: 10, max: 100)
  sort?: string;        // Sort field
  order?: 'asc' | 'desc'; // Sort direction
  search?: string;      // Search query
  filter?: string;      // Filter criteria
}
```

### 📄 Pagination Response
List endpoints return paginated responses:

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

## 🚨 Error Handling

### 📊 HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **409**: Conflict
- **422**: Validation Error
- **500**: Internal Server Error

### 🔍 Error Response Format
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  details?: {
    field?: string;
    code?: string;
    message?: string;
  }[];
  timestamp: string;
}
```

### 🛠️ Common Error Scenarios
- **Authentication Errors**: Invalid or expired tokens
- **Authorization Errors**: Insufficient permissions for operation
- **Validation Errors**: Invalid input data or missing required fields
- **Conflict Errors**: Scheduling conflicts or duplicate data
- **Rate Limiting**: Too many requests from client

## 📊 Rate Limiting

### 🚦 Limits by Endpoint Type
- **Authentication**: 10 requests/minute
- **AI Endpoints**: 30 requests/minute
- **CRUD Operations**: 100 requests/minute
- **Read-only Queries**: 200 requests/minute

### 📈 Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 🧪 Testing & Development

### 🔧 Development Tools
- **API Testing**: Use Postman collection or curl commands
- **Authentication**: Obtain tokens via Supabase Auth
- **Local Development**: Run `npm run dev` for local API server

### 📋 Testing Checklist
- [ ] Authentication with valid tokens
- [ ] Role-based access control validation
- [ ] Multi-tenant data isolation
- [ ] Input validation and error handling
- [ ] Rate limiting compliance

## 📚 Additional Resources

### 📖 Detailed Documentation
- **[Endpoint Reference](endpoints.md)** - Complete API endpoint documentation
- **[Authentication Guide](authentication.md)** - Security and access control details
- **[Database Schema](../database/schema.md)** - Data structure and relationships

### 🔗 External Resources
- [Supabase API Documentation](https://supabase.com/docs/reference/api)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)

### 🛠️ Development Support
- **Validation Scripts**: `npm run validate:api`
- **Testing Suite**: `npm run test:api`
- **Debug Tools**: Available at `/debug/api` in development

---

**API Version**: 1.0  
**Last Updated**: January 2025  
**Status**: Production Ready  
**Support**: Check troubleshooting guide for common issues
