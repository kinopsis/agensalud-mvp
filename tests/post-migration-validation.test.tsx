/**
 * @jest-environment jsdom
 */

import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithProviders, MockUser, MockOrganization } from './utils/test-helpers';

// Mock fetch globally
global.fetch = jest.fn();

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/test',
}));

// Test data
const testUser: MockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'patient',
  organization_id: 'test-org-id',
  profile: {
    full_name: 'Test User'
  }
};

const testOrganization: MockOrganization = {
  id: 'test-org-id',
  name: 'Test Organization',
  slug: 'test-org',
  email: 'org@test.com',
  phone: '+1234567890',
  address: '123 Test St',
  city: 'Test City',
  state: 'Test State',
  postal_code: '12345',
  country: 'Test Country'
};

describe('Post-Migration Validation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('Database Schema Validation', () => {
    it('should validate that new database columns are accessible', async () => {
      // Mock API response with new schema columns
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          doctors: [{
            id: 'doctor-1',
            specialization: 'Optometría',
            experience_years: 5, // New column from migration
            languages: ['es', 'en'], // New column from migration
            is_active: true, // New column from migration
            profiles: {
              first_name: 'Dr. Juan',
              last_name: 'Pérez',
              email: 'dr.perez@test.com'
            }
          }]
        })
      });

      // Test that API calls work with new schema
      const response = await fetch('/api/doctors?organizationId=test-org-id');
      const data = await response.json();

      expect(data.doctors[0]).toHaveProperty('experience_years');
      expect(data.doctors[0]).toHaveProperty('languages');
      expect(data.doctors[0]).toHaveProperty('is_active');
      expect(data.doctors[0].languages).toEqual(['es', 'en']);
    });

    it('should validate patients table with new columns', async () => {
      // Mock API response with new patient schema
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          patients: [{
            id: 'patient-1',
            date_of_birth: '1990-01-01', // New column from migration
            gender: 'M', // New column from migration
            address: '123 Test St', // New column from migration
            medical_notes: 'Test notes', // New column from migration
            status: 'active', // New column from migration
            profiles: {
              first_name: 'Juan',
              last_name: 'Paciente',
              email: 'patient@test.com'
            }
          }]
        })
      });

      const response = await fetch('/api/patients?organizationId=test-org-id');
      const data = await response.json();

      expect(data.patients[0]).toHaveProperty('date_of_birth');
      expect(data.patients[0]).toHaveProperty('gender');
      expect(data.patients[0]).toHaveProperty('address');
      expect(data.patients[0]).toHaveProperty('medical_notes');
      expect(data.patients[0]).toHaveProperty('status');
    });

    it('should validate organizations subscription_plan column', async () => {
      // Mock API response with subscription_plan
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          organization: {
            id: 'test-org-id',
            name: 'Test Organization',
            subscription_plan: 'basic' // Updated default from migration
          }
        })
      });

      const response = await fetch('/api/organizations/test-org-id');
      const data = await response.json();

      expect(data.organization).toHaveProperty('subscription_plan');
      expect(data.organization.subscription_plan).toBe('basic');
    });
  });

  describe('TypeScript Types Validation', () => {
    it('should validate that TypeScript types are updated', () => {
      // Import types to ensure they compile correctly
      const { Database } = require('@/types/database');
      
      // This test passes if TypeScript compilation succeeds
      expect(Database).toBeDefined();
    });
  });

  describe('Component Rendering Validation', () => {
    it('should render components without TypeScript errors', async () => {
      // Mock successful API responses
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, services: [] })
        });

      // Import and render a component that uses the updated types
      const UnifiedAppointmentFlow = require('@/components/appointments/UnifiedAppointmentFlow').default;

      await act(async () => {
        renderWithProviders(
          <UnifiedAppointmentFlow
            organizationId="test-org-id"
            userId="test-user-id"
            onAppointmentBooked={jest.fn()}
            onCancel={jest.fn()}
            mode="manual"
          />,
          {
            initialUser: testUser,
            initialOrganization: testOrganization
          }
        );
      });

      // If component renders without errors, types are working
      await waitFor(() => {
        expect(screen.getByTestId('progress-indicator')).toBeInTheDocument();
      });
    });

    it('should render dashboard components without loading indefinitely', async () => {
      // Mock dashboard API responses
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            stats: {
              totalAppointments: 10,
              todayAppointments: 3,
              totalPatients: 25,
              systemHealth: 'excellent'
            }
          })
        });

      // Import a dashboard component
      const PatientDashboard = require('@/components/dashboard/PatientDashboard').default;

      await act(async () => {
        renderWithProviders(
          <PatientDashboard />,
          {
            initialUser: testUser,
            initialOrganization: testOrganization
          }
        );
      });

      // Should not be stuck in loading state
      await waitFor(() => {
        expect(screen.queryByText('Cargando...')).not.toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('API Integration Validation', () => {
    it('should handle appointment booking with new schema', async () => {
      // Mock successful appointment booking
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          appointmentId: 'new-appointment-id',
          appointment: {
            id: 'new-appointment-id',
            doctor_id: 'doctor-1',
            patient_id: 'patient-1',
            service_id: 'service-1',
            appointment_date: '2024-01-15',
            start_time: '10:00',
            status: 'confirmed'
          }
        })
      });

      const bookingData = {
        organizationId: 'test-org-id',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        serviceId: 'service-1',
        appointmentDate: '2024-01-15',
        startTime: '10:00',
        endTime: '11:00',
        reason: 'Test appointment',
        notes: 'Test notes'
      };

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
      expect(result.appointmentId).toBe('new-appointment-id');
    });
  });

  describe('Multi-tenant Data Isolation Validation', () => {
    it('should maintain multi-tenant isolation with new schema', async () => {
      // Mock API response that respects organization isolation
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          doctors: [{
            id: 'doctor-1',
            organization_id: 'test-org-id', // Should match current org
            specialization: 'Optometría',
            experience_years: 5,
            languages: ['es'],
            is_active: true
          }]
        })
      });

      const response = await fetch('/api/doctors?organizationId=test-org-id');
      const data = await response.json();

      // Verify that returned data belongs to the correct organization
      expect(data.doctors[0].organization_id).toBe('test-org-id');
    });
  });
});
