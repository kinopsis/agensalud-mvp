#!/usr/bin/env node

/**
 * Script de Corrección: Asociaciones Doctor-Servicio Faltantes
 * Corrige el problema donde 9 de 11 servicios no tienen doctores asociados
 * 
 * PROBLEMA IDENTIFICADO: Solo 2 servicios tienen doctores asociados
 * SOLUCIÓN: Agregar asociaciones lógicas basadas en especialidades
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Datos de la organización
const ORGANIZATION_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';

/**
 * Obtener todos los doctores y servicios
 */
async function getDoctorsAndServices() {
  console.log('\n🔍 PASO 1: Obtener Doctores y Servicios');
  console.log('=======================================');

  try {
    // Obtener doctores
    const { data: doctors, error: doctorsError } = await supabase
      .from('doctors')
      .select(`
        id,
        profile_id,
        specialization,
        is_available,
        profiles(id, first_name, last_name)
      `)
      .eq('organization_id', ORGANIZATION_ID)
      .eq('is_available', true);

    if (doctorsError) {
      console.error('❌ Error obteniendo doctores:', doctorsError);
      return null;
    }

    // Obtener servicios
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, category, description')
      .eq('organization_id', ORGANIZATION_ID)
      .eq('is_active', true);

    if (servicesError) {
      console.error('❌ Error obteniendo servicios:', servicesError);
      return null;
    }

    console.log(`✅ Doctores encontrados: ${doctors?.length || 0}`);
    doctors?.forEach(doctor => {
      console.log(`   👨‍⚕️ ${doctor.profiles.first_name} ${doctor.profiles.last_name} - ${doctor.specialization}`);
    });

    console.log(`\n✅ Servicios encontrados: ${services?.length || 0}`);
    services?.forEach(service => {
      console.log(`   🏥 ${service.name} (${service.category})`);
    });

    return { doctors: doctors || [], services: services || [] };

  } catch (error) {
    console.error('❌ Error obteniendo datos:', error);
    return null;
  }
}

/**
 * Definir asociaciones lógicas doctor-servicio
 */
function defineLogicalAssociations(doctors, services) {
  console.log('\n🔍 PASO 2: Definir Asociaciones Lógicas');
  console.log('=======================================');

  const associations = [];

  // Mapeo de especialidades a servicios
  const specialtyServiceMap = {
    'Optometría Clínica': [
      'Examen Visual Completo',
      'Control Visual Rápido',
      'Examen Visual Pediátrico',
      'Topografía Corneal'
    ],
    'Contactología Avanzada': [
      'Adaptación de Lentes de Contacto Blandas',
      'Adaptación de Lentes de Contacto Rígidas',
      'Revisión de Lentes de Contacto',
      'Examen Visual Completo'
    ],
    'Optometría Pediátrica': [
      'Examen Visual Pediátrico',
      'Examen Visual Completo',
      'Control Visual Rápido',
      'Terapia Visual'
    ],
    'Optometría General': [
      'Examen Visual Completo',
      'Control Visual Rápido',
      'Ajuste y Mantenimiento de Gafas',
      'Asesoramiento en Selección de Monturas'
    ],
    'Baja Visión': [
      'Asesoramiento en Baja Visión',
      'Examen Visual Completo',
      'Terapia Visual'
    ]
  };

  // Crear asociaciones basadas en especialidades
  doctors.forEach(doctor => {
    const doctorName = `${doctor.profiles.first_name} ${doctor.profiles.last_name}`;
    const specialty = doctor.specialization;
    const serviceNames = specialtyServiceMap[specialty] || [];

    console.log(`\n👨‍⚕️ ${doctorName} (${specialty}):`);

    serviceNames.forEach(serviceName => {
      const service = services.find(s => s.name === serviceName);
      if (service) {
        associations.push({
          doctor_id: doctor.profile_id, // Usar profile_id como doctor_id
          service_id: service.id,
          doctor_name: doctorName,
          service_name: serviceName
        });
        console.log(`   ✅ ${serviceName}`);
      } else {
        console.log(`   ⚠️  Servicio no encontrado: ${serviceName}`);
      }
    });
  });

  console.log(`\n📊 Total de asociaciones definidas: ${associations.length}`);
  return associations;
}

/**
 * Verificar asociaciones existentes
 */
async function checkExistingAssociations() {
  console.log('\n🔍 PASO 3: Verificar Asociaciones Existentes');
  console.log('============================================');

  try {
    const { data: existing, error } = await supabase
      .from('doctor_services')
      .select(`
        doctor_id,
        service_id,
        services(name),
        profiles(first_name, last_name)
      `);

    if (error) {
      console.error('❌ Error verificando asociaciones existentes:', error);
      return [];
    }

    console.log(`✅ Asociaciones existentes: ${existing?.length || 0}`);
    existing?.forEach(assoc => {
      console.log(`   🔗 ${assoc.profiles?.first_name} ${assoc.profiles?.last_name} → ${assoc.services?.name}`);
    });

    return existing || [];

  } catch (error) {
    console.error('❌ Error verificando asociaciones:', error);
    return [];
  }
}

/**
 * Insertar nuevas asociaciones
 */
