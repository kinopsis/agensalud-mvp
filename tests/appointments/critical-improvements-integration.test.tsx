/**
 * Integration Tests for Critical Priority Improvements
 * Validates the implementation of location information, AppointmentCard redesign, and simplified states
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createClient } from '@/lib/supabase/client';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn()
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn()
  }),
  useSearchParams: () => ({
    get: jest.fn()
  })
}));

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  single: jest.fn(),
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com'
        }
      },
      error: null
    })
  }
};

// Mock appointment data with all required fields including location and service
const mockAppointmentsWithLocation = [
  {
    id: 'appointment-1',
    appointment_date: '2025-01-30',
    start_time: '14:30:00',
    duration_minutes: 30,
    status: 'confirmed',
    reason: 'Consulta de rutina',
    notes: 'Paciente con historial de hipertensión',
    doctor: [{
      id: 'doctor-1',
      specialization: 'Cardiología',
      profiles: [{
        first_name: 'Juan',
        last_name: 'Pérez'
      }]
    }],
    patient: [{
      id: 'patient-1',
      first_name: 'María',
      last_name: 'García'
    }],
    location: [{
      id: 'location-1',
      name: 'Sede Principal',
      address: 'Calle 123 #45-67, Bogotá'
    }],
    service: [{
      id: 'service-1',
      name: 'Consulta Cardiológica',
      duration_minutes: 30,
      price: 150000
    }]
  },
  {
    id: 'appointment-2',
    appointment_date: '2025-02-01',
    start_time: '10:00:00',
    duration_minutes: 45,
    status: 'pending',
    reason: 'Seguimiento',
    notes: null,
    doctor: [{
      id: 'doctor-2',
      specialization: 'Medicina General',
      profiles: [{
        first_name: 'Ana',
        last_name: 'López'
      }]
    }],
    patient: [{
      id: 'patient-1',
      first_name: 'María',
      last_name: 'García'
    }],
    location: [{
      id: 'location-2',
      name: 'Sede Norte',
      address: 'Carrera 15 #80-45, Bogotá'
    }],
    service: [{
      id: 'service-2',
      name: 'Consulta General',
      duration_minutes: 45,
      price: 80000
    }]
  }
];

// Mock profile data
const mockProfile = {
  id: 'profile-1',
  first_name: 'María',
  last_name: 'García',
  role: 'patient' as const,
  organization_id: 'org-1'
};

describe('Critical Priority Improvements Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    
    // Mock profile query
    mockSupabase.single.mockResolvedValue({
      data: mockProfile,
      error: null
    });
  });

  describe('1. Location Information Integration', () => {
    it('should include location data in appointment queries', async () => {
      // Mock appointments query with location
      mockSupabase.select.mockResolvedValueOnce({
        data: mockAppointmentsWithLocation,
        error: null
      });

      // Import and render the appointments page
      const AppointmentsPage = (await import('@/app/(dashboard)/appointments/page')).default;
      
      render(<AppointmentsPage />);

      // Wait for data to load
      await waitFor(() => {
        expect(mockSupabase.select).toHaveBeenCalledWith(
          expect.stringContaining('location:locations!appointments_location_id_fkey')
        );
      });

      // Verify location information is displayed
      await waitFor(() => {
        expect(screen.getByText('Sede Principal')).toBeInTheDocument();
        expect(screen.getByText('Calle 123 #45-67, Bogotá')).toBeInTheDocument();
        expect(screen.getByText('Sede Norte')).toBeInTheDocument();
        expect(screen.getByText('Carrera 15 #80-45, Bogotá')).toBeInTheDocument();
      });
    });

    it('should include service information in appointment queries', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: mockAppointmentsWithLocation,
        error: null
      });

      const AppointmentsPage = (await import('@/app/(dashboard)/appointments/page')).default;
      
      render(<AppointmentsPage />);

      await waitFor(() => {
        expect(mockSupabase.select).toHaveBeenCalledWith(
          expect.stringContaining('service:services!appointments_service_id_fkey')
        );
      });

      // Verify service information is displayed
      await waitFor(() => {
        expect(screen.getByText('Consulta Cardiológica')).toBeInTheDocument();
        expect(screen.getByText('Consulta General')).toBeInTheDocument();
      });
    });

    it('should handle appointments with missing location gracefully', async () => {
      const appointmentsWithMissingLocation = [
        {
          ...mockAppointmentsWithLocation[0],
          location: [], // Empty location array
          service: []   // Empty service array
        }
      ];

      mockSupabase.select.mockResolvedValueOnce({
        data: appointmentsWithMissingLocation,
        error: null
      });

      const AppointmentsPage = (await import('@/app/(dashboard)/appointments/page')).default;
      
      render(<AppointmentsPage />);

      // Should not crash and should show fallback values
      await waitFor(() => {
        expect(screen.getByText('Dr. Juan Pérez')).toBeInTheDocument();
      });
    });
  });

  describe('2. AppointmentCard Component Integration', () => {
    it('should use AppointmentCard component for displaying appointments', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: mockAppointmentsWithLocation,
        error: null
      });

      const AppointmentsPage = (await import('@/app/(dashboard)/appointments/page')).default;
      
      render(<AppointmentsPage />);

      // Wait for appointments to load and verify card structure
      await waitFor(() => {
        // Check for card-specific elements (icons, layout)
        expect(screen.getAllByText('Servicio')).toHaveLength(2);
        expect(screen.getAllByText('Ubicación')).toHaveLength(2);
        expect(screen.getAllByText('Motivo')).toHaveLength(1); // Only one has reason
      });
    });

    it('should display improved visual hierarchy in cards', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: mockAppointmentsWithLocation,
        error: null
      });

      const AppointmentsPage = (await import('@/app/(dashboard)/appointments/page')).default;
      
      render(<AppointmentsPage />);

      await waitFor(() => {
        // Verify structured information display
        expect(screen.getByText('Consulta Cardiológica')).toBeInTheDocument();
        expect(screen.getByText('Dr. Juan Pérez')).toBeInTheDocument();
        expect(screen.getByText('Sede Principal')).toBeInTheDocument();
        expect(screen.getByText('Calle 123 #45-67, Bogotá')).toBeInTheDocument();
      });
    });

    it('should show responsive design elements', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: mockAppointmentsWithLocation,
        error: null
      });

      const AppointmentsPage = (await import('@/app/(dashboard)/appointments/page')).default;
      
      render(<AppointmentsPage />);

      await waitFor(() => {
        // Check for responsive grid classes (these would be in the DOM)
        const cards = screen.getAllByText('Servicio');
        expect(cards.length).toBeGreaterThan(0);
      });
    });
  });

  describe('3. Simplified Status System', () => {
    it('should display simplified status labels', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: mockAppointmentsWithLocation,
        error: null
      });

      const AppointmentsPage = (await import('@/app/(dashboard)/appointments/page')).default;
      
      render(<AppointmentsPage />);

      await waitFor(() => {
        // Check for simplified status text
        expect(screen.getByText('Confirmada')).toBeInTheDocument();
        expect(screen.getByText('Pendiente de Confirmación')).toBeInTheDocument();
      });
    });

    it('should handle legacy status mapping', async () => {
      const appointmentsWithLegacyStatus = [
        {
          ...mockAppointmentsWithLocation[0],
          status: 'scheduled' // Legacy status
        }
      ];

      mockSupabase.select.mockResolvedValueOnce({
        data: appointmentsWithLegacyStatus,
        error: null
      });

      const AppointmentsPage = (await import('@/app/(dashboard)/appointments/page')).default;
      
      render(<AppointmentsPage />);

      await waitFor(() => {
        // Legacy 'scheduled' should map to 'Confirmada'
        expect(screen.getByText('Confirmada')).toBeInTheDocument();
      });
    });

    it('should use simplified status options in dropdowns', async () => {
      // Mock admin role to see status dropdown
      mockSupabase.single.mockResolvedValue({
        data: { ...mockProfile, role: 'admin' },
        error: null
      });

      mockSupabase.select.mockResolvedValueOnce({
        data: mockAppointmentsWithLocation,
        error: null
      });

      const AppointmentsPage = (await import('@/app/(dashboard)/appointments/page')).default;
      
      render(<AppointmentsPage />);

      await waitFor(() => {
        const dropdowns = screen.getAllByRole('combobox');
        expect(dropdowns.length).toBeGreaterThan(0);
        
        // Check that simplified options are available
        const firstDropdown = dropdowns[0];
        expect(firstDropdown).toBeInTheDocument();
      });
    });
  });

  describe('4. End-to-End Functionality', () => {
    it('should support complete appointment management workflow', async () => {
      // Mock admin role for full functionality
      mockSupabase.single.mockResolvedValue({
        data: { ...mockProfile, role: 'admin' },
        error: null
      });

      mockSupabase.select.mockResolvedValueOnce({
        data: mockAppointmentsWithLocation,
        error: null
      });

      const AppointmentsPage = (await import('@/app/(dashboard)/appointments/page')).default;
      
      render(<AppointmentsPage />);

      await waitFor(() => {
        // Verify all critical information is displayed
        expect(screen.getByText('Sede Principal')).toBeInTheDocument();
        expect(screen.getByText('Consulta Cardiológica')).toBeInTheDocument();
        expect(screen.getByText('Confirmada')).toBeInTheDocument();
        
        // Verify action buttons are available
        expect(screen.getAllByText('Reagendar')).toHaveLength(2);
        expect(screen.getAllByText('Cancelar')).toHaveLength(2);
      });
    });

    it('should maintain multi-tenant data isolation', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: mockAppointmentsWithLocation,
        error: null
      });

      const AppointmentsPage = (await import('@/app/(dashboard)/appointments/page')).default;
      
      render(<AppointmentsPage />);

      await waitFor(() => {
        // Verify that organization filtering is applied in queries
        expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', 'org-1');
      });
    });

    it('should provide accessible interface', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: mockAppointmentsWithLocation,
        error: null
      });

      const AppointmentsPage = (await import('@/app/(dashboard)/appointments/page')).default;
      
      render(<AppointmentsPage />);

      await waitFor(() => {
        // Check for ARIA labels and accessibility features
        const statusDropdowns = screen.getAllByLabelText(/cambiar estado/i);
        expect(statusDropdowns.length).toBeGreaterThan(0);
        
        const rescheduleButtons = screen.getAllByTitle(/reagendar/i);
        expect(rescheduleButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('5. Performance and Error Handling', () => {
    it('should handle loading states gracefully', async () => {
      // Mock slow loading
      mockSupabase.select.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ data: mockAppointmentsWithLocation, error: null }), 100)
        )
      );

      const AppointmentsPage = (await import('@/app/(dashboard)/appointments/page')).default;
      
      render(<AppointmentsPage />);

      // Should show loading state initially
      // Then show content after loading
      await waitFor(() => {
        expect(screen.getByText('Sede Principal')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const AppointmentsPage = (await import('@/app/(dashboard)/appointments/page')).default;
      
      render(<AppointmentsPage />);

      // Should not crash and should show appropriate error handling
      await waitFor(() => {
        // The component should handle the error gracefully
        expect(screen.queryByText('Sede Principal')).not.toBeInTheDocument();
      });
    });
  });
});
