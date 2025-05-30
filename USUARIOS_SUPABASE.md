# Gestión de Usuarios en Supabase para Agendalo

Este documento proporciona instrucciones detalladas sobre cómo gestionar usuarios en Supabase para la plataforma Agendalo, incluyendo la creación de usuarios, pruebas de conexión y pruebas de inicio de sesión.

## Requisitos Previos

Antes de ejecutar cualquiera de los scripts, asegúrate de tener:

1. Node.js instalado (versión 14 o superior)
2. Las dependencias necesarias instaladas:
   ```bash
   cd app
   npm install @supabase/supabase-js dotenv node-fetch@2 uuid
   ```
3. Un archivo `.env.local` configurado con las siguientes variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon
   SUPABASE_SERVICE_ROLE_KEY=tu-clave-service-role
   ```

## 1. Probar la Conexión a Supabase

El script `test-connection.js` te permite verificar que puedes conectarte correctamente a Supabase y que tus credenciales son válidas.

### Código del Script

```javascript
// test-connection.js
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Obtener las variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Configurada' : 'No configurada');
console.log('Supabase Service Key:', supabaseServiceKey ? 'Configurada' : 'No configurada');

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('Error: Faltan variables de entorno necesarias');
  process.exit(1);
}

// Crear cliente de Supabase con la clave anónima
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Crear cliente de Supabase con la clave de servicio
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    console.log('\nProbando conexión con clave anónima...');
    const { data: anonData, error: anonError } = await supabaseAnon.from('profiles').select('*').limit(1);
    
    if (anonError) {
      console.error('Error con clave anónima:', anonError.message);
    } else {
      console.log('Conexión con clave anónima exitosa:', anonData);
    }

    console.log('\nProbando conexión con clave de servicio...');
    const { data: serviceData, error: serviceError } = await supabaseService.from('profiles').select('*').limit(1);
    
    if (serviceError) {
      console.error('Error con clave de servicio:', serviceError.message);
    } else {
      console.log('Conexión con clave de servicio exitosa:', serviceData);
    }

    // Probar la API de administración
    console.log('\nProbando API de administración...');
    try {
      const { data: users, error: usersError } = await supabaseService.auth.admin.listUsers({
        page: 1,
        perPage: 10
      });
      
      if (usersError) {
        console.error('Error al listar usuarios:', usersError.message);
      } else {
        console.log(`Listado de usuarios exitoso. Total: ${users.users.length}`);
        users.users.forEach(user => {
          console.log(`- ${user.email} (${user.id})`);
        });
      }
    } catch (adminError) {
      console.error('Error al acceder a la API de administración:', adminError.message);
    }
  } catch (err) {
    console.error('Error inesperado:', err.message);
  }
}

testConnection();
```

### Uso

```bash
cd app
node scripts/test-connection.js
```

### Resultado Esperado

El script mostrará información sobre la conexión a Supabase, incluyendo:
- Si las variables de entorno están configuradas correctamente
- Si puedes conectarte a Supabase con la clave anónima
- Si puedes conectarte a Supabase con la clave de servicio
- Si puedes acceder a la API de administración de Supabase

## 2. Listar Usuarios Existentes

El script `list-users.js` te permite listar todos los usuarios existentes en la base de datos, incluyendo sus perfiles.

### Código del Script

```javascript
// list-users.js
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Obtener las variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Faltan variables de entorno necesarias');
  process.exit(1);
}

