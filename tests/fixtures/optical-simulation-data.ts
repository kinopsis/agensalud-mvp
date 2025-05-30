/**
 * Mock data generators based on OPTICAL_SIMULATION.md
 * Provides realistic test data for AgentSalud testing
 */

import { MockUser, MockOrganization, MockAppointment } from '../utils/test-helpers';

// Organization data based on Óptica VisualCare
export const MOCK_ORGANIZATIONS: MockOrganization[] = [
  {
    id: 'org_visualcare_001',
    name: 'Óptica VisualCare',
    slug: 'visualcare',
    email: 'info@visualcare.com',
    phone: '+1234567890',
    website: 'https://www.visualcare.com',
    address: 'Av. Principal 123',
    city: 'Ciudad Central',
    state: 'Estado Central',
    postal_code: '12345',
    country: 'España',
    description: 'Red de ópticas especializada en exámenes visuales, venta de lentes graduados, lentes de contacto y gafas de sol.'
  }
];

// Locations/Branches data
export const MOCK_LOCATIONS = [
  {
    id: 'loc_central_001',
    organization_id: 'org_visualcare_001',
    name: 'VisualCare Central',
    address: 'Av. Principal 123, Ciudad Central',
    city: 'Ciudad Central',
    postal_code: '12345',
    phone: '+1234567890',
    email: 'central@visualcare.com',
    description: 'Nuestra sede principal con todos los servicios disponibles, incluyendo laboratorio propio para fabricación de lentes.',
    schedule: {
      monday: { open: '09:00', close: '20:00' },
      tuesday: { open: '09:00', close: '20:00' },
      wednesday: { open: '09:00', close: '20:00' },
      thursday: { open: '09:00', close: '20:00' },
      friday: { open: '09:00', close: '20:00' },
      saturday: { open: '10:00', close: '14:00' },
      sunday: { closed: true }
    }
  },
  {
    id: 'loc_norte_001',
    organization_id: 'org_visualcare_001',
    name: 'VisualCare Norte',
    address: 'Calle Norte 456, Barrio Norte',
    city: 'Ciudad Central',
    postal_code: '12346',
    phone: '+1234567891',
    email: 'norte@visualcare.com',
    description: 'Sede especializada en atención pediátrica y adaptación de lentes de contacto.',
    schedule: {
      monday: { open: '10:00', close: '19:00' },
      tuesday: { open: '10:00', close: '19:00' },
      wednesday: { open: '10:00', close: '19:00' },
      thursday: { open: '10:00', close: '19:00' },
      friday: { open: '10:00', close: '19:00' },
      saturday: { open: '10:00', close: '14:00' },
      sunday: { closed: true }
    }
  },
  {
    id: 'loc_shopping_001',
    organization_id: 'org_visualcare_001',
    name: 'VisualCare Shopping',
    address: 'Centro Comercial Cityplaza, Local 45',
    city: 'Ciudad Central',
    postal_code: '12347',
    phone: '+1234567892',
    email: 'shopping@visualcare.com',
    description: 'Ubicada en el centro comercial más grande de la ciudad, especializada en moda óptica y atención rápida.',
    schedule: {
      monday: { open: '10:00', close: '22:00' },
      tuesday: { open: '10:00', close: '22:00' },
      wednesday: { open: '10:00', close: '22:00' },
      thursday: { open: '10:00', close: '22:00' },
      friday: { open: '10:00', close: '22:00' },
      saturday: { open: '10:00', close: '22:00' },
      sunday: { open: '10:00', close: '22:00' }
    }
  }
];

// Users data based on simulation
export const MOCK_USERS: MockUser[] = [
  // Administrators
  {
    id: 'user_carlos_001',
    email: 'carlos.martinez.new@visualcare.com',
    role: 'admin',
    organization_id: 'org_visualcare_001',
    profile: {
      full_name: 'Carlos Martínez',
      phone: '+34600111222',
    }
  },
  {
    id: 'user_laura_001',
    email: 'laura.gomez.new@visualcare.com',
    role: 'admin',
    organization_id: 'org_visualcare_001',
    profile: {
      full_name: 'Laura Gómez',
      phone: '+34600111223',
    }
  },
  // Doctors/Optometrists
  {
    id: 'user_ana_001',
    email: 'ana.rodriguez.new@visualcare.com',
    role: 'doctor',
    organization_id: 'org_visualcare_001',
    profile: {
      full_name: 'Ana Rodríguez',
      phone: '+34600111224',
    }
  },
  {
    id: 'user_pedro_001',
    email: 'pedro.sanchez.new@visualcare.com',
    role: 'doctor',
    organization_id: 'org_visualcare_001',
    profile: {
      full_name: 'Pedro Sánchez',
      phone: '+34600111225',
    }
  },
  {
    id: 'user_elena_001',
    email: 'elena.lopez.new@visualcare.com',
    role: 'doctor',
    organization_id: 'org_visualcare_001',
    profile: {
      full_name: 'Elena López',
      phone: '+34600111226',
    }
  },
  // Staff
  {
    id: 'user_carmen_001',
    email: 'carmen.ruiz.new@visualcare.com',
    role: 'staff',
    organization_id: 'org_visualcare_001',
    profile: {
      full_name: 'Carmen Ruiz',
      phone: '+34600111229',
    }
  },
  // Patients
  {
    id: 'user_maria_001',
    email: 'maria.garcia.new@example.com',
    role: 'patient',
    organization_id: 'org_visualcare_001',
    profile: {
      full_name: 'María García',
      phone: '+34600222111',
      address: 'Calle Mayor 10, Madrid',
    }
  },
  {
    id: 'user_juan_001',
    email: 'juan.perez.new@example.com',
    role: 'patient',
    organization_id: 'org_visualcare_001',
    profile: {
      full_name: 'Juan Pérez',
      phone: '+34600222112',
      address: 'Avenida Libertad 45, Barcelona',
    }
  }
];

