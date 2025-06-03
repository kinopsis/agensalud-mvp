-- Migration: 007_mvp_appointment_states
-- Description: Extensión de estados de citas para MVP con audit trail
-- Date: 2025-01-28
-- Purpose: Implementar estados avanzados de citas según estándares médicos internacionales

-- =====================================================
-- SECCIÓN 1: EXTENSIÓN DE ESTADOS DE CITAS
-- =====================================================

-- Agregar nuevos estados MVP al enum existente
-- Estados críticos para compliance médico básico
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'pendiente_pago';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'reagendada';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'cancelada_paciente';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'cancelada_clinica';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'en_curso';

-- Comentarios para documentación de estados
COMMENT ON TYPE appointment_status IS 'Estados de citas médicas según estándares MVP:
- pending: Cita registrada, pendiente de confirmación
- pendiente_pago: Requiere pago de depósito para confirmar
- confirmed: Cita confirmada y programada
- reagendada: Cita reprogramada a nueva fecha/hora
- cancelada_paciente: Cancelada por el paciente
- cancelada_clinica: Cancelada por la clínica
- en_curso: Paciente siendo atendido
- completed: Cita realizada exitosamente
- no_show: Paciente no se presentó';

-- =====================================================
-- SECCIÓN 2: TABLA DE AUDIT TRAIL
-- =====================================================

-- Crear tabla para historial de cambios de estado (audit trail)
CREATE TABLE IF NOT EXISTS appointment_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
    previous_status appointment_status,
    new_status appointment_status NOT NULL,
    changed_by UUID REFERENCES profiles(id) NOT NULL,
    reason TEXT,
    user_role TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentarios para documentación
COMMENT ON TABLE appointment_status_history IS 'Audit trail para cambios de estado de citas médicas';
COMMENT ON COLUMN appointment_status_history.previous_status IS 'Estado anterior de la cita';
COMMENT ON COLUMN appointment_status_history.new_status IS 'Nuevo estado de la cita';
COMMENT ON COLUMN appointment_status_history.changed_by IS 'Usuario que realizó el cambio';
COMMENT ON COLUMN appointment_status_history.reason IS 'Razón del cambio de estado';
COMMENT ON COLUMN appointment_status_history.user_role IS 'Rol del usuario que realizó el cambio';
COMMENT ON COLUMN appointment_status_history.ip_address IS 'Dirección IP del usuario';
COMMENT ON COLUMN appointment_status_history.metadata IS 'Información adicional del cambio';

-- =====================================================
-- SECCIÓN 3: ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para consultas frecuentes en audit trail
CREATE INDEX IF NOT EXISTS idx_appointment_status_history_appointment 
ON appointment_status_history(appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointment_status_history_date 
ON appointment_status_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_appointment_status_history_user 
ON appointment_status_history(changed_by);

CREATE INDEX IF NOT EXISTS idx_appointment_status_history_status 
ON appointment_status_history(new_status);

-- Índice compuesto para consultas de audit por appointment y fecha
CREATE INDEX IF NOT EXISTS idx_appointment_status_history_appointment_date 
ON appointment_status_history(appointment_id, created_at DESC);

-- =====================================================
-- SECCIÓN 4: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en la tabla de historial
ALTER TABLE appointment_status_history ENABLE ROW LEVEL SECURITY;

-- Política para ver historial de estados (mismo acceso que appointments)
CREATE POLICY "appointment_history_access" ON appointment_status_history
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.id = appointment_status_history.appointment_id
            AND (
                a.patient_id = auth.uid() OR
                a.doctor_id = auth.uid() OR
                get_user_role() IN ('admin', 'staff', 'superadmin')
            )
        )
    );

-- Política para insertar en historial (solo usuarios autenticados con acceso a la cita)
CREATE POLICY "appointment_history_insert" ON appointment_status_history
    FOR INSERT TO authenticated
    WITH CHECK (
        changed_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.id = appointment_status_history.appointment_id
            AND (
                a.patient_id = auth.uid() OR
                a.doctor_id = auth.uid() OR
                get_user_role() IN ('admin', 'staff', 'superadmin')
            )
        )
    );

-- =====================================================
-- SECCIÓN 5: FUNCIONES DE VALIDACIÓN
-- =====================================================

