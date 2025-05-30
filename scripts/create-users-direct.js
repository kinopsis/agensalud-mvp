// Script simplificado para crear usuarios usando fetch directo
// Sin dependencias externas

const https = require('https');
const fs = require('fs');

// Configuración
const supabaseUrl = 'https://fjvletqwwmxusgthwphr.supabase.co';
const organizationId = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';

// Leer la clave del servicio desde .env.local
function getServiceKey() {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
        const key = line.split('=')[1].trim();
        if (key && key !== 'placeholder_service_role_key') {
          return key;
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error leyendo .env.local:', error.message);
    return null;
  }
}

// Usuarios a crear
const users = [
  // Administradores
  { email: 'carlos.martinez.new@visualcare.com', firstName: 'Carlos', lastName: 'Martínez', phone: '+34600111222', role: 'admin' },
  { email: 'laura.gomez.new@visualcare.com', firstName: 'Laura', lastName: 'Gómez', phone: '+34600111223', role: 'admin' },
  // Doctores
  { email: 'ana.rodriguez.new@visualcare.com', firstName: 'Ana', lastName: 'Rodríguez', phone: '+34600111224', role: 'doctor' },
  { email: 'pedro.sanchez.new@visualcare.com', firstName: 'Pedro', lastName: 'Sánchez', phone: '+34600111225', role: 'doctor' },
  { email: 'elena.lopez.new@visualcare.com', firstName: 'Elena', lastName: 'López', phone: '+34600111226', role: 'doctor' },
  { email: 'miguel.fernandez.new@visualcare.com', firstName: 'Miguel', lastName: 'Fernández', phone: '+34600111227', role: 'doctor' },
  { email: 'sofia.torres.new@visualcare.com', firstName: 'Sofía', lastName: 'Torres', phone: '+34600111228', role: 'doctor' },
  // Staff
  { email: 'carmen.ruiz.new@visualcare.com', firstName: 'Carmen', lastName: 'Ruiz', phone: '+34600111229', role: 'staff' },
  { email: 'javier.moreno.new@visualcare.com', firstName: 'Javier', lastName: 'Moreno', phone: '+34600111230', role: 'staff' },
  { email: 'lucia.navarro.new@visualcare.com', firstName: 'Lucía', lastName: 'Navarro', phone: '+34600111231', role: 'staff' },
  // Pacientes
  { email: 'maria.garcia.new@example.com', firstName: 'María', lastName: 'García', phone: '+34600222111', role: 'patient' },
  { email: 'juan.perez.new@example.com', firstName: 'Juan', lastName: 'Pérez', phone: '+34600222112', role: 'patient' },
  { email: 'isabel.diaz.new@example.com', firstName: 'Isabel', lastName: 'Díaz', phone: '+34600222113', role: 'patient' }
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

async function createUser(userData, serviceKey) {
  try {
    console.log(`\nCreando usuario: ${userData.email}`);
    
    // 1. Crear usuario en auth.users
    const authOptions = {
      hostname: 'fjvletqwwmxusgthwphr.supabase.co',
      port: 443,
      path: '/auth/v1/admin/users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    };
    
    const authData = {
      email: userData.email,
      password: 'VisualCare2025!',
      email_confirm: true,
      user_metadata: {
        first_name: userData.firstName,
        last_name: userData.lastName,
        role: userData.role
      }
    };
    
    const authResponse = await makeRequest(authOptions, authData);
    
    if (authResponse.status !== 200) {
      console.error(`❌ Error al crear usuario ${userData.email}:`, authResponse.data);
      return null;
    }
    
    console.log(`✅ Usuario creado en auth: ${authResponse.data.email} (${authResponse.data.id})`);
    
    // 2. Crear perfil en profiles
    const profileOptions = {
      hostname: 'fjvletqwwmxusgthwphr.supabase.co',
      port: 443,
      path: '/rest/v1/profiles',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=representation'
      }
    };
    
    const profileData = {
      id: authResponse.data.id,
      organization_id: organizationId,
      email: userData.email,
      role: userData.role,
      first_name: userData.firstName,
      last_name: userData.lastName,
      phone: userData.phone,
      is_active: true
    };
    
    const profileResponse = await makeRequest(profileOptions, profileData);
    
    if (profileResponse.status !== 201) {
      console.error(`❌ Error al crear perfil para ${userData.email}:`, profileResponse.data);
      return null;
    }
    
    console.log(`✅ Perfil creado: ${profileResponse.data[0].first_name} ${profileResponse.data[0].last_name} - ${profileResponse.data[0].role}`);
    
    return {
      user: authResponse.data,
      profile: profileResponse.data[0]
    };
    
  } catch (error) {
    console.error(`❌ Error inesperado al crear ${userData.email}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Iniciando creación de usuarios de VisualCare...');
  
  const serviceKey = getServiceKey();
  if (!serviceKey) {
    console.error('❌ Error: No se pudo obtener SUPABASE_SERVICE_ROLE_KEY');
    console.log('💡 Asegúrate de que .env.local tenga la clave correcta');
    process.exit(1);
  }
  
  console.log(`📋 Total de usuarios a crear: ${users.length}`);
  console.log(`🏢 Organización: Óptica VisualCare (${organizationId})`);
  
  const results = { success: [], failed: [] };
  
  for (const userData of users) {
    const result = await createUser(userData, serviceKey);
    
    if (result) {
      results.success.push({
        email: userData.email,
        role: userData.role,
        id: result.user.id
      });
    } else {
      results.failed.push({
        email: userData.email,
        role: userData.role
      });
    }
    
    // Pausa entre creaciones
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 RESUMEN DE CREACIÓN:');
  console.log(`✅ Usuarios creados exitosamente: ${results.success.length}`);
  console.log(`❌ Usuarios fallidos: ${results.failed.length}`);
  
  if (results.success.length > 0) {
    console.log('\n✅ USUARIOS CREADOS:');
    results.success.forEach(user => {
      console.log(`- ${user.email} (${user.role}) - ID: ${user.id}`);
    });
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ USUARIOS FALLIDOS:');
    results.failed.forEach(user => {
      console.log(`- ${user.email} (${user.role})`);
    });
  }
  
  console.log('\n🎯 Script completado');
}

main().catch(console.error);
