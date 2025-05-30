-- Script para configurar servicios y horarios después del registro de usuarios
-- Ejecutar DESPUÉS de que los doctores se hayan registrado manualmente

-- ID de la organización Óptica VisualCare
-- 927cecbe-d9e5-43a4-b9d0-25f942ededc4

-- 1. Crear servicios de la óptica
INSERT INTO services (
  organization_id,
  name,
  description,
  duration_minutes,
  price,
  category,
  is_active
) VALUES 
(
  '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid,
  'Examen Visual Completo',
  'Evaluación completa de la salud visual y ocular, incluyendo refracción, tonometría, biomicroscopía y fondo de ojo.',
  45,
  60.00,
  'Exámenes',
  true
),
(
  '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid,
  'Control Visual Rápido',
  'Revisión básica de la graduación y ajuste de prescripción.',
  20,
  30.00,
  'Exámenes',
  true
),
(
  '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid,
  'Examen Visual Pediátrico',
  'Evaluación especializada para niños, con técnicas adaptadas a diferentes edades.',
  30,
  45.00,
  'Exámenes',
  true
),
(
  '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid,
  'Adaptación de Lentes de Contacto Blandas',
  'Evaluación, medición y prueba de lentes de contacto blandas.',
  40,
  50.00,
  'Lentes de Contacto',
  true
),
(
  '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid,
  'Adaptación de Lentes de Contacto Rígidas',
  'Evaluación especializada y adaptación de lentes de contacto rígidas permeables al gas.',
  60,
  80.00,
  'Lentes de Contacto',
  true
),
(
  '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid,
  'Topografía Corneal',
  'Mapeo detallado de la superficie corneal para diagnóstico de irregularidades.',
  30,
  70.00,
  'Diagnóstico Avanzado',
  true
),
(
  '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid,
  'Evaluación de Baja Visión',
  'Evaluación especializada para pacientes con baja visión y recomendación de ayudas ópticas.',
  60,
  90.00,
  'Especializada',
  true
),
(
  '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid,
  'Terapia Visual',
  'Programa de ejercicios visuales para mejorar habilidades visuales específicas.',
  45,
  55.00,
  'Terapia',
  true
);

-- 2. Crear horarios estándar para doctores (se aplicarán cuando se registren)
-- Estos son templates que se pueden usar

-- Horario estándar de lunes a viernes 9:00-17:00
-- Sábados 10:00-14:00

-- 3. Crear algunas citas de ejemplo para demostración
-- Nota: Estas se crearán después de que los usuarios se registren

-- Verificar servicios creados
SELECT 
  name,
  description,
  duration_minutes,
  price,
  category
FROM services 
WHERE organization_id = '927cecbe-d9e5-43a4-b9d0-25f942ededc4'::uuid
ORDER BY category, name;