-- Función para validar transiciones de estado según business rules
CREATE OR REPLACE FUNCTION validate_appointment_status_transition(
    p_appointment_id UUID,
    p_new_status appointment_status,
    p_user_role TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    current_status appointment_status;
    valid_transitions TEXT[];
    is_privileged_user BOOLEAN;
BEGIN
    -- Obtener estado actual de la cita
    SELECT status INTO current_status 
    FROM appointments 
    WHERE id = p_appointment_id;
    
    -- Si no se encuentra la cita, retornar false
    IF current_status IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Determinar si el usuario tiene privilegios especiales
    is_privileged_user := p_user_role IN ('admin', 'staff', 'superadmin');
    
    -- Definir transiciones válidas por estado actual
    CASE current_status
        WHEN 'pending' THEN 
            valid_transitions := ARRAY['pendiente_pago', 'confirmed', 'cancelada_clinica'];
        WHEN 'pendiente_pago' THEN 
            valid_transitions := ARRAY['confirmed', 'cancelled', 'cancelada_paciente'];
        WHEN 'confirmed' THEN 
            valid_transitions := ARRAY['en_curso', 'reagendada', 'cancelada_paciente', 'cancelada_clinica', 'no_show'];
        WHEN 'en_curso' THEN 
            valid_transitions := ARRAY['completed'];
        WHEN 'reagendada' THEN 
            valid_transitions := ARRAY['confirmed', 'cancelada_paciente', 'cancelada_clinica'];
        -- Estados finales no permiten transiciones
        WHEN 'cancelled' THEN 
            valid_transitions := ARRAY[]::TEXT[];
        WHEN 'cancelada_paciente' THEN 
            valid_transitions := ARRAY[]::TEXT[];
        WHEN 'cancelada_clinica' THEN 
            valid_transitions := ARRAY[]::TEXT[];
        WHEN 'completed' THEN 
            valid_transitions := ARRAY[]::TEXT[];
        WHEN 'no_show' THEN 
            valid_transitions := ARRAY[]::TEXT[];
        ELSE 
            valid_transitions := ARRAY[]::TEXT[];
    END CASE;
    
    -- Usuarios privilegiados pueden hacer transiciones adicionales para correcciones
    IF is_privileged_user THEN
        -- Permitir correcciones desde estados finales (excepto completed)
        IF current_status IN ('cancelled', 'cancelada_paciente', 'cancelada_clinica', 'no_show') THEN
            valid_transitions := valid_transitions || ARRAY['confirmed', 'reagendada'];
        END IF;
    END IF;
    
    -- Validar si la transición solicitada está permitida
    RETURN p_new_status::TEXT = ANY(valid_transitions);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario para documentación
COMMENT ON FUNCTION validate_appointment_status_transition IS 'Valida transiciones de estado de citas según business rules y permisos de usuario';

-- =====================================================
-- SECCIÓN 6: TRIGGER PARA AUDIT AUTOMÁTICO
-- =====================================================

-- Función trigger para registrar cambios de estado automáticamente
CREATE OR REPLACE FUNCTION log_appointment_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo registrar si el estado cambió
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO appointment_status_history (
            appointment_id,
            previous_status,
            new_status,
            changed_by,
            user_role,
            reason,
            metadata
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            auth.uid(),
            get_user_role(),
            'Cambio automático de estado',
            jsonb_build_object(
                'trigger', 'automatic',
                'updated_at', NEW.updated_at,
                'previous_updated_at', OLD.updated_at
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para audit automático
DROP TRIGGER IF EXISTS appointment_status_audit_trigger ON appointments;
CREATE TRIGGER appointment_status_audit_trigger
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION log_appointment_status_change();

-- =====================================================
-- SECCIÓN 7: VERIFICACIÓN Y VALIDACIÓN
-- =====================================================

-- Verificar que los nuevos estados se agregaron correctamente
DO $$
DECLARE
    status_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO status_count
    FROM unnest(enum_range(NULL::appointment_status)) AS status
    WHERE status::TEXT IN ('pendiente_pago', 'reagendada', 'cancelada_paciente', 'cancelada_clinica', 'en_curso');
    
    IF status_count = 5 THEN
        RAISE NOTICE 'SUCCESS: Todos los nuevos estados MVP fueron agregados correctamente';
    ELSE
        RAISE EXCEPTION 'ERROR: No se pudieron agregar todos los estados MVP. Estados encontrados: %', status_count;
    END IF;
END $$;

-- Verificar que la tabla de audit trail se creó correctamente
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointment_status_history') THEN
        RAISE NOTICE 'SUCCESS: Tabla appointment_status_history creada correctamente';
    ELSE
        RAISE EXCEPTION 'ERROR: No se pudo crear la tabla appointment_status_history';
    END IF;
END $$;

-- Verificar que las políticas RLS están habilitadas
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'appointment_status_history' 
        AND rowsecurity = true
    ) THEN
        RAISE NOTICE 'SUCCESS: RLS habilitado en appointment_status_history';
    ELSE
        RAISE EXCEPTION 'ERROR: RLS no está habilitado en appointment_status_history';
    END IF;
END $$;

-- Verificar que la función de validación funciona
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_appointment_status_transition') THEN
        RAISE NOTICE 'SUCCESS: Función validate_appointment_status_transition creada correctamente';
    ELSE
        RAISE EXCEPTION 'ERROR: No se pudo crear la función validate_appointment_status_transition';
    END IF;
END $$;

-- =====================================================
-- MIGRACIÓN COMPLETADA
-- =====================================================

-- Log de finalización
DO $$
BEGIN
    RAISE NOTICE '=== MIGRACIÓN 007_mvp_appointment_states COMPLETADA ===';
    RAISE NOTICE 'Estados MVP agregados: pendiente_pago, reagendada, cancelada_paciente, cancelada_clinica, en_curso';
    RAISE NOTICE 'Tabla audit trail: appointment_status_history creada con RLS';
    RAISE NOTICE 'Función de validación: validate_appointment_status_transition implementada';
    RAISE NOTICE 'Trigger automático: appointment_status_audit_trigger configurado';
    RAISE NOTICE 'Índices de performance: 5 índices creados para optimización';
    RAISE NOTICE 'Fecha: 2025-01-28';
    RAISE NOTICE '=== MIGRACIÓN EXITOSA ===';
END $$;
