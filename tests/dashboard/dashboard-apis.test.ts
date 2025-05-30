/**
 * Dashboard APIs Tests
 * Tests for dashboard API endpoints and data processing
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET as adminStatsGET } from '@/app/api/dashboard/admin/stats/route';
import { GET as adminActivityGET } from '@/app/api/dashboard/admin/activity/route';
import { GET as adminUpcomingGET } from '@/app/api/dashboard/admin/upcoming/route';
import { GET as doctorStatsGET } from '@/app/api/dashboard/doctor/stats/route';
import { GET as patientStatsGET } from '@/app/api/dashboard/patient/stats/route';
import { GET as staffStatsGET } from '@/app/api/dashboard/staff/stats/route';
import { GET as staffTasksGET } from '@/app/api/dashboard/staff/tasks/route';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn()
            }))
          }))
        })),
        lte: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn()
          }))
        })),
        in: jest.fn(() => ({
          or: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn()
            }))
          }))
        })),
        order: jest.fn(() => ({
          limit: jest.fn()
        })),
        limit: jest.fn()
      }))
    }))
  }))
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient
}));

describe('Admin Dashboard APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful authentication
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-user-id' } },
      error: null
    });

    // Mock admin profile
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  role: 'admin',
                  organization_id: 'test-org-id'
                },
                error: null
              })
            }))
          }))
        };
      }
      return mockSupabaseClient.from();
    });
  });

  describe('GET /api/dashboard/admin/stats', () => {
    it('should return admin statistics successfully', async () => {
      // Mock appointments data
      const mockAppointmentsChain = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn().mockResolvedValue({
                data: Array(25).fill({ id: 'apt-id' }),
                error: null
              })
            }))
          }))
        }))
      };

      // Mock patients data
      const mockPatientsChain = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({
              data: Array(50).fill({ 
                id: 'patient-id',
                created_at: new Date().toISOString()
              }),
              error: null
            })
          }))
        }))
      };

      // Mock doctors data
      const mockDoctorsChain = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({
              data: Array(5).fill({ id: 'doctor-id' }),
              error: null
            })
          }))
        }))
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        switch (table) {
          case 'profiles':
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { role: 'admin', organization_id: 'test-org-id' },
                    error: null
                  }),
                  eq: jest.fn().mockImplementation((field: string, value: string) => {
                    if (field === 'role' && value === 'patient') {
                      return mockPatientsChain;
                    }
                    if (field === 'role' && value === 'doctor') {
                      return mockDoctorsChain;
                    }
                    return mockPatientsChain;
                  })
                }))
              }))
            };
          case 'appointments':
            return mockAppointmentsChain;
          default:
            return mockSupabaseClient.from();
        }
      });

      const request = new NextRequest('http://localhost/api/dashboard/admin/stats?organizationId=test-org-id');
      const response = await adminStatsGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('totalAppointments');
      expect(data.data).toHaveProperty('todayAppointments');
      expect(data.data).toHaveProperty('totalPatients');
      expect(data.data).toHaveProperty('totalDoctors');
      expect(typeof data.data.totalAppointments).toBe('number');
    });

    it('should require organization ID', async () => {
      const request = new NextRequest('http://localhost/api/dashboard/admin/stats');
      const response = await adminStatsGET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Organization ID is required');
    });

    it('should require admin permissions', async () => {
      // Mock non-admin user
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    role: 'patient',
                    organization_id: 'test-org-id'
                  },
                  error: null
                })
              }))
            }))
          };
        }
        return mockSupabaseClient.from();
      });

      const request = new NextRequest('http://localhost/api/dashboard/admin/stats?organizationId=test-org-id');
      const response = await adminStatsGET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Insufficient permissions');
    });
  });

  describe('GET /api/dashboard/admin/activity', () => {
    it('should return recent activity successfully', async () => {
      // Mock recent appointments
      const mockActivityChain = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'apt-1',
                    status: 'confirmed',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    patient: { first_name: 'Juan', last_name: 'Pérez' },
                    doctor: { first_name: 'María', last_name: 'García' },
                    service: { name: 'Examen Visual' }
                  }
                ],
                error: null
              })
            }))
          }))
        }))
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { role: 'admin', organization_id: 'test-org-id' },
                  error: null
                }),
                order: jest.fn(() => ({
                  limit: jest.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'user-1',
                        first_name: 'Ana',
                        last_name: 'López',
                        role: 'patient',
                        created_at: new Date().toISOString()
                      }
                    ],
                    error: null
                  })
                }))
              }))
            }))
          };
        }
        if (table === 'appointments') {
          return mockActivityChain;
        }
        return mockSupabaseClient.from();
      });

      const request = new NextRequest('http://localhost/api/dashboard/admin/activity?organizationId=test-org-id&limit=5');
      const response = await adminActivityGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.data[0]).toHaveProperty('type');
      expect(data.data[0]).toHaveProperty('description');
      expect(data.data[0]).toHaveProperty('timestamp');
    });
  });
});

describe('Doctor Dashboard APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'doctor-user-id' } },
      error: null
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  role: 'doctor',
                  organization_id: 'test-org-id'
                },
                error: null
              })
            }))
          }))
        };
      }
      return mockSupabaseClient.from();
    });
  });

  describe('GET /api/dashboard/doctor/stats', () => {
    it('should return doctor statistics successfully', async () => {
      // Mock appointments data
      const mockAppointmentsChain = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({
              data: Array(8).fill({ id: 'apt-id', status: 'confirmed' }),
              error: null
            }),
            gte: jest.fn(() => ({
              lte: jest.fn().mockResolvedValue({
                data: Array(35).fill({ id: 'apt-id' }),
                error: null
              })
            })),
            in: jest.fn(() => ({
              or: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn().mockResolvedValue({
                    data: [{
                      start_time: '14:30',
                      patient: { first_name: 'Ana', last_name: 'Martínez' },
                      service: { name: 'Control Visual' }
                    }],
                    error: null
                  }),
                  single: jest.fn().mockResolvedValue({
                    data: {
                      start_time: '14:30',
                      patient: { first_name: 'Ana', last_name: 'Martínez' },
                      service: { name: 'Control Visual' }
                    },
                    error: null
                  })
                }))
              }))
            }))
          }))
        }))
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { role: 'doctor', organization_id: 'test-org-id' },
                  error: null
                })
              }))
            }))
          };
        }
        if (table === 'appointments') {
          return mockAppointmentsChain;
        }
        if (table === 'doctor_availability') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    { start_time: '09:00', end_time: '17:00' }
                  ],
                  error: null
                })
              }))
            }))
          };
        }
        return mockSupabaseClient.from();
      });

      const request = new NextRequest('http://localhost/api/dashboard/doctor/stats?doctorId=doctor-user-id&organizationId=test-org-id');
      const response = await doctorStatsGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('todayAppointments');
      expect(data.data).toHaveProperty('weekAppointments');
      expect(data.data).toHaveProperty('monthAppointments');
      expect(data.data).toHaveProperty('totalPatients');
      expect(data.data).toHaveProperty('availableHours');
    });

    it('should require doctor ID and organization ID', async () => {
      const request = new NextRequest('http://localhost/api/dashboard/doctor/stats');
      const response = await doctorStatsGET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Doctor ID and Organization ID are required');
    });
  });
});

describe('Patient Dashboard APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'patient-user-id' } },
      error: null
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  role: 'patient',
                  organization_id: 'test-org-id'
                },
                error: null
              })
            }))
          }))
        };
      }
      return mockSupabaseClient.from();
    });
  });

  describe('GET /api/dashboard/patient/stats', () => {
    it('should return patient statistics successfully', async () => {
      // Mock appointments data
      const mockAppointmentsChain = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            in: jest.fn(() => ({
              or: jest.fn().mockResolvedValue({
                data: Array(2).fill({ id: 'apt-id' }),
                error: null
              })
            })),
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn().mockResolvedValue({
                  data: [{
                    appointment_date: '2025-01-20',
                    doctor: { first_name: 'María', last_name: 'García' },
                    service: { name: 'Control Visual' }
                  }],
                  error: null
                }),
                single: jest.fn().mockResolvedValue({
                  data: {
                    appointment_date: '2025-01-20',
                    doctor: { first_name: 'María', last_name: 'García' },
                    service: { name: 'Control Visual' }
                  },
                  error: null
                })
              }))
            }))
          }))
        }))
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { role: 'patient', organization_id: 'test-org-id' },
                  error: null
                })
              }))
            }))
          };
        }
        if (table === 'appointments') {
          return mockAppointmentsChain;
        }
        return mockSupabaseClient.from();
      });

      const request = new NextRequest('http://localhost/api/dashboard/patient/stats?patientId=patient-user-id&organizationId=test-org-id');
      const response = await patientStatsGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('upcomingAppointments');
      expect(data.data).toHaveProperty('totalAppointments');
      expect(data.data).toHaveProperty('lastAppointment');
    });
  });
});

describe('Staff Dashboard APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'staff-user-id' } },
      error: null
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  role: 'staff',
                  organization_id: 'test-org-id'
                },
                error: null
              })
            }))
          }))
        };
      }
      return mockSupabaseClient.from();
    });
  });

  describe('GET /api/dashboard/staff/stats', () => {
    it('should return staff statistics successfully', async () => {
      // Mock appointments and patients data
      const mockAppointmentsChain = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({
              data: Array(18).fill({ id: 'apt-id', status: 'confirmed' }),
              error: null
            })
          }))
        }))
      };

      const mockPatientsChain = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({
              data: Array(234).fill({ id: 'patient-id' }),
              error: null
            })
          }))
        }))
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { role: 'staff', organization_id: 'test-org-id' },
                  error: null
                }),
                eq: jest.fn().mockResolvedValue({
                  data: Array(234).fill({ id: 'patient-id' }),
                  error: null
                })
              }))
            }))
          };
        }
        if (table === 'appointments') {
          return mockAppointmentsChain;
        }
        return mockSupabaseClient.from();
      });

      const request = new NextRequest('http://localhost/api/dashboard/staff/stats?organizationId=test-org-id');
      const response = await staffStatsGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('todayAppointments');
      expect(data.data).toHaveProperty('pendingAppointments');
      expect(data.data).toHaveProperty('totalPatients');
      expect(data.data).toHaveProperty('completedToday');
      expect(data.data).toHaveProperty('upcomingToday');
    });
  });
});