// Crear cliente de Supabase con la clave de servicio
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listUsers() {
  try {
    console.log('Listando usuarios de auth.users...');
    
    // Listar usuarios utilizando la API REST de Supabase
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error al listar usuarios:', data.message || data.error || 'Error desconocido');
      return;
    }
    
    console.log(`Se encontraron ${data.users.length} usuarios:`);
    
    for (const user of data.users) {
      console.log(`\nUsuario: ${user.email} (${user.id})`);
      console.log('- Email confirmado:', user.email_confirmed_at ? 'Sí' : 'No');
      console.log('- Creado:', new Date(user.created_at).toLocaleString());
      console.log('- Último inicio de sesión:', user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Nunca');
      console.log('- Metadata:', JSON.stringify(user.user_metadata));
      
      // Buscar perfil correspondiente
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error('Error al buscar perfil:', profileError.message);
      } else if (profile) {
        console.log('- Perfil:');
        console.log('  - Rol:', profile.role);
        console.log('  - Nombre:', profile.first_name, profile.last_name);
        console.log('  - Organización:', profile.organization_id || 'Ninguna');
      } else {
        console.log('- No tiene perfil');
      }
    }
    
    // Listar perfiles sin usuario correspondiente
    console.log('\nListando perfiles sin usuario correspondiente...');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      console.error('Error al listar perfiles:', profilesError.message);
      return;
    }
    
    const orphanProfiles = profiles.filter(profile => !data.users.some(user => user.id === profile.id));
    
    console.log(`Se encontraron ${orphanProfiles.length} perfiles huérfanos:`);
    
    for (const profile of orphanProfiles) {
      console.log(`\nPerfil huérfano: ${profile.email || 'Sin email'} (${profile.id})`);
      console.log('- Rol:', profile.role);
      console.log('- Nombre:', profile.first_name, profile.last_name);
      console.log('- Organización:', profile.organization_id || 'Ninguna');
      console.log('- Creado:', new Date(profile.created_at).toLocaleString());
    }
  } catch (err) {
    console.error('Error inesperado:', err.message);
  }
}

listUsers();
```

### Uso

```bash
cd app
node scripts/list-users.js
```

### Resultado Esperado

El script mostrará información sobre todos los usuarios existentes en la base de datos, incluyendo:
- Información básica del usuario (email, ID, fecha de creación, etc.)
- Información del perfil asociado (rol, nombre, organización, etc.)
- Perfiles huérfanos (perfiles sin usuario correspondiente en auth.users)

## 3. Crear un Nuevo Usuario

El script `create-fresh-user.js` te permite crear un nuevo usuario en Supabase, incluyendo su perfil.

### Código del Script

```javascript
// create-fresh-user.js
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Obtener las variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Error: Faltan variables de entorno necesarias');
  process.exit(1);
}

// Datos del usuario a crear - MODIFICA ESTOS VALORES SEGÚN TUS NECESIDADES
const userData = {
  email: 'nuevo-usuario@agendalo.com',
  password: 'Password123!',
  firstName: 'Nuevo',
  lastName: 'Usuario',
  role: 'admin' // Opciones: superadmin, admin, doctor, staff, patient
};

async function createFreshUser() {
  try {
    console.log(`Creando usuario: ${userData.email}`);
    
    // Crear usuario utilizando la API REST de Supabase
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
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
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error al crear usuario:', data.message || data.error || 'Error desconocido');
      return;
    }
    
    console.log('Usuario creado exitosamente:');
    console.log('- ID:', data.id);
    console.log('- Email:', data.email);
    console.log('- Metadata:', data.user_metadata);
    
    // Crear perfil para el usuario
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id: data.id,
        email: userData.email,
        role: userData.role,
        first_name: userData.firstName,
        last_name: userData.lastName,
        is_active: true
      })
    });
    
    const profileData = await profileResponse.json();
    
    if (!profileResponse.ok) {
      console.error('Error al crear perfil:', profileData.message || profileData.error || 'Error desconocido');
      return;
    }
    
    console.log('Perfil creado exitosamente:');
    console.log('- ID:', profileData[0].id);
    console.log('- Rol:', profileData[0].role);
    console.log('- Nombre:', profileData[0].first_name, profileData[0].last_name);
    
    // Probar inicio de sesión
    console.log('\nProbando inicio de sesión...');
    const loginResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.error('Error al iniciar sesión:', loginData.message || loginData.error || 'Error desconocido');
      return;
    }
    
    console.log('Inicio de sesión exitoso:');
    console.log('- Usuario:', loginData.user.email);
    console.log('- Sesión expira:', new Date(loginData.expires_at * 1000).toLocaleString());
    
    // Guardar las credenciales en un archivo para referencia futura
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const credentialsFile = `credentials_${timestamp}.txt`;
    
    fs.writeFileSync(credentialsFile, `
Credenciales de usuario:
- Email: ${userData.email}
- Password: ${userData.password}
- Rol: ${userData.role}
- ID: ${data.id}
- Creado: ${new Date().toLocaleString()}
    `);
    
    console.log(`\nCredenciales guardadas en ${credentialsFile}`);
  } catch (err) {
    console.error('Error inesperado:', err.message);
  }
}