// Services data
export const MOCK_SERVICES = [
  {
    id: 'service_exam_complete',
    organization_id: 'org_visualcare_001',
    name: 'Examen Visual Completo',
    description: 'Evaluación completa de la salud visual y ocular, incluyendo refracción, tonometría, biomicroscopía y fondo de ojo.',
    duration: 45,
    price: 60,
    category: 'Exámenes'
  },
  {
    id: 'service_exam_quick',
    organization_id: 'org_visualcare_001',
    name: 'Control Visual Rápido',
    description: 'Revisión básica de la graduación y ajuste de prescripción.',
    duration: 20,
    price: 30,
    category: 'Exámenes'
  },
  {
    id: 'service_exam_pediatric',
    organization_id: 'org_visualcare_001',
    name: 'Examen Visual Pediátrico',
    description: 'Evaluación especializada para niños, con técnicas adaptadas a diferentes edades.',
    duration: 30,
    price: 45,
    category: 'Exámenes'
  },
  {
    id: 'service_contact_soft',
    organization_id: 'org_visualcare_001',
    name: 'Adaptación de Lentes de Contacto Blandas',
    description: 'Evaluación, medición y prueba de lentes de contacto blandas.',
    duration: 40,
    price: 50,
    category: 'Lentes de Contacto'
  }
];

// Sample appointments
export const MOCK_APPOINTMENTS: MockAppointment[] = [
  {
    id: 'apt_001',
    patient_id: 'user_juan_001',
    doctor_id: 'user_ana_001',
    organization_id: 'org_visualcare_001',
    service_id: 'service_exam_complete',
    appointment_date: '2024-01-15',
    start_time: '10:00',
    end_time: '10:45',
    status: 'confirmed',
    notes: 'Primera consulta'
  },
  {
    id: 'apt_002',
    patient_id: 'user_maria_001',
    doctor_id: 'user_pedro_001',
    organization_id: 'org_visualcare_001',
    service_id: 'service_contact_soft',
    appointment_date: '2024-01-15',
    start_time: '16:30',
    end_time: '17:10',
    status: 'confirmed',
    notes: 'Adaptación de lentes de contacto'
  }
];

// AI conversation examples for testing
export const MOCK_AI_CONVERSATIONS = [
  {
    id: 'conv_001',
    messages: [
      {
        id: 'msg_001',
        content: 'Necesito una cita con cardiología',
        role: 'user',
        timestamp: '2024-01-15T10:00:00.000Z'
      },
      {
        id: 'msg_002',
        content: 'Te ayudo a agendar una cita con cardiología. ¿Tienes alguna preferencia de fecha?',
        role: 'assistant',
        timestamp: '2024-01-15T10:00:05.000Z',
        metadata: {
          intent: 'book',
          specialty: 'cardiología',
          confidence: 0.9
        }
      }
    ],
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:05.000Z',
    status: 'active'
  }
];

// Factory functions for generating test data
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: `user_${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    role: 'patient',
    organization_id: 'org_visualcare_001',
    profile: {
      full_name: 'Test User',
      phone: '+34600000000',
    },
    ...overrides
  };
}

export function createMockOrganization(overrides: Partial<MockOrganization> = {}): MockOrganization {
  return {
    id: `org_${Date.now()}`,
    name: 'Test Organization',
    slug: `test-org-${Date.now()}`,
    email: 'test@example.com',
    phone: '+1234567890',
    address: 'Test Address 123',
    city: 'Test City',
    state: 'Test State',
    postal_code: '12345',
    country: 'España',
    ...overrides
  };
}

export function createMockAppointment(overrides: Partial<MockAppointment> = {}): MockAppointment {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    id: `apt_${Date.now()}`,
    patient_id: 'user_maria_001',
    doctor_id: 'user_ana_001',
    organization_id: 'org_visualcare_001',
    appointment_date: tomorrow.toISOString().split('T')[0] || tomorrow.toISOString().substring(0, 10),
    start_time: '10:00',
    end_time: '10:45',
    status: 'scheduled',
    ...overrides
  };
}
