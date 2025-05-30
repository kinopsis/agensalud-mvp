/**
 * @fileoverview Tests for Doctor Schedule API endpoint
 * @description Validates doctor availability schedule retrieval functionality
 * @author AgentSalud MVP Team
 * @version 1.0.0
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/doctors/[id]/schedule/route';
import { createMockSupabaseClient } from '../../__mocks__/supabase';

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

describe('/api/doctors/[id]/schedule', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
  });

  describe('GET /api/doctors/[id]/schedule', () => {
    const validDoctorId = '5bfbf7b8-e021-4657-ae42-a3fa185d4ab6';
    const validProfileId = 'c923e0ec-d941-48d1-9fe6-0d75122e3cbe';

    /**
     * Test successful schedule retrieval
     */
    it('should return doctor schedule successfully', async () => {
      // Mock doctor lookup
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { profile_id: validProfileId },
              error: null,
            }),
          }),
        }),
      });

      // Mock schedule query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: '49f6f8ee-a51b-44dd-91b0-441bea4ff0bd',
                  doctor_id: validProfileId,
                  day_of_week: 1,
                  start_time: '08:00:00',
                  end_time: '12:00:00',
                  is_active: true,
                  notes: 'Consultas generales de optometría',
                },
              ],
              error: null,
            }),
          }),
        }),
      });

      const request = new NextRequest(
        `http://localhost:3001/api/doctors/${validDoctorId}/schedule`
      );

      const response = await GET(request, { params: { id: validDoctorId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0]).toMatchObject({
        day_of_week: 1,
        start_time: '08:00:00',
        end_time: '12:00:00',
        is_active: true,
      });
    });

    /**
     * Test doctor not found scenario
     */
    it('should return 404 when doctor not found', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows found' },
            }),
          }),
        }),
      });

      const request = new NextRequest(
        `http://localhost:3001/api/doctors/invalid-id/schedule`
      );

      const response = await GET(request, { params: { id: 'invalid-id' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Doctor not found');
    });

    /**
     * Test empty schedule scenario
     */
    it('should return empty array when doctor has no schedule', async () => {
      // Mock doctor lookup
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { profile_id: validProfileId },
              error: null,
            }),
          }),
        }),
      });

      // Mock empty schedule query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      const request = new NextRequest(
        `http://localhost:3001/api/doctors/${validDoctorId}/schedule`
      );

      const response = await GET(request, { params: { id: validDoctorId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
      expect(data.count).toBe(0);
    });

    /**
     * Test database error handling
     */
    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: '42P01', message: 'relation does not exist' },
            }),
          }),
        }),
      });

      const request = new NextRequest(
        `http://localhost:3001/api/doctors/${validDoctorId}/schedule`
      );

      const response = await GET(request, { params: { id: validDoctorId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Database error');
    });

    /**
     * Test invalid doctor ID format
     */
    it('should handle invalid UUID format', async () => {
      const invalidId = 'not-a-uuid';
      const request = new NextRequest(
        `http://localhost:3001/api/doctors/${invalidId}/schedule`
      );

      const response = await GET(request, { params: { id: invalidId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid doctor ID format');
    });

    /**
     * Test schedule ordering by day_of_week
     */
    it('should return schedules ordered by day of week', async () => {
      const mockSchedules = [
        { day_of_week: 5, start_time: '09:00:00' },
        { day_of_week: 1, start_time: '08:00:00' },
        { day_of_week: 3, start_time: '14:00:00' },
      ];

      // Mock doctor lookup
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { profile_id: validProfileId },
              error: null,
            }),
          }),
        }),
      });

      // Mock schedule query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockSchedules,
              error: null,
            }),
          }),
        }),
      });

      const request = new NextRequest(
        `http://localhost:3001/api/doctors/${validDoctorId}/schedule`
      );

      const response = await GET(request, { params: { id: validDoctorId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockSupabase.from().select().eq().order).toHaveBeenCalledWith('day_of_week');
    });
  });
});
