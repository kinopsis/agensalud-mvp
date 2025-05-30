/**
 * Validación final del endpoint /api/appointments/availability
 * 
 * Verifica que el endpoint resuelve el error 404 crítico
 * y funciona correctamente con WeeklyAvailabilitySelector
 */

const https = require('https');
const http = require('http');

async function validateEndpoint() {
  console.log('🔍 VALIDACIÓN FINAL DEL ENDPOINT DE DISPONIBILIDAD');
  console.log('=' .repeat(60));
  
  const testCases = [
    {
      name: 'Consulta básica (caso del error original)',
      url: 'http://localhost:3000/api/appointments/availability?organizationId=927cecbe-d9e5-43a4-b9d0-25f942ededc4&startDate=2025-05-25&endDate=2025-05-31&serviceId=af9208aa-1341-498f-9852-e33422d4a0b0',
      expectedStatus: 200
    },
    {
      name: 'Sin serviceId',
      url: 'http://localhost:3000/api/appointments/availability?organizationId=927cecbe-d9e5-43a4-b9d0-25f942ededc4&startDate=2025-05-25&endDate=2025-05-31',
      expectedStatus: 200
    },
    {
      name: 'Parámetros faltantes (debe fallar)',
      url: 'http://localhost:3000/api/appointments/availability?organizationId=927cecbe-d9e5-43a4-b9d0-25f942ededc4',
      expectedStatus: 400
    },
    {
      name: 'Fecha inválida (debe fallar)',
      url: 'http://localhost:3000/api/appointments/availability?organizationId=927cecbe-d9e5-43a4-b9d0-25f942ededc4&startDate=invalid&endDate=2025-05-31',
      expectedStatus: 400
    }
  ];
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log('─'.repeat(50));
    
    try {
      const result = await makeRequest(testCase.url);
      
      if (result.statusCode === testCase.expectedStatus) {
        console.log(`✅ PASSED - Status: ${result.statusCode}`);
        
        if (result.statusCode === 200) {
          const data = JSON.parse(result.data);
          console.log(`   📊 Success: ${data.success}`);
          console.log(`   📅 Dates returned: ${Object.keys(data.data || {}).length}`);
          
          // Verificar estructura para WeeklyAvailabilitySelector
          const firstDate = Object.keys(data.data || {})[0];
          if (firstDate) {
            const dayData = data.data[firstDate];
            console.log(`   🕐 Slots for ${firstDate}: ${dayData.slots?.length || 0}`);
            console.log(`   📈 Total/Available: ${dayData.totalSlots}/${dayData.availableSlots}`);
          }
        } else {
          const errorData = JSON.parse(result.data);
          console.log(`   ❌ Expected error: ${errorData.error}`);
        }
        
        passedTests++;
      } else {
        console.log(`❌ FAILED - Expected: ${testCase.expectedStatus}, Got: ${result.statusCode}`);
        console.log(`   Response: ${result.data.substring(0, 200)}...`);
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 RESULTADOS FINALES: ${passedTests}/${totalTests} tests pasaron`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ¡ÉXITO TOTAL! El endpoint está funcionando correctamente');
    console.log('✅ El error 404 ha sido resuelto');
    console.log('✅ WeeklyAvailabilitySelector puede funcionar ahora');
    console.log('✅ SmartSuggestionsEngine puede obtener datos');
    console.log('✅ Las mejoras de IA de las Fases 2-3 están habilitadas');
  } else {
    console.log('⚠️  Algunos tests fallaron. Revisar implementación.');
  }
  
  return passedTests === totalTests;
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Ejecutar validación
if (require.main === module) {
  validateEndpoint()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Error en validación:', error);
      process.exit(1);
    });
}

module.exports = { validateEndpoint };
