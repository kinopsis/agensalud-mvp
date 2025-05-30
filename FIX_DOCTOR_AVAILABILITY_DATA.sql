-- =====================================================
-- CORRECCIÓN CRÍTICA: Datos de Disponibilidad de Doctores
-- AgentSalud MVP - Flujo de Reserva Manual
-- =====================================================

-- FASE 1: LIMPIEZA DE DATOS HUÉRFANOS
-- ===================================

-- 1.1 Eliminar disponibilidad de doctores inexistentes
DELETE FROM doctor_availability 
WHERE doctor_id NOT IN (SELECT id FROM doctors);

-- 1.2 Eliminar servicios de doctores inexistentes  
DELETE FROM doctor_services
WHERE doctor_id NOT IN (SELECT id FROM doctors);

-- Verificar limpieza
SELECT 'Registros huérfanos eliminados' as status;
SELECT COUNT(*) as remaining_availability FROM doctor_availability;
SELECT COUNT(*) as remaining_services FROM doctor_services;

-- FASE 2: CREAR DATOS VÁLIDOS PARA DOCTORES REALES
-- ===============================================

-- 2.1 Obtener IDs de doctores y sedes actuales
-- Doctores:
-- Ana Rodríguez:    5bfbf7b8-e021-4657-ae42-a3fa185d4ab6
-- Elena López:      e73dcd71-af31-44b8-b517-5a1c8b4e49be  
-- Miguel Fernández: 17307e25-2cbb-4dab-ad56-d2971e698086
-- Pedro Sánchez:    79a2a6c3-c4b6-4e55-bff1-725f52a92404
-- Sofía Torres:     1c3a0b86-3929-49b6-aa0a-ddc013d7c5cd

-- Sedes:
-- VisualCare Central: 3f32d1b7-2ff4-4bfd-95f4-7964db56d7e9
-- VisualCare Norte:   710a59e5-f5cd-4fb5-a192-50737615e573
-- VisualCare Shopping: 3d714a7b-134a-4647-8c10-c1ed7eac5312

-- Servicios:
-- Examen Visual Completo: 0c98efc9-b65c-4913-aa23-9952493d7d9d
-- Control Visual Rápido:  433c13e1-4b5f-48b2-aeed-b3a3173ca3fd

-- 2.2 Crear disponibilidad para Ana Rodríguez (VisualCare Central)
INSERT INTO doctor_availability (doctor_id, location_id, day_of_week, start_time, end_time, is_active)
VALUES 
-- Lunes, Miércoles, Viernes - Mañana
('5bfbf7b8-e021-4657-ae42-a3fa185d4ab6', '3f32d1b7-2ff4-4bfd-95f4-7964db56d7e9', 1, '08:00', '12:00', true),
('5bfbf7b8-e021-4657-ae42-a3fa185d4ab6', '3f32d1b7-2ff4-4bfd-95f4-7964db56d7e9', 3, '08:00', '12:00', true),
('5bfbf7b8-e021-4657-ae42-a3fa185d4ab6', '3f32d1b7-2ff4-4bfd-95f4-7964db56d7e9', 5, '08:00', '12:00', true),
-- Martes, Jueves - Tarde
('5bfbf7b8-e021-4657-ae42-a3fa185d4ab6', '3f32d1b7-2ff4-4bfd-95f4-7964db56d7e9', 2, '14:00', '18:00', true),
('5bfbf7b8-e021-4657-ae42-a3fa185d4ab6', '3f32d1b7-2ff4-4bfd-95f4-7964db56d7e9', 4, '14:00', '18:00', true);

-- 2.3 Crear disponibilidad para Elena López (VisualCare Norte)
INSERT INTO doctor_availability (doctor_id, location_id, day_of_week, start_time, end_time, is_active)
VALUES 
-- Lunes a Viernes - Mañana
('e73dcd71-af31-44b8-b517-5a1c8b4e49be', '710a59e5-f5cd-4fb5-a192-50737615e573', 1, '09:00', '13:00', true),
('e73dcd71-af31-44b8-b517-5a1c8b4e49be', '710a59e5-f5cd-4fb5-a192-50737615e573', 2, '09:00', '13:00', true),
('e73dcd71-af31-44b8-b517-5a1c8b4e49be', '710a59e5-f5cd-4fb5-a192-50737615e573', 3, '09:00', '13:00', true),
('e73dcd71-af31-44b8-b517-5a1c8b4e49be', '710a59e5-f5cd-4fb5-a192-50737615e573', 4, '09:00', '13:00', true),
('e73dcd71-af31-44b8-b517-5a1c8b4e49be', '710a59e5-f5cd-4fb5-a192-50737615e573', 5, '09:00', '13:00', true);

-- 2.4 Crear disponibilidad para Miguel Fernández (VisualCare Central)
INSERT INTO doctor_availability (doctor_id, location_id, day_of_week, start_time, end_time, is_active)
VALUES 
-- Lunes, Miércoles, Viernes - Tarde
('17307e25-2cbb-4dab-ad56-d2971e698086', '3f32d1b7-2ff4-4bfd-95f4-7964db56d7e9', 1, '15:00', '19:00', true),
('17307e25-2cbb-4dab-ad56-d2971e698086', '3f32d1b7-2ff4-4bfd-95f4-7964db56d7e9', 3, '15:00', '19:00', true),
('17307e25-2cbb-4dab-ad56-d2971e698086', '3f32d1b7-2ff4-4bfd-95f4-7964db56d7e9', 5, '15:00', '19:00', true);

