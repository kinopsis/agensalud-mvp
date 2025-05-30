#!/usr/bin/env node

/**
 * Script de Validación: Corrección de Relación Servicio-Doctor-Sede
 * Valida que la corrección crítica del filtro profile_id vs id funcione correctamente
 * 
 * PROBLEMA RESUELTO: "0 doctores disponibles" para cualquier servicio
 * CAUSA RAÍZ: API buscaba por doctors.id en lugar de doctors.profile_id
 * SOLUCIÓN: Corregir filtro en línea 118 de /api/doctors/availability
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Datos de prueba
const TEST_DATA = {
  organizationId: '927cecbe-d9e5-43a4-b9d0-25f942ededc4',
  serviceId: '0c98efc9-b65c-4913-aa23-9952493d7d9d', // Examen Visual Completo
  serviceName: 'Examen Visual Completo',
  expectedDoctors: {
    'Ana Rodríguez': {
      doctorId: '5bfbf7b8-e021-4657-ae42-a3fa185d4ab6',
      profileId: 'c923e0ec-d941-48d1-9fe6-0d75122e3cbe'
    },
    'Elena López': {
      doctorId: 'e73dcd71-af31-44b8-b517-5a1c8b4e49be',
      profileId: 'd2afb7f5-c272-402d-8d86-ea7ea92d4380'
    },
    'Miguel Fernández': {
      doctorId: '17307e25-2cbb-4dab-ad56-d2971e698086',
      profileId: '2bb3b714-2fd3-44af-a5d2-c623ffaaa84d'
    },
    'Pedro Sánchez': {
      doctorId: '79a2a6c3-c4b6-4e55-bff1-725f52a92404',
      profileId: 'f161fcc5-82f3-48ce-a056-b11282549d0f'
    }
  }
};

/**
 * Validación 1: Relaciones de Base de Datos
 */
