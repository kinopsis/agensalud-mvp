/**
 * Tests for useAvailabilityData Hook
 * 
 * Pruebas unitarias para el hook de gestión de datos de disponibilidad
 * con cobertura completa de funcionalidades de caché y API
 * 
 * @author AgentSalud MVP Team - UX Enhancement Phase 1 Tests
 * @version 1.0.0
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useAvailabilityData, useWeeklyAvailability, type AvailabilityParams, type DayAvailabilityData } from '@/hooks/useAvailabilityData';

// Mock de fetch global
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('useAvailabilityData', () => {
  const mockParams: AvailabilityParams = {
    organizationId: 'org-123',
    serviceId: 'service-456',
    doctorId: 'doctor-789',
    locationId: 'location-101',
    startDate: '2024-12-16',
    endDate: '2024-12-22'
  };

  const mockApiResponse = {
    success: true,
    data: {
      '2024-12-16': {
        slots: [
          { id: '1', time: '09:00', available: true, doctorId: 'doctor-789' },
          { id: '2', time: '10:00', available: true, doctorId: 'doctor-789' }
        ],
        totalSlots: 2,
        availableSlots: 2
      },
      '2024-12-17': {
        slots: [
          { id: '3', time: '09:00', available: true, doctorId: 'doctor-789' },
          { id: '4', time: '10:00', available: true, doctorId: 'doctor-789' },
          { id: '5', time: '11:00', available: true, doctorId: 'doctor-789' }
        ],
        totalSlots: 3,
        availableSlots: 3
      },
      '2024-12-18': {
        slots: [],
        totalSlots: 0,
        availableSlots: 0
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    
    // Limpiar caché entre tests
    const { availabilityCache } = require('@/hooks/useAvailabilityData');
    if (availabilityCache) {
      availabilityCache.clear();
    }
  });

  describe('Carga de datos básica', () => {
    it('debe cargar datos correctamente', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const { result } = renderHook(() => useAvailabilityData(mockParams));

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toEqual([]);
      expect(result.current.error).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toHaveLength(7); // 7 días en la semana
      expect(result.current.error).toBe(null);
      
      // Verificar estructura de datos procesados
      const mondayData = result.current.data.find(day => day.date === '2024-12-16');
      expect(mondayData).toEqual({
        date: '2024-12-16',
        dayName: 'Lunes',
        slotsCount: 2,
        availabilityLevel: 'low',
        isToday: false,
        isTomorrow: false,
        isWeekend: false,
        slots: expect.any(Array)
      });
    });

    it('debe manejar parámetros null', () => {
      const { result } = renderHook(() => useAvailabilityData(null));

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual([]);
      expect(result.current.error).toBe(null);
    });

    it('debe construir URL correctamente con todos los parámetros', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      renderHook(() => useAvailabilityData(mockParams));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/appointments/availability'),
          expect.any(Object)
        );
      });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('organizationId=org-123');
      expect(calledUrl).toContain('serviceId=service-456');
      expect(calledUrl).toContain('doctorId=doctor-789');
      expect(calledUrl).toContain('locationId=location-101');
      expect(calledUrl).toContain('startDate=2024-12-16');
      expect(calledUrl).toContain('endDate=2024-12-22');
    });
  });

  describe('Manejo de errores', () => {
    it('debe manejar errores de red', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAvailabilityData(mockParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.data).toEqual([]);
    });

    it('debe manejar respuestas HTTP de error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const { result } = renderHook(() => useAvailabilityData(mockParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Error 404: Not Found');
      expect(result.current.data).toEqual([]);
    });

    it('debe manejar respuestas de API con success: false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Invalid parameters'
        }),
      } as Response);

      const { result } = renderHook(() => useAvailabilityData(mockParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Invalid parameters');
      expect(result.current.data).toEqual([]);
    });
  });

  describe('Funcionalidad de caché', () => {
    it('debe usar caché para peticiones idénticas', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      // Primera llamada
      const { result: result1 } = renderHook(() => useAvailabilityData(mockParams));
      
      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Segunda llamada con mismos parámetros
      const { result: result2 } = renderHook(() => useAvailabilityData(mockParams));
      
      await waitFor(() => {
        expect(result2.current.loading).toBe(false);
      });

      // No debe hacer nueva petición HTTP
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result2.current.data).toEqual(result1.current.data);
    });

    it('debe invalidar caché con refresh', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const { result } = renderHook(() => useAvailabilityData(mockParams));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Llamar refresh
      result.current.refresh();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Debe hacer nueva petición
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('debe limpiar caché expirado', async () => {
      // Mock de Date.now para controlar tiempo
      const originalDateNow = Date.now;
      let mockTime = 1000000;
      Date.now = jest.fn(() => mockTime);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      // Primera llamada
      const { result: result1 } = renderHook(() => useAvailabilityData(mockParams));
      
      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
      });

      // Avanzar tiempo más allá del TTL (5 minutos = 300000ms)
      mockTime += 400000;

      // Segunda llamada después de expiración
      const { result: result2 } = renderHook(() => useAvailabilityData(mockParams));
      
      await waitFor(() => {
        expect(result2.current.loading).toBe(false);
      });

      // Debe hacer nueva petición porque el caché expiró
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Restaurar Date.now
      Date.now = originalDateNow;
    });
  });

  describe('Funciones de utilidad', () => {
    it('debe obtener datos de día específico', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const { result } = renderHook(() => useAvailabilityData(mockParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const mondayData = result.current.getDayData('2024-12-16');
      expect(mondayData).toBeDefined();
      expect(mondayData?.date).toBe('2024-12-16');
      expect(mondayData?.slotsCount).toBe(2);
    });

    it('debe obtener días con alta disponibilidad', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const { result } = renderHook(() => useAvailabilityData(mockParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const highAvailabilityDays = result.current.getHighAvailabilityDays();
      expect(highAvailabilityDays).toHaveLength(0); // Ningún día tiene 6+ slots en mock
    });

    it('debe calcular estadísticas de disponibilidad', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const { result } = renderHook(() => useAvailabilityData(mockParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const stats = result.current.getAvailabilityStats();
      expect(stats.total).toBe(7);
      expect(stats.available).toBeGreaterThan(0);
      expect(stats.availabilityRate).toBeGreaterThan(0);
      expect(stats.availabilityRate).toBeLessThanOrEqual(100);
    });
  });

  describe('Debouncing', () => {
    it('debe hacer debounce de peticiones rápidas', async () => {
      jest.useFakeTimers();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const { result, rerender } = renderHook(
        ({ params }) => useAvailabilityData(params),
        { initialProps: { params: mockParams } }
      );

      // Cambiar parámetros rápidamente
      const newParams = { ...mockParams, serviceId: 'service-999' };
      rerender({ params: newParams });
      
      const newerParams = { ...mockParams, serviceId: 'service-888' };
      rerender({ params: newerParams });

      // Avanzar tiempo menos que el debounce (300ms)
      jest.advanceTimersByTime(200);
      
      expect(mockFetch).not.toHaveBeenCalled();

      // Avanzar tiempo completo del debounce
      jest.advanceTimersByTime(200);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      jest.useRealTimers();
    });
  });
});

describe('useWeeklyAvailability', () => {
  const mockOrganizationId = 'org-123';
  const mockStartDate = new Date('2024-12-16');
  const mockServiceId = 'service-456';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it('debe calcular fechas de semana correctamente', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: {} }),
    } as Response);

    renderHook(() => 
      useWeeklyAvailability(mockOrganizationId, mockStartDate, mockServiceId)
    );

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('startDate=2024-12-16'),
      expect.any(Object)
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('endDate=2024-12-22'),
      expect.any(Object)
    );
  });

  it('debe incluir parámetros opcionales cuando se proporcionan', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: {} }),
    } as Response);

    const mockDoctorId = 'doctor-789';
    const mockLocationId = 'location-101';

    renderHook(() => 
      useWeeklyAvailability(
        mockOrganizationId, 
        mockStartDate, 
        mockServiceId, 
        mockDoctorId, 
        mockLocationId
      )
    );

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('serviceId=service-456');
    expect(calledUrl).toContain('doctorId=doctor-789');
    expect(calledUrl).toContain('locationId=location-101');
  });
});