-- 2.5 Crear disponibilidad para Pedro Sánchez (VisualCare Shopping)
INSERT INTO doctor_availability (doctor_id, location_id, day_of_week, start_time, end_time, is_active)
VALUES 
-- Martes, Jueves, Sábado
('79a2a6c3-c4b6-4e55-bff1-725f52a92404', '3d714a7b-134a-4647-8c10-c1ed7eac5312', 2, '10:00', '14:00', true),
('79a2a6c3-c4b6-4e55-bff1-725f52a92404', '3d714a7b-134a-4647-8c10-c1ed7eac5312', 4, '10:00', '14:00', true),
('79a2a6c3-c4b6-4e55-bff1-725f52a92404', '3d714a7b-134a-4647-8c10-c1ed7eac5312', 6, '10:00', '14:00', true);

-- 2.6 Crear disponibilidad para Sofía Torres (VisualCare Norte)
INSERT INTO doctor_availability (doctor_id, location_id, day_of_week, start_time, end_time, is_active)
VALUES 
-- Lunes, Miércoles - Especialista en Baja Visión
('1c3a0b86-3929-49b6-aa0a-ddc013d7c5cd', '710a59e5-f5cd-4fb5-a192-50737615e573', 1, '14:00', '17:00', true),
('1c3a0b86-3929-49b6-aa0a-ddc013d7c5cd', '710a59e5-f5cd-4fb5-a192-50737615e573', 3, '14:00', '17:00', true);

-- FASE 3: ASOCIAR SERVICIOS A DOCTORES
-- ===================================

-- 3.1 Ana Rodríguez - Optometría Clínica (Todos los servicios)
INSERT INTO doctor_services (doctor_id, service_id)
VALUES 
('5bfbf7b8-e021-4657-ae42-a3fa185d4ab6', '0c98efc9-b65c-4913-aa23-9952493d7d9d'), -- Examen Visual Completo
('5bfbf7b8-e021-4657-ae42-a3fa185d4ab6', '433c13e1-4b5f-48b2-aeed-b3a3173ca3fd'); -- Control Visual Rápido

-- 3.2 Elena López - Optometría Pediátrica (Servicios especializados)
INSERT INTO doctor_services (doctor_id, service_id)
VALUES 
('e73dcd71-af31-44b8-b517-5a1c8b4e49be', '0c98efc9-b65c-4913-aa23-9952493d7d9d'), -- Examen Visual Completo
('e73dcd71-af31-44b8-b517-5a1c8b4e49be', '433c13e1-4b5f-48b2-aeed-b3a3173ca3fd'); -- Control Visual Rápido

-- 3.3 Miguel Fernández - Optometría General (Servicios básicos)
INSERT INTO doctor_services (doctor_id, service_id)
VALUES 
('17307e25-2cbb-4dab-ad56-d2971e698086', '0c98efc9-b65c-4913-aa23-9952493d7d9d'), -- Examen Visual Completo
('17307e25-2cbb-4dab-ad56-d2971e698086', '433c13e1-4b5f-48b2-aeed-b3a3173ca3fd'); -- Control Visual Rápido

-- 3.4 Pedro Sánchez - Contactología Avanzada (Servicios especializados)
INSERT INTO doctor_services (doctor_id, service_id)
VALUES 
('79a2a6c3-c4b6-4e55-bff1-725f52a92404', '0c98efc9-b65c-4913-aa23-9952493d7d9d'), -- Examen Visual Completo
('79a2a6c3-c4b6-4e55-bff1-725f52a92404', '433c13e1-4b5f-48b2-aeed-b3a3173ca3fd'); -- Control Visual Rápido

-- 3.5 Sofía Torres - Baja Visión (Servicios especializados)
INSERT INTO doctor_services (doctor_id, service_id)
VALUES 
('1c3a0b86-3929-49b6-aa0a-ddc013d7c5cd', '0c98efc9-b65c-4913-aa23-9952493d7d9d'); -- Solo Examen Visual Completo

-- FASE 4: VERIFICACIÓN DE DATOS
-- ============================

-- 4.1 Verificar disponibilidad creada
SELECT 
    d.id,
    p.first_name,
    p.last_name,
    l.name as location,
    da.day_of_week,
    da.start_time,
    da.end_time
FROM doctor_availability da
JOIN doctors d ON da.doctor_id = d.id
JOIN profiles p ON d.profile_id = p.id
JOIN locations l ON da.location_id = l.id
ORDER BY p.first_name, da.day_of_week, da.start_time;

-- 4.2 Verificar servicios asociados
SELECT 
    p.first_name,
    p.last_name,
    s.name as service_name,
    COUNT(da.id) as availability_slots
FROM doctor_services ds
JOIN doctors d ON ds.doctor_id = d.id
JOIN profiles p ON d.profile_id = p.id
JOIN services s ON ds.service_id = s.id
LEFT JOIN doctor_availability da ON da.doctor_id = d.id
GROUP BY p.first_name, p.last_name, s.name
ORDER BY p.first_name, s.name;

-- 4.3 Verificar que Ana Rodríguez tiene disponibilidad
SELECT 
    'Ana Rodríguez availability check' as test,
    COUNT(*) as availability_count
FROM doctor_availability da
JOIN doctors d ON da.doctor_id = d.id
JOIN profiles p ON d.profile_id = p.id
WHERE p.first_name = 'Ana' AND p.last_name = 'Rodríguez';

SELECT 'Corrección de datos completada exitosamente' as status;
