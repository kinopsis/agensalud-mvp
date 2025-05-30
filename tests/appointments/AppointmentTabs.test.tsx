/**
 * AppointmentTabs Component Tests
 * 
 * Pruebas automatizadas para el sistema de pestañas de citas del paciente
 * Cobertura: renderizado, filtrado, contadores, interacciones, accesibilidad
 * 
 * @author AgentSalud MVP Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AppointmentTabs, {
  type TabType,
  filterAppointmentsByTab,
  useAppointmentCounts,
  isVigenteAppointment,
  isHistorialAppointment,
  EmptyTabMessage,
  useAppointmentTabs,
  getTabConfig,
  isValidTabType
} from '@/components/appointments/AppointmentTabs';
import { AppointmentData } from '@/components/appointments/AppointmentCard';

// Mock data for testing
// Current test time: 2024-12-15T12:00:00Z
const mockAppointments: AppointmentData[] = [
  {
    id: '1',
    appointment_date: '2024-12-20', // Future date
    start_time: '10:00:00',
    duration_minutes: 30,
    status: 'confirmed', // VIGENTE
    reason: 'Consulta general',
    notes: null,
    doctor: [{
      id: 'doc1',
      specialization: 'Medicina General',
      profiles: [{ first_name: 'Juan', last_name: 'Pérez' }]
    }],
    patient: [{ id: 'pat1', first_name: 'María', last_name: 'García' }],
    location: [{ id: 'loc1', name: 'Sede Principal', address: 'Calle 123' }],
    service: [{ id: 'serv1', name: 'Consulta General', duration_minutes: 30, price: 50000 }]
  },
  {
    id: '2',
    appointment_date: '2024-11-15', // Past date
    start_time: '14:00:00',
    duration_minutes: 45,
    status: 'completed', // HISTORIAL
    reason: 'Revisión',
    notes: 'Paciente en buen estado',
    doctor: [{
      id: 'doc2',
      specialization: 'Cardiología',
      profiles: [{ first_name: 'Ana', last_name: 'López' }]
    }],
    patient: [{ id: 'pat1', first_name: 'María', last_name: 'García' }],
    location: [{ id: 'loc1', name: 'Sede Principal', address: 'Calle 123' }],
    service: [{ id: 'serv2', name: 'Consulta Cardiológica', duration_minutes: 45, price: 80000 }]
  },
  {
    id: '3',
    appointment_date: '2024-12-25', // Future date
    start_time: '09:00:00',
    duration_minutes: 30,
    status: 'pending', // VIGENTE
    reason: 'Control',
    notes: null,
    doctor: [{
      id: 'doc1',
      specialization: 'Medicina General',
      profiles: [{ first_name: 'Juan', last_name: 'Pérez' }]
    }],
    patient: [{ id: 'pat1', first_name: 'María', last_name: 'García' }],
    location: [{ id: 'loc1', name: 'Sede Principal', address: 'Calle 123' }],
    service: [{ id: 'serv1', name: 'Consulta General', duration_minutes: 30, price: 50000 }]
  },
  {
    id: '4',
    appointment_date: '2024-10-10', // Past date
    start_time: '11:00:00',
    duration_minutes: 30,
    status: 'cancelled', // HISTORIAL
    reason: 'Cancelada por paciente',
    notes: null,
    doctor: [{
      id: 'doc1',
      specialization: 'Medicina General',
      profiles: [{ first_name: 'Juan', last_name: 'Pérez' }]
    }],
    patient: [{ id: 'pat1', first_name: 'María', last_name: 'García' }],
    location: [{ id: 'loc1', name: 'Sede Principal', address: 'Calle 123' }],
    service: [{ id: 'serv1', name: 'Consulta General', duration_minutes: 30, price: 50000 }]
  }
];

// Test wrapper component for hooks
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div>{children}</div>;
};

describe('AppointmentTabs Component', () => {
  const mockOnTabChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current date to ensure consistent test results
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-12-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Renderizado básico', () => {
    it('debe renderizar las pestañas correctamente', () => {
      render(
        <AppointmentTabs
          appointments={mockAppointments}
          activeTab="vigentes"
          onTabChange={mockOnTabChange}
        />
      );

      expect(screen.getByRole('tab', { name: /vigentes/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /historial/i })).toBeInTheDocument();
    });

    it('debe mostrar la pestaña activa correctamente', () => {
      render(
        <AppointmentTabs
          appointments={mockAppointments}
          activeTab="vigentes"
          onTabChange={mockOnTabChange}
        />
      );

      const vigenteTab = screen.getByRole('tab', { name: /vigentes/i });
      const historialTab = screen.getByRole('tab', { name: /historial/i });

      expect(vigenteTab).toHaveAttribute('aria-selected', 'true');
      expect(historialTab).toHaveAttribute('aria-selected', 'false');
    });

    it('debe mostrar contadores de citas por pestaña', () => {
      render(
        <AppointmentTabs
          appointments={mockAppointments}
          activeTab="vigentes"
          onTabChange={mockOnTabChange}
        />
      );

      // Vigentes: 2 citas (confirmed + pending futuras)
      // Historial: 2 citas (completed + cancelled)
      const counters = screen.getAllByText('2');
      expect(counters).toHaveLength(2); // Debe haber 2 contadores con valor "2"
    });
  });

  describe('Interacciones', () => {
    it('debe llamar onTabChange cuando se hace clic en una pestaña', () => {
      render(
        <AppointmentTabs
          appointments={mockAppointments}
          activeTab="vigentes"
          onTabChange={mockOnTabChange}
        />
      );

      const historialTab = screen.getByRole('tab', { name: /historial/i });
      fireEvent.click(historialTab);

      expect(mockOnTabChange).toHaveBeenCalledWith('historial');
    });

    it('debe manejar el estado de carga', () => {
      render(
        <AppointmentTabs
          appointments={[]}
          activeTab="vigentes"
          onTabChange={mockOnTabChange}
          loading={true}
        />
      );

      const loadingElements = screen.getAllByText('Cargando...');
      expect(loadingElements.length).toBeGreaterThan(0);
    });
  });

  describe('Accesibilidad', () => {
    it('debe tener atributos ARIA correctos', () => {
      render(
        <AppointmentTabs
          appointments={mockAppointments}
          activeTab="vigentes"
          onTabChange={mockOnTabChange}
        />
      );

      const tablist = screen.getByRole('navigation');
      expect(tablist).toHaveAttribute('aria-label', 'Pestañas de citas');

      const vigenteTab = screen.getByRole('tab', { name: /vigentes/i });
      expect(vigenteTab).toHaveAttribute('id', 'tab-vigentes');
      expect(vigenteTab).toHaveAttribute('aria-controls', 'tabpanel-vigentes');
    });

    it('debe ser navegable por teclado', () => {
      render(
        <AppointmentTabs
          appointments={mockAppointments}
          activeTab="vigentes"
          onTabChange={mockOnTabChange}
        />
      );

      const vigenteTab = screen.getByRole('tab', { name: /vigentes/i });
      vigenteTab.focus();
      
      expect(vigenteTab).toHaveFocus();
    });
  });
});

describe('Funciones de filtrado', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-12-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('isVigenteAppointment', () => {
    it('debe identificar citas vigentes correctamente', () => {
      const vigenteAppointment = mockAppointments[0]; // confirmed, futura
      const pendingAppointment = mockAppointments[2]; // pending, futura
      
      expect(isVigenteAppointment(vigenteAppointment)).toBe(true);
      expect(isVigenteAppointment(pendingAppointment)).toBe(true);
    });

    it('debe excluir citas no vigentes', () => {
      const completedAppointment = mockAppointments[1]; // completed, pasada
      const cancelledAppointment = mockAppointments[3]; // cancelled, pasada
      
      expect(isVigenteAppointment(completedAppointment)).toBe(false);
      expect(isVigenteAppointment(cancelledAppointment)).toBe(false);
    });
  });

  describe('isHistorialAppointment', () => {
    it('debe identificar citas de historial correctamente', () => {
      const completedAppointment = mockAppointments[1]; // completed
      const cancelledAppointment = mockAppointments[3]; // cancelled
      
      expect(isHistorialAppointment(completedAppointment)).toBe(true);
      expect(isHistorialAppointment(cancelledAppointment)).toBe(true);
    });

    it('debe excluir citas vigentes', () => {
      const vigenteAppointment = mockAppointments[0]; // confirmed, futura
      const pendingAppointment = mockAppointments[2]; // pending, futura
      
      expect(isHistorialAppointment(vigenteAppointment)).toBe(false);
      expect(isHistorialAppointment(pendingAppointment)).toBe(false);
    });
  });

  describe('filterAppointmentsByTab', () => {
    it('debe filtrar citas vigentes correctamente', () => {
      const vigentes = filterAppointmentsByTab(mockAppointments, 'vigentes');
      expect(vigentes).toHaveLength(2);
      expect(vigentes.every(apt => ['confirmed', 'pending'].includes(apt.status))).toBe(true);
    });

    it('debe filtrar citas de historial correctamente', () => {
      const historial = filterAppointmentsByTab(mockAppointments, 'historial');
      expect(historial).toHaveLength(2);
      expect(historial.every(apt => ['completed', 'cancelled'].includes(apt.status))).toBe(true);
    });
  });
});

describe('EmptyTabMessage Component', () => {
  const mockOnCreateAppointment = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe renderizar mensaje vacío para vigentes', () => {
    render(
      <EmptyTabMessage 
        tabType="vigentes" 
        onCreateAppointment={mockOnCreateAppointment}
      />
    );

    expect(screen.getByText('No tienes citas vigentes')).toBeInTheDocument();
    expect(screen.getByText('Agendar Primera Cita')).toBeInTheDocument();
  });

  it('debe renderizar mensaje vacío para historial', () => {
    render(
      <EmptyTabMessage tabType="historial" />
    );

    expect(screen.getByText('No hay historial de citas')).toBeInTheDocument();
    expect(screen.queryByText('Agendar Primera Cita')).not.toBeInTheDocument();
  });

  it('debe llamar onCreateAppointment cuando se hace clic en el botón', () => {
    render(
      <EmptyTabMessage 
        tabType="vigentes" 
        onCreateAppointment={mockOnCreateAppointment}
      />
    );

    const button = screen.getByText('Agendar Primera Cita');
    fireEvent.click(button);

    expect(mockOnCreateAppointment).toHaveBeenCalledTimes(1);
  });
});

describe('Funciones utilitarias', () => {
  it('getTabConfig debe retornar configuración correcta', () => {
    const vigenteConfig = getTabConfig('vigentes');
    expect(vigenteConfig.label).toBe('Vigentes');
    expect(vigenteConfig.description).toBe('Citas confirmadas y pendientes');

    const historialConfig = getTabConfig('historial');
    expect(historialConfig.label).toBe('Historial');
    expect(historialConfig.description).toBe('Citas completadas y canceladas');
  });

  it('isValidTabType debe validar tipos correctamente', () => {
    expect(isValidTabType('vigentes')).toBe(true);
    expect(isValidTabType('historial')).toBe(true);
    expect(isValidTabType('invalid')).toBe(false);
  });
});

describe('useAppointmentCounts Hook', () => {
  it('debe calcular contadores correctamente', () => {
    // Test direct function calls first
    const vigentes = filterAppointmentsByTab(mockAppointments, 'vigentes');
    const historial = filterAppointmentsByTab(mockAppointments, 'historial');

    expect(vigentes).toHaveLength(2);
    expect(historial).toHaveLength(2);

    const TestComponent = () => {
      const counts = useAppointmentCounts(mockAppointments);
      return (
        <div>
          <span data-testid="vigentes-count">{counts.vigentes}</span>
          <span data-testid="historial-count">{counts.historial}</span>
          <span data-testid="total-count">{counts.total}</span>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByTestId('vigentes-count')).toHaveTextContent('2');
    expect(screen.getByTestId('historial-count')).toHaveTextContent('2');
    expect(screen.getByTestId('total-count')).toHaveTextContent('4');
  });

  it('debe manejar lista vacía de citas', () => {
    const TestComponent = () => {
      const counts = useAppointmentCounts([]);
      return (
        <div>
          <span data-testid="vigentes-count">{counts.vigentes}</span>
          <span data-testid="historial-count">{counts.historial}</span>
          <span data-testid="total-count">{counts.total}</span>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByTestId('vigentes-count')).toHaveTextContent('0');
    expect(screen.getByTestId('historial-count')).toHaveTextContent('0');
    expect(screen.getByTestId('total-count')).toHaveTextContent('0');
  });
});

describe('useAppointmentTabs Hook', () => {
  it('debe manejar estado de pestañas correctamente', () => {
    const TestComponent = () => {
      const { activeTab, handleTabChange } = useAppointmentTabs('vigentes');
      return (
        <div>
          <span data-testid="active-tab">{activeTab}</span>
          <button type="button" onClick={() => handleTabChange('historial')}>
            Cambiar a Historial
          </button>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByTestId('active-tab')).toHaveTextContent('vigentes');

    const button = screen.getByText('Cambiar a Historial');
    fireEvent.click(button);

    expect(screen.getByTestId('active-tab')).toHaveTextContent('historial');
  });

  it('debe usar pestaña inicial por defecto', () => {
    const TestComponent = () => {
      const { activeTab } = useAppointmentTabs();
      return <span data-testid="active-tab">{activeTab}</span>;
    };

    render(<TestComponent />);

    expect(screen.getByTestId('active-tab')).toHaveTextContent('vigentes');
  });
});

describe('Casos edge y manejo de errores', () => {
  const mockOnTabChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-12-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debe manejar citas con fechas límite correctamente', () => {
    const edgeCaseAppointments: AppointmentData[] = [
      {
        ...mockAppointments[0],
        id: 'edge1',
        appointment_date: '2024-12-16', // Mañana
        start_time: '10:00:00', // Futuro
        status: 'confirmed'
      },
      {
        ...mockAppointments[0],
        id: 'edge2',
        appointment_date: '2024-12-14', // Ayer
        start_time: '11:00:00', // Pasado
        status: 'confirmed'
      }
    ];

    const vigentes = filterAppointmentsByTab(edgeCaseAppointments, 'vigentes');
    const historial = filterAppointmentsByTab(edgeCaseAppointments, 'historial');

    expect(vigentes).toHaveLength(1); // Solo la futura
    expect(historial).toHaveLength(1); // Solo la pasada
  });

  it('debe manejar citas sin datos de doctor/paciente', () => {
    const incompleteAppointment: AppointmentData = {
      id: 'incomplete',
      appointment_date: '2024-12-20',
      start_time: '10:00:00',
      duration_minutes: 30,
      status: 'confirmed',
      reason: null,
      notes: null,
      doctor: null,
      patient: null,
      location: null,
      service: null
    };

    expect(isVigenteAppointment(incompleteAppointment)).toBe(true);
    expect(isHistorialAppointment(incompleteAppointment)).toBe(false);
  });

  it('debe manejar estados de cita no estándar', () => {
    const nonStandardAppointment: AppointmentData = {
      ...mockAppointments[0],
      id: 'non-standard',
      status: 'rescheduled' // Estado no estándar
    };

    expect(isVigenteAppointment(nonStandardAppointment)).toBe(false);
    expect(isHistorialAppointment(nonStandardAppointment)).toBe(false);
  });

  it('debe renderizar con className personalizada', () => {
    const { container } = render(
      <AppointmentTabs
        appointments={mockAppointments}
        activeTab="vigentes"
        onTabChange={mockOnTabChange}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('debe integrar correctamente con AppointmentCard ribbon-style', () => {
    // Test that the tabs work with the new ribbon-style AppointmentCard
    render(
      <div>
        <AppointmentTabs
          appointments={mockAppointments}
          activeTab="vigentes"
          onTabChange={mockOnTabChange}
        />
        <div data-testid="appointment-list">
          {filterAppointmentsByTab(mockAppointments, 'vigentes').map((appointment) => (
            <div key={appointment.id} data-testid={`appointment-${appointment.id}`}>
              {appointment.service?.[0]?.name || 'Consulta General'}
            </div>
          ))}
        </div>
      </div>
    );

    // Verify tabs are rendered
    expect(screen.getByRole('tab', { name: /vigentes/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /historial/i })).toBeInTheDocument();

    // Verify filtered appointments are displayed
    const appointmentList = screen.getByTestId('appointment-list');
    expect(appointmentList).toBeInTheDocument();

    // Should show vigentes appointments (2 in our mock data)
    const vigentesAppointments = filterAppointmentsByTab(mockAppointments, 'vigentes');
    expect(vigentesAppointments).toHaveLength(2);
  });
});
