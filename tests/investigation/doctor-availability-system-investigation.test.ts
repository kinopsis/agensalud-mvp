/**
 * Doctor Availability System Investigation
 * 
 * OBJETIVO: Investigar el estado actual del sistema de disponibilidad de doctores
 * y analizar cómo funciona el sistema de reservas sin horarios configurados.
 * 
 * FASES:
 * 1. Verificación de base de datos
 * 2. Análisis de datos existentes
 * 3. Investigación de lógica de citas
 * 4. Análisis de comportamiento del sistema
 * 5. Recomendaciones
 */

import { createClient } from '@/lib/supabase/server';

describe('🔍 DOCTOR AVAILABILITY SYSTEM INVESTIGATION', () => {
  let supabase: any;

  beforeAll(async () => {
    supabase = await createClient();
  });

  describe('📋 FASE 1: VERIFICACIÓN DE BASE DE DATOS', () => {
    it('should verify if doctor_availability table exists and its structure', async () => {
      console.log('\n🔍 FASE 1: VERIFICACIÓN DE BASE DE DATOS');
      console.log('=====================================');
      
      // Test 1: Verificar existencia de tabla
      console.log('\n1. VERIFICANDO EXISTENCIA DE TABLA doctor_availability...');
      
      const { data: tableExists, error: tableError } = await supabase
        .from('doctor_availability')
        .select('count')
        .limit(1);

      if (tableError) {
        console.log('❌ Tabla doctor_availability:', tableError.message);
        console.log('🔍 Código de error:', tableError.code);
        
        if (tableError.code === '42P01') {
          console.log('📋 DIAGNÓSTICO: La tabla doctor_availability NO EXISTE');
        }
      } else {
        console.log('✅ Tabla doctor_availability: EXISTE y es accesible');
      }

      // Test 2: Verificar estructura si existe
      if (!tableError) {
        console.log('\n2. VERIFICANDO ESTRUCTURA DE LA TABLA...');
        
        const { data: sampleRecord, error: structureError } = await supabase
          .from('doctor_availability')
          .select('*')
          .limit(1);

        if (structureError) {
          console.log('❌ Error obteniendo estructura:', structureError.message);
        } else {
          console.log('✅ Estructura accesible');
          if (sampleRecord && sampleRecord.length > 0) {
            console.log('📊 Campos disponibles:', Object.keys(sampleRecord[0]));
          }
        }
      }

      // Test 3: Verificar tablas relacionadas
      console.log('\n3. VERIFICANDO TABLAS RELACIONADAS...');
      
      const relatedTables = [
        { name: 'profiles', description: 'Perfiles de usuarios (doctores)' },
        { name: 'doctors', description: 'Información específica de doctores' },
        { name: 'appointments', description: 'Citas médicas' },
        { name: 'locations', description: 'Ubicaciones/sedes' }
      ];
      
      for (const table of relatedTables) {
        const { data, error } = await supabase
          .from(table.name)
          .select('count')
          .limit(1);
          
        if (error) {
          console.log(`❌ ${table.name}: ${error.message}`);
        } else {
          console.log(`✅ ${table.name}: Existe - ${table.description}`);
        }
      }

      expect(true).toBe(true); // Test siempre pasa, solo recopila información
    });

    it('should count doctors and their availability records', async () => {
      console.log('\n📊 CONTEO DE DOCTORES Y DISPONIBILIDAD');
      console.log('=====================================');
      
      // Contar doctores totales
      const { data: doctorsCount, error: doctorsError } = await supabase
        .from('profiles')
        .select('count')
        .eq('role', 'doctor');

      if (doctorsError) {
        console.log('❌ Error contando doctores:', doctorsError.message);
      } else {
        console.log('👨‍⚕️ Total de doctores en el sistema:', doctorsCount?.length || 0);
      }

      // Obtener lista de doctores
      const { data: doctorsList, error: listError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, organization_id')
        .eq('role', 'doctor');

      if (listError) {
        console.log('❌ Error obteniendo lista de doctores:', listError.message);
      } else {
        console.log('\n📋 DOCTORES REGISTRADOS:');
        doctorsList?.forEach((doctor, index) => {
          console.log(`${index + 1}. ${doctor.first_name} ${doctor.last_name} (${doctor.email})`);
          console.log(`   ID: ${doctor.id}`);
        });
      }

      // Intentar contar registros de disponibilidad
      console.log('\n📅 VERIFICANDO REGISTROS DE DISPONIBILIDAD...');
      
      const { data: availabilityCount, error: availError } = await supabase
        .from('doctor_availability')
        .select('count');

      if (availError) {
        console.log('❌ No se puede acceder a doctor_availability:', availError.message);
        console.log('📋 CONCLUSIÓN: Los doctores NO tienen horarios configurados');
      } else {
        console.log('✅ Registros de disponibilidad encontrados:', availabilityCount?.length || 0);
      }

      expect(true).toBe(true);
    });
  });

  describe('🔍 FASE 2: ANÁLISIS DE LÓGICA DE CITAS', () => {
    it('should investigate how appointments work without doctor schedules', async () => {
      console.log('\n🔍 FASE 2: ANÁLISIS DE LÓGICA DE CITAS');
      console.log('=====================================');
      
      // Verificar citas existentes
      console.log('\n1. VERIFICANDO CITAS EXISTENTES...');
      
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .limit(5);

      if (appointmentsError) {
        console.log('❌ Error accediendo a appointments:', appointmentsError.message);
      } else {
        console.log('📊 Citas encontradas:', appointments?.length || 0);
        
        if (appointments && appointments.length > 0) {
          console.log('\n📋 MUESTRA DE CITAS:');
          appointments.forEach((apt, index) => {
            console.log(`${index + 1}. Fecha: ${apt.appointment_date}, Hora: ${apt.start_time}-${apt.end_time}`);
            console.log(`   Doctor ID: ${apt.doctor_id}, Estado: ${apt.status}`);
          });
        }
      }

      // Verificar si hay appointment_slots
      console.log('\n2. VERIFICANDO APPOINTMENT_SLOTS...');
      
      const { data: slots, error: slotsError } = await supabase
        .from('appointment_slots')
        .select('*')
        .limit(5);

      if (slotsError) {
        console.log('❌ Error accediendo a appointment_slots:', slotsError.message);
      } else {
        console.log('📊 Slots de citas encontrados:', slots?.length || 0);
        
        if (slots && slots.length > 0) {
          console.log('\n📋 MUESTRA DE SLOTS:');
          slots.forEach((slot, index) => {
            console.log(`${index + 1}. Fecha: ${slot.date}, Hora: ${slot.start_time}-${slot.end_time}`);
            console.log(`   Doctor ID: ${slot.doctor_id}, Disponible: ${slot.is_available}`);
          });
        }
      }

      expect(true).toBe(true);
    });

    it('should test appointment availability API behavior', async () => {
      console.log('\n🧪 PROBANDO API DE DISPONIBILIDAD');
      console.log('=====================================');
      
      // Obtener un doctor para probar
      const { data: testDoctor, error: doctorError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'doctor')
        .limit(1)
        .single();

      if (doctorError || !testDoctor) {
        console.log('❌ No se pudo obtener doctor para prueba');
        return;
      }

      console.log(`🧪 Probando con doctor: ${testDoctor.first_name} ${testDoctor.last_name}`);
      console.log(`📋 Doctor ID: ${testDoctor.id}`);

      // Simular llamada a API de disponibilidad
      const testDate = new Date();
      testDate.setDate(testDate.getDate() + 1); // Mañana
      const dateString = testDate.toISOString().split('T')[0];

      console.log(`📅 Fecha de prueba: ${dateString}`);
      
      // Esta sería la lógica que usa la API de disponibilidad
      console.log('\n🔍 SIMULANDO LÓGICA DE DISPONIBILIDAD...');
      console.log('1. ¿Tiene el doctor horarios configurados?');
      console.log('2. ¿Hay slots predefinidos?');
      console.log('3. ¿Se usan horarios por defecto?');
      console.log('4. ¿Cómo se generan los slots disponibles?');

      expect(testDoctor).toBeTruthy();
    });
  });

  describe('📊 FASE 3: ANÁLISIS DE COMPORTAMIENTO DEL SISTEMA', () => {
    it('should document current system behavior without schedules', async () => {
      console.log('\n📊 FASE 3: ANÁLISIS DE COMPORTAMIENTO DEL SISTEMA');
      console.log('=====================================');
      
      console.log('\n🔍 COMPORTAMIENTO ACTUAL OBSERVADO:');
      console.log('1. La página Staff Schedules muestra "No hay horarios configurados"');
      console.log('2. La API devuelve datos vacíos cuando no existe la tabla');
      console.log('3. El sistema tiene fallback implementado');
      
      console.log('\n❓ PREGUNTAS CLAVE:');
      console.log('1. ¿Cómo funciona el booking de citas sin horarios?');
      console.log('2. ¿Hay lógica de horarios por defecto?');
      console.log('3. ¿El sistema AI usa horarios alternativos?');
      console.log('4. ¿Los pacientes pueden reservar citas?');
      
      console.log('\n🎯 HIPÓTESIS:');
      console.log('A. El sistema usa horarios hardcodeados por defecto');
      console.log('B. Las citas se crean sin validación de disponibilidad');
      console.log('C. Hay otra tabla/lógica que maneja la disponibilidad');
      console.log('D. El sistema está incompleto y necesita configuración');

      expect(true).toBe(true);
    });
  });

  describe('💡 FASE 4: RECOMENDACIONES', () => {
    it('should provide recommendations for doctor availability system', async () => {
      console.log('\n💡 FASE 4: RECOMENDACIONES');
      console.log('=====================================');
      
      console.log('\n🔧 RECOMENDACIONES INMEDIATAS:');
      console.log('1. ✅ Crear tabla doctor_availability (script ya preparado)');
      console.log('2. ✅ Configurar horarios por defecto para todos los doctores');
      console.log('3. ✅ Implementar UI para gestión de horarios');
      console.log('4. ✅ Validar disponibilidad en booking de citas');
      
      console.log('\n📋 HORARIOS POR DEFECTO SUGERIDOS:');
      console.log('- Lunes a Viernes: 9:00 AM - 5:00 PM');
      console.log('- Sábados: 10:00 AM - 2:00 PM');
      console.log('- Domingos: No disponible');
      console.log('- Duración de cita: 30 minutos');
      
      console.log('\n🎯 MEJORAS A LARGO PLAZO:');
      console.log('1. Horarios flexibles por doctor');
      console.log('2. Bloqueos de tiempo (vacaciones, reuniones)');
      console.log('3. Horarios especiales por servicio');
      console.log('4. Integración con calendario externo');
      
      console.log('\n⚠️ RIESGOS ACTUALES:');
      console.log('1. Doble booking de citas');
      console.log('2. Citas fuera de horario laboral');
      console.log('3. Experiencia de usuario confusa');
      console.log('4. Falta de control de disponibilidad');

      expect(true).toBe(true);
    });
  });
});
