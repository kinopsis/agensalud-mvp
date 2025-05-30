#!/usr/bin/env node

/**
 * Investigación Específica: Servicio a479e2d0-9121-4d0b-ac4b-1efd86c6aab6
 * Analiza por qué este servicio específico devuelve 0 doctores
 * 
 * PROBLEMA: DEBUG: Loaded 0 doctors for service a479e2d0-9121-4d0b-ac4b-1efd86c6aab6
 * OBJETIVO: Identificar la causa raíz específica de este servicio
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

// Datos de investigación
const INVESTIGATION_DATA = {
  organizationId: '927cecbe-d9e5-43a4-b9d0-25f942ededc4',
  problemServiceId: 'a479e2d0-9121-4d0b-ac4b-1efd86c6aab6', // Servicio que falla
  workingServiceId: '0c98efc9-b65c-4913-aa23-9952493d7d9d'  // Servicio que funciona (Examen Visual Completo)
};

/**
 * Paso 1: Identificar qué servicio es el problemático
 */
async function identifyProblemService() {
  console.log('\n🔍 PASO 1: Identificar Servicio Problemático');
  console.log('============================================');

  try {
    // Buscar el servicio problemático
    const { data: problemService, error: problemError } = await supabase
      .from('services')
      .select('*')
      .eq('id', INVESTIGATION_DATA.problemServiceId)
      .single();

    if (problemError) {
      console.error('❌ Error buscando servicio problemático:', problemError);
      return null;
    }

    if (!problemService) {
      console.error('❌ PROBLEMA CRÍTICO: Servicio no existe en la base de datos');
      return null;
    }

    console.log('✅ Servicio problemático encontrado:');
    console.log(`   📋 ID: ${problemService.id}`);
    console.log(`   📋 Nombre: ${problemService.name}`);
    console.log(`   📋 Descripción: ${problemService.description}`);
    console.log(`   📋 Categoría: ${problemService.category}`);
    console.log(`   📋 Duración: ${problemService.duration_minutes} minutos`);
    console.log(`   📋 Precio: $${problemService.price}`);
    console.log(`   📋 Activo: ${problemService.is_active}`);
    console.log(`   📋 Organización: ${problemService.organization_id}`);

    return problemService;

  } catch (error) {
    console.error('❌ Error en identificación de servicio:', error);
    return null;
  }
}

/**
 * Paso 2: Comparar con el servicio que funciona
 */
async function compareWithWorkingService() {
  console.log('\n🔍 PASO 2: Comparar con Servicio que Funciona');
  console.log('=============================================');

  try {
    // Buscar el servicio que funciona
    const { data: workingService, error: workingError } = await supabase
      .from('services')
      .select('*')
      .eq('id', INVESTIGATION_DATA.workingServiceId)
      .single();

    if (workingError) {
      console.error('❌ Error buscando servicio que funciona:', workingError);
      return null;
    }

    console.log('✅ Servicio que funciona:');
    console.log(`   📋 ID: ${workingService.id}`);
    console.log(`   📋 Nombre: ${workingService.name}`);
    console.log(`   📋 Descripción: ${workingService.description}`);
    console.log(`   📋 Categoría: ${workingService.category}`);
    console.log(`   📋 Duración: ${workingService.duration_minutes} minutos`);
    console.log(`   📋 Precio: $${workingService.price}`);
    console.log(`   📋 Activo: ${workingService.is_active}`);
    console.log(`   📋 Organización: ${workingService.organization_id}`);

    return workingService;

  } catch (error) {
    console.error('❌ Error en comparación de servicios:', error);
    return null;
  }
}

/**
 * Paso 3: Verificar asociaciones doctor-servicio
 */