createFreshUser();
```

### Uso

1. Modifica los valores de `userData` en el script según tus necesidades.
2. Ejecuta el script:
   ```bash
   cd app
   node scripts/create-fresh-user.js
   ```

### Resultado Esperado

El script:
1. Creará un nuevo usuario en Supabase
2. Creará un perfil para el usuario
3. Probará el inicio de sesión con el nuevo usuario
4. Guardará las credenciales en un archivo de texto para referencia futura

## 4. Probar el Inicio de Sesión

El script `login-test.js` te permite probar el inicio de sesión con un usuario existente.

### Código del Script

```javascript
// login-test.js
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Obtener las variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Faltan variables de entorno necesarias');
  process.exit(1);
}

// Crear cliente de Supabase con la clave anónima
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Datos de inicio de sesión - MODIFICA ESTOS VALORES SEGÚN TUS NECESIDADES
const loginData = {
  email: 'admin2@agendalo.com',
  password: 'Admin123!'
};

async function testLogin() {
  try {
    console.log(`Intentando iniciar sesión con: ${loginData.email}`);
    
    // Intentar iniciar sesión
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginData.email,
      password: loginData.password
    });
    
    if (error) {
      console.error('Error al iniciar sesión:', error.message);
      return;
    }
    
    console.log('Inicio de sesión exitoso:');
    console.log('- Usuario:', data.user.email);
    console.log('- ID:', data.user.id);
    console.log('- Sesión expira:', new Date(data.session.expires_at * 1000).toLocaleString());
    
    // Obtener el perfil del usuario
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (profileError) {
      console.error('Error al obtener el perfil:', profileError.message);
    } else {
      console.log('\nPerfil del usuario:');
      console.log('- Rol:', profileData.role);
      console.log('- Nombre:', profileData.first_name, profileData.last_name);
      console.log('- Email:', profileData.email);
      console.log('- Organización:', profileData.organization_id || 'Ninguna');
    }
  } catch (err) {
    console.error('Error inesperado:', err.message);
  }
}

testLogin();
```

### Uso

1. Modifica los valores de `loginData` en el script según tus necesidades.
2. Ejecuta el script:
   ```bash
   cd app
   node scripts/login-test.js
   ```

### Resultado Esperado

El script:
1. Intentará iniciar sesión con las credenciales proporcionadas
2. Mostrará información sobre el usuario y la sesión si el inicio de sesión es exitoso
3. Mostrará información sobre el perfil del usuario si está disponible

## 5. Actualizar la Contraseña de un Usuario

El script `update-user-password.js` te permite actualizar la contraseña de un usuario existente.

### Código del Script

```javascript
// update-user-password.js
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

// Obtener las variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Error: Faltan variables de entorno necesarias');
  process.exit(1);
}

// Datos del usuario a actualizar - MODIFICA ESTOS VALORES SEGÚN TUS NECESIDADES
const userId = 'f59ffea9-1c92-496b-800e-9d62e3dc6d7f'; // ID del usuario
const email = 'admin2@agendalo.com'; // Email del usuario
const newPassword = 'NuevaContraseña123!'; // Nueva contraseña

