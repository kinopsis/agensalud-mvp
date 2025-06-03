# 🗄️ **INSTRUCCIONES DE MIGRACIÓN 007 - Estados Básicos Extendidos**

## 📋 **Información General**

**Archivo de Migración**: `src/lib/supabase/migrations/007_mvp_appointment_states.sql`  
**Fecha**: 28 de Enero, 2025  
**Prioridad**: 🔴 **CRÍTICA**  
**Duración Estimada**: 5-10 minutos  
**Impacto**: Extensión de funcionalidad sin breaking changes  

## 🎯 **Objetivo de la Migración**

Esta migración implementa estados avanzados de citas médicas según estándares internacionales, agregando:

1. **5 Nuevos Estados MVP**: `pendiente_pago`, `reagendada`, `cancelada_paciente`, `cancelada_clinica`, `en_curso`
2. **Audit Trail Completo**: Tabla `appointment_status_history` para compliance HIPAA
3. **Validación de Transiciones**: Función SQL para business rules
4. **Logging Automático**: Trigger para audit trail automático
5. **Políticas RLS**: Seguridad multi-tenant para audit trail

## ⚠️ **IMPORTANTE - LEER ANTES DE EJECUTAR**

### **Prerequisitos**
- ✅ Backup completo de la base de datos realizado
- ✅ Acceso de superusuario a PostgreSQL
- ✅ Verificar que no hay transacciones activas en tabla `appointments`
- ✅ Confirmar que la función `get_user_role()` existe (migración 003)

### **Compatibilidad**
- ✅ **Sin Breaking Changes**: Estados existentes se preservan
- ✅ **Backward Compatible**: APIs actuales siguen funcionando
- ✅ **Zero Downtime**: Migración puede ejecutarse en producción

## 🚀 **PASOS DE EJECUCIÓN**

### **Paso 1: Verificación Pre-Migración**

```sql
-- Verificar estado actual del enum
SELECT unnest(enum_range(NULL::appointment_status)) AS current_statuses;

-- Verificar que get_user_role() existe
SELECT proname FROM pg_proc WHERE proname = 'get_user_role';

-- Verificar citas existentes
SELECT status, COUNT(*) FROM appointments GROUP BY status;
```

**Resultado Esperado:**
- Estados actuales: `pending`, `confirmed`, `cancelled`, `completed`, `no_show`
- Función `get_user_role` debe existir
- Conteo de citas por estado actual

### **Paso 2: Ejecutar Migración**

```bash
# Conectar a la base de datos
psql -h [HOST] -U [USER] -d [DATABASE]

# Ejecutar el archivo de migración
\i src/lib/supabase/migrations/007_mvp_appointment_states.sql
```

**O ejecutar directamente el contenido del archivo SQL en el panel de Supabase.**

### **Paso 3: Verificación Post-Migración**

```sql
-- 1. Verificar nuevos estados agregados
SELECT unnest(enum_range(NULL::appointment_status)) AS all_statuses;

-- 2. Verificar tabla de audit trail
\d appointment_status_history

-- 3. Verificar políticas RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'appointment_status_history';

-- 4. Verificar función de validación
SELECT proname, pronargs FROM pg_proc 
WHERE proname = 'validate_appointment_status_transition';

-- 5. Verificar trigger
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname = 'appointment_status_audit_trigger';

-- 6. Test básico de validación
SELECT validate_appointment_status_transition(
    '00000000-0000-0000-0000-000000000000'::uuid,
    'confirmed'::appointment_status,
    'admin'
);
```

**Resultados Esperados:**
1. **Estados**: 10 estados total (5 originales + 5 nuevos)
2. **Tabla**: `appointment_status_history` creada con 11 columnas
3. **RLS**: `rowsecurity = true` para audit trail
4. **Función**: `validate_appointment_status_transition` con 3 argumentos
5. **Trigger**: `appointment_status_audit_trigger` en tabla `appointments`
6. **Test**: Función retorna `false` (UUID no existe, comportamiento esperado)

## 📊 **VALIDACIÓN DE ÉXITO**

### **Checklist de Verificación**

