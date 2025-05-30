// Script para crear usuarios de VisualCare en Supabase
// Basado en MANUAL_TESTING_GUIDE.md

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

// Configuración de Supabase
const supabaseUrl = 'https://fjvletqwwmxusgthwphr.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const organizationId = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY no está configurada');
  process.exit(1);
}

// Usuarios a crear basados en MANUAL_TESTING_GUIDE.md
const users = [
  // Administradores
  {
    email: 'carlos.martinez.new@visualcare.com',
    password: 'VisualCare2025!',
    firstName: 'Carlos',
    lastName: 'Martínez',
    phone: '+34600111222',
    role: 'admin'
  },
  {
    email: 'laura.gomez.new@visualcare.com',
    password: 'VisualCare2025!',
    firstName: 'Laura',
    lastName: 'Gómez',
    phone: '+34600111223',
    role: 'admin'
  },
  // Doctores
  {
    email: 'ana.rodriguez.new@visualcare.com',
    password: 'VisualCare2025!',
    firstName: 'Ana',
    lastName: 'Rodríguez',
    phone: '+34600111224',
    role: 'doctor'
  },
  {
    email: 'pedro.sanchez.new@visualcare.com',
    password: 'VisualCare2025!',
    firstName: 'Pedro',
    lastName: 'Sánchez',
    phone: '+34600111225',
    role: 'doctor'
  },
  {
    email: 'elena.lopez.new@visualcare.com',
    password: 'VisualCare2025!',
    firstName: 'Elena',
    lastName: 'López',
    phone: '+34600111226',
    role: 'doctor'
  },
  {
    email: 'miguel.fernandez.new@visualcare.com',
    password: 'VisualCare2025!',
    firstName: 'Miguel',
    lastName: 'Fernández',
    phone: '+34600111227',
    role: 'doctor'
  },
  {
    email: 'sofia.torres.new@visualcare.com',
    password: 'VisualCare2025!',
    firstName: 'Sofía',
    lastName: 'Torres',
    phone: '+34600111228',
    role: 'doctor'
  },
  // Staff
  {
    email: 'carmen.ruiz.new@visualcare.com',
    password: 'VisualCare2025!',
    firstName: 'Carmen',
    lastName: 'Ruiz',
    phone: '+34600111229',
    role: 'staff'
  },
  {
    email: 'javier.moreno.new@visualcare.com',
    password: 'VisualCare2025!',
    firstName: 'Javier',
    lastName: 'Moreno',
    phone: '+34600111230',
    role: 'staff'
  },
  {
    email: 'lucia.navarro.new@visualcare.com',
    password: 'VisualCare2025!',
    firstName: 'Lucía',
    lastName: 'Navarro',
    phone: '+34600111231',
    role: 'staff'
  },
  // Pacientes
  {
    email: 'maria.garcia.new@example.com',
    password: 'VisualCare2025!',
    firstName: 'María',
    lastName: 'García',
    phone: '+34600222111',
    role: 'patient'
  },
  {
    email: 'juan.perez.new@example.com',
    password: 'VisualCare2025!',
    firstName: 'Juan',
    lastName: 'Pérez',
    phone: '+34600222112',
    role: 'patient'
  },
  {
    email: 'isabel.diaz.new@example.com',
    password: 'VisualCare2025!',
    firstName: 'Isabel',
    lastName: 'Díaz',
    phone: '+34600222113',
    role: 'patient'
  }
];

async function createUser(userData) {
  try {
    console.log(`\nCreando usuario: ${userData.email}`);
    
    // 1. Crear usuario en auth.users
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role
        }
      })
    });
    
    const authData = await authResponse.json();
    
    if (!authResponse.ok) {
      console.error(`Error al crear usuario ${userData.email}:`, authData.message || authData.error);
      return null;
    }
    
    console.log(`✅ Usuario creado en auth: ${authData.email} (${authData.id})`);
    
    // 2. Crear perfil en profiles
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id: authData.id,
        organization_id: organizationId,
        email: userData.email,
        role: userData.role,
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone,
        is_active: true
      })
    });
    
    const profileData = await profileResponse.json();
    
    if (!profileResponse.ok) {
      console.error(`Error al crear perfil para ${userData.email}:`, profileData.message || profileData.error);
      return null;
    }
    
    console.log(`✅ Perfil creado: ${profileData[0].first_name} ${profileData[0].last_name} - ${profileData[0].role}`);
    
    return {
      user: authData,
      profile: profileData[0]
    };
    
  } catch (error) {
    console.error(`Error inesperado al crear ${userData.email}:`, error.message);
    return null;
  }
}

async function createAllUsers() {
  console.log('🚀 Iniciando creación de usuarios de VisualCare...');
  console.log(`📋 Total de usuarios a crear: ${users.length}`);
  console.log(`🏢 Organización: Óptica VisualCare (${organizationId})`);
  
  const results = {
    success: [],
    failed: []
  };
  
  for (const userData of users) {
    const result = await createUser(userData);
    
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
    
    // Pausa pequeña entre creaciones
    await new Promise(resolve => setTimeout(resolve, 500));
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
  
  console.log('\n🎯 Próximos pasos:');
  console.log('1. Verificar que todos los usuarios pueden iniciar sesión');
  console.log('2. Configurar información adicional para doctores');
  console.log('3. Crear horarios para doctores');
  console.log('4. Probar funcionalidad AI con diferentes roles');
}

// Ejecutar el script
createAllUsers().catch(console.error);
