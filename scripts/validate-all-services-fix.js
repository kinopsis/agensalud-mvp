#!/usr/bin/env node

/**
 * Validación Final: Todos los Servicios Funcionando
 * Confirma que la corrección resolvió el problema para TODOS los servicios
 * 
 * OBJETIVO: Validar que ningún servicio devuelve "0 doctores disponibles"
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

// Datos de validación
const ORGANIZATION_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';

/**
 * Simular API call para cada servicio
 */
async function simulateAPICallForService(serviceId, serviceName) {
  try {
    // Paso 1: Obtener doctor profile IDs (como hace la API)
    const { data: doctorServices, error: serviceError } = await supabase
      .from('doctor_services')
      .select('doctor_id')
      .eq('service_id', serviceId);

    if (serviceError) {
      return { success: false, error: serviceError.message, doctorCount: 0 };
    }

    const doctorProfileIds = doctorServices?.map(ds => ds.doctor_id) || [];

    if (doctorProfileIds.length === 0) {
      return { success: true, doctorCount: 0, message: 'No doctors associated' };
    }

    // Paso 2: Obtener datos de doctores (como hace la API)
    const { data: filteredDoctors, error: doctorsError } = await supabase
      .from('doctors')
      .select(`
        id,
        specialization,
        consultation_fee,
        is_available,
        profiles(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('organization_id', ORGANIZATION_ID)
      .eq('is_available', true)
      .in('profile_id', doctorProfileIds);

    if (doctorsError) {
      return { success: false, error: doctorsError.message, doctorCount: 0 };
    }

    const filteredDoctorsWithProfiles = filteredDoctors?.filter(doctor => doctor.profiles) || [];
    const mappedDoctors = filteredDoctorsWithProfiles.map(doctor => ({
      id: doctor.id,
      name: `${doctor.profiles.first_name} ${doctor.profiles.last_name}`,
      specialization: doctor.specialization,
      consultation_fee: doctor.consultation_fee,
      is_available: doctor.is_available,
      profiles: doctor.profiles
    }));

    return {
      success: true,
      doctorCount: mappedDoctors.length,
      doctors: mappedDoctors
    };

  } catch (error) {
    return { success: false, error: error.message, doctorCount: 0 };
  }
}

/**
 * Validar todos los servicios
 */
async function validateAllServices() {
  console.log('\n🔍 VALIDACIÓN COMPLETA: Todos los Servicios');
  console.log('===========================================');

  try {
    // Obtener todos los servicios activos
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, category, description')
      .eq('organization_id', ORGANIZATION_ID)
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (servicesError) {
      console.error('❌ Error obteniendo servicios:', servicesError);
      return null;
    }

    console.log(`✅ Servicios activos encontrados: ${services?.length || 0}`);

    const results = [];
    let totalPassed = 0;
    let totalFailed = 0;

    // Validar cada servicio
    for (const service of services || []) {
      console.log(`\n📋 Validando: ${service.name} (${service.category})`);
      
      const result = await simulateAPICallForService(service.id, service.name);
      
      if (result.success && result.doctorCount > 0) {
        console.log(`   ✅ ${result.doctorCount} doctores disponibles`);
        result.doctors?.forEach(doctor => {
          console.log(`      👨‍⚕️ ${doctor.name} (${doctor.specialization})`);
        });
        totalPassed++;
      } else if (result.success && result.doctorCount === 0) {
        console.log(`   ❌ 0 doctores disponibles - ${result.message || 'Sin asociaciones'}`);
        totalFailed++;
      } else {
        console.log(`   ❌ Error: ${result.error}`);
        totalFailed++;
      }

      results.push({
        serviceId: service.id,
        serviceName: service.name,
        category: service.category,
        doctorCount: result.doctorCount,
        success: result.success && result.doctorCount > 0,
        error: result.error
      });
    }

    console.log(`\n📊 RESUMEN DE VALIDACIÓN:`);
    console.log(`   ✅ Servicios funcionando: ${totalPassed}`);
    console.log(`   ❌ Servicios con problemas: ${totalFailed}`);
    console.log(`   📊 Total de servicios: ${services?.length || 0}`);

    return {
      totalServices: services?.length || 0,
      passed: totalPassed,
      failed: totalFailed,
      results
    };

  } catch (error) {
    console.error('❌ Error en validación completa:', error);
    return null;
  }
}

/**
 * Probar servicios específicos mencionados en el problema
 */
async function testSpecificServices() {
  console.log('\n🔍 PRUEBA ESPECÍFICA: Servicios Mencionados');
  console.log('===========================================');

  const specificServices = [
    {
      id: 'a479e2d0-9121-4d0b-ac4b-1efd86c6aab6',
      name: 'Adaptación de Lentes de Contacto Rígidas',
      description: 'Servicio que estaba fallando'
    },
    {
      id: '0c98efc9-b65c-4913-aa23-9952493d7d9d',
      name: 'Examen Visual Completo',
      description: 'Servicio que funcionaba antes'
    }
  ];

  const results = [];

  for (const service of specificServices) {
    console.log(`\n📋 Probando: ${service.name}`);
    console.log(`   📝 ${service.description}`);
    
    const result = await simulateAPICallForService(service.id, service.name);
    
    if (result.success && result.doctorCount > 0) {
      console.log(`   ✅ FUNCIONA: ${result.doctorCount} doctores disponibles`);
      result.doctors?.forEach(doctor => {
        console.log(`      👨‍⚕️ ${doctor.name} (${doctor.specialization})`);
      });
    } else {
      console.log(`   ❌ FALLA: ${result.error || 'Sin doctores disponibles'}`);
    }

    results.push({
      ...service,
      doctorCount: result.doctorCount,
      success: result.success && result.doctorCount > 0
    });
  }

  return results;
}

/**
 * Generar reporte final
 */
function generateFinalReport(validationResults, specificResults) {
  console.log('\n📊 REPORTE FINAL DE VALIDACIÓN');
  console.log('==============================');

  if (!validationResults) {
    console.log('❌ No se pudo completar la validación');
    return false;
  }

  console.log(`📋 ESTADÍSTICAS GENERALES:`);
  console.log(`   📊 Total de servicios: ${validationResults.totalServices}`);
  console.log(`   ✅ Servicios funcionando: ${validationResults.passed}`);
  console.log(`   ❌ Servicios con problemas: ${validationResults.failed}`);
  console.log(`   📈 Tasa de éxito: ${((validationResults.passed / validationResults.totalServices) * 100).toFixed(1)}%`);

  console.log(`\n📋 SERVICIOS ESPECÍFICOS:`);
  specificResults?.forEach(service => {
    const status = service.success ? '✅ FUNCIONA' : '❌ FALLA';
    console.log(`   ${status} ${service.name}: ${service.doctorCount} doctores`);
  });

  console.log(`\n📋 SERVICIOS CON PROBLEMAS:`);
  const failedServices = validationResults.results.filter(r => !r.success);
  if (failedServices.length === 0) {
    console.log('   🎉 ¡NINGUNO! Todos los servicios funcionan correctamente');
  } else {
    failedServices.forEach(service => {
      console.log(`   ❌ ${service.serviceName} (${service.category}): ${service.error || 'Sin doctores'}`);
    });
  }

  const allPassed = validationResults.failed === 0;
  
  if (allPassed) {
    console.log('\n🎉 ¡VALIDACIÓN EXITOSA!');
    console.log('✅ TODOS los servicios funcionan correctamente');
    console.log('✅ El problema "0 doctores disponibles" ha sido resuelto completamente');
    console.log('✅ El flujo de reserva manual funciona para TODOS los servicios');
  } else {
    console.log('\n⚠️  VALIDACIÓN PARCIAL');
    console.log(`❌ ${validationResults.failed} servicios aún tienen problemas`);
    console.log('🔧 Se requiere investigación adicional');
  }

  return allPassed;
}

/**
 * Función principal
 */
async function main() {
  console.log('🔍 VALIDACIÓN FINAL: Corrección de Asociaciones Doctor-Servicio');
  console.log('================================================================');
  console.log('Objetivo: Confirmar que TODOS los servicios ahora funcionan');
  console.log('Problema original: Servicios devolvían "0 doctores disponibles"');
  console.log('================================================================');

  // Validar todos los servicios
  const validationResults = await validateAllServices();
  
  // Probar servicios específicos
  const specificResults = await testSpecificServices();

  // Generar reporte final
  const success = generateFinalReport(validationResults, specificResults);

  if (success) {
    console.log('\n🏆 MISIÓN CUMPLIDA');
    console.log('==================');
    console.log('✅ Problema completamente resuelto');
    console.log('✅ Todos los servicios operativos');
    console.log('✅ Flujo de reserva manual funcional');
    process.exit(0);
  } else {
    console.log('\n⚠️  MISIÓN PARCIALMENTE COMPLETADA');
    console.log('==================================');
    console.log('⚠️  Algunos servicios requieren atención adicional');
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
  simulateAPICallForService,
  validateAllServices,
  testSpecificServices,
  generateFinalReport
};