async function checkDoctorServiceAssociations() {
  console.log('\n🔍 PASO 3: Verificar Asociaciones Doctor-Servicio');
  console.log('=================================================');

  try {
    // Verificar asociaciones para el servicio problemático
    console.log('📋 Verificando servicio problemático...');
    const { data: problemAssociations, error: problemError } = await supabase
      .from('doctor_services')
      .select(`
        doctor_id,
        service_id,
        services(name),
        profiles(first_name, last_name)
      `)
      .eq('service_id', INVESTIGATION_DATA.problemServiceId);

    if (problemError) {
      console.error('❌ Error verificando asociaciones problemáticas:', problemError);
    } else {
      console.log(`   📊 Asociaciones encontradas: ${problemAssociations?.length || 0}`);
      if (problemAssociations && problemAssociations.length > 0) {
        problemAssociations.forEach(assoc => {
          console.log(`   👨‍⚕️ Doctor: ${assoc.profiles?.first_name} ${assoc.profiles?.last_name}`);
        });
      } else {
        console.log('   ❌ NO HAY DOCTORES ASOCIADOS A ESTE SERVICIO');
      }
    }

    // Verificar asociaciones para el servicio que funciona
    console.log('\n📋 Verificando servicio que funciona...');
    const { data: workingAssociations, error: workingError } = await supabase
      .from('doctor_services')
      .select(`
        doctor_id,
        service_id,
        services(name),
        profiles(first_name, last_name)
      `)
      .eq('service_id', INVESTIGATION_DATA.workingServiceId);

    if (workingError) {
      console.error('❌ Error verificando asociaciones que funcionan:', workingError);
    } else {
      console.log(`   📊 Asociaciones encontradas: ${workingAssociations?.length || 0}`);
      if (workingAssociations && workingAssociations.length > 0) {
        workingAssociations.forEach(assoc => {
          console.log(`   👨‍⚕️ Doctor: ${assoc.profiles?.first_name} ${assoc.profiles?.last_name}`);
        });
      }
    }

    return {
      problemAssociations: problemAssociations || [],
      workingAssociations: workingAssociations || []
    };

  } catch (error) {
    console.error('❌ Error en verificación de asociaciones:', error);
    return null;
  }
}

/**
 * Paso 4: Simular la API call exacta que está fallando
 */
