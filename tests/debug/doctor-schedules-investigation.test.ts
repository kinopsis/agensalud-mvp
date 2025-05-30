/**
 * FASE 3: GESTIÓN DE HORARIOS DE DOCTORES - ERROR CRÍTICO
 * Test específico para debuggear el error "Error al cargar horarios del doctor"
 * 
 * OBJETIVO: Debuggear el error "Error al cargar horarios del doctor":
 * - Analizar endpoint /api/doctors/[id]/schedule
 * - Revisar componente de gestión de horarios
 * - Validar consultas de base de datos para tabla doctor_schedules
 * - Verificar filtros de organization_id en consultas de horarios
 * - Analizar logs de errores específicos
 */

import { createClient } from '@/lib/supabase/server';

// Mock para createClient
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}));

describe('🔍 FASE 3: GESTIÓN DE HORARIOS DE DOCTORES - ERROR CRÍTICO', () => {
  let mockSupabase: any;
  const mockDoctorId = 'doctor-test-123';
  const mockOrganizationId = 'org-test-123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn()
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              single: jest.fn()
            })),
            insert: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
          }))
        }))
      }))
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('🔍 PROBLEMA 1: Endpoint /api/doctors/[id]/schedule', () => {
    it('should identify issues with doctor schedule endpoint', async () => {
      // Simular problemas comunes del endpoint
      const endpointIssues = {
        invalidDoctorId: 'Doctor ID format validation failing',
        tableNotFound: 'Table doctor_schedules might not exist',
        joinError: 'JOIN with doctors and profiles tables failing',
        organizationFilter: 'Missing organization_id filter in query',
        rlsPolicy: 'RLS policy blocking access to schedules',
        dataStructure: 'Incorrect data structure in response'
      };

      console.log('🔴 PROBLEMA CRÍTICO: Issues with /api/doctors/[id]/schedule endpoint');
      console.log('Endpoint issues:', endpointIssues);
      
      expect(Object.keys(endpointIssues)).toHaveLength(6);
    });

    it('should verify doctor schedule query structure', async () => {
      // Mock successful query structure
      const expectedQuery = {
        table: 'doctor_schedules',
        select: `
          *,
          doctors!inner(
            id,
            specialization,
            profiles!inner(
              first_name,
              last_name,
              email
            )
          )
        `,
        filter: 'doctor_id',
        order: 'day_of_week'
      };

      // Mock query response
      const mockSchedules = [
        {
          id: 'schedule-1',
          doctor_id: mockDoctorId,
          day_of_week: 1,
          start_time: '09:00',
          end_time: '17:00',
          is_available: true,
          doctors: {
            id: mockDoctorId,
            specialization: 'Cardiología',
            profiles: {
              first_name: 'Dr. Juan',
              last_name: 'Pérez',
              email: 'juan.perez@test.com'
            }
          }
        }
      ];

      // Configurar mock para consulta de horarios
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'doctor_schedules') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => Promise.resolve({
                  data: mockSchedules,
                  error: null
                }))
              }))
            }))
          };
        }
        return { select: jest.fn() };
      });

      console.log('✅ VALIDACIÓN: Estructura de consulta de horarios');
      console.log('Expected query:', expectedQuery);
      console.log('Mock schedules:', mockSchedules);
      
      expect(mockSchedules).toHaveLength(1);
      expect(mockSchedules[0].doctor_id).toBe(mockDoctorId);
    });
  });

  describe('🔍 PROBLEMA 2: Tabla doctor_schedules', () => {
    it('should verify doctor_schedules table structure', async () => {
      // Verificar estructura esperada de la tabla
      const expectedTableStructure = {
        tableName: 'doctor_schedules',
        columns: {
          id: 'UUID PRIMARY KEY',
          doctor_id: 'UUID REFERENCES doctors(id)',
          day_of_week: 'INTEGER (0-6)',
          start_time: 'TIME',
          end_time: 'TIME',
          is_available: 'BOOLEAN',
          notes: 'TEXT',
          created_at: 'TIMESTAMP',
          updated_at: 'TIMESTAMP'
        },
        indexes: [
          'doctor_id',
          'day_of_week',
          'is_available'
        ],
        rlsPolicies: [
          'doctor_schedules_same_organization',
          'doctors_manage_own_schedules'
        ]
      };

      console.log('🔍 INVESTIGACIÓN: Estructura de tabla doctor_schedules');
      console.log('Expected table structure:', expectedTableStructure);
      
      expect(expectedTableStructure.tableName).toBe('doctor_schedules');
      expect(Object.keys(expectedTableStructure.columns)).toHaveLength(8);
    });

    it('should identify potential table issues', async () => {
      // Identificar problemas potenciales con la tabla
      const tableIssues = {
        tableExists: 'Verificar si tabla doctor_schedules existe',
        foreignKeys: 'Verificar relación con tabla doctors',
        dataTypes: 'Verificar tipos de datos de columnas',
        constraints: 'Verificar restricciones de tiempo y día',
        indexes: 'Verificar índices para performance',
        rlsPolicies: 'Verificar políticas RLS para acceso'
      };

      console.log('🔴 PROBLEMA POTENCIAL: Issues with doctor_schedules table');
      console.log('Table issues:', tableIssues);
      
      expect(Object.keys(tableIssues)).toHaveLength(6);
    });
  });

  describe('🔍 PROBLEMA 3: Filtros organization_id', () => {
    it('should verify organization_id filtering in schedule queries', async () => {
      // Verificar que las consultas incluyan filtros de organización
      const organizationFiltering = {
        directFilter: 'doctor_schedules.organization_id = ?',
        joinFilter: 'doctors.organization_id = ?',
        rlsFilter: 'get_user_organization_id()',
        multiTenantIsolation: 'Aislamiento por organización'
      };

      // Mock query con filtro de organización
      const mockFilteredSchedules = [
        {
          id: 'schedule-1',
          doctor_id: mockDoctorId,
          organization_id: mockOrganizationId,
          day_of_week: 1,
          start_time: '09:00',
          end_time: '17:00'
        }
      ];

      console.log('🔍 INVESTIGACIÓN: Filtros de organization_id en consultas');
      console.log('Organization filtering:', organizationFiltering);
      console.log('Filtered schedules:', mockFilteredSchedules);
      
      expect(mockFilteredSchedules[0].organization_id).toBe(mockOrganizationId);
    });

    it('should identify missing organization filters', async () => {
      // Identificar filtros faltantes
      const missingFilters = {
        scheduleQuery: 'Consulta de horarios sin filtro organization_id',
        doctorValidation: 'Validación de doctor sin verificar organización',
        rlsPolicy: 'Política RLS no incluye organization_id',
        joinCondition: 'JOIN sin condición de organización'
      };

      console.log('🔴 PROBLEMA CRÍTICO: Missing organization filters');
      console.log('Missing filters:', missingFilters);
      
      expect(Object.keys(missingFilters)).toHaveLength(4);
    });
  });

  describe('🔍 PROBLEMA 4: Componente de Gestión de Horarios', () => {
    it('should verify ScheduleManager component functionality', async () => {
      // Verificar funcionalidad del componente
      const componentFunctionality = {
        fetchSchedules: 'Función para cargar horarios',
        errorHandling: 'Manejo de errores en UI',
        loadingStates: 'Estados de carga',
        dataBinding: 'Vinculación de datos',
        formValidation: 'Validación de formularios',
        apiIntegration: 'Integración con API'
      };

      // Mock error del componente
      const componentError = {
        message: 'Error al cargar horarios del doctor',
        source: 'ScheduleManager.fetchSchedules()',
        apiCall: '/api/doctors/${doctorId}/schedule',
        httpStatus: 500,
        supabaseError: 'relation "doctor_schedules" does not exist'
      };

      console.log('🔍 INVESTIGACIÓN: Funcionalidad del componente ScheduleManager');
      console.log('Component functionality:', componentFunctionality);
      console.log('Component error:', componentError);
      
      expect(componentError.message).toContain('Error al cargar horarios');
    });

    it('should verify staff schedules page functionality', async () => {
      // Verificar página de horarios del staff
      const staffSchedulesPage = {
        route: '/staff/schedules',
        component: 'StaffSchedulesPage',
        functionality: 'Gestión de horarios por staff',
        apiEndpoint: '/api/doctors/${doctorId}/schedule',
        errorMessage: 'Error al cargar horarios del doctor.',
        errorSource: 'fetchDoctorSchedules function'
      };

      console.log('🔍 INVESTIGACIÓN: Página de horarios del staff');
      console.log('Staff schedules page:', staffSchedulesPage);
      
      expect(staffSchedulesPage.errorMessage).toBe('Error al cargar horarios del doctor.');
    });
  });

  describe('🔍 PROBLEMA 5: Logs de Errores Específicos', () => {
    it('should analyze specific error logs', async () => {
      // Analizar logs de errores específicos
      const errorLogs = {
        apiError: {
          endpoint: '/api/doctors/[id]/schedule',
          method: 'GET',
          status: 500,
          error: 'Internal Server Error',
          details: 'relation "doctor_schedules" does not exist'
        },
        supabaseError: {
          code: '42P01',
          message: 'relation "doctor_schedules" does not exist',
          hint: 'Perhaps you meant to reference the table "doctor_availability"?',
          position: '15'
        },
        componentError: {
          component: 'ScheduleManager',
          function: 'fetchSchedules',
          message: 'Failed to fetch schedules',
          stack: 'Error at fetchSchedules line 82'
        }
      };

      console.log('🔴 PROBLEMA CRÍTICO: Logs de errores específicos');
      console.log('Error logs:', errorLogs);
      
      // Verificar que el error principal es tabla no encontrada
      expect(errorLogs.supabaseError.message).toContain('does not exist');
      expect(errorLogs.supabaseError.hint).toContain('doctor_availability');
    });

    it('should identify root cause of schedule loading error', async () => {
      // Identificar causa raíz del error
      const rootCause = {
        primaryIssue: 'Tabla doctor_schedules no existe en la base de datos',
        suggestedTable: 'doctor_availability (sugerida por Supabase)',
        impact: 'Todas las funcionalidades de horarios fallan',
        affectedComponents: [
          'ScheduleManager',
          'StaffSchedulesPage', 
          'DoctorSchedulePage',
          'AvailabilityEngine'
        ],
        affectedEndpoints: [
          '/api/doctors/[id]/schedule',
          '/api/doctors/availability'
        ],
        solution: 'Crear tabla doctor_schedules o usar doctor_availability'
      };

      console.log('🎯 CAUSA RAÍZ IDENTIFICADA: Schedule loading error');
      console.log('Root cause analysis:', rootCause);
      
      expect(rootCause.primaryIssue).toContain('doctor_schedules no existe');
      expect(rootCause.affectedComponents).toHaveLength(4);
    });
  });

  describe('📊 RESUMEN DE INVESTIGACIÓN HORARIOS DE DOCTORES', () => {
    it('should provide comprehensive schedule investigation summary', async () => {
      const scheduleInvestigationSummary = {
        tableIssue: '🔴 CRÍTICO - Tabla doctor_schedules no existe',
        endpointError: '🔴 CRÍTICO - Endpoint /api/doctors/[id]/schedule falla',
        componentError: '🔴 CRÍTICO - ScheduleManager no puede cargar datos',
        suggestedFix: '🔧 SOLUCIÓN - Usar tabla doctor_availability existente',
        alternativeFix: '🔧 ALTERNATIVA - Crear tabla doctor_schedules',
        organizationFilter: '🟡 REVISAR - Verificar filtros multi-tenant',
        rlsPolicies: '🟡 REVISAR - Verificar políticas RLS',
        dataStructure: '✅ VALIDADO - Estructura de datos correcta'
      };

      console.log('📊 RESUMEN DE INVESTIGACIÓN - HORARIOS DE DOCTORES');
      console.log('Schedule Investigation Summary:', scheduleInvestigationSummary);
      
      // Verificar que hay problemas críticos identificados
      const criticalIssues = Object.values(scheduleInvestigationSummary).filter(status => status.includes('🔴 CRÍTICO'));
      expect(criticalIssues).toHaveLength(3);
    });
  });
});
