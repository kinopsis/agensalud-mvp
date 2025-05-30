/**
 * Script de prueba para el endpoint /api/appointments/availability
 * 
 * Verifica que el endpoint funciona correctamente y resuelve el error 404
 * que estaba rompiendo WeeklyAvailabilitySelector
 */

const testEndpoint = async () => {
  const baseUrl = 'http://localhost:3000';
  
  // Parámetros de prueba basados en el error del log
  const params = new URLSearchParams({
    organizationId: '927cecbe-d9e5-43a4-b9d0-25f942ededc4',
    startDate: '2025-05-25',
    endDate: '2025-05-31',
    serviceId: 'af9208aa-1341-498f-9852-e33422d4a0b0'
  });
  
  const url = `${baseUrl}/api/appointments/availability?${params}`;
  
  console.log('🧪 Testing availability endpoint...');
  console.log('📍 URL:', url);
  
  try {
    const response = await fetch(url);
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS! Endpoint is working');
      console.log('📄 Response Data Structure:');
      console.log('  - success:', data.success);
      console.log('  - data keys:', Object.keys(data.data || {}));
      
      // Mostrar ejemplo de datos para una fecha
      const firstDate = Object.keys(data.data || {})[0];
      if (firstDate) {
        const dayData = data.data[firstDate];
        console.log(`  - ${firstDate}:`, {
          totalSlots: dayData.totalSlots,
          availableSlots: dayData.availableSlots,
          slotsCount: dayData.slots?.length || 0
        });
        
        if (dayData.slots && dayData.slots.length > 0) {
          console.log('  - First slot example:', dayData.slots[0]);
        }
      }
      
      console.log('\n🎉 WeeklyAvailabilitySelector should now work correctly!');
      
    } else {
      const errorData = await response.text();
      console.log('❌ FAILED! Response:', errorData);
      
      if (response.status === 404) {
        console.log('💡 The endpoint still returns 404. Check:');
        console.log('   1. Server is running on port 3000');
        console.log('   2. Route file is in correct location: src/app/api/appointments/availability/route.ts');
        console.log('   3. No syntax errors in the route file');
      }
    }
    
  } catch (error) {
    console.log('❌ NETWORK ERROR:', error.message);
    console.log('💡 Make sure the development server is running: npm run dev');
  }
};

// Función para probar diferentes escenarios
const runAllTests = async () => {
  console.log('🚀 Starting comprehensive endpoint tests...\n');
  
  const testCases = [
    {
      name: 'Basic availability query',
      params: {
        organizationId: '927cecbe-d9e5-43a4-b9d0-25f942ededc4',
        startDate: '2025-05-25',
        endDate: '2025-05-31'
      }
    },
    {
      name: 'With service filter',
      params: {
        organizationId: '927cecbe-d9e5-43a4-b9d0-25f942ededc4',
        startDate: '2025-05-25',
        endDate: '2025-05-31',
        serviceId: 'af9208aa-1341-498f-9852-e33422d4a0b0'
      }
    },
    {
      name: 'Single day query',
      params: {
        organizationId: '927cecbe-d9e5-43a4-b9d0-25f942ededc4',
        startDate: '2025-05-26',
        endDate: '2025-05-26'
      }
    },
    {
      name: 'Invalid parameters (should fail)',
      params: {
        organizationId: '927cecbe-d9e5-43a4-b9d0-25f942ededc4'
        // Missing startDate and endDate
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log('─'.repeat(50));
    
    const params = new URLSearchParams(testCase.params);
    const url = `http://localhost:3000/api/appointments/availability?${params}`;
    
    try {
      const response = await fetch(url);
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Success');
        console.log(`Data keys: ${Object.keys(data.data || {}).length} dates`);
      } else {
        const errorData = await response.json();
        console.log('❌ Expected error:', errorData.error);
      }
      
    } catch (error) {
      console.log('❌ Network error:', error.message);
    }
  }
  
  console.log('\n🏁 All tests completed!');
};

// Ejecutar pruebas
if (require.main === module) {
  // Esperar un poco para que el servidor se inicie
  setTimeout(() => {
    runAllTests();
  }, 2000);
}

module.exports = { testEndpoint, runAllTests };
