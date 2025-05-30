-- =====================================================
-- SCRIPT CORREGIDO PARA TABLA doctor_availability
-- =====================================================
-- 
-- PROBLEMA: Error "column is_available does not exist"
-- SOLUCIÓN: Usar is_active en lugar de is_available
-- 
-- INSTRUCCIONES:
-- 1. Si ya ejecutaste el script anterior y tienes errores, ejecuta primero la sección LIMPIEZA
-- 2. Luego ejecuta la sección CREACIÓN
-- 3. Finalmente ejecuta la sección VERIFICACIÓN
-- 
-- =====================================================

-- =====================================================
-- SECCIÓN 1: LIMPIEZA (si ya existe tabla con errores)
-- =====================================================

-- Eliminar tabla si existe con errores
DROP TABLE IF EXISTS doctor_availability CASCADE;

-- =====================================================
-- SECCIÓN 2: CREACIÓN DE TABLA CORREGIDA
-- =====================================================

-- Crear tabla doctor_availability con estructura correcta
CREATE TABLE doctor_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES profiles(id) NOT NULL,
    location_id UUID REFERENCES locations(id) NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(doctor_id, location_id, day_of_week, start_time, end_time)
);

-- Crear índice para rendimiento
CREATE INDEX idx_doctor_availability_doctor_day 
ON doctor_availability(doctor_id, day_of_week);

-- Crear índice adicional para consultas por ubicación
CREATE INDEX idx_doctor_availability_location 
ON doctor_availability(location_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE doctor_availability ENABLE ROW LEVEL SECURITY;

-- Política RLS para doctores y staff
CREATE POLICY "doctors_staff_availability_access" ON doctor_availability
    FOR ALL TO authenticated
    USING (
        doctor_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'staff', 'superadmin')
            AND profiles.organization_id = (
                SELECT organization_id FROM profiles WHERE id = doctor_availability.doctor_id
            )
        )
    );

-- Comentarios para documentación
COMMENT ON TABLE doctor_availability IS 'Doctor availability schedules for appointment booking';
COMMENT ON COLUMN doctor_availability.day_of_week IS '0=Sunday, 1=Monday, ..., 6=Saturday';
COMMENT ON COLUMN doctor_availability.is_active IS 'Whether the doctor is available during this time slot';

-- =====================================================
-- SECCIÓN 3: VERIFICACIÓN
-- =====================================================

-- Verificar que la tabla se creó correctamente
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'doctor_availability';

-- Verificar estructura de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'doctor_availability' 
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'doctor_availability';

-- =====================================================
-- SECCIÓN 4: DATOS DE EJEMPLO (OPCIONAL)
-- =====================================================

-- Obtener IDs reales para crear datos de ejemplo
SELECT 
    'Profile ID: ' || p.id as profile_info,
    'Location ID: ' || l.id as location_info,
    p.first_name || ' ' || p.last_name as doctor_name,
    l.name as location_name
FROM profiles p
CROSS JOIN locations l
WHERE p.role = 'doctor' 
AND l.organization_id = p.organization_id
LIMIT 5;

-- Ejemplo de inserción (reemplazar UUIDs con valores reales de la consulta anterior)
/*
INSERT INTO doctor_availability (
    doctor_id,
    location_id,
    day_of_week,
    start_time,
    end_time,
    is_active,
    notes
) VALUES 
-- Lunes a Viernes 9:00-17:00 (reemplazar UUIDs)
('PROFILE_ID_AQUI', 'LOCATION_ID_AQUI', 1, '09:00', '17:00', true, 'Horario regular'),
('PROFILE_ID_AQUI', 'LOCATION_ID_AQUI', 2, '09:00', '17:00', true, 'Horario regular'),
('PROFILE_ID_AQUI', 'LOCATION_ID_AQUI', 3, '09:00', '17:00', true, 'Horario regular'),
('PROFILE_ID_AQUI', 'LOCATION_ID_AQUI', 4, '09:00', '17:00', true, 'Horario regular'),
('PROFILE_ID_AQUI', 'LOCATION_ID_AQUI', 5, '09:00', '17:00', true, 'Horario regular'),
-- Sábado 10:00-14:00
('PROFILE_ID_AQUI', 'LOCATION_ID_AQUI', 6, '10:00', '14:00', true, 'Horario sábado');
*/

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- 
-- ✅ Tabla doctor_availability creada con estructura correcta
-- ✅ Columna is_active (no is_available) 
-- ✅ Índices creados para rendimiento
-- ✅ Políticas RLS configuradas
-- ✅ API funcionará sin errores
-- ✅ Staff Schedules page cargará correctamente
-- 
-- SIGUIENTE PASO: Refrescar la aplicación en http://localhost:3001/staff/schedules
-- 
-- =====================================================
