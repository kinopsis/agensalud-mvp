import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/docs/openapi.json
 * Generate OpenAPI 3.0 specification for AgentSalud API
 * Provides machine-readable API documentation
 */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://api.agentsalud.com' 
      : 'http://localhost:3000';

    const openApiSpec = {
      openapi: '3.0.3',
      info: {
        title: 'AgentSalud API',
        description: 'Comprehensive API for AgentSalud medical appointment management system',
        version: '1.0.0',
        contact: {
          name: 'AgentSalud Support',
          email: 'support@agentsalud.com',
          url: 'https://agentsalud.com/support'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      servers: [
        {
          url: baseUrl,
          description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
        }
      ],
      security: [
        {
          bearerAuth: []
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token obtained from login endpoint'
          }
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              error: {
                type: 'string',
                description: 'Error message'
              },
              code: {
                type: 'string',
                description: 'Error code'
              },
              details: {
                type: 'object',
                description: 'Additional error details'
              }
            },
            required: ['error']
          },
          Service: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: 'Service unique identifier'
              },
              name: {
                type: 'string',
                maxLength: 255,
                description: 'Service name'
              },
              description: {
                type: 'string',
                description: 'Service description'
              },
              duration_minutes: {
                type: 'integer',
                minimum: 5,
                maximum: 480,
                description: 'Service duration in minutes'
              },
              price: {
                type: 'number',
                minimum: 0,
                description: 'Service price'
              },
              category: {
                type: 'string',
                description: 'Service category'
              },
              is_active: {
                type: 'boolean',
                description: 'Whether service is active'
              },
              organization_id: {
                type: 'string',
                format: 'uuid',
                description: 'Organization identifier'
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                description: 'Creation timestamp'
              },
              updated_at: {
                type: 'string',
                format: 'date-time',
                description: 'Last update timestamp'
              }
            },
            required: ['id', 'name', 'duration_minutes', 'organization_id']
          },
          Appointment: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: 'Appointment unique identifier'
              },
              patient_id: {
                type: 'string',
                format: 'uuid',
                description: 'Patient identifier'
              },
              doctor_id: {
                type: 'string',
                format: 'uuid',
                description: 'Doctor identifier'
              },
              service_id: {
                type: 'string',
                format: 'uuid',
                description: 'Service identifier'
              },
              location_id: {
                type: 'string',
                format: 'uuid',
                description: 'Location identifier'
              },
              appointment_date: {
                type: 'string',
                format: 'date',
                description: 'Appointment date (YYYY-MM-DD)'
              },
              start_time: {
                type: 'string',
                pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$',
                description: 'Appointment start time (HH:MM:SS)'
              },
              end_time: {
                type: 'string',
                pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$',
                description: 'Appointment end time (HH:MM:SS)'
              },
              status: {
                type: 'string',
                enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
                description: 'Appointment status'
              },
              notes: {
                type: 'string',
                description: 'Appointment notes'
              },
              reason: {
                type: 'string',
                description: 'Reason for appointment'
              },
              organization_id: {
                type: 'string',
                format: 'uuid',
                description: 'Organization identifier'
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                description: 'Creation timestamp'
              },
              updated_at: {
                type: 'string',
                format: 'date-time',
                description: 'Last update timestamp'
              }
            },
            required: ['id', 'patient_id', 'appointment_date', 'start_time', 'end_time', 'status', 'organization_id']
          },
          User: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: 'User unique identifier'
              },
              email: {
                type: 'string',
                format: 'email',
                description: 'User email address'
              },
              first_name: {
                type: 'string',
                description: 'User first name'
              },
              last_name: {
                type: 'string',
                description: 'User last name'
              },
              role: {
                type: 'string',
                enum: ['superadmin', 'admin', 'doctor', 'staff', 'patient'],
                description: 'User role'
              },
              organization_id: {
                type: 'string',
                format: 'uuid',
                description: 'Organization identifier'
              },
              is_active: {
                type: 'boolean',
                description: 'Whether user is active'
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                description: 'Creation timestamp'
              },
              updated_at: {
                type: 'string',
                format: 'date-time',
                description: 'Last update timestamp'
              }
            },
            required: ['id', 'email', 'first_name', 'last_name', 'role', 'organization_id']
          }
        }
      },
      paths: {
        '/api/services': {
          get: {
            summary: 'List Services',
            description: 'Get all services for an organization with filtering support',
            tags: ['Services'],
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: 'organizationId',
                in: 'query',
                required: true,
                schema: { type: 'string', format: 'uuid' },
                description: 'Organization UUID'
              },
              {
                name: 'category',
                in: 'query',
                required: false,
                schema: { type: 'string' },
                description: 'Filter by service category'
              },
              {
                name: 'status',
                in: 'query',
                required: false,
                schema: { type: 'string', enum: ['active', 'inactive'] },
                description: 'Filter by service status'
              },
              {
                name: 'search',
                in: 'query',
                required: false,
                schema: { type: 'string' },
                description: 'Search term for service name or description'
              }
            ],
            responses: {
              '200': {
                description: 'Services retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        services: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Service' }
                        }
                      }
                    }
                  }
                }
              },
              '400': {
                description: 'Bad request',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Error' }
                  }
                }
              },
              '401': {
                description: 'Unauthorized',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Error' }
                  }
                }
              }
            }
          },
          post: {
            summary: 'Create Service',
            description: 'Create a new medical service',
            tags: ['Services'],
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', maxLength: 255 },
                      description: { type: 'string' },
                      duration_minutes: { type: 'integer', minimum: 5, maximum: 480 },
                      price: { type: 'number', minimum: 0 },
                      category: { type: 'string' },
                      is_active: { type: 'boolean' }
                    },
                    required: ['name', 'duration_minutes']
                  }
                }
              }
            },
            responses: {
              '201': {
                description: 'Service created successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        service: { $ref: '#/components/schemas/Service' }
                      }
                    }
                  }
                }
              },
              '400': {
                description: 'Bad request',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Error' }
                  }
                }
              },
              '401': {
                description: 'Unauthorized',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Error' }
                  }
                }
              },
              '403': {
                description: 'Forbidden',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Error' }
                  }
                }
              }
            }
          }
        },
        '/api/appointments': {
          get: {
            summary: 'List Appointments',
            description: 'Get appointments with filtering and pagination',
            tags: ['Appointments'],
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: 'organizationId',
                in: 'query',
                required: true,
                schema: { type: 'string', format: 'uuid' },
                description: 'Organization UUID'
              },
              {
                name: 'date',
                in: 'query',
                required: false,
                schema: { type: 'string', format: 'date' },
                description: 'Filter by appointment date (YYYY-MM-DD)'
              },
              {
                name: 'doctorId',
                in: 'query',
                required: false,
                schema: { type: 'string', format: 'uuid' },
                description: 'Filter by doctor UUID'
              },
              {
                name: 'status',
                in: 'query',
                required: false,
                schema: { 
                  type: 'string', 
                  enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'] 
                },
                description: 'Filter by appointment status'
              }
            ],
            responses: {
              '200': {
                description: 'Appointments retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        appointments: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Appointment' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          post: {
            summary: 'Create Appointment',
            description: 'Create a new appointment (supports manual and AI booking)',
            tags: ['Appointments'],
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      patientId: { type: 'string', format: 'uuid' },
                      doctorId: { type: 'string', format: 'uuid' },
                      serviceId: { type: 'string', format: 'uuid' },
                      locationId: { type: 'string', format: 'uuid' },
                      appointmentDate: { type: 'string', format: 'date' },
                      startTime: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
                      endTime: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
                      notes: { type: 'string' },
                      reason: { type: 'string' }
                    },
                    required: ['patientId', 'appointmentDate', 'startTime', 'endTime']
                  }
                }
              }
            },
            responses: {
              '201': {
                description: 'Appointment created successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        appointment: { $ref: '#/components/schemas/Appointment' },
                        appointmentId: { type: 'string', format: 'uuid' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      tags: [
        {
          name: 'Authentication',
          description: 'User authentication and authorization'
        },
        {
          name: 'Services',
          description: 'Medical services management'
        },
        {
          name: 'Appointments',
          description: 'Appointment booking and management'
        },
        {
          name: 'Users',
          description: 'User management'
        },
        {
          name: 'Admin',
          description: 'Administrative operations'
        },
        {
          name: 'SuperAdmin',
          description: 'System-wide administrative operations'
        }
      ]
    };

    return NextResponse.json(openApiSpec, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });

  } catch (error) {
    console.error('Error generating OpenAPI spec:', error);
    return NextResponse.json(
      { error: 'Failed to generate OpenAPI specification' },
      { status: 500 }
    );
  }
}
