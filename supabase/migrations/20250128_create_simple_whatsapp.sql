-- =====================================================
-- SIMPLE WHATSAPP INTEGRATION FOR MVP
-- =====================================================
-- 
-- Tabla simplificada para instancias de WhatsApp
-- Diseñada para máxima simplicidad y funcionalidad MVP
--
-- @author AgentSalud Development Team
-- @date 2025-01-28

-- Crear tabla de instancias WhatsApp simplificada
CREATE TABLE IF NOT EXISTS whatsapp_instances_simple (
    -- Identificadores
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Información básica
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    
    -- Evolution API
    evolution_instance_name VARCHAR(100) NOT NULL UNIQUE,
    evolution_instance_id VARCHAR(255),
    
    -- Estado y conexión
    status VARCHAR(50) NOT NULL DEFAULT 'creating',
    connection_state VARCHAR(50) DEFAULT 'disconnected',
    
    -- QR Code
    qr_code_base64 TEXT,
    qr_code_expires_at TIMESTAMPTZ,
    
    -- WhatsApp info (cuando esté conectado)
    whatsapp_number VARCHAR(20),
    whatsapp_name VARCHAR(255),
    whatsapp_profile_pic_url TEXT,
    
    -- Metadatos
    last_seen_at TIMESTAMPTZ,
    error_message TEXT,
    error_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    connected_at TIMESTAMPTZ,
    disconnected_at TIMESTAMPTZ
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_whatsapp_simple_org_id ON whatsapp_instances_simple(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_simple_status ON whatsapp_instances_simple(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_simple_evolution_name ON whatsapp_instances_simple(evolution_instance_name);

-- RLS (Row Level Security)
ALTER TABLE whatsapp_instances_simple ENABLE ROW LEVEL SECURITY;

-- Política para superadmin (acceso total)
CREATE POLICY "Superadmin full access to whatsapp_instances_simple" ON whatsapp_instances_simple
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'superadmin'
        )
    );

-- Política para admin/staff (solo su organización)
CREATE POLICY "Organization access to whatsapp_instances_simple" ON whatsapp_instances_simple
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.organization_id = whatsapp_instances_simple.organization_id
            AND profiles.role IN ('admin', 'staff')
        )
    );

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_whatsapp_simple_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE TRIGGER trigger_update_whatsapp_simple_updated_at
    BEFORE UPDATE ON whatsapp_instances_simple
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_simple_updated_at();

-- Estados válidos para validación
COMMENT ON COLUMN whatsapp_instances_simple.status IS 'Estados: creating, connecting, connected, disconnected, error, deleted';
COMMENT ON COLUMN whatsapp_instances_simple.connection_state IS 'Estados Evolution API: open, connecting, close';

-- Comentarios para documentación
COMMENT ON TABLE whatsapp_instances_simple IS 'Tabla simplificada para instancias WhatsApp MVP - diseñada para máxima simplicidad';
COMMENT ON COLUMN whatsapp_instances_simple.evolution_instance_name IS 'Nombre único en Evolution API (máximo 100 caracteres)';
COMMENT ON COLUMN whatsapp_instances_simple.qr_code_base64 IS 'Código QR en formato base64 para conexión WhatsApp';
COMMENT ON COLUMN whatsapp_instances_simple.error_count IS 'Contador de errores consecutivos para circuit breaker';
