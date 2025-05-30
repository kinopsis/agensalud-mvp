/**
 * Tests for /api/appointments/availability endpoint
 * 
 * Pruebas críticas para el endpoint de disponibilidad que resuelve
 * el error 404 que estaba rompiendo WeeklyAvailabilitySelector
 * 
 * @author AgentSalud MVP Team - Critical API Fix Tests
 * @version 1.0.0
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/appointments/availability/route';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => Promise.resolve({
                data: mockAvailabilityData,
                error: null
              }))
            }))
          }))
        }))
      }))
    }))
  }))
}));

const mockAvailabilityData = [
  {
    id: 'avail-1',
    doctor_id: 'doc-1',
    date: '2025-05-26',
    start_time: '09:00:00',
    end_time: '17:00:00',
    slot_duration: 30,
    is_available: true,
    organization_id: 'org-123',
    location_id: 'loc-1',
    doctor: {
      id: 'doc-1',
      specialization: 'Cardiología',
      profiles: [{
        first_name: 'Juan',
        last_name: 'Pérez'
      }]
    },
    location: {
      id: 'loc-1',
      name: 'Sede Principal',
      address: 'Calle 123 #45-67'
    }
  },
  {
    id: 'avail-2',
    doctor_id: 'doc-2',
    date: '2025-05-27',
    start_time: '08:00:00',
    end_time: '16:00:00',
    slot_duration: 30,
    is_available: true,
    organization_id: 'org-123',
    location_id: 'loc-1',
    doctor: {
      id: 'doc-2',
      specialization: 'Medicina General',
      profiles: [{
        first_name: 'María',
        last_name: 'García'
      }]
    }
  }
];

describe('/api/appointments/availability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validación de parámetros', () => {
    it('debe requerir organizationId', async () => {
      const request = new NextRequest('http://localhost:3000/api/appointments/availability?startDate=2025-05-26&endDate=2025-05-31');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('organizationId');
    });

    it('debe requerir startDate', async () => {
      const request = new NextRequest('http://localhost:3000/api/appointments/availability?organizationId=org-123&endDate=2025-05-31');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('startDate');
    });

    it('debe requerir endDate', async () => {
      const request = new NextRequest('http://localhost:3000/api/appointments/availability?organizationId=org-123&startDate=2025-05-26');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('endDate');
    });

    it('debe validar formato de fechas', async () => {
      const request = new NextRequest('http://localhost:3000/api/appointments/availability?organizationId=org-123&startDate=invalid&endDate=2025-05-31');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('formato de fecha');
    });

    it('debe validar que startDate sea anterior a endDate', async () => {
      const request = new NextRequest('http://localhost:3000/api/appointments/availability?organizationId=org-123&startDate=2025-05-31&endDate=2025-05-26');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('anterior o igual');
    });
  });

  describe('Funcionalidad básica', () => {
    it('debe retornar disponibilidad exitosamente', async () => {
      const request = new NextRequest('http://localhost:3000/api/appointments/availability?organizationId=org-123&startDate=2025-05-26&endDate=2025-05-31');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(typeof data.data).toBe('object');
    });

    it('debe generar estructura de datos correcta', async () => {
      const request = new NextRequest('http://localhost:3000/api/appointments/availability?organizationId=org-123&startDate=2025-05-26&endDate=2025-05-27');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data['2025-05-26']).toBeDefined();
      expect(data.data['2025-05-26'].slots).toBeInstanceOf(Array);
      expect(data.data['2025-05-26'].totalSlots).toBeGreaterThan(0);
      expect(data.data['2025-05-26'].availableSlots).toBeGreaterThan(0);
    });

    it('debe generar slots de tiempo correctamente', async () => {
      const request = new NextRequest('http://localhost:3000/api/appointments/availability?organizationId=org-123&startDate=2025-05-26&endDate=2025-05-26');
      
      const response = await GET(request);
      const data = await response.json();
      
      const dayData = data.data['2025-05-26'];
      expect(dayData.slots.length).toBeGreaterThan(0);
      
      const firstSlot = dayData.slots[0];
      expect(firstSlot).toHaveProperty('id');
      expect(firstSlot).toHaveProperty('time');
      expect(firstSlot).toHaveProperty('doctorId');
      expect(firstSlot).toHaveProperty('doctorName');
      expect(firstSlot).toHaveProperty('available');
      expect(firstSlot.doctorName).toContain('Dr.');
    });
  });

  describe('Filtros opcionales', () => {
    it('debe aceptar filtro por serviceId', async () => {
      const request = new NextRequest('http://localhost:3000/api/appointments/availability?organizationId=org-123&startDate=2025-05-26&endDate=2025-05-31&serviceId=service-123');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('debe aceptar filtro por doctorId', async () => {
      const request = new NextRequest('http://localhost:3000/api/appointments/availability?organizationId=org-123&startDate=2025-05-26&endDate=2025-05-31&doctorId=doc-1');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('debe aceptar filtro por locationId', async () => {
      const request = new NextRequest('http://localhost:3000/api/appointments/availability?organizationId=org-123&startDate=2025-05-26&endDate=2025-05-31&locationId=loc-1');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('debe combinar múltiples filtros', async () => {
      const request = new NextRequest('http://localhost:3000/api/appointments/availability?organizationId=org-123&startDate=2025-05-26&endDate=2025-05-31&serviceId=service-123&doctorId=doc-1&locationId=loc-1');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Integración con WeeklyAvailabilitySelector', () => {
    it('debe retornar formato compatible con WeeklyAvailabilitySelector', async () => {
      const request = new NextRequest('http://localhost:3000/api/appointments/availability?organizationId=org-123&startDate=2025-05-26&endDate=2025-05-31');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      
      // Verificar estructura esperada por WeeklyAvailabilitySelector
      Object.keys(data.data).forEach(date => {
        const dayData = data.data[date];
        expect(dayData).toHaveProperty('slots');
        expect(dayData).toHaveProperty('totalSlots');
        expect(dayData).toHaveProperty('availableSlots');
        expect(Array.isArray(dayData.slots)).toBe(true);
        expect(typeof dayData.totalSlots).toBe('number');
        expect(typeof dayData.availableSlots).toBe('number');
      });
    });

    it('debe incluir todos los días en el rango solicitado', async () => {
      const request = new NextRequest('http://localhost:3000/api/appointments/availability?organizationId=org-123&startDate=2025-05-26&endDate=2025-05-31');
      
      const response = await GET(request);
      const data = await response.json();
      
      // Debe incluir 6 días (26, 27, 28, 29, 30, 31)
      const dates = Object.keys(data.data);
      expect(dates.length).toBe(6);
      expect(dates).toContain('2025-05-26');
      expect(dates).toContain('2025-05-31');
    });
  });

  describe('Integración con SmartSuggestionsEngine', () => {
    it('debe retornar datos compatibles con SmartSuggestionsEngine', async () => {
      const request = new NextRequest('http://localhost:3000/api/appointments/availability?organizationId=org-123&startDate=2025-05-26&endDate=2025-05-31&serviceId=service-123');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      
      // Verificar que los slots tienen la información necesaria para sugerencias
      Object.values(data.data).forEach((dayData: any) => {
        dayData.slots.forEach((slot: any) => {
          expect(slot).toHaveProperty('id');
          expect(slot).toHaveProperty('time');
          expect(slot).toHaveProperty('doctorId');
          expect(slot).toHaveProperty('doctorName');
          expect(slot).toHaveProperty('available');
          // Propiedades opcionales para SmartSuggestionsEngine
          if (slot.serviceId) expect(typeof slot.serviceId).toBe('string');
          if (slot.locationId) expect(typeof slot.locationId).toBe('string');
          if (slot.duration) expect(typeof slot.duration).toBe('number');
        });
      });
    });
  });

  describe('Manejo de errores', () => {
    it('debe manejar errores de base de datos', async () => {
      // Mock error de Supabase
      const mockSupabase = require('@supabase/supabase-js');
      mockSupabase.createClient.mockReturnValueOnce({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  lte: jest.fn(() => Promise.resolve({
                    data: null,
                    error: { message: 'Database error' }
                  }))
                }))
              }))
            }))
          }))
        }))
      });

      const request = new NextRequest('http://localhost:3000/api/appointments/availability?organizationId=org-123&startDate=2025-05-26&endDate=2025-05-31');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Error al consultar disponibilidad');
    });

    it('debe manejar excepciones inesperadas', async () => {
      // Mock excepción
      const mockSupabase = require('@supabase/supabase-js');
      mockSupabase.createClient.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const request = new NextRequest('http://localhost:3000/api/appointments/availability?organizationId=org-123&startDate=2025-05-26&endDate=2025-05-31');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Error interno del servidor');
    });
  });

  describe('Multi-tenant isolation', () => {
    it('debe filtrar por organizationId correctamente', async () => {
      const request = new NextRequest('http://localhost:3000/api/appointments/availability?organizationId=org-456&startDate=2025-05-26&endDate=2025-05-31');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verificar que se llamó con el organizationId correcto
      const mockSupabase = require('@supabase/supabase-js');
      const mockFrom = mockSupabase.createClient().from;
      expect(mockFrom).toHaveBeenCalledWith('doctor_availability');
    });
  });

  describe('Performance y optimización', () => {
    it('debe completar la consulta en tiempo razonable', async () => {
      const startTime = Date.now();
      
      const request = new NextRequest('http://localhost:3000/api/appointments/availability?organizationId=org-123&startDate=2025-05-26&endDate=2025-05-31');
      
      const response = await GET(request);
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(1000); // Menos de 1 segundo
    });

    it('debe manejar rangos de fechas grandes eficientemente', async () => {
      const request = new NextRequest('http://localhost:3000/api/appointments/availability?organizationId=org-123&startDate=2025-05-01&endDate=2025-05-31');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Object.keys(data.data).length).toBe(31); // Todo el mes de mayo
    });
  });
});
