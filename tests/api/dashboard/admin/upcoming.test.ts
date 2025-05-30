/**
 * @fileoverview Tests for Admin Dashboard Upcoming Appointments API
 * @description Validates upcoming appointments retrieval for admin dashboard
 * @author AgentSalud MVP Team
 * @version 1.0.0
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/dashboard/admin/upcoming/route';
import { createMockSupabaseClient } from '../../../__mocks__/supabase';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createServerComponentClient: jest.fn(() => createMockSupabaseClient()),
}));

// Mock Next.js cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    getAll: jest.fn(() => []),
  })),
}));

describe('/api/dashboard/admin/upcoming', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
  });

  describe('GET /api/dashboard/admin/upcoming', () => {
    const validOrgId = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';

    /**
     * Test successful upcoming appointments retrieval
     */
    it('should return upcoming appointments successfully', async () => {
      const mockAppointments = [
        {
          id: 'apt-1',
          appointment_date: '2024-01-15',
          start_time: '09:00:00',
          end_time: '10:00:00',
          status: 'confirmed',
          notes: 'Consulta de rutina',
          patient: [{ first_name: 'Juan', last_name: 'Pérez', phone: '123456789' }],
          doctor: [{ 
            profile_id: 'doc-1',
            profiles: [{ first_name: 'Ana', last_name: 'Rodríguez' }]
          }],
          service: [{ name: 'Consulta General' }],
          location: [{ name: 'Sede Principal' }],
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: mockAppointments,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const url = `http://localhost:3001/api/dashboard/admin/upcoming?organizationId=${validOrgId}&limit=5`;
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0]).toMatchObject({
        id: 'apt-1',
        patient_name: 'Juan Pérez',
        doctor_name: 'Ana Rodríguez',
        service_name: 'Consulta General',
        location_name: 'Sede Principal',
      });
    });

    /**
     * Test missing organization ID
     */
    it('should return 400 when organizationId is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3001/api/dashboard/admin/upcoming'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Organization ID is required');
    });

    /**
     * Test empty appointments list
     */
    it('should return empty array when no upcoming appointments', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const url = `http://localhost:3001/api/dashboard/admin/upcoming?organizationId=${validOrgId}`;
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
      expect(data.count).toBe(0);
    });

    /**
     * Test limit parameter validation
     */
    it('should apply default limit when not specified', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const url = `http://localhost:3001/api/dashboard/admin/upcoming?organizationId=${validOrgId}`;
      const request = new NextRequest(url);

      await GET(request);

      expect(mockSupabase.from().select().eq().gte().order().limit)
        .toHaveBeenCalledWith(10); // Default limit
    });

    /**
     * Test custom limit parameter
     */
    it('should apply custom limit when specified', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const url = `http://localhost:3001/api/dashboard/admin/upcoming?organizationId=${validOrgId}&limit=25`;
      const request = new NextRequest(url);

      await GET(request);

      expect(mockSupabase.from().select().eq().gte().order().limit)
        .toHaveBeenCalledWith(25);
    });

    /**
     * Test database error handling
     */
    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST200', message: 'Schema cache error' },
                }),
              }),
            }),
          }),
        }),
      });

      const url = `http://localhost:3001/api/dashboard/admin/upcoming?organizationId=${validOrgId}`;
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Error fetching upcoming appointments');
    });

    /**
     * Test data formatting with missing nested data
     */
    it('should handle missing nested data gracefully', async () => {
      const mockAppointments = [
        {
          id: 'apt-1',
          appointment_date: '2024-01-15',
          start_time: '09:00:00',
          end_time: '10:00:00',
          status: 'confirmed',
          notes: null,
          patient: [],
          doctor: [],
          service: [],
          location: [],
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: mockAppointments,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const url = `http://localhost:3001/api/dashboard/admin/upcoming?organizationId=${validOrgId}`;
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data[0]).toMatchObject({
        patient_name: 'Paciente desconocido',
        doctor_name: 'Doctor desconocido',
        service_name: 'Servicio desconocido',
        location_name: null,
      });
    });
  });
});