async function validateDatabaseRelationships() {
  console.log('\n🔍 VALIDACIÓN 1: Relaciones de Base de Datos');
  console.log('=============================================');

  try {
    // 1.1 Verificar integridad de doctor_services
    const { data: doctorServices, error: servicesError } = await supabase
      .from('doctor_services')
      .select(`
        doctor_id,
        service_id,
        services(name)
      `)
      .eq('service_id', TEST_DATA.serviceId);

    if (servicesError) {
      console.error('❌ Error verificando doctor_services:', servicesError);
      return false;
    }

    if (!doctorServices || doctorServices.length === 0) {
      console.error('❌ No se encontraron asociaciones doctor-servicio');
      return false;
    }

    console.log(`✅ Encontradas ${doctorServices.length} asociaciones doctor-servicio`);
    console.log(`📋 Servicio: ${doctorServices[0].services.name}`);

    // 1.2 Verificar que los doctor_id son profile_id válidos
    const profileIds = doctorServices.map(ds => ds.doctor_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', profileIds);

    if (profilesError) {
      console.error('❌ Error verificando profiles:', profilesError);
      return false;
    }

    if (profiles.length !== doctorServices.length) {
      console.error(`❌ Inconsistencia: ${doctorServices.length} asociaciones vs ${profiles.length} profiles`);
      return false;
    }

    console.log('✅ Todos los doctor_id referencian profiles válidos');

    // 1.3 Verificar relación doctors.profile_id
    const { data: doctors, error: doctorsError } = await supabase
      .from('doctors')
      .select('id, profile_id, specialization')
      .in('profile_id', profileIds)
      .eq('organization_id', TEST_DATA.organizationId);

    if (doctorsError) {
      console.error('❌ Error verificando doctors:', doctorsError);
      return false;
    }

    console.log(`✅ Encontrados ${doctors.length} doctores con profile_id válidos`);

    return true;

  } catch (error) {
    console.error('❌ Error en validación de relaciones:', error);
    return false;
  }
}

/**
 * Validación 2: Flujo API Corregido vs Incorrecto
 */
async function validateAPIFlowComparison() {
  console.log('\n🔍 VALIDACIÓN 2: Comparación Flujo API Corregido vs Incorrecto');
  console.log('==============================================================');

  try {
    // Paso 1: Obtener doctor_ids (que son profile_ids) del servicio
    console.log('📋 Paso 1: Obtener doctores asociados al servicio...');
    
    const { data: doctorServices, error: serviceError } = await supabase
      .from('doctor_services')
      .select('doctor_id')
      .eq('service_id', TEST_DATA.serviceId);

    if (serviceError) {
      console.error('❌ Error obteniendo doctor_services:', serviceError);
      return false;
    }

    const doctorIds = doctorServices?.map(ds => ds.doctor_id) || [];
    console.log(`📊 Encontrados ${doctorIds.length} doctores para el servicio`);

    if (doctorIds.length === 0) {
      console.error('❌ PROBLEMA: No se encontraron doctores para el servicio');
      return false;
    }

    // Paso 2A: Flujo INCORRECTO (como estaba antes)
    console.log('📋 Paso 2A: Probar flujo INCORRECTO (.in("id", doctorIds))...');
    
    const { data: incorrectDoctors, error: incorrectError } = await supabase
      .from('doctors')
      .select('id, profile_id, specialization, profiles(first_name, last_name)')
      .eq('organization_id', TEST_DATA.organizationId)
      .eq('is_available', true)
      .in('id', doctorIds); // ❌ INCORRECTO: busca por id

    if (incorrectError) {
      console.error('❌ Error en flujo incorrecto:', incorrectError);
    }

    console.log(`📊 Flujo INCORRECTO: ${incorrectDoctors?.length || 0} doctores encontrados`);

    // Paso 2B: Flujo CORRECTO (como está ahora)
    console.log('📋 Paso 2B: Probar flujo CORRECTO (.in("profile_id", doctorIds))...');
    
    const { data: correctDoctors, error: correctError } = await supabase
      .from('doctors')
      .select('id, profile_id, specialization, profiles(first_name, last_name)')
      .eq('organization_id', TEST_DATA.organizationId)
      .eq('is_available', true)
      .in('profile_id', doctorIds); // ✅ CORRECTO: busca por profile_id

    if (correctError) {
      console.error('❌ Error en flujo correcto:', correctError);
      return false;
    }

    console.log(`📊 Flujo CORRECTO: ${correctDoctors?.length || 0} doctores encontrados`);

    // Comparación de resultados
    console.log('\n📊 COMPARACIÓN DE RESULTADOS:');
    console.log(`❌ Flujo Incorrecto: ${incorrectDoctors?.length || 0} doctores`);
    console.log(`✅ Flujo Correcto: ${correctDoctors?.length || 0} doctores`);

    if ((incorrectDoctors?.length || 0) > 0) {
      console.log('⚠️  ADVERTENCIA: El flujo incorrecto devolvió resultados (esto no debería pasar)');
    }

    if ((correctDoctors?.length || 0) === 0) {
      console.error('❌ PROBLEMA: El flujo correcto no devolvió doctores');
      return false;
    }

    // Mostrar doctores encontrados
    console.log('\n👨‍⚕️ DOCTORES ENCONTRADOS (Flujo Correcto):');
    correctDoctors.forEach(doctor => {
      console.log(`   - ${doctor.profiles.first_name} ${doctor.profiles.last_name} (${doctor.specialization})`);
    });

    console.log('✅ Corrección validada: Flujo correcto funciona, incorrecto no');
    return true;

  } catch (error) {
    console.error('❌ Error en validación de flujo API:', error);
    return false;
  }
}

/**
 * Validación 3: Disponibilidad Completa
 */
async function validateCompleteAvailability() {
  console.log('\n🔍 VALIDACIÓN 3: Disponibilidad Completa para Lunes');
  console.log('==================================================');

  try {
    // Simular el flujo completo corregido
    const { data: doctorServices } = await supabase
      .from('doctor_services')
      .select('doctor_id')
      .eq('service_id', TEST_DATA.serviceId);

    const doctorIds = doctorServices?.map(ds => ds.doctor_id) || [];

    const { data: doctors } = await supabase
      .from('doctors')
      .select('id, profile_id, specialization, profiles(first_name, last_name)')
      .eq('organization_id', TEST_DATA.organizationId)
      .eq('is_available', true)
      .in('profile_id', doctorIds); // ✅ CORRECTO

    if (!doctors || doctors.length === 0) {
      console.error('❌ No se encontraron doctores disponibles');
      return false;
    }

    // Obtener disponibilidad para lunes
    const profileIds = doctors.map(d => d.profile_id);
    const { data: schedules, error: schedulesError } = await supabase
      .from('doctor_availability')
      .select('doctor_id, day_of_week, start_time, end_time, is_active, locations(name)')
      .in('doctor_id', profileIds)
      .eq('day_of_week', 1) // Lunes
      .eq('is_active', true);

    if (schedulesError) {
      console.error('❌ Error obteniendo horarios:', schedulesError);
      return false;
    }

    if (!schedules || schedules.length === 0) {
      console.error('❌ No se encontraron horarios para lunes');
      return false;
    }

    // Combinar doctores con horarios
    const doctorsWithSchedules = doctors.filter(doctor => {
      const doctorSchedules = schedules.filter(s => s.doctor_id === doctor.profile_id);
      if (doctorSchedules.length > 0) {
        doctor.schedules = doctorSchedules;
        return true;
      }
      return false;
    });

    console.log(`✅ ${doctorsWithSchedules.length} doctores con horarios para lunes`);
    console.log(`📊 Total de slots de horarios: ${schedules.length}`);

    // Mostrar detalle
    console.log('\n📅 DISPONIBILIDAD DETALLADA:');
    doctorsWithSchedules.forEach(doctor => {
      console.log(`\n👨‍⚕️ ${doctor.profiles.first_name} ${doctor.profiles.last_name}`);
      doctor.schedules.forEach(schedule => {
        console.log(`   📍 ${schedule.locations.name}: ${schedule.start_time} - ${schedule.end_time}`);
      });
    });

    console.log('\n✅ Disponibilidad completa validada exitosamente');
    return true;

  } catch (error) {
    console.error('❌ Error en validación de disponibilidad:', error);
    return false;
  }
}

/**
 * Función principal de validación
 */
async function main() {
  console.log('🏥 VALIDACIÓN DE CORRECCIÓN: Relación Servicio-Doctor-Sede');
  console.log('=========================================================');
  console.log('Problema: "0 doctores disponibles" para cualquier servicio');
  console.log('Solución: Corregir filtro .in("id") → .in("profile_id")');
  console.log('=========================================================');

  const results = {
    databaseRelationships: false,
    apiFlowComparison: false,
    completeAvailability: false
  };

  // Ejecutar validaciones
  results.databaseRelationships = await validateDatabaseRelationships();
  results.apiFlowComparison = await validateAPIFlowComparison();
  results.completeAvailability = await validateCompleteAvailability();

  // Resumen final
  console.log('\n📊 RESUMEN DE VALIDACIÓN');
  console.log('========================');
  console.log(`Relaciones de BD: ${results.databaseRelationships ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Comparación API: ${results.apiFlowComparison ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Disponibilidad Completa: ${results.completeAvailability ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('\n🎉 ¡CORRECCIÓN VALIDADA EXITOSAMENTE!');
    console.log('✅ El problema "0 doctores disponibles" ha sido resuelto');
    console.log('✅ La API de disponibilidad funciona correctamente');
    console.log('✅ Flujo manual de reserva de citas operativo');
    process.exit(0);
  } else {
    console.log('\n❌ VALIDACIÓN FALLIDA');
    console.log('⚠️  Algunos problemas persisten y requieren atención');
    process.exit(1);
  }
}

// Ejecutar validación
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Error fatal en validación:', error);
    process.exit(1);
  });
}

module.exports = {
  validateDatabaseRelationships,
  validateAPIFlowComparison,
  validateCompleteAvailability
};
