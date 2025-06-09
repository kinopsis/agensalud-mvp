import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';
export const revalidate = 0;


/**
 * GET /api/docs/endpoints
 * Get comprehensive API documentation for all endpoints
 * Returns role-based filtered documentation
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user and verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile to determine role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Define comprehensive API documentation
    const endpoints = [
      // Authentication Endpoints
      {
        id: 'auth-login',
        method: 'POST' as const,
        path: '/api/auth/login',
        title: 'User Login',
        description: 'Authenticate user and obtain access token',
        category: 'authentication',
        roles: ['admin', 'doctor', 'staff', 'patient', 'superadmin'],
        authentication: false,
        parameters: [],
        requestBody: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 }
          },
          required: ['email', 'password'],
          example: {
            email: 'user@example.com',
            password: 'securepassword'
          }
        },
        responses: [
          {
            status: 200,
            description: 'Login successful',
            schema: { type: 'object' },
            example: {
              success: true,
              user: { id: 'uuid', email: 'user@example.com' },
              token: 'jwt_token_here'
            }
          },
          {
            status: 401,
            description: 'Invalid credentials',
            schema: { type: 'object' },
            example: { error: 'Invalid email or password' }
          }
        ],
        examples: [
          {
            title: 'Basic Login',
            description: 'Standard user authentication',
            request: { email: 'doctor@clinic.com', password: 'password123' },
            response: { success: true, token: 'eyJ...' }
          }
        ]
      },

      // Services Endpoints
      {
        id: 'services-list',
        method: 'GET' as const,
        path: '/api/services',
        title: 'List Services',
        description: 'Get all services for an organization with filtering',
        category: 'services',
        roles: ['admin', 'doctor', 'staff', 'patient', 'superadmin'],
        authentication: true,
        parameters: [
          {
            name: 'organizationId',
            type: 'string',
            required: true,
            description: 'Organization UUID',
            example: '123e4567-e89b-12d3-a456-426614174000'
          },
          {
            name: 'category',
            type: 'string',
            required: false,
            description: 'Filter by service category',
            example: 'consultation'
          },
          {
            name: 'status',
            type: 'string',
            required: false,
            description: 'Filter by service status',
            enum: ['active', 'inactive']
          },
          {
            name: 'search',
            type: 'string',
            required: false,
            description: 'Search term for service name or description',
            example: 'cardiology'
          }
        ],
        responses: [
          {
            status: 200,
            description: 'Services retrieved successfully',
            schema: { type: 'object' },
            example: {
              success: true,
              services: [
                {
                  id: 'uuid',
                  name: 'Cardiology Consultation',
                  description: 'Heart health consultation',
                  duration_minutes: 45,
                  price: 150.00,
                  category: 'consultation',
                  is_active: true
                }
              ]
            }
          }
        ],
        examples: [
          {
            title: 'Get All Services',
            description: 'Retrieve all services for organization',
            request: { organizationId: '123e4567-e89b-12d3-a456-426614174000' },
            response: { success: true, services: [] }
          }
        ]
      },

      {
        id: 'services-create',
        method: 'POST' as const,
        path: '/api/services',
        title: 'Create Service',
        description: 'Create a new medical service',
        category: 'services',
        roles: ['admin', 'superadmin'],
        authentication: true,
        requestBody: {
          type: 'object',
          properties: {
            name: { type: 'string', maxLength: 255 },
            description: { type: 'string' },
            duration_minutes: { type: 'number', minimum: 5, maximum: 480 },
            price: { type: 'number', minimum: 0 },
            category: { type: 'string' },
            is_active: { type: 'boolean' }
          },
          required: ['name', 'duration_minutes'],
          example: {
            name: 'General Consultation',
            description: 'Standard medical consultation',
            duration_minutes: 30,
            price: 75.00,
            category: 'consultation',
            is_active: true
          }
        },
        responses: [
          {
            status: 201,
            description: 'Service created successfully',
            schema: { type: 'object' },
            example: {
              success: true,
              service: {
                id: 'uuid',
                name: 'General Consultation',
                duration_minutes: 30,
                price: 75.00
              }
            }
          }
        ],
        examples: [
          {
            title: 'Create Basic Service',
            description: 'Create a standard consultation service',
            request: {
              name: 'General Consultation',
              duration_minutes: 30,
              price: 75.00
            },
            response: { success: true, service: { id: 'uuid' } }
          }
        ]
      },

      // Appointments Endpoints
      {
        id: 'appointments-list',
        method: 'GET' as const,
        path: '/api/appointments',
        title: 'List Appointments',
        description: 'Get appointments with filtering and pagination',
        category: 'appointments',
        roles: ['admin', 'doctor', 'staff', 'patient', 'superadmin'],
        authentication: true,
        parameters: [
          {
            name: 'organizationId',
            type: 'string',
            required: true,
            description: 'Organization UUID'
          },
          {
            name: 'date',
            type: 'string',
            required: false,
            description: 'Filter by appointment date (YYYY-MM-DD)',
            example: '2024-01-15'
          },
          {
            name: 'doctorId',
            type: 'string',
            required: false,
            description: 'Filter by doctor UUID'
          },
          {
            name: 'status',
            type: 'string',
            required: false,
            description: 'Filter by appointment status',
            enum: ['scheduled', 'completed', 'cancelled', 'no_show']
          }
        ],
        responses: [
          {
            status: 200,
            description: 'Appointments retrieved successfully',
            schema: { type: 'object' },
            example: {
              success: true,
              appointments: [
                {
                  id: 'uuid',
                  appointment_date: '2024-01-15',
                  start_time: '09:00:00',
                  end_time: '09:30:00',
                  status: 'scheduled',
                  patient: { name: 'John Doe' },
                  doctor: { name: 'Dr. Smith' },
                  service: { name: 'Consultation' }
                }
              ]
            }
          }
        ],
        examples: [
          {
            title: 'Get Today\'s Appointments',
            description: 'Retrieve all appointments for today',
            request: { date: '2024-01-15' },
            response: { success: true, appointments: [] }
          }
        ]
      },

      {
        id: 'appointments-create',
        method: 'POST' as const,
        path: '/api/appointments',
        title: 'Create Appointment',
        description: 'Create a new appointment (supports manual and AI booking)',
        category: 'appointments',
        roles: ['admin', 'doctor', 'staff', 'patient', 'superadmin'],
        authentication: true,
        requestBody: {
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
          required: ['patientId', 'appointmentDate', 'startTime', 'endTime'],
          example: {
            patientId: 'uuid',
            doctorId: 'uuid',
            serviceId: 'uuid',
            appointmentDate: '2024-01-15',
            startTime: '09:00',
            endTime: '09:30',
            notes: 'Follow-up consultation'
          }
        },
        responses: [
          {
            status: 201,
            description: 'Appointment created successfully',
            schema: { type: 'object' },
            example: {
              success: true,
              appointment: {
                id: 'uuid',
                appointment_date: '2024-01-15',
                start_time: '09:00:00',
                status: 'scheduled'
              },
              appointmentId: 'uuid'
            }
          }
        ],
        examples: [
          {
            title: 'Book Standard Appointment',
            description: 'Create a regular appointment booking',
            request: {
              patientId: 'uuid',
              doctorId: 'uuid',
              appointmentDate: '2024-01-15',
              startTime: '09:00',
              endTime: '09:30'
            },
            response: { success: true, appointmentId: 'uuid' }
          }
        ]
      },

      // Users Management
      {
        id: 'users-list',
        method: 'GET' as const,
        path: '/api/users',
        title: 'List Users',
        description: 'Get users for organization management',
        category: 'users',
        roles: ['admin', 'superadmin'],
        authentication: true,
        parameters: [
          {
            name: 'organizationId',
            type: 'string',
            required: true,
            description: 'Organization UUID'
          },
          {
            name: 'role',
            type: 'string',
            required: false,
            description: 'Filter by user role',
            enum: ['admin', 'doctor', 'staff', 'patient']
          }
        ],
        responses: [
          {
            status: 200,
            description: 'Users retrieved successfully',
            schema: { type: 'object' },
            example: {
              success: true,
              users: [
                {
                  id: 'uuid',
                  email: 'user@example.com',
                  first_name: 'John',
                  last_name: 'Doe',
                  role: 'doctor',
                  is_active: true
                }
              ]
            }
          }
        ],
        examples: [
          {
            title: 'Get All Doctors',
            description: 'Retrieve all doctors in organization',
            request: { role: 'doctor' },
            response: { success: true, users: [] }
          }
        ]
      }
    ];

    // Filter endpoints based on user role
    const filteredEndpoints = endpoints.filter(endpoint => 
      endpoint.roles.includes(profile.role)
    );

    return NextResponse.json({
      success: true,
      endpoints: filteredEndpoints,
      total: filteredEndpoints.length,
      userRole: profile.role
    });

  } catch (error) {
    console.error('Error in GET /api/docs/endpoints:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
