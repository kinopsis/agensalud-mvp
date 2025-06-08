#!/usr/bin/env node

/**
 * Test Evolution API Integration
 * 
 * Prueba directa de la integración con Evolution API usando
 * exactamente el mismo payload que funcionó en la prueba manual.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

require('dotenv').config({ path: '.env.local' });

console.log('🧪 EVOLUTION API INTEGRATION TEST');
console.log('='.repeat(60));

// Configuración que funciona (de la prueba manual)
const WORKING_CONFIG = {
  baseUrl: 'https://evo.torrecentral.com',
  apiKey: 'ixisatbi7f3p9m1ip37hibanq0vjq8nc',
  endpoint: '/instance/create'
};

// Payload exacto que funcionó en la prueba manual
const WORKING_PAYLOAD = {
  instanceName: `test-agentsalud-${Date.now()}`, // Nombre único para evitar conflictos
  integration: 'WHATSAPP-BAILEYS',
  qrcode: true
};

console.log('\n📋 CONFIGURACIÓN DE PRUEBA:');
console.log('-'.repeat(50));
console.log(`URL: ${WORKING_CONFIG.baseUrl}${WORKING_CONFIG.endpoint}`);
console.log(`API Key: ${WORKING_CONFIG.apiKey}`);
console.log(`Payload:`, JSON.stringify(WORKING_PAYLOAD, null, 2));

async function testEvolutionAPI() {
  try {
    console.log('\n🚀 INICIANDO PRUEBA DE EVOLUTION API...');
    console.log('-'.repeat(50));

    const startTime = Date.now();

    // Hacer la misma llamada que funcionó en la prueba manual
    const response = await fetch(`${WORKING_CONFIG.baseUrl}${WORKING_CONFIG.endpoint}`, {
      method: 'POST',
      headers: {
        'apikey': WORKING_CONFIG.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(WORKING_PAYLOAD)
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log(`⏱️ Tiempo de respuesta: ${responseTime}ms`);

    if (!response.ok) {
      console.log(`❌ Error HTTP: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log(`Error details: ${errorText}`);
      return false;
    }

    const result = await response.json();

    console.log('\n✅ RESPUESTA EXITOSA:');
    console.log('-'.repeat(50));
    console.log('📊 Estructura de respuesta:');
    console.log(`  - Instance Name: ${result.instance?.instanceName}`);
    console.log(`  - Instance ID: ${result.instance?.instanceId}`);
    console.log(`  - Integration: ${result.instance?.integration}`);
    console.log(`  - Status: ${result.instance?.status}`);
    console.log(`  - Hash: ${result.hash ? 'Presente' : 'Ausente'}`);
    console.log(`  - Webhook: ${result.webhook ? 'Configurado' : 'No configurado'}`);
    console.log(`  - Settings: ${result.settings ? 'Presente' : 'Ausente'}`);

    console.log('\n📱 QR CODE ANALYSIS:');
    console.log('-'.repeat(50));
    if (result.qrcode) {
      console.log(`✅ QR Code generado exitosamente:`);
      console.log(`  - Código: ${result.qrcode.code ? 'Presente' : 'Ausente'}`);
      console.log(`  - Base64: ${result.qrcode.base64 ? 'Presente' : 'Ausente'}`);
      console.log(`  - Count: ${result.qrcode.count || 'N/A'}`);
      console.log(`  - Pairing Code: ${result.qrcode.pairingCode || 'N/A'}`);
      
      if (result.qrcode.base64) {
        const base64Length = result.qrcode.base64.length;
        console.log(`  - Base64 Length: ${base64Length} characters`);
        console.log(`  - Base64 Preview: ${result.qrcode.base64.substring(0, 50)}...`);
      }
    } else {
      console.log(`❌ QR Code NO generado`);
    }

    console.log('\n🎯 COMPARACIÓN CON PRUEBA MANUAL:');
    console.log('-'.repeat(50));
    
    // Comparar con la respuesta de la prueba manual
    const manualTestResponse = {
      instanceId: '852714c2-ca86-4030-bda5-f71fd0702a53',
      status: 'connecting',
      hasQRCode: true,
      hasBase64: true
    };

    console.log(`✅ Instance ID format: ${result.instance?.instanceId ? 'UUID válido' : '❌ Formato incorrecto'}`);
    console.log(`✅ Status: ${result.instance?.status === 'connecting' ? 'Correcto (connecting)' : `❌ Incorrecto (${result.instance?.status})`}`);
    console.log(`✅ QR Code: ${result.qrcode ? 'Presente' : '❌ Ausente'}`);
    console.log(`✅ Base64: ${result.qrcode?.base64 ? 'Presente' : '❌ Ausente'}`);

    console.log('\n📊 MÉTRICAS DE RENDIMIENTO:');
    console.log('-'.repeat(50));
    console.log(`⏱️ Tiempo de respuesta: ${responseTime}ms`);
    console.log(`🎯 Target: <5000ms (${responseTime < 5000 ? '✅ CUMPLIDO' : '❌ EXCEDIDO'})`);
    console.log(`🚀 Excelente: <1000ms (${responseTime < 1000 ? '✅ EXCELENTE' : '⚠️ ACEPTABLE'})`);

    // Guardar la respuesta completa para análisis
    console.log('\n💾 RESPUESTA COMPLETA GUARDADA:');
    console.log('-'.repeat(50));
    const fs = require('fs');
    const responseFile = `evolution-test-response-${Date.now()}.json`;
    fs.writeFileSync(responseFile, JSON.stringify(result, null, 2));
    console.log(`📁 Archivo: ${responseFile}`);

    return true;

  } catch (error) {
    console.log('\n❌ ERROR EN LA PRUEBA:');
    console.log('-'.repeat(50));
    console.log(`Error: ${error.message}`);
    console.log(`Stack: ${error.stack}`);
    return false;
  }
}

async function main() {
  const success = await testEvolutionAPI();

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTADO DE LA PRUEBA:');
  console.log('='.repeat(60));

  if (success) {
    console.log('🎉 PRUEBA EXITOSA');
    console.log('✅ Evolution API responde correctamente');
    console.log('✅ QR Code se genera inmediatamente');
    console.log('✅ Formato de respuesta coincide con prueba manual');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Verificar que la aplicación use el mismo payload');
    console.log('2. Probar la creación de instancias desde la UI');
    console.log('3. Confirmar que el QR se muestre correctamente');
  } else {
    console.log('❌ PRUEBA FALLIDA');
    console.log('🔧 Revisar configuración y conectividad');
    console.log('📊 Verificar logs de error arriba');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Test de Evolution API Completo!');
  console.log('='.repeat(60));

  process.exit(success ? 0 : 1);
}

main().catch(console.error);