async function updateUserPassword() {
  try {
    console.log(`Actualizando contraseña para usuario: ${email} (${userId})`);
    
    // Actualizar usuario utilizando la API REST de Supabase
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        password: newPassword,
        email_confirm: true
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error al actualizar usuario:', data.message || data.error || 'Error desconocido');
      return;
    }
    
    console.log('Usuario actualizado exitosamente:');
    console.log('- ID:', data.id);
    console.log('- Email:', data.email);
    console.log('- Email confirmado:', data.email_confirmed_at ? 'Sí' : 'No');
    
    // Probar inicio de sesión con la nueva contraseña
    console.log('\nProbando inicio de sesión con la nueva contraseña...');
    const loginResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({
        email,
        password: newPassword
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.error('Error al iniciar sesión:', loginData.message || loginData.error || 'Error desconocido');
      return;
    }
    
    console.log('Inicio de sesión exitoso:');
    console.log('- Usuario:', loginData.user.email);
    console.log('- Sesión expira:', new Date(loginData.expires_at * 1000).toLocaleString());
  } catch (err) {
    console.error('Error inesperado:', err.message);
  }
}

updateUserPassword();
```

### Uso

1. Modifica los valores de `userId`, `email` y `newPassword` en el script según tus necesidades.
2. Ejecuta el script:
   ```bash
   cd app
   node scripts/update-user-password.js
   ```

### Resultado Esperado

El script:
1. Actualizará la contraseña del usuario especificado
2. Probará el inicio de sesión con la nueva contraseña
3. Mostrará información sobre el usuario y la sesión si el inicio de sesión es exitoso

## Notas Importantes

1. **Seguridad**: Nunca expongas la clave de servicio (`SUPABASE_SERVICE_ROLE_KEY`) en el cliente. Esta clave debe utilizarse únicamente en el servidor.

2. **Confirmación de Email**: Los usuarios creados con la API de administración de Supabase pueden tener el correo electrónico confirmado automáticamente estableciendo `email_confirm: true`. Esto es útil para crear usuarios administrativos sin necesidad de que confirmen su correo electrónico.

3. **Perfiles**: Cada usuario debe tener un perfil correspondiente en la tabla `profiles` con el mismo ID. El perfil contiene información adicional sobre el usuario, como su rol, nombre, etc.

4. **Roles**: Los roles disponibles en la plataforma Agendalo son:
   - `superadmin`: Administrador global de la plataforma
   - `admin`: Administrador de una organización
   - `doctor`: Médico que atiende pacientes
   - `staff`: Personal administrativo de una organización
   - `patient`: Paciente que puede reservar citas

5. **Errores Comunes**:
   - `duplicate key value violates unique constraint`: El usuario ya existe en la base de datos
   - `Invalid login credentials`: Las credenciales de inicio de sesión son incorrectas
   - `User not found`: El usuario no existe en la base de datos

## Solución de Problemas

Si encuentras problemas al ejecutar los scripts, puedes seguir estos pasos:

1. **Verifica las Variables de Entorno**: Asegúrate de que las variables de entorno en `.env.local` están configuradas correctamente.

2. **Verifica la Conexión a Supabase**: Ejecuta el script `test-connection.js` para verificar que puedes conectarte a Supabase.

3. **Verifica los Usuarios Existentes**: Ejecuta el script `list-users.js` para verificar qué usuarios existen en la base de datos.

4. **Crea un Nuevo Usuario**: Si todo lo demás falla, crea un nuevo usuario utilizando el script `create-fresh-user.js`.

5. **Consulta la Documentación de Supabase**: La [documentación oficial de Supabase](https://supabase.com/docs) contiene información detallada sobre la API de autenticación y administración de usuarios.

## Referencias

- [Documentación de Supabase Auth](https://supabase.com/docs/reference/javascript/auth-api)
- [Documentación de la API de administración de Supabase Auth](https://supabase.com/docs/reference/javascript/admin-api)
- [Documentación de Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
