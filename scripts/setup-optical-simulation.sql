-- Script para crear la organización Óptica VisualCare basada en OPTICAL_SIMULATION.md
-- Para pruebas manuales del sistema AgentSalud

-- 1. Crear la organización principal
INSERT INTO organizations (
  id,
  name,
  slug,
  email,
  phone,
  website,
  address,
  city,
  state,
  postal_code,
  country,
  description,
  is_active
) VALUES (
  'org_visualcare_001'::uuid,
  'Óptica VisualCare',
  'visualcare',
  'info@visualcare.com',
  '+1234567890',
  'https://www.visualcare.com',
  'Av. Principal 123',
  'Ciudad Central',
  'Estado Central',
  '12345',
  'España',
  'Red de ópticas especializada en exámenes visuales, venta de lentes graduados, lentes de contacto y gafas de sol. Ofrecemos atención personalizada y tecnología de vanguardia para el cuidado de la salud visual.',
  true
);

-- 2. Crear usuarios en auth.users (simulando registro)
-- Nota: En producción estos se crearían a través del registro normal de Supabase Auth

-- Administradores
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES 
(
  'user_carlos_001'::uuid,
  'carlos.martinez.new@visualcare.com',
  crypt('VisualCare2025!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Carlos Martínez"}'
),
(
  'user_laura_001'::uuid,
  'laura.gomez.new@visualcare.com',
  crypt('VisualCare2025!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Laura Gómez"}'
),
-- Doctores/Optometristas
(
  'user_ana_001'::uuid,
  'ana.rodriguez.new@visualcare.com',
  crypt('VisualCare2025!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Ana Rodríguez"}'
),
(
  'user_pedro_001'::uuid,
  'pedro.sanchez.new@visualcare.com',
  crypt('VisualCare2025!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Pedro Sánchez"}'
),
(
  'user_elena_001'::uuid,
  'elena.lopez.new@visualcare.com',
  crypt('VisualCare2025!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Elena López"}'
),
(
  'user_miguel_001'::uuid,
  'miguel.fernandez.new@visualcare.com',
  crypt('VisualCare2025!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Miguel Fernández"}'
),
(
  'user_sofia_001'::uuid,
  'sofia.torres.new@visualcare.com',
  crypt('VisualCare2025!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Sofía Torres"}'
),
-- Personal (Staff)
(
  'user_carmen_001'::uuid,
  'carmen.ruiz.new@visualcare.com',
  crypt('VisualCare2025!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Carmen Ruiz"}'
),
(
  'user_javier_001'::uuid,
  'javier.moreno.new@visualcare.com',
  crypt('VisualCare2025!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Javier Moreno"}'
),
(
  'user_lucia_001'::uuid,
  'lucia.navarro.new@visualcare.com',
  crypt('VisualCare2025!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Lucía Navarro"}'
),
-- Pacientes
(
  'user_maria_001'::uuid,
  'maria.garcia.new@example.com',
  crypt('VisualCare2025!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "María García"}'
),
(
  'user_juan_001'::uuid,
  'juan.perez.new@example.com',
  crypt('VisualCare2025!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Juan Pérez"}'
),
(
  'user_isabel_001'::uuid,
  'isabel.diaz.new@example.com',
  crypt('VisualCare2025!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Isabel Díaz"}'
);

-- 3. Crear perfiles de usuarios
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
-- Administradores
(
  'user_carlos_001'::uuid,
  'org_visualcare_001'::uuid,
  'Carlos',
  'Martínez',
  'carlos.martinez.new@visualcare.com',
  '+34600111222',
  'admin',
  true
),
(
  'user_laura_001'::uuid,
  'org_visualcare_001'::uuid,
  'Laura',
  'Gómez',
  'laura.gomez.new@visualcare.com',
  '+34600111223',
  'admin',
  true
),
-- Doctores
(
  'user_ana_001'::uuid,
  'org_visualcare_001'::uuid,
  'Ana',
  'Rodríguez',
  'ana.rodriguez.new@visualcare.com',
  '+34600111224',
  'doctor',
  true
),
(
  'user_pedro_001'::uuid,
  'org_visualcare_001'::uuid,
  'Pedro',
  'Sánchez',
  'pedro.sanchez.new@visualcare.com',
  '+34600111225',
  'doctor',
  true
),
(
  'user_elena_001'::uuid,
  'org_visualcare_001'::uuid,
  'Elena',
  'López',
  'elena.lopez.new@visualcare.com',
  '+34600111226',
  'doctor',
  true
),
(
  'user_miguel_001'::uuid,
  'org_visualcare_001'::uuid,
  'Miguel',
  'Fernández',
  'miguel.fernandez.new@visualcare.com',
  '+34600111227',
  'doctor',
  true
),
(
  'user_sofia_001'::uuid,
  'org_visualcare_001'::uuid,
  'Sofía',
  'Torres',
  'sofia.torres.new@visualcare.com',
  '+34600111228',
  'doctor',
  true
),
-- Staff
(
  'user_carmen_001'::uuid,
  'org_visualcare_001'::uuid,
  'Carmen',
  'Ruiz',
  'carmen.ruiz.new@visualcare.com',
  '+34600111229',
  'staff',
  true
),
(
  'user_javier_001'::uuid,
  'org_visualcare_001'::uuid,
  'Javier',
  'Moreno',
  'javier.moreno.new@visualcare.com',
  '+34600111230',
  'staff',
  true
),
(
  'user_lucia_001'::uuid,
  'org_visualcare_001'::uuid,
  'Lucía',
  'Navarro',
  'lucia.navarro.new@visualcare.com',
  '+34600111231',
  'staff',
  true
),
-- Pacientes
(
  'user_maria_001'::uuid,
  'org_visualcare_001'::uuid,
  'María',
  'García',
  'maria.garcia.new@example.com',
  '+34600222111',
  'patient',
  true
),
(
  'user_juan_001'::uuid,
  'org_visualcare_001'::uuid,
  'Juan',
  'Pérez',
  'juan.perez.new@example.com',
  '+34600222112',
  'patient',
  true
),
(
  'user_isabel_001'::uuid,
  'org_visualcare_001'::uuid,
  'Isabel',
  'Díaz',
  'isabel.diaz.new@example.com',
  '+34600222113',
  'patient',
  true
);

-- 4. Crear registros de doctores con especialidades
INSERT INTO doctors (
  id,
  profile_id,
  organization_id,
  license_number,
  specialization,
  years_of_experience,
  education,
  bio,
  consultation_fee,
  is_available
) VALUES 
(
  'doc_ana_001'::uuid,
  'user_ana_001'::uuid,
  'org_visualcare_001'::uuid,
  'OPT-001-ES',
  'Optometría Clínica',
  15,
  'Licenciatura en Óptica y Optometría - Universidad Complutense Madrid',
  'Optometrista senior especializada en exámenes visuales completos y topografía corneal.',
  60.00,
  true
),
(
  'doc_pedro_001'::uuid,
  'user_pedro_001'::uuid,
  'org_visualcare_001'::uuid,
  'OPT-002-ES',
  'Contactología Avanzada',
  10,
  'Licenciatura en Óptica y Optometría - Universidad de Valencia',
  'Especialista en adaptación de lentes de contacto blandas y rígidas.',
  50.00,
  true
),
(
  'doc_elena_001'::uuid,
  'user_elena_001'::uuid,
  'org_visualcare_001'::uuid,
  'OPT-003-ES',
  'Optometría Pediátrica',
  8,
  'Licenciatura en Óptica y Optometría + Máster en Optometría Pediátrica',
  'Especialista en atención visual infantil y terapia visual.',
  45.00,
  true
),
(
  'doc_miguel_001'::uuid,
  'user_miguel_001'::uuid,
  'org_visualcare_001'::uuid,
  'OPT-004-ES',
  'Optometría General',
  5,
  'Licenciatura en Óptica y Optometría - Universidad Politécnica de Cataluña',
  'Optometrista general especializado en exámenes rutinarios y atención rápida.',
  40.00,
  true
),
(
  'doc_sofia_001'::uuid,
  'user_sofia_001'::uuid,
  'org_visualcare_001'::uuid,
  'OPT-005-ES',
  'Baja Visión',
  12,
  'Licenciatura en Óptica y Optometría + Especialización en Baja Visión',
  'Especialista en evaluación y rehabilitación de pacientes con baja visión.',
  90.00,
  true
);

-- 5. Crear registros de pacientes
INSERT INTO patients (
  id,
  profile_id,
  organization_id,
  emergency_contact_name,
  emergency_contact_phone,
  medical_history,
  allergies
) VALUES 
(
  'pat_maria_001'::uuid,
  'user_maria_001'::uuid,
  'org_visualcare_001'::uuid,
  'José García (Esposo)',
  '+34600333111',
  'Miopía progresiva desde los 20 años',
  'Ninguna conocida'
),
(
  'pat_juan_001'::uuid,
  'user_juan_001'::uuid,
  'org_visualcare_001'::uuid,
  'Carmen Pérez (Esposa)',
  '+34600333112',
  'Hipertensión controlada, revisiones anuales',
  'Alergia al polen'
),
(
  'pat_isabel_001'::uuid,
  'user_isabel_001'::uuid,
  'org_visualcare_001'::uuid,
  'Miguel Díaz (Hermano)',
  '+34600333113',
  'Astigmatismo leve',
  'Ninguna conocida'
);

-- Mensaje de confirmación
SELECT 'Organización Óptica VisualCare creada exitosamente con todos los usuarios y roles' as resultado;
