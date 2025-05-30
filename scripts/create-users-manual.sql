-- Script SQL para crear usuarios de VisualCare manualmente
-- Ejecutar después de crear los usuarios en auth.users usando la API de administración

-- IDs de usuarios que deben crearse primero en auth.users:
-- Estos UUIDs deben usarse al crear los usuarios en auth.users

-- PASO 1: Crear usuarios en auth.users usando la API de administración
-- Usar el script create-visualcare-users.js o crear manualmente

-- PASO 2: Una vez creados los usuarios en auth.users, ejecutar estos INSERTs
-- Reemplazar los UUIDs con los IDs reales generados por auth.users

-- Administradores
INSERT INTO profiles (
  id,
  organization_id,
  first_name,
  last_name,
  email,
  phone,
  role,
  is_active
) VALUES 
-- Carlos Martínez - Admin Principal
-- Reemplazar 'UUID_CARLOS' con el ID real del usuario
(
  'UUID_CARLOS'::uuid,
  '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid,
  'Carlos',
  'Martínez',
  'carlos.martinez.new@visualcare.com',
  '+34600111222',
  'admin',
  true
),
-- Laura Gómez - Admin Secundaria
-- Reemplazar 'UUID_LAURA' con el ID real del usuario
(
  'UUID_LAURA'::uuid,
  '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid,
  'Laura',
  'Gómez',
  'laura.gomez.new@visualcare.com',
  '+34600111223',
  'admin',
  true
);

-- Doctores
INSERT INTO profiles (
  id,
  organization_id,
  first_name,
  last_name,
  email,
  phone,
  role,
  is_active
) VALUES 
-- Ana Rodríguez - Optometría Clínica
(
  'UUID_ANA'::uuid,
  '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid,
  'Ana',
  'Rodríguez',
  'ana.rodriguez.new@visualcare.com',
  '+34600111224',
  'doctor',
  true
),
-- Pedro Sánchez - Contactología
(
  'UUID_PEDRO'::uuid,
  '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid,
  'Pedro',
  'Sánchez',
  'pedro.sanchez.new@visualcare.com',
  '+34600111225',
  'doctor',
  true
),
-- Elena López - Optometría Pediátrica
(
  'UUID_ELENA'::uuid,
  '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid,
  'Elena',
  'López',
  'elena.lopez.new@visualcare.com',
  '+34600111226',
  'doctor',
  true
),
-- Miguel Fernández - Optometría General
(
  'UUID_MIGUEL'::uuid,
  '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid,
  'Miguel',
  'Fernández',
  'miguel.fernandez.new@visualcare.com',
  '+34600111227',
  'doctor',
  true
),
-- Sofía Torres - Baja Visión
(
  'UUID_SOFIA'::uuid,
  '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid,
  'Sofía',
  'Torres',
  'sofia.torres.new@visualcare.com',
  '+34600111228',
  'doctor',
  true
);

-- Staff
INSERT INTO profiles (
  id,
  organization_id,
  first_name,
  last_name,
  email,
  phone,
  role,
  is_active
) VALUES 
-- Carmen Ruiz - Recepcionista
(
  'UUID_CARMEN'::uuid,
  '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid,
  'Carmen',
  'Ruiz',
  'carmen.ruiz.new@visualcare.com',
  '+34600111229',
  'staff',
  true
),
-- Javier Moreno - Técnico
(
  'UUID_JAVIER'::uuid,
  '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid,
  'Javier',
  'Moreno',
  'javier.moreno.new@visualcare.com',
  '+34600111230',
  'staff',
  true
),
-- Lucía Navarro - Asistente
(
  'UUID_LUCIA'::uuid,
  '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid,
  'Lucía',
  'Navarro',
  'lucia.navarro.new@visualcare.com',
  '+34600111231',
  'staff',
  true
);

-- Pacientes
INSERT INTO profiles (
  id,
  organization_id,
  first_name,
  last_name,
  email,
  phone,
  role,
  is_active
) VALUES 
-- María García - Paciente 1
(
  'UUID_MARIA'::uuid,
  '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid,
  'María',
  'García',
  'maria.garcia.new@example.com',
  '+34600222111',
  'patient',
  true
),
-- Juan Pérez - Paciente 2
(
  'UUID_JUAN'::uuid,
  '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid,
  'Juan',
  'Pérez',
  'juan.perez.new@example.com',
  '+34600222112',
  'patient',
  true
),
-- Isabel Díaz - Paciente 3
(
  'UUID_ISABEL'::uuid,
  '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid,
  'Isabel',
  'Díaz',
  'isabel.diaz.new@example.com',
  '+34600222113',
  'patient',
  true
);

-- Verificar usuarios creados
SELECT 
  p.first_name,
  p.last_name,
  p.email,
  p.role,
  o.name as organization
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.organization_id = '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid
ORDER BY 
  CASE p.role 
    WHEN 'admin' THEN 1
    WHEN 'doctor' THEN 2
    WHEN 'staff' THEN 3
    WHEN 'patient' THEN 4
  END,
  p.first_name;
