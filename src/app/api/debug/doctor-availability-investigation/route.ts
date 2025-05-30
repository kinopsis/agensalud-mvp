import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Doctor Availability System Investigation API
 * 
 * OBJETIVO: Investigar el estado actual del sistema de disponibilidad
 * y analizar cómo funciona sin horarios configurados.
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const investigation = {
      timestamp: new Date().toISOString(),
      phase1_database_verification: {},
      phase2_data_analysis: {},
      phase3_appointment_logic: {},
      phase4_system_behavior: {},
      phase5_recommendations: {}
    };

    console.log('\n🔍 INICIANDO INVESTIGACIÓN DEL SISTEMA DE DISPONIBILIDAD');
    console.log('=====================================');

    // FASE 1: VERIFICACIÓN DE BASE DE DATOS POST-FIX
    console.log('\n📋 FASE 1: VERIFICACIÓN DE BASE DE DATOS POST-FIX');

    // Test 1: Verificar tabla doctor_availability existe
    const { data: availabilityTest, error: availabilityError } = await supabase
      .from('doctor_availability')
      .select('count')
      .limit(1);

    // Test 2: Verificar estructura de la tabla
    const { data: structureTest, error: structureError } = await supabase
      .from('doctor_availability')
      .select('id, doctor_id, location_id, day_of_week, start_time, end_time, is_active, notes, created_at, updated_at')
      .limit(1);

    investigation.phase1_database_verification = {
      doctor_availability_table: {
        exists: !availabilityError,
        error: availabilityError?.message || null,
        error_code: availabilityError?.code || null,
        structure_valid: !structureError,
        structure_error: structureError?.message || null,
        record_count: availabilityTest?.length || 0
      }
    };

    if (availabilityError) {
      console.log('❌ Tabla doctor_availability:', availabilityError.message);
      if (availabilityError.code === '42P01') {
        console.log('📋 DIAGNÓSTICO: La tabla doctor_availability NO EXISTE');
      }
    } else {
      console.log('✅ Tabla doctor_availability: EXISTE');
    }

    // Test 2: Verificar tablas relacionadas
    const relatedTables = ['profiles', 'doctors', 'appointments', 'locations'];
    const tableStatus: any = {};

    for (const tableName of relatedTables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('count')
        .limit(1);
        
      tableStatus[tableName] = {
        exists: !error,
        error: error?.message || null
      };
      
      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
      } else {
        console.log(`✅ ${tableName}: Existe`);
      }
    }

    investigation.phase1_database_verification.related_tables = tableStatus;

    // FASE 2: ANÁLISIS DE DATOS
    console.log('\n📊 FASE 2: ANÁLISIS DE DATOS');
    
    // Contar doctores
    const { data: doctors, error: doctorsError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role, organization_id')
      .eq('role', 'doctor');

    investigation.phase2_data_analysis.doctors = {
      total_count: doctors?.length || 0,
      error: doctorsError?.message || null,
      sample_doctors: doctors?.slice(0, 3).map(d => ({
        id: d.id,
        name: `${d.first_name} ${d.last_name}`,
        email: d.email
      })) || []
    };

    console.log('👨‍⚕️ Total doctores encontrados:', doctors?.length || 0);
    
    if (doctors && doctors.length > 0) {
      console.log('\n📋 MUESTRA DE DOCTORES:');
      doctors.slice(0, 3).forEach((doctor, index) => {
        console.log(`${index + 1}. ${doctor.first_name} ${doctor.last_name} (${doctor.email})`);
      });
    }

    // Verificar citas existentes
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, doctor_id, appointment_date, start_time, end_time, status')
      .limit(5);

    investigation.phase2_data_analysis.appointments = {
      total_count: appointments?.length || 0,
      error: appointmentsError?.message || null,
      sample_appointments: appointments?.map(apt => ({
        id: apt.id,
        doctor_id: apt.doctor_id,
        date: apt.appointment_date,
        time: `${apt.start_time}-${apt.end_time}`,
        status: apt.status
      })) || []
    };

    console.log('📅 Total citas encontradas:', appointments?.length || 0);

    // FASE 3: INVESTIGACIÓN DE LÓGICA DE CITAS
    console.log('\n🔍 FASE 3: INVESTIGACIÓN DE LÓGICA DE CITAS');
    
    // Verificar si hay appointment_slots
    const { data: slots, error: slotsError } = await supabase
      .from('appointment_slots')
      .select('*')
      .limit(5);

    investigation.phase3_appointment_logic.appointment_slots = {
      exists: !slotsError,
      count: slots?.length || 0,
      error: slotsError?.message || null
    };

    if (slotsError) {
      console.log('❌ appointment_slots:', slotsError.message);
    } else {
      console.log('✅ appointment_slots: Existe con', slots?.length || 0, 'registros');
    }

    // FASE 4: ANÁLISIS DE COMPORTAMIENTO
    console.log('\n📊 FASE 4: ANÁLISIS DE COMPORTAMIENTO DEL SISTEMA');
    
    investigation.phase4_system_behavior = {
      observations: [
        'Staff Schedules page muestra "No hay horarios configurados"',
        'API devuelve fallback cuando tabla no existe',
        'Sistema tiene mecanismo de recuperación implementado'
      ],
      key_questions: [
        '¿Cómo funciona booking sin horarios?',
        '¿Hay horarios por defecto?',
        '¿Sistema AI usa lógica alternativa?',
        '¿Pacientes pueden reservar citas?'
      ]
    };

    // FASE 5: RECOMENDACIONES
    console.log('\n💡 FASE 5: RECOMENDACIONES');
    
    investigation.phase5_recommendations = {
      immediate_actions: [
        'Crear tabla doctor_availability usando script preparado',
        'Configurar horarios por defecto para todos los doctores',
        'Implementar validación de disponibilidad en booking'
      ],
      default_schedule_suggestion: {
        monday_friday: '9:00 AM - 5:00 PM',
        saturday: '10:00 AM - 2:00 PM',
        sunday: 'No disponible',
        appointment_duration: '30 minutos'
      },
      risks_identified: [
        'Posible doble booking de citas',
        'Citas fuera de horario laboral',
        'Experiencia de usuario confusa',
        'Falta de control de disponibilidad'
      ]
    };

    console.log('\n✅ INVESTIGACIÓN COMPLETADA');
    console.log('📋 Ver respuesta JSON para detalles completos');

    return NextResponse.json({
      success: true,
      investigation,
      summary: {
        doctor_availability_table_exists: !availabilityError,
        total_doctors: doctors?.length || 0,
        total_appointments: appointments?.length || 0,
        appointment_slots_exists: !slotsError,
        main_issue: availabilityError ? 'doctor_availability table missing' : 'unknown',
        next_step: availabilityError ? 'Create doctor_availability table' : 'Analyze existing data'
      }
    });

  } catch (error) {
    console.error('Error en investigación:', error);
    return NextResponse.json(
      { error: 'Investigation failed', details: error },
      { status: 500 }
    );
  }
}
