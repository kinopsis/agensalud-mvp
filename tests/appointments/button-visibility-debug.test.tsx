/**
 * DEBUG TEST FOR BUTTON VISIBILITY
 * Verifica específicamente por qué los botones de gestión no se muestran
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the auth and tenant contexts
const mockProfile = {
  id: 'patient-123',
  role: 'patient',
  organization_id: 'org-123'
};

const mockOrganization = {
  id: 'org-123',
  name: 'Test Clinic'
};

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'user-123' },
    profile: mockProfile
  })
}));

jest.mock('@/contexts/tenant-context', () => ({
  useTenant: () => ({
    organization: mockOrganization
  })
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null)
  })
}));

// Mock Supabase client with realistic appointment data
const mockAppointments = [
  {
    id: 'apt-1',
    appointment_date: '2025-06-15', // Future date
    start_time: '10:00:00',
    duration_minutes: 30,
    status: 'confirmed',
    reason: 'Consulta general',
    notes: 'Primera consulta',
    doctor: [{
      id: 'doc-1',
      specialization: 'Optometría',
      profiles: [{
        first_name: 'Ana',
        last_name: 'García'
      }]
    }],
    patient: [{
      id: 'patient-123', // Same as mockProfile.id
      first_name: 'Juan',
      last_name: 'Pérez'
    }]
  }
];

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              data: mockAppointments,
              error: null
            })
          })
        })
      })
    }),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
    }
  })
}));

// Mock appointment actions
jest.mock('@/app/api/appointments/actions', () => ({
  cancelAppointment: jest.fn(),
  updateAppointment: jest.fn()
}));

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: ''
  },
  writable: true
});

// Import the component after mocks
import AppointmentsPage from '@/app/(dashboard)/appointments/page';

describe('Button Visibility Debug', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. PATIENT ROLE BUTTON VISIBILITY', () => {
    
    it('should show buttons for patient own future confirmed appointment', async () => {
      render(<AppointmentsPage />);
      
      // Wait for component to load
      await screen.findByText('Mis Citas');
      
      // Check if appointment is rendered
      expect(screen.getByText('Dr. Ana García')).toBeInTheDocument();
      expect(screen.getByText('Confirmada')).toBeInTheDocument();
      
      // Debug: Check if buttons are present
      const rescheduleButtons = screen.queryAllByText('Reagendar');
      const cancelButtons = screen.queryAllByText('Cancelar');
      
      console.log('Debug - Reschedule buttons found:', rescheduleButtons.length);
      console.log('Debug - Cancel buttons found:', cancelButtons.length);
      
      // Verify buttons are visible
      expect(rescheduleButtons.length).toBeGreaterThan(0);
      expect(cancelButtons.length).toBeGreaterThan(0);
      
      // Check specific button
      const rescheduleButton = screen.getByRole('button', { name: /reagendar/i });
      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      
      expect(rescheduleButton).toBeInTheDocument();
      expect(rescheduleButton).toBeVisible();
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).toBeVisible();
    });

    it('should verify button functionality', async () => {
      render(<AppointmentsPage />);
      
      await screen.findByText('Mis Citas');
      
      const rescheduleButton = screen.getByRole('button', { name: /reagendar/i });
      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      
      // Test reschedule button click
      fireEvent.click(rescheduleButton);
      expect(window.location.href).toBe('/appointments/book?reschedule=apt-1');
      
      // Reset location
      window.location.href = '';
      
      // Test cancel button click (should show confirmation)
      window.confirm = jest.fn().mockReturnValue(false); // User cancels
      fireEvent.click(cancelButton);
      expect(window.confirm).toHaveBeenCalledWith('¿Estás seguro de que quieres cancelar esta cita?');
    });
  });

  describe('2. ADMIN ROLE BUTTON VISIBILITY', () => {
    
    beforeEach(() => {
      // Change mock profile to admin
      mockProfile.role = 'admin';
    });

    it('should show buttons for admin viewing any appointment', async () => {
      render(<AppointmentsPage />);
      
      await screen.findByText('Gestión de Citas');
      
      // Check if appointment is rendered
      expect(screen.getByText('Dr. Ana García')).toBeInTheDocument();
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument(); // Patient name should show for admin
      
      // Verify buttons are visible
      const rescheduleButton = screen.getByRole('button', { name: /reagendar/i });
      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      
      expect(rescheduleButton).toBeInTheDocument();
      expect(rescheduleButton).toBeVisible();
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).toBeVisible();
      
      // Admin should also see status dropdown
      const statusDropdown = screen.getByDisplayValue('Confirmada');
      expect(statusDropdown).toBeInTheDocument();
    });
  });

  describe('3. PERMISSION LOGIC VERIFICATION', () => {
    
    it('should verify canCancelAppointment logic for patient', () => {
      const appointment = mockAppointments[0];
      const profile = { id: 'patient-123', role: 'patient' };
      
      // Simulate the permission logic
      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
      const now = new Date();
      const isFuture = appointmentDateTime > now;
      
      const cancellableStatuses = ['scheduled', 'confirmed', 'pending'];
      const isStatusCancellable = cancellableStatuses.includes(appointment.status);
      
      const hasPermission = appointment.patient[0]?.id === profile.id;
      
      const canCancel = isFuture && isStatusCancellable && hasPermission;
      
      console.log('Permission debug:', {
        appointmentDate: appointment.appointment_date,
        startTime: appointment.start_time,
        status: appointment.status,
        patientId: appointment.patient[0]?.id,
        profileId: profile.id,
        isFuture,
        isStatusCancellable,
        hasPermission,
        canCancel
      });
      
      expect(isFuture).toBe(true); // Future appointment
      expect(isStatusCancellable).toBe(true); // Confirmed status is cancellable
      expect(hasPermission).toBe(true); // Patient owns the appointment
      expect(canCancel).toBe(true); // Should be able to cancel
    });

    it('should verify canRescheduleAppointment logic for patient', () => {
      const appointment = mockAppointments[0];
      const profile = { id: 'patient-123', role: 'patient' };
      
      // Simulate the permission logic
      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
      const now = new Date();
      const isFuture = appointmentDateTime > now;
      
      const reschedulableStatuses = ['scheduled', 'confirmed', 'pending'];
      const isStatusReschedulable = reschedulableStatuses.includes(appointment.status);
      
      const hasPermission = appointment.patient[0]?.id === profile.id;
      
      const canReschedule = isFuture && isStatusReschedulable && hasPermission;
      
      expect(isFuture).toBe(true);
      expect(isStatusReschedulable).toBe(true);
      expect(hasPermission).toBe(true);
      expect(canReschedule).toBe(true);
    });
  });

  describe('4. CSS AND STYLING VERIFICATION', () => {
    
    it('should verify buttons have correct CSS classes', async () => {
      render(<AppointmentsPage />);
      
      await screen.findByText('Mis Citas');
      
      const rescheduleButton = screen.getByRole('button', { name: /reagendar/i });
      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      
      // Check CSS classes
      expect(rescheduleButton).toHaveClass('text-blue-600');
      expect(rescheduleButton).toHaveClass('hover:text-blue-800');
      expect(rescheduleButton).toHaveClass('border-blue-200');
      
      expect(cancelButton).toHaveClass('text-red-600');
      expect(cancelButton).toHaveClass('hover:text-red-800');
      expect(cancelButton).toHaveClass('border-red-200');
      
      // Verify they're not hidden
      expect(rescheduleButton).not.toHaveClass('hidden');
      expect(cancelButton).not.toHaveClass('hidden');
      expect(rescheduleButton).not.toHaveStyle('display: none');
      expect(cancelButton).not.toHaveStyle('display: none');
    });
  });

  describe('5. EDGE CASES', () => {
    
    it('should handle appointments with missing patient data', async () => {
      // Mock appointment with missing patient data
      const appointmentWithoutPatient = {
        ...mockAppointments[0],
        patient: []
      };
      
      jest.mocked(require('@/lib/supabase/client').createClient).mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  data: [appointmentWithoutPatient],
                  error: null
                })
              })
            })
          })
        }),
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null
          })
        }
      });
      
      render(<AppointmentsPage />);
      
      await screen.findByText('Mis Citas');
      
      // Buttons should not be visible for appointments without patient data
      const rescheduleButtons = screen.queryAllByText('Reagendar');
      const cancelButtons = screen.queryAllByText('Cancelar');
      
      expect(rescheduleButtons.length).toBe(0);
      expect(cancelButtons.length).toBe(0);
    });
  });
});