- [ ] ✅ **Estados Agregados**: 5 nuevos estados en enum `appointment_status`
- [ ] ✅ **Tabla Audit**: `appointment_status_history` creada correctamente
- [ ] ✅ **Índices**: 5 índices creados para performance
- [ ] ✅ **RLS Habilitado**: Políticas de seguridad activas
- [ ] ✅ **Función Validación**: `validate_appointment_status_transition` funcional
- [ ] ✅ **Trigger Activo**: Logging automático configurado
- [ ] ✅ **Sin Errores**: Migración ejecutada sin errores
- [ ] ✅ **Datos Preservados**: Citas existentes intactas

### **Test de Funcionalidad**

```sql
-- Test 1: Crear registro de prueba en audit trail
INSERT INTO appointment_status_history (
    appointment_id,
    previous_status,
    new_status,
    changed_by,
    user_role,
    reason
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'pending',
    'confirmed',
    auth.uid(),
    'admin',
    'Test de migración'
);

-- Test 2: Verificar que el trigger funciona (requiere cita real)
-- UPDATE appointments SET status = 'confirmed' WHERE id = '[APPOINTMENT_ID]';

-- Test 3: Limpiar datos de prueba
DELETE FROM appointment_status_history 
WHERE appointment_id = '00000000-0000-0000-0000-000000000000';
```

## 🔧 **TROUBLESHOOTING**

### **Errores Comunes y Soluciones**

#### **Error: "function get_user_role() does not exist"**
```sql
-- Solución: Aplicar migración 003 primero
\i src/lib/supabase/migrations/003_utility_functions.sql
```

#### **Error: "permission denied for relation appointments"**
```sql
-- Solución: Verificar permisos de usuario
GRANT ALL ON appointments TO [USER];
GRANT ALL ON appointment_status_history TO [USER];
```

#### **Error: "enum value already exists"**
```sql
-- Solución: Verificar si migración ya fue aplicada parcialmente
SELECT unnest(enum_range(NULL::appointment_status));
-- Si los estados ya existen, continuar con el resto de la migración
```

#### **Error: "table appointment_status_history already exists"**
```sql
-- Solución: Verificar estado de la tabla
\d appointment_status_history
-- Si existe pero está incompleta, DROP y recrear
```

### **Rollback (Solo si es necesario)**

```sql
-- ⚠️ CUIDADO: Solo ejecutar si hay problemas críticos

-- 1. Eliminar trigger
DROP TRIGGER IF EXISTS appointment_status_audit_trigger ON appointments;

-- 2. Eliminar función
DROP FUNCTION IF EXISTS log_appointment_status_change();
DROP FUNCTION IF EXISTS validate_appointment_status_transition(UUID, appointment_status, TEXT);

-- 3. Eliminar tabla audit
DROP TABLE IF EXISTS appointment_status_history;

-- 4. Revertir enum (PELIGROSO - puede romper datos existentes)
-- NO EJECUTAR A MENOS QUE SEA ABSOLUTAMENTE NECESARIO
-- Los valores enum no se pueden eliminar fácilmente en PostgreSQL
```

## 📞 **Soporte y Contacto**

### **En Caso de Problemas**

1. **Verificar Logs**: Revisar logs de PostgreSQL para errores específicos
2. **Backup**: Asegurar que el backup está disponible antes de cualquier acción
3. **Documentar**: Capturar mensajes de error exactos
4. **Contactar**: Equipo de desarrollo con detalles específicos

### **Información de Contacto**
- **Equipo**: AgentSalud MVP Development Team
- **Migración**: 007_mvp_appointment_states
- **Documentación**: `/docs/database/MIGRATION_007_INSTRUCTIONS.md`

## 📈 **Impacto Esperado**

### **Beneficios Post-Migración**
- ✅ **Compliance Médico**: Estados alineados con estándares HL7 FHIR
- ✅ **Audit Trail**: Trazabilidad completa de cambios para HIPAA
- ✅ **Business Rules**: Validación automática de transiciones
- ✅ **Performance**: Índices optimizados para consultas frecuentes
- ✅ **Seguridad**: RLS policies para multi-tenant isolation

### **Métricas de Monitoreo**
- **Performance**: Consultas de audit trail <100ms
- **Storage**: Crecimiento estimado 5-10MB/mes por 1000 citas
- **Compliance**: 100% trazabilidad de cambios de estado

---

**✅ MIGRACIÓN LISTA PARA PRODUCCIÓN**  
**Fecha de Preparación**: 28 de Enero, 2025  
**Versión**: 007_mvp_appointment_states  
**Estado**: Validada y documentada  
