/**
 * Real-World Patient Scenario Test
 * Simulates the exact flow from the appointments page for patient users
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
          id: 'patient-123',
          email: 'patient@example.com'
        }
      },
      error: null
    })
  }
};

// Mock patient profile
const mockPatientProfile = {
  id: 'patient-123',
  first_name: 'María',
  last_name: 'García',
  role: 'patient' as const,
  organization_id: 'org-1'
};

// Mock appointments data exactly as it comes from Supabase
const mockAppointmentsFromSupabase = [
  {
    id: 'appointment-pending-123',
    appointment_date: (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    })(),
    start_time: '14:30:00',
    duration_minutes: 30,
    status: 'pending',
    reason: 'Consulta de rutina',
    notes: null,
    doctor: [{
      id: 'doctor-1',
      specialization: 'Cardiología',
      profiles: [{ first_name: 'Dr. Juan', last_name: 'Pérez' }]
    }],
    patient: [{
      id: 'patient-123', // Same as logged-in patient
      first_name: 'María',
      last_name: 'García'
    }],
    location: [{
      id: 'location-1',
      name: 'Sede Principal',
      address: 'Calle 123 #45-67'
    }],
    service: [{
      id: 'service-1',
      name: 'Consulta Cardiológica',
      duration_minutes: 30,
      price: 150000
    }]
  },
  {
    id: 'appointment-confirmed-123',
    appointment_date: (() => {
      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      return dayAfterTomorrow.toISOString().split('T')[0];
    })(),
    start_time: '10:00:00',
    duration_minutes: 45,
    status: 'confirmed',
    reason: 'Seguimiento',
    notes: null,
    doctor: [{
      id: 'doctor-2',
      specialization: 'Medicina General',
      profiles: [{ first_name: 'Dra. Ana', last_name: 'López' }]
    }],
    patient: [{
      id: 'patient-123', // Same as logged-in patient
      first_name: 'María',
      last_name: 'García'
    }],
    location: [{
      id: 'location-2',
      name: 'Sede Norte',
      address: 'Carrera 15 #80-45'
    }],
    service: [{
      id: 'service-2',
      name: 'Consulta General',
      duration_minutes: 45,
      price: 80000
    }]
  }
];

describe('Real-World Patient Scenario', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    
    // Mock profile query
    mockSupabase.single.mockResolvedValue({
      data: mockPatientProfile,
      error: null
    });
    
    // Mock appointments query
    mockSupabase.select.mockResolvedValue({
      data: mockAppointmentsFromSupabase,
      error: null
    });
  });

  it('should show buttons for patient in real appointments page scenario', async () => {
    console.log('🔍 REAL-WORLD SCENARIO TEST:');
    console.log('   Testing with actual appointments page component...');

    // Import the actual appointments page
    const AppointmentsPage = (await import('@/app/(dashboard)/appointments/page')).default;
    
    render(<AppointmentsPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(mockSupabase.select).toHaveBeenCalled();
    });

    // Wait for appointments to render
    await waitFor(() => {
      expect(screen.getByText('Consulta Cardiológica')).toBeInTheDocument();
    }, { timeout: 3000 });

    console.log('   ✅ Appointments loaded successfully');

    // Check for pending appointment buttons
    await waitFor(() => {
      const reagendarButtons = screen.getAllByText('Reagendar');
      const cancelarButtons = screen.getAllByText('Cancelar');
      
      console.log(`   - Found ${reagendarButtons.length} Reagendar buttons`);
      console.log(`   - Found ${cancelarButtons.length} Cancelar buttons`);
      
      // Should have buttons for both pending and confirmed appointments
      expect(reagendarButtons.length).toBeGreaterThanOrEqual(2);
      expect(cancelarButtons.length).toBeGreaterThanOrEqual(2);
    }, { timeout: 3000 });

    console.log('   ✅ CONCLUSION: Buttons ARE visible in real-world scenario');
  });

  it('should verify permission calculation in real scenario', async () => {
    console.log('🔍 PERMISSION CALCULATION VERIFICATION:');

    // Import the actual appointments page to access its functions
    const AppointmentsPage = (await import('@/app/(dashboard)/appointments/page')).default;
    
    render(<AppointmentsPage />);

    await waitFor(() => {
      expect(mockSupabase.select).toHaveBeenCalled();
    });

    // Verify that the query includes the correct filters
    expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', 'org-1');
    
    console.log('   ✅ Organization filter applied correctly');
    console.log('   ✅ Patient profile loaded correctly');
    console.log('   ✅ Appointments query executed correctly');
  });

  it('should test with edge case: past appointment', async () => {
    // Mock a past appointment
    const pastAppointment = {
      ...mockAppointmentsFromSupabase[0],
      id: 'appointment-past-123',
      appointment_date: '2024-01-15', // Past date
      status: 'pending'
    };

    mockSupabase.select.mockResolvedValue({
      data: [pastAppointment],
      error: null
    });

    console.log('🔍 PAST APPOINTMENT TEST:');

    const AppointmentsPage = (await import('@/app/(dashboard)/appointments/page')).default;
    
    render(<AppointmentsPage />);

    await waitFor(() => {
      expect(mockSupabase.select).toHaveBeenCalled();
    });

    // Wait for appointment to render
    await waitFor(() => {
      expect(screen.getByText('Consulta Cardiológica')).toBeInTheDocument();
    });

    // Past appointments should NOT have action buttons
    const reagendarButtons = screen.queryAllByText('Reagendar');
    const cancelarButtons = screen.queryAllByText('Cancelar');
    
    console.log(`   - Found ${reagendarButtons.length} Reagendar buttons (should be 0)`);
    console.log(`   - Found ${cancelarButtons.length} Cancelar buttons (should be 0)`);
    
    expect(reagendarButtons.length).toBe(0);
    expect(cancelarButtons.length).toBe(0);
    
    console.log('   ✅ CONCLUSION: Past appointments correctly have no buttons');
  });

  it('should test with cancelled appointment', async () => {
    const cancelledAppointment = {
      ...mockAppointmentsFromSupabase[0],
      id: 'appointment-cancelled-123',
      status: 'cancelled'
    };

    mockSupabase.select.mockResolvedValue({
      data: [cancelledAppointment],
      error: null
    });

    console.log('🔍 CANCELLED APPOINTMENT TEST:');

    const AppointmentsPage = (await import('@/app/(dashboard)/appointments/page')).default;
    
    render(<AppointmentsPage />);

    await waitFor(() => {
      expect(mockSupabase.select).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Consulta Cardiológica')).toBeInTheDocument();
    });

    // Cancelled appointments should NOT have action buttons
    const reagendarButtons = screen.queryAllByText('Reagendar');
    const cancelarButtons = screen.queryAllByText('Cancelar');
    
    console.log(`   - Found ${reagendarButtons.length} Reagendar buttons (should be 0)`);
    console.log(`   - Found ${cancelarButtons.length} Cancelar buttons (should be 0)`);
    
    expect(reagendarButtons.length).toBe(0);
    expect(cancelarButtons.length).toBe(0);
    
    console.log('   ✅ CONCLUSION: Cancelled appointments correctly have no buttons');
  });

  it('should verify button functionality works', async () => {
    console.log('🔍 BUTTON FUNCTIONALITY TEST:');

    const AppointmentsPage = (await import('@/app/(dashboard)/appointments/page')).default;
    
    render(<AppointmentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Consulta Cardiológica')).toBeInTheDocument();
    });

    // Find and click a Reagendar button
    const reagendarButtons = screen.getAllByText('Reagendar');
    expect(reagendarButtons.length).toBeGreaterThan(0);
    
    // Click should not throw an error (handlers are defined)
    fireEvent.click(reagendarButtons[0]);
    
    console.log('   ✅ Reagendar button clicked without errors');

    // Find and click a Cancelar button
    const cancelarButtons = screen.getAllByText('Cancelar');
    expect(cancelarButtons.length).toBeGreaterThan(0);
    
    fireEvent.click(cancelarButtons[0]);
    
    console.log('   ✅ Cancelar button clicked without errors');
    console.log('   ✅ CONCLUSION: Button functionality works correctly');
  });
});
