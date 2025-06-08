#!/usr/bin/env node

/**
 * Debug Evolution API Configuration
 * 
 * Verifica que la configuración de Evolution API esté correcta
 * y compara con los valores que funcionan en la prueba manual.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

require('dotenv').config({ path: '.env.local' });

console.log('🔍 EVOLUTION API CONFIGURATION DEBUG');
console.log('='.repeat(60));

// Valores que funcionan en la prueba manual
const WORKING_CONFIG = {
  baseUrl: 'https://evo.torrecentral.com',
  apiKey: 'ixisatbi7f3p9m1ip37hibanq0vjq8nc',
  endpoint: '/instance/create'
};

// Configuración actual del sistema
const CURRENT_CONFIG = {
  baseUrl: process.env.EVOLUTION_API_BASE_URL,
  apiKey: process.env.EVOLUTION_API_KEY,
  version: process.env.EVOLUTION_API_VERSION,
  nodeEnv: process.env.NODE_ENV
};

console.log('\n📋 CONFIGURACIÓN QUE FUNCIONA (Prueba Manual):');
console.log('-'.repeat(50));
console.log(`URL Base: ${WORKING_CONFIG.baseUrl}`);
console.log(`API Key: ${WORKING_CONFIG.apiKey}`);
console.log(`Endpoint: ${WORKING_CONFIG.endpoint}`);

console.log('\n📋 CONFIGURACIÓN ACTUAL DEL SISTEMA:');
console.log('-'.repeat(50));
console.log(`EVOLUTION_API_BASE_URL: ${CURRENT_CONFIG.baseUrl || 'NO DEFINIDA'}`);
console.log(`EVOLUTION_API_KEY: ${CURRENT_CONFIG.apiKey || 'NO DEFINIDA'}`);
console.log(`EVOLUTION_API_VERSION: ${CURRENT_CONFIG.version || 'NO DEFINIDA'}`);
console.log(`NODE_ENV: ${CURRENT_CONFIG.nodeEnv || 'NO DEFINIDA'}`);

console.log('\n🔍 ANÁLISIS DE COMPATIBILIDAD:');
console.log('-'.repeat(50));

// Verificar URL base
const urlsMatch = CURRENT_CONFIG.baseUrl?.replace(/\/+$/, '') === WORKING_CONFIG.baseUrl;
console.log(`✅ URL Base: ${urlsMatch ? 'COINCIDE' : '❌ NO COINCIDE'}`);
if (!urlsMatch) {
  console.log(`   Esperado: ${WORKING_CONFIG.baseUrl}`);
  console.log(`   Actual: ${CURRENT_CONFIG.baseUrl}`);
}

// Verificar API Key
const keysMatch = CURRENT_CONFIG.apiKey === WORKING_CONFIG.apiKey;
console.log(`✅ API Key: ${keysMatch ? 'COINCIDE' : '❌ NO COINCIDE'}`);
if (!keysMatch) {
  console.log(`   Esperado: ${WORKING_CONFIG.apiKey}`);
  console.log(`   Actual: ${CURRENT_CONFIG.apiKey || 'NO DEFINIDA'}`);
}

// Verificar si está en modo desarrollo
const isDevelopment = CURRENT_CONFIG.nodeEnv === 'development';
console.log(`🔧 Modo Desarrollo: ${isDevelopment ? 'SÍ' : 'NO'}`);

console.log('\n🧪 PRUEBA DE CONEXIÓN SIMULADA:');
console.log('-'.repeat(50));

// Simular la configuración que usaría el servicio
const serviceConfig = {
  baseUrl: CURRENT_CONFIG.baseUrl || 'http://localhost:8080',
  apiKey: CURRENT_CONFIG.apiKey || (isDevelopment ? 'dev-api-key-placeholder' : ''),
  version: 'v2'
};

console.log('Configuración que usaría EvolutionAPIService:');
console.log(`  Base URL: ${serviceConfig.baseUrl}`);
console.log(`  API Key: ${serviceConfig.apiKey}`);
console.log(`  Version: ${serviceConfig.version}`);

// Construir URL completa
const fullUrl = `${serviceConfig.baseUrl.replace(/\/+$/, '')}/instance/create`;
console.log(`  URL Completa: ${fullUrl}`);

console.log('\n🎯 DIAGNÓSTICO:');
console.log('-'.repeat(50));

if (urlsMatch && keysMatch) {
  console.log('🎉 CONFIGURACIÓN CORRECTA');
  console.log('✅ La configuración del sistema coincide con la prueba manual exitosa');
  console.log('✅ El problema debe estar en la implementación del servicio');
  
} else {
  console.log('🚨 CONFIGURACIÓN INCORRECTA');
  console.log('❌ La configuración del sistema NO coincide con la prueba manual');
  console.log('🔧 Necesita corrección en las variables de entorno');
}

console.log('\n📋 RECOMENDACIONES:');
console.log('-'.repeat(50));

if (!urlsMatch || !keysMatch) {
  console.log('1. 🔧 Corregir variables de entorno:');
  if (!urlsMatch) {
    console.log(`   EVOLUTION_API_BASE_URL=${WORKING_CONFIG.baseUrl}`);
  }
  if (!keysMatch) {
    console.log(`   EVOLUTION_API_KEY=${WORKING_CONFIG.apiKey}`);
  }
  console.log('2. 🔄 Reiniciar el servidor de desarrollo');
  console.log('3. 🧪 Probar la creación de instancias');
  
} else {
  console.log('1. 🔍 Verificar implementación de EvolutionAPIService');
  console.log('2. 🧪 Probar endpoint de creación de instancias');
  console.log('3. 📊 Revisar logs de la aplicación');
  console.log('4. 🔧 Verificar manejo de respuestas de Evolution API');
}

console.log('\n🧪 PRÓXIMOS PASOS DE TESTING:');
console.log('-'.repeat(50));
console.log('1. Ejecutar prueba manual desde la aplicación');
console.log('2. Comparar logs de la aplicación con la prueba manual exitosa');
console.log('3. Verificar que el payload enviado sea idéntico');
console.log('4. Confirmar que la respuesta se procese correctamente');

console.log('\n' + '='.repeat(60));
console.log('✨ Debug de Configuración Evolution API Completo!');
console.log('='.repeat(60));
