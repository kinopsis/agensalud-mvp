/**
 * Tests for organization registration page
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import RegisterOrganizationPage from '@/app/(dashboard)/organization/register/page'

// Mock the server action
jest.mock('@/app/api/organizations/actions', () => ({
  createOrganization: jest.fn()
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}))

describe('RegisterOrganizationPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render the registration form', () => {
    render(<RegisterOrganizationPage />)

    expect(screen.getByText('Registrar Organización')).toBeInTheDocument()
    expect(screen.getByText('Crea tu organización para comenzar a gestionar citas médicas')).toBeInTheDocument()

    // Check for required fields
    expect(screen.getByLabelText(/Nombre de la Organización/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Identificador único/)).toBeInTheDocument()

    // Check for optional fields
    expect(screen.getByLabelText(/Email de contacto/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Teléfono/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Sitio web/)).toBeInTheDocument()

    // Check submit button
    expect(screen.getByRole('button', { name: /Crear Organización/ })).toBeInTheDocument()
  })

  it('should auto-generate slug when organization name is entered', () => {
    render(<RegisterOrganizationPage />)

    const nameInput = screen.getByLabelText(/Nombre de la Organización/)
    const slugInput = screen.getByLabelText(/Identificador único/)

    fireEvent.change(nameInput, { target: { value: 'Clínica San José' } })

    // The slug should be auto-generated (accents removed)
    expect(slugInput).toHaveValue('clinica-san-jose')
  })

  it('should validate required fields', () => {
    render(<RegisterOrganizationPage />)

    const nameInput = screen.getByLabelText(/Nombre de la Organización/)
    const slugInput = screen.getByLabelText(/Identificador único/)

    // Both fields should be required
    expect(nameInput).toBeRequired()
    expect(slugInput).toBeRequired()
  })

  it('should validate slug pattern', () => {
    render(<RegisterOrganizationPage />)

    const slugInput = screen.getByLabelText(/Identificador único/)

    // Should have pattern validation
    expect(slugInput).toHaveAttribute('pattern', '^[a-z0-9-]+$')
  })

  it('should validate email format', () => {
    render(<RegisterOrganizationPage />)

    const emailInput = screen.getByLabelText(/Email de contacto/)

    // Should be email type
    expect(emailInput).toHaveAttribute('type', 'email')
  })

  it('should validate website URL format', () => {
    render(<RegisterOrganizationPage />)

    const websiteInput = screen.getByLabelText(/Sitio web/)

    // Should be URL type
    expect(websiteInput).toHaveAttribute('type', 'url')
  })

  it('should validate phone format', () => {
    render(<RegisterOrganizationPage />)

    const phoneInput = screen.getByLabelText(/Teléfono/)

    // Should be tel type
    expect(phoneInput).toHaveAttribute('type', 'tel')
  })

  it('should have default country value', () => {
    render(<RegisterOrganizationPage />)

    const countryInput = screen.getByLabelText(/País/)

    // Should have default value of Colombia
    expect(countryInput).toHaveValue('Colombia')
  })

  it('should have submit button with correct text', () => {
    render(<RegisterOrganizationPage />)

    const submitButton = screen.getByRole('button', { name: /Crear Organización/ })

    // Should have correct initial text
    expect(submitButton).toHaveTextContent('Crear Organización')
    expect(submitButton).toHaveAttribute('type', 'submit')
  })
})

describe('Organization Form Validation', () => {
  it('should generate valid slugs from organization names', () => {
    const generateSlug = (name: string) => {
      return name
        .toLowerCase()
        .normalize('NFD') // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    }

    expect(generateSlug('Clínica San José')).toBe('clinica-san-jose')
    expect(generateSlug('Test Clinic 123')).toBe('test-clinic-123')
    expect(generateSlug('  Multiple   Spaces  ')).toBe('multiple-spaces')
    expect(generateSlug('Special@#$%Characters')).toBe('special-characters')
  })

  it('should validate Colombian phone numbers', () => {
    const isValidColombianPhone = (phone: string) => {
      // Basic Colombian phone validation
      const phoneRegex = /^(\+57\s?)?[3][0-9]{9}$|^(\+57\s?)?[1-8][0-9]{6,7}$/
      return phoneRegex.test(phone.replace(/\s/g, ''))
    }

    expect(isValidColombianPhone('+57 300 123 4567')).toBe(true)
    expect(isValidColombianPhone('300 123 4567')).toBe(true)
    expect(isValidColombianPhone('+57 1 234 5678')).toBe(true)
    expect(isValidColombianPhone('123')).toBe(false)
  })
})
