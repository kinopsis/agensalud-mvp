/**
 * Tests for appointment booking page
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import BookAppointmentPage from '@/app/(dashboard)/appointments/book/page'

// Mock the appointment actions
jest.mock('@/app/api/appointments/actions', () => ({
  createAppointment: jest.fn(),
  getAvailableSlots: jest.fn()
}))

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          mockResolvedValue: jest.fn()
        })),
        single: jest.fn()
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    }))
  }))
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}))

// Mock the auth context
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com'
}
const mockProfile = {
  id: 'test-user-id',
  organization_id: 'test-org-id',
  first_name: 'John',
  last_name: 'Doe',
  role: 'patient'
}

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: mockUser,
    profile: mockProfile
  })
}))

// Mock the tenant context
const mockOrganization = {
  id: 'test-org-id',
  name: 'Test Clinic',
  slug: 'test-clinic'
}

jest.mock('@/contexts/tenant-context', () => ({
  useTenant: () => ({
    organization: mockOrganization
  })
}))

const mockDoctors = [
  {
    id: 'doctor-1',
    specialization: 'Cardiología',
    consultation_fee: 150000,
    profiles: [{
      first_name: 'María',
      last_name: 'García'
    }]
  },
  {
    id: 'doctor-2',
    specialization: 'Dermatología',
    consultation_fee: 120000,
    profiles: [{
      first_name: 'Carlos',
      last_name: 'López'
    }]
  }
]

const mockAvailableSlots = ['09:00', '09:30', '10:00', '10:30', '11:00']

describe('BookAppointmentPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Mock Supabase client responses
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockDoctors,
            error: null
          }),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' }
          })
        })
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'patient-123' },
            error: null
          })
        })
      })
    })

    // Mock getAvailableSlots
    require('@/app/api/appointments/actions').getAvailableSlots.mockResolvedValue({
      success: true,
      data: mockAvailableSlots
    })
  })

  it('should render the booking form', async () => {
    render(<BookAppointmentPage />)

    expect(screen.getByRole('heading', { name: 'Agendar Cita' })).toBeInTheDocument()
    expect(screen.getByText('Selecciona un doctor, fecha y horario para tu cita médica')).toBeInTheDocument()

    // Check for form fields
    expect(screen.getByLabelText(/Doctor \*/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Fecha \*/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Motivo de la consulta/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Notas adicionales/)).toBeInTheDocument()

    // Check submit button
    expect(screen.getByRole('button', { name: /Agendar Cita/ })).toBeInTheDocument()
  })

  it('should have doctor selection dropdown', () => {
    render(<BookAppointmentPage />)

    const doctorSelect = screen.getByLabelText(/Doctor \*/)
    expect(doctorSelect).toBeInTheDocument()
    expect(doctorSelect).toBeRequired()
  })

  it('should show time slot placeholder when no doctor/date selected', () => {
    render(<BookAppointmentPage />)

    // Should show placeholder when no doctor/date selected
    expect(screen.getByText('Selecciona un doctor y fecha primero')).toBeInTheDocument()

    // Should have the time slot label
    expect(screen.getByText('Horario *')).toBeInTheDocument()
  })

  it('should have form fields for appointment details', () => {
    render(<BookAppointmentPage />)

    expect(screen.getByLabelText(/Motivo de la consulta/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Notas adicionales/)).toBeInTheDocument()

    const reasonInput = screen.getByLabelText(/Motivo de la consulta/)
    expect(reasonInput).toHaveAttribute('placeholder', 'Ej: Consulta general, dolor de cabeza, etc.')
  })

  it('should validate required fields', () => {
    render(<BookAppointmentPage />)

    const doctorSelect = screen.getByLabelText(/Doctor \*/)
    const dateInput = screen.getByLabelText(/Fecha \*/)
    const submitButton = screen.getByRole('button', { name: /Agendar Cita/ })

    expect(doctorSelect).toBeRequired()
    expect(dateInput).toBeRequired()
    expect(submitButton).toBeDisabled() // Should be disabled when required fields are empty
  })

  it('should set minimum date to today', () => {
    render(<BookAppointmentPage />)

    const dateInput = screen.getByLabelText(/Fecha \*/)
    const today = new Date().toISOString().split('T')[0]

    expect(dateInput).toHaveAttribute('min', today)
  })

  it('should have action buttons', () => {
    render(<BookAppointmentPage />)

    const cancelButton = screen.getByRole('button', { name: /Cancelar/ })
    const submitButton = screen.getByRole('button', { name: /Agendar Cita/ })

    expect(cancelButton).toBeInTheDocument()
    expect(submitButton).toBeInTheDocument()
    expect(submitButton).toBeDisabled() // Should be disabled initially
  })
})
