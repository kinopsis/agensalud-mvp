// Script para probar el login de usuarios creados
const https = require('https');
const fs = require('fs');

// Configuración
const supabaseUrl = 'https://fjvletqwwmxusgthwphr.supabase.co';

// Leer la clave anon desde .env.local
function getAnonKey() {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
        return line.split('=')[1].trim();
      }
    }
    return null;
  } catch (error) {
    console.error('Error leyendo .env.local:', error.message);
    return null;
  }
}

// Usuarios de prueba (uno de cada rol)
const testUsers = [
  { email: 'carlos.martinez.new@visualcare.com', role: 'admin', name: 'Carlos Martínez' },
  { email: 'ana.rodriguez.new@visualcare.com', role: 'doctor', name: 'Ana Rodríguez' },
  { email: 'carmen.ruiz.new@visualcare.com', role: 'staff', name: 'Carmen Ruiz' },
  { email: 'maria.garcia.new@example.com', role: 'patient', name: 'María García' }
];

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testLogin(user, anonKey) {
  try {
    console.log(`\n🔐 Probando login: ${user.name} (${user.role})`);
    console.log(`📧 Email: ${user.email}`);
    
    const options = {
      hostname: 'fjvletqwwmxusgthwphr.supabase.co',
      port: 443,
      path: '/auth/v1/token?grant_type=password',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey
      }
    };
    
    const loginData = {
      email: user.email,
      password: 'VisualCare2025!'
    };
    
    const response = await makeRequest(options, loginData);
    
    if (response.status === 200 && response.data.access_token) {
      console.log(`✅ Login exitoso para ${user.name}`);
      console.log(`🎫 Token obtenido: ${response.data.access_token.substring(0, 20)}...`);
      console.log(`👤 Usuario ID: ${response.data.user.id}`);
      console.log(`📧 Email confirmado: ${response.data.user.email_confirmed_at ? 'Sí' : 'No'}`);
      return true;
    } else {
      console.log(`❌ Login fallido para ${user.name}`);
      console.log(`📄 Respuesta:`, response.data);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Error al probar login para ${user.name}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Iniciando pruebas de autenticación...');
  
  const anonKey = getAnonKey();
  if (!anonKey) {
    console.error('❌ Error: No se pudo obtener NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }
  
  console.log(`🔑 Usando anon key: ${anonKey.substring(0, 20)}...`);
  console.log(`🏢 Probando ${testUsers.length} usuarios de diferentes roles`);
  
  const results = { success: 0, failed: 0 };
  
  for (const user of testUsers) {
    const success = await testLogin(user, anonKey);
    
    if (success) {
      results.success++;
    } else {
      results.failed++;
    }
    
    // Pausa entre pruebas
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 RESUMEN DE PRUEBAS DE LOGIN:');
  console.log(`✅ Logins exitosos: ${results.success}/${testUsers.length}`);
  console.log(`❌ Logins fallidos: ${results.failed}/${testUsers.length}`);
  
  if (results.success === testUsers.length) {
    console.log('\n🎉 ¡Todos los usuarios pueden autenticarse correctamente!');
    console.log('🔐 Contraseña estándar: VisualCare2025!');
  } else {
    console.log('\n⚠️  Algunos usuarios tienen problemas de autenticación');
  }
  
  console.log('\n🎯 Pruebas de autenticación completadas');
}

main().catch(console.error);
