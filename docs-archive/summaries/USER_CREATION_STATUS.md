# 📋 Estado de Creación de Usuarios - AgentSalud

## ✅ **Tarea 1 Completada: Cambio de Rol**

**Usuario**: `soporte@torrecentral.com`  
**Cambio**: `patient` → `superadmin`  
**Estado**: ✅ **COMPLETADO**  
**ID**: `007ecfa8-c99b-4bda-82c7-04e694370e7f`

```sql
-- Verificación del cambio
SELECT id, email, role, first_name, last_name 
FROM profiles 
WHERE email = 'soporte@torrecentral.com';
```

**Resultado**:
- Email: `soporte@torrecentral.com`
- Rol: `superadmin` ✅
- Nombre: Gabriel Pulgarin

---

## 🔄 **Tarea 2: Creación de Usuarios VisualCare**

### **📊 Estado Actual**

**Organización**: Óptica VisualCare  
**ID**: `927cecbe-d9e5-43a4-b9d0-25f942ededc4`  
**Usuarios a crear**: 13 usuarios  
**Estado**: 🔄 **PENDIENTE** (Requiere ejecución manual)

### **👥 Usuarios Definidos para Creación**

#### **👨‍💼 Administradores (2)**
1. **Carlos Martínez** - `carlos.martinez.new@visualcare.com` - `admin`
2. **Laura Gómez** - `laura.gomez.new@visualcare.com` - `admin`

#### **👩‍⚕️ Doctores (5)**
3. **Ana Rodríguez** - `ana.rodriguez.new@visualcare.com` - `doctor`
4. **Pedro Sánchez** - `pedro.sanchez.new@visualcare.com` - `doctor`
5. **Elena López** - `elena.lopez.new@visualcare.com` - `doctor`
6. **Miguel Fernández** - `miguel.fernandez.new@visualcare.com` - `doctor`
7. **Sofía Torres** - `sofia.torres.new@visualcare.com` - `doctor`

#### **👥 Staff (3)**
8. **Carmen Ruiz** - `carmen.ruiz.new@visualcare.com` - `staff`
9. **Javier Moreno** - `javier.moreno.new@visualcare.com` - `staff`
10. **Lucía Navarro** - `lucia.navarro.new@visualcare.com` - `staff`

#### **🏥 Pacientes (3)**
11. **María García** - `maria.garcia.new@example.com` - `patient`
12. **Juan Pérez** - `juan.perez.new@example.com` - `patient`
13. **Isabel Díaz** - `isabel.diaz.new@example.com` - `patient`

### **🔑 Credenciales Estándar**
- **Contraseña**: `VisualCare2025!` (para todos los usuarios)
- **Email confirmado**: Sí (automático)
- **Estado**: Activo

---

## 🛠️ **Herramientas Creadas para Completar la Tarea**

### **1. Script de Creación Automática**
**Archivo**: `scripts/create-visualcare-users.js`  
**Descripción**: Script Node.js que usa la API de administración de Supabase  
**Uso**:
```bash
cd scripts
node create-visualcare-users.js
```

### **2. Script SQL Manual**
**Archivo**: `scripts/create-users-manual.sql`  
**Descripción**: Comandos SQL para crear perfiles después de crear usuarios en auth  
**Uso**: Ejecutar después de crear usuarios en auth.users

### **3. Documentación Completa**
**Archivo**: `MANUAL_TESTING_GUIDE.md`  
**Descripción**: Guía completa con todos los datos de usuarios y escenarios de prueba

---

## 🚀 **Instrucciones para Completar la Creación**

### **Opción 1: Script Automático (Recomendado)**

1. **Configurar variables de entorno**:
   ```bash
   # En .env.local
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
   ```

2. **Ejecutar script**:
   ```bash
   cd scripts
   node create-visualcare-users.js
   ```

3. **Verificar resultados**:
   ```sql
   SELECT first_name, last_name, email, role 
   FROM profiles 
   WHERE organization_id = '927cecbe-d9e5-43a4-b9d0-25f942ededc4'
   ORDER BY role, first_name;
   ```

### **Opción 2: Creación Manual**

1. **Usar Supabase Dashboard**:
   - Ir a Authentication > Users
   - Crear cada usuario con email y contraseña
   - Copiar los UUIDs generados

2. **Ejecutar SQL para perfiles**:
   - Usar `scripts/create-users-manual.sql`
   - Reemplazar UUIDs con los IDs reales
   - Ejecutar en SQL Editor

### **Opción 3: API REST Directa**

Usar los comandos curl basados en `USUARIOS_SUPABASE.md`:

```bash
# Ejemplo para crear un usuario
curl -X POST 'https://fjvletqwwmxusgthwphr.supabase.co/auth/v1/admin/users' \
  -H 'Content-Type: application/json' \
  -H 'apikey: YOUR_SERVICE_ROLE_KEY' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -d '{
    "email": "carlos.martinez.new@visualcare.com",
    "password": "VisualCare2025!",
    "email_confirm": true,
    "user_metadata": {
      "first_name": "Carlos",
      "last_name": "Martínez",
      "role": "admin"
    }
  }'
```

---

## ✅ **Tarea 3: Validación Final**

### **Comandos de Verificación**

#### **Verificar usuario superadmin**
```sql
SELECT id, email, role, first_name, last_name 
FROM profiles 
WHERE email = 'soporte@torrecentral.com';
```
**Estado**: ✅ **COMPLETADO**

#### **Listar usuarios de VisualCare**
```sql
SELECT 
  p.first_name,
  p.last_name,
  p.email,
  p.role,
  p.is_active,
  o.name as organization
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.organization_id = '927cecbe-d9e5-43a4-b9d0-25f942ededc4'
ORDER BY 
  CASE p.role 
    WHEN 'admin' THEN 1
    WHEN 'doctor' THEN 2
    WHEN 'staff' THEN 3
    WHEN 'patient' THEN 4
  END,
  p.first_name;
```
**Estado**: 🔄 **PENDIENTE** (Después de crear usuarios)

#### **Verificar integridad de relaciones**
```sql
-- Verificar que todos los perfiles tienen usuarios correspondientes
SELECT 
  p.id,
  p.email,
  CASE 
    WHEN au.id IS NOT NULL THEN 'Tiene usuario auth'
    ELSE 'SIN usuario auth'
  END as auth_status
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE p.organization_id = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';
```

---

## 📊 **Resumen de Estado**

| Tarea | Estado | Detalles |
|-------|--------|----------|
| 1. Cambiar rol superadmin | ✅ **COMPLETADO** | `soporte@torrecentral.com` → `superadmin` |
| 2. Crear usuarios VisualCare | 🔄 **PENDIENTE** | 13 usuarios definidos, herramientas creadas |
| 3. Validación final | ⏳ **ESPERANDO** | Depende de completar tarea 2 |

---

## 🎯 **Próximos Pasos**

1. **Ejecutar script de creación** usando `create-visualcare-users.js`
2. **Verificar usuarios creados** con comandos SQL de validación
3. **Probar login** con algunos usuarios de prueba
4. **Configurar información adicional** para doctores (especialidades, horarios)
5. **Ejecutar pruebas de funcionalidad** AI y multi-tenant

---

**Última Actualización**: Enero 2025  
**Estado General**: 1/3 tareas completadas  
**Siguiente Acción**: Ejecutar script de creación de usuarios