async function simulateFailingAPICall() {
  console.log('\n🔍 PASO 4: Simular API Call que Falla');
  console.log('====================================');

  try {
    console.log('📋 Simulando API /api/doctors con servicio problemático...');
    
    // Paso 1: Obtener doctor profile IDs (como hace la API)
    const { data: doctorServices, error: serviceError } = await supabase
      .from('doctor_services')
      .select('doctor_id')
      .eq('service_id', INVESTIGATION_DATA.problemServiceId);

    if (serviceError) {
      console.error('❌ Error obteniendo doctor_services:', serviceError);
      return null;
    }

    const doctorProfileIds = doctorServices?.map(ds => ds.doctor_id) || [];
    console.log(`   📊 Doctor profile IDs encontrados: ${doctorProfileIds.length}`);
    console.log(`   📋 IDs: ${JSON.stringify(doctorProfileIds)}`);

    if (doctorProfileIds.length === 0) {
      console.log('   ❌ CAUSA RAÍZ ENCONTRADA: No hay doctores asociados a este servicio');
      return { success: true, data: [] };
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
      .eq('organization_id', INVESTIGATION_DATA.organizationId)
      .eq('is_available', true)
      .in('profile_id', doctorProfileIds);

    if (doctorsError) {
      console.error('❌ Error obteniendo doctores:', doctorsError);
      return null;
    }

    console.log(`   📊 Doctores encontrados: ${filteredDoctors?.length || 0}`);

    return {
      success: true,
      data: filteredDoctors || []
    };

  } catch (error) {
    console.error('❌ Error en simulación de API:', error);
    return null;
  }
}

/**
 * Paso 5: Verificar todos los servicios disponibles
 */
async function checkAllServices() {
  console.log('\n🔍 PASO 5: Verificar Todos los Servicios');
  console.log('========================================');

  try {
    // Obtener todos los servicios de la organización
    const { data: allServices, error: servicesError } = await supabase
      .from('services')
      .select('id, name, category, is_active')
      .eq('organization_id', INVESTIGATION_DATA.organizationId)
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (servicesError) {
      console.error('❌ Error obteniendo servicios:', servicesError);
      return null;
    }

    console.log(`✅ Servicios activos encontrados: ${allServices?.length || 0}`);

    // Para cada servicio, verificar si tiene doctores asociados
    for (const service of allServices || []) {
      const { data: associations, error: assocError } = await supabase
        .from('doctor_services')
        .select('doctor_id')
        .eq('service_id', service.id);

      const doctorCount = associations?.length || 0;
      const status = doctorCount > 0 ? '✅' : '❌';
      const highlight = service.id === INVESTIGATION_DATA.problemServiceId ? ' ⚠️  PROBLEMÁTICO' : '';
      
      console.log(`   ${status} ${service.name} (${service.category}) - ${doctorCount} doctores${highlight}`);
    }

    return allServices;

  } catch (error) {
    console.error('❌ Error verificando todos los servicios:', error);
    return null;
  }
}

/**
 * Función principal de investigación
 */
async function main() {
  console.log('🔍 INVESTIGACIÓN ESPECÍFICA: Servicio a479e2d0-9121-4d0b-ac4b-1efd86c6aab6');
  console.log('===========================================================================');
  console.log('Problema: DEBUG: Loaded 0 doctors for service a479e2d0-9121-4d0b-ac4b-1efd86c6aab6');
  console.log('Objetivo: Identificar por qué este servicio específico no tiene doctores');
  console.log('===========================================================================');

  const results = {
    serviceIdentified: false,
    comparisonDone: false,
    associationsChecked: false,
    apiSimulated: false,
    allServicesChecked: false
  };

  // Ejecutar investigación paso a paso
  const problemService = await identifyProblemService();
  results.serviceIdentified = problemService !== null;

  const workingService = await compareWithWorkingService();
  results.comparisonDone = workingService !== null;

  const associations = await checkDoctorServiceAssociations();
  results.associationsChecked = associations !== null;

  const apiResult = await simulateFailingAPICall();
  results.apiSimulated = apiResult !== null;

  const allServices = await checkAllServices();
  results.allServicesChecked = allServices !== null;

  // Análisis final
  console.log('\n📊 ANÁLISIS FINAL');
  console.log('=================');

  if (problemService) {
    console.log(`✅ Servicio identificado: "${problemService.name}"`);
  }

  if (associations) {
    const problemCount = associations.problemAssociations.length;
    const workingCount = associations.workingAssociations.length;
    
    console.log(`📊 Asociaciones doctor-servicio:`);
    console.log(`   - Servicio problemático: ${problemCount} doctores`);
    console.log(`   - Servicio que funciona: ${workingCount} doctores`);

    if (problemCount === 0) {
      console.log('\n🎯 CAUSA RAÍZ IDENTIFICADA:');
      console.log('❌ El servicio NO TIENE DOCTORES ASOCIADOS en la tabla doctor_services');
      console.log('💡 SOLUCIÓN: Agregar asociaciones doctor-servicio para este servicio');
    }
  }

  // Resumen final
  console.log('\n📋 RESUMEN DE INVESTIGACIÓN');
  console.log('===========================');
  console.log(`Servicio Identificado: ${results.serviceIdentified ? '✅ SÍ' : '❌ NO'}`);
  console.log(`Comparación Realizada: ${results.comparisonDone ? '✅ SÍ' : '❌ NO'}`);
  console.log(`Asociaciones Verificadas: ${results.associationsChecked ? '✅ SÍ' : '❌ NO'}`);
  console.log(`API Simulada: ${results.apiSimulated ? '✅ SÍ' : '❌ NO'}`);
  console.log(`Todos los Servicios Verificados: ${results.allServicesChecked ? '✅ SÍ' : '❌ NO'}`);

  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('\n🎉 ¡INVESTIGACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('✅ Causa raíz identificada y documentada');
    process.exit(0);
  } else {
    console.log('\n❌ INVESTIGACIÓN INCOMPLETA');
    console.log('⚠️  Algunos pasos fallaron y requieren atención');
    process.exit(1);
  }
}

// Ejecutar investigación
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Error fatal en investigación:', error);
    process.exit(1);
  });
}

module.exports = {
  identifyProblemService,
  compareWithWorkingService,
  checkDoctorServiceAssociations,
  simulateFailingAPICall,
  checkAllServices
};