async function insertNewAssociations(newAssociations, existingAssociations) {
  console.log('\n🔍 PASO 4: Insertar Nuevas Asociaciones');
  console.log('=======================================');

  try {
    // Filtrar asociaciones que ya existen
    const existingKeys = new Set(
      existingAssociations.map(assoc => `${assoc.doctor_id}-${assoc.service_id}`)
    );

    const toInsert = newAssociations.filter(assoc => 
      !existingKeys.has(`${assoc.doctor_id}-${assoc.service_id}`)
    );

    console.log(`📊 Asociaciones a insertar: ${toInsert.length}`);
    console.log(`📊 Asociaciones ya existentes: ${newAssociations.length - toInsert.length}`);

    if (toInsert.length === 0) {
      console.log('✅ No hay nuevas asociaciones que insertar');
      return true;
    }

    // Preparar datos para inserción
    const insertData = toInsert.map(assoc => ({
      doctor_id: assoc.doctor_id,
      service_id: assoc.service_id
    }));

    console.log('\n📋 Insertando asociaciones:');
    toInsert.forEach(assoc => {
      console.log(`   ➕ ${assoc.doctor_name} → ${assoc.service_name}`);
    });

    // Insertar en lotes
    const { data, error } = await supabase
      .from('doctor_services')
      .insert(insertData);

    if (error) {
      console.error('❌ Error insertando asociaciones:', error);
      return false;
    }

    console.log(`✅ ${toInsert.length} asociaciones insertadas exitosamente`);
    return true;

  } catch (error) {
    console.error('❌ Error en inserción de asociaciones:', error);
    return false;
  }
}

/**
 * Validar corrección
 */
async function validateFix() {
  console.log('\n🔍 PASO 5: Validar Corrección');
  console.log('=============================');

  try {
    // Verificar todos los servicios ahora tienen doctores
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, category')
      .eq('organization_id', ORGANIZATION_ID)
      .eq('is_active', true);

    if (servicesError) {
      console.error('❌ Error obteniendo servicios:', servicesError);
      return false;
    }

    console.log('📊 Estado de servicios después de la corrección:');
    let servicesWithDoctors = 0;
    let servicesWithoutDoctors = 0;

    for (const service of services || []) {
      const { data: associations, error: assocError } = await supabase
        .from('doctor_services')
        .select('doctor_id')
        .eq('service_id', service.id);

      const doctorCount = associations?.length || 0;
      const status = doctorCount > 0 ? '✅' : '❌';
      
      if (doctorCount > 0) {
        servicesWithDoctors++;
      } else {
        servicesWithoutDoctors++;
      }

      console.log(`   ${status} ${service.name} (${service.category}) - ${doctorCount} doctores`);
    }

    console.log(`\n📊 RESUMEN:`);
    console.log(`   ✅ Servicios con doctores: ${servicesWithDoctors}`);
    console.log(`   ❌ Servicios sin doctores: ${servicesWithoutDoctors}`);
    console.log(`   📊 Total de servicios: ${services?.length || 0}`);

    return servicesWithoutDoctors === 0;

  } catch (error) {
    console.error('❌ Error en validación:', error);
    return false;
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🔧 CORRECCIÓN: Asociaciones Doctor-Servicio Faltantes');
  console.log('====================================================');
  console.log('Problema: 9 de 11 servicios no tienen doctores asociados');
  console.log('Solución: Agregar asociaciones lógicas basadas en especialidades');
  console.log('====================================================');

  const results = {
    dataObtained: false,
    associationsDefined: false,
    existingChecked: false,
    newInserted: false,
    fixValidated: false
  };

  // Paso 1: Obtener datos
  const data = await getDoctorsAndServices();
  results.dataObtained = data !== null;

  if (!data) {
    console.error('❌ No se pudieron obtener los datos necesarios');
    process.exit(1);
  }

  // Paso 2: Definir asociaciones
  const newAssociations = defineLogicalAssociations(data.doctors, data.services);
  results.associationsDefined = newAssociations.length > 0;

  // Paso 3: Verificar existentes
  const existingAssociations = await checkExistingAssociations();
  results.existingChecked = true;

  // Paso 4: Insertar nuevas
  const insertSuccess = await insertNewAssociations(newAssociations, existingAssociations);
  results.newInserted = insertSuccess;

  // Paso 5: Validar
  const validationSuccess = await validateFix();
  results.fixValidated = validationSuccess;

  // Resumen final
  console.log('\n📊 RESUMEN DE CORRECCIÓN');
  console.log('========================');
  console.log(`Datos Obtenidos: ${results.dataObtained ? '✅ SÍ' : '❌ NO'}`);
  console.log(`Asociaciones Definidas: ${results.associationsDefined ? '✅ SÍ' : '❌ NO'}`);
  console.log(`Existentes Verificadas: ${results.existingChecked ? '✅ SÍ' : '❌ NO'}`);
  console.log(`Nuevas Insertadas: ${results.newInserted ? '✅ SÍ' : '❌ NO'}`);
  console.log(`Corrección Validada: ${results.fixValidated ? '✅ SÍ' : '❌ NO'}`);

  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('\n🎉 ¡CORRECCIÓN COMPLETADA EXITOSAMENTE!');
    console.log('✅ Todos los servicios ahora tienen doctores asociados');
    console.log('✅ El flujo de reserva manual funcionará para todos los servicios');
    process.exit(0);
  } else {
    console.log('\n❌ CORRECCIÓN INCOMPLETA');
    console.log('⚠️  Algunos pasos fallaron y requieren atención');
    process.exit(1);
  }
}

// Ejecutar corrección
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Error fatal en corrección:', error);
    process.exit(1);
  });
}

module.exports = {
  getDoctorsAndServices,
  defineLogicalAssociations,
  checkExistingAssociations,
  insertNewAssociations,
  validateFix
};
