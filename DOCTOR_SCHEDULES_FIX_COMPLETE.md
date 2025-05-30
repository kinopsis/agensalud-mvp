# 🔧 DOCTOR SCHEDULES API - SOLUCIÓN COMPLETA

## 📋 PROBLEMA IDENTIFICADO

**Error Principal**: `Could not find a relationship between 'doctor_availability' and 'profiles' in the schema cache`

**Causa Raíz**: La tabla `doctor_availability` **NO EXISTE** en la base de datos.

## ✅ CORRECCIONES APLICADAS

### 1. **API Corregida** ✅
- **Archivo**: `src/app/api/doctors/[id]/schedule/route.ts`
- **Cambio**: Convertir `doctors.id` → `profile_id` antes de consultar `doctor_availability`
- **Estado**: ✅ COMPLETADO

### 2. **Validación de IDs** ✅
- **Problema anterior**: Doctor ID llegaba como `undefined`
- **Solución**: Validación mejorada y logs de debug
- **Estado**: ✅ RESUELTO

## 🚨 ACCIÓN REQUERIDA: CREAR TABLA

### **PASO 1: Ejecutar Script SQL**

Copiar y ejecutar en **Supabase SQL Editor**:

```sql
-- Crear tabla doctor_availability
CREATE TABLE IF NOT EXISTS doctor_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES profiles(id) NOT NULL,
    location_id UUID REFERENCES locations(id) NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(doctor_id, location_id, day_of_week, start_time, end_time)
);

-- Crear índice para rendimiento
CREATE INDEX IF NOT EXISTS idx_doctor_availability_doctor_day 
ON doctor_availability(doctor_id, day_of_week);

-- Habilitar RLS
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
```

### **PASO 2: Verificar Creación**

Ejecutar en SQL Editor para verificar:

```sql
-- Verificar que la tabla existe
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'doctor_availability';

-- Verificar estructura
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'doctor_availability' 
ORDER BY ordinal_position;
```

### **PASO 3: Probar API**

1. Refrescar la página `/staff/schedules` en http://localhost:3001
2. Verificar que no aparezcan errores en los logs
3. Confirmar que los horarios de doctores se cargan correctamente

## 📊 ESTRUCTURA DE LA TABLA

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `doctor_id` | UUID | Referencias `profiles(id)` |
| `location_id` | UUID | Referencias `locations(id)` |
| `day_of_week` | INTEGER | 0=Domingo, 6=Sábado |
| `start_time` | TIME | Hora de inicio |
| `end_time` | TIME | Hora de fin |
| `is_available` | BOOLEAN | Disponibilidad |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de actualización |

## 🔒 POLÍTICAS RLS

- **Doctores**: Pueden gestionar su propia disponibilidad
- **Staff/Admin/SuperAdmin**: Pueden gestionar disponibilidad de doctores en su organización
- **Seguridad**: Multi-tenant por organización

## 🧪 VALIDACIÓN

Ejecutar test de validación:

```bash
npm test -- tests/debug/doctor-availability-table-validation.test.ts --watchAll=false
```

## 📈 PRÓXIMOS PASOS

1. ✅ **Crear tabla** (PASO REQUERIDO)
2. ✅ **Probar API** 
3. ✅ **Validar frontend**
4. ✅ **Crear horarios de ejemplo**
5. ✅ **Documentar funcionalidad**

## 🎯 RESULTADO ESPERADO

Después de ejecutar el script SQL:

- ✅ API `/api/doctors/[id]/schedule` funcionará correctamente
- ✅ Staff Schedules page cargará horarios de doctores
- ✅ Se podrán crear, editar y eliminar horarios
- ✅ Cumplimiento con límite de 500 líneas por archivo
- ✅ Arquitectura multi-tenant preservada

---

**Estado**: 🟡 **PENDIENTE** - Requiere ejecución de script SQL
**Prioridad**: 🔴 **ALTA** - Parte de MVP crítico
**Estimado**: 5 minutos para ejecutar script + validación
