-- =====================================================
-- SCRIPT PARA CREAR TABLA doctor_availability
-- =====================================================
-- 
-- INSTRUCCIONES:
-- 1. Abrir Supabase Dashboard
-- 2. Ir a SQL Editor
-- 3. Copiar y pegar este script completo
-- 4. Ejecutar (Run)
-- 5. Verificar que se ejecutó sin errores
-- 
-- =====================================================

-- Crear tabla doctor_availability
CREATE TABLE IF NOT EXISTS doctor_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES profiles(id) NOT NULL,
    location_id UUID REFERENCES locations(id) NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(doctor_id, location_id, day_of_week, start_time, end_time)
);

-- Crear índice para rendimiento
CREATE INDEX IF NOT EXISTS idx_doctor_availability_doctor_day 
ON doctor_availability(doctor_id, day_of_week);

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
-- VERIFICACIÓN (ejecutar después del script anterior)
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
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'doctor_availability';

-- =====================================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- =====================================================
-- Ejecutar solo si quieres crear horarios de ejemplo
-- Reemplazar los UUIDs con IDs reales de tu base de datos

/*
-- Ejemplo de horarios para un doctor (reemplazar UUIDs)
INSERT INTO doctor_availability (
    doctor_id,
    location_id,
    day_of_week,
    start_time,
    end_time,
    is_active
) VALUES
-- Lunes a Viernes 9:00-17:00
('REEMPLAZAR_CON_PROFILE_ID_REAL', 'REEMPLAZAR_CON_LOCATION_ID_REAL', 1, '09:00', '17:00', true),
('REEMPLAZAR_CON_PROFILE_ID_REAL', 'REEMPLAZAR_CON_LOCATION_ID_REAL', 2, '09:00', '17:00', true),
('REEMPLAZAR_CON_PROFILE_ID_REAL', 'REEMPLAZAR_CON_LOCATION_ID_REAL', 3, '09:00', '17:00', true),
('REEMPLAZAR_CON_PROFILE_ID_REAL', 'REEMPLAZAR_CON_LOCATION_ID_REAL', 4, '09:00', '17:00', true),
('REEMPLAZAR_CON_PROFILE_ID_REAL', 'REEMPLAZAR_CON_LOCATION_ID_REAL', 5, '09:00', '17:00', true),
-- Sábado 10:00-14:00
('REEMPLAZAR_CON_PROFILE_ID_REAL', 'REEMPLAZAR_CON_LOCATION_ID_REAL', 6, '10:00', '14:00', true);
*/

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- 
-- Después de ejecutar este script:
-- ✅ Tabla doctor_availability creada
-- ✅ Índices creados para rendimiento
-- ✅ Políticas RLS configuradas
-- ✅ API de horarios funcionará correctamente
-- ✅ Staff Schedules page cargará sin errores
-- 
-- =====================================================
