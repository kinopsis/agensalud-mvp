# 🔍 **INSTRUCCIONES DE DEBUGGING - FASE CRÍTICA**

## 🎯 **PROBLEMA IDENTIFICADO**

He agregado **debug logs extensivos** a las páginas problemáticas y he identificado un **problema crítico potencial**:

### **Inconsistencia de Formato de API en Página de Horarios**

**Archivo:** `src/app/(dashboard)/staff/schedules/page.tsx`  
**Línea:** 163  
**Problema:** La página busca `result.doctors` pero la API ahora retorna `result.data`

```typescript
// ⚠️ PROBLEMA POTENCIAL: La API puede retornar 'data' pero el código busca 'doctors'
const doctorsData = result.data || result.doctors || [];
```

## 🚀 **PASOS INMEDIATOS PARA VALIDAR**

### **Paso 1: Iniciar Servidor y Probar Debug Logs**

```bash
# 1. Iniciar servidor
npm run dev

# 2. Abrir navegador en modo desarrollador (F12)
# 3. Ir a Console tab
# 4. Navegar a las páginas problemáticas
```

### **Paso 2: Probar Página de Pacientes**

```bash
# URL: http://localhost:3000/patients
# Login: laura.gomez.new@visualcare.com / password123

# Buscar en console estos logs:
🔍 PATIENTS DEBUG: useEffect triggered
🔍 PATIENTS DEBUG: Calling fetchPatients()
🔍 PATIENTS DEBUG: fetchPatients() started
🔍 PATIENTS DEBUG: Making API call to: /api/patients?organizationId=...
🔍 PATIENTS DEBUG: API response status: 200 OK
🔍 PATIENTS DEBUG: API response received: { hasData: true, dataLength: 3 }
🔍 PATIENTS DEBUG: Setting patients data: { patientsCount: 3 }
```

**Resultado Esperado:** Debe mostrar 3 pacientes

### **Paso 3: Probar Página de Horarios**

```bash
# URL: http://localhost:3000/staff/schedules
# Login: laura.gomez.new@visualcare.com / password123

# Buscar en console estos logs:
🔍 SCHEDULES DEBUG: useEffect triggered
🔍 SCHEDULES DEBUG: Calling fetchDoctors()
🔍 SCHEDULES DEBUG: fetchDoctors() started
🔍 SCHEDULES DEBUG: Making API call to: /api/doctors?organizationId=...
🔍 SCHEDULES DEBUG: API response status: 200 OK
🔍 SCHEDULES DEBUG: API response received: { hasData: true, dataLength: 5 }
🔍 SCHEDULES DEBUG: Setting doctors data: { doctorsCount: 5 }
```

**Resultado Esperado:** Debe mostrar 5 doctores

## 🔧 **FIXES IMPLEMENTADOS**

### **Fix 1: Debug Logs en Página de Pacientes**

- ✅ Agregados logs en `useEffect`
- ✅ Agregados logs en `fetchPatients()`
- ✅ Agregados logs en procesamiento de respuesta API
- ✅ Verificación de estructura de datos

### **Fix 2: Debug Logs en Página de Horarios**

- ✅ Agregados logs en `useEffect`
- ✅ Agregados logs en `fetchDoctors()`
- ✅ Agregados logs en procesamiento de respuesta API
- ✅ **Fix crítico:** Compatibilidad con ambos formatos (`result.data || result.doctors`)

### **Fix 3: Compatibilidad de Formato de API**

```typescript
// ANTES (solo buscaba 'doctors'):
setDoctors(result.doctors || []);

// DESPUÉS (busca ambos formatos):
const doctorsData = result.data || result.doctors || [];
setDoctors(doctorsData);
```

## 📊 **ESCENARIOS DE DEBUGGING**

### **Escenario A: APIs Funcionan, Frontend Falla**

**Síntomas en Console:**
```
🔍 DEBUG: API response status: 200 OK
🔍 DEBUG: API response received: { hasData: true, dataLength: 0 }
🔍 DEBUG: Setting data: { count: 0 }
```

**Causa:** Problema en procesamiento de respuesta  
**Solución:** Verificar estructura de `result.data`

### **Escenario B: APIs Fallan con 401**

**Síntomas en Console:**
```
🔍 DEBUG: API response status: 401 Unauthorized
🔍 DEBUG: API Error: { status: 401, error: 'Unauthorized' }
```

**Causa:** Problema de autenticación en navegador  
**Solución:** Verificar cookies de sesión, re-login

### **Escenario C: useEffect No Se Ejecuta**

**Síntomas en Console:**
```
🔍 DEBUG: useEffect triggered: { hasProfile: false, hasOrganization: false }
🔍 DEBUG: Not calling fetch - missing requirements
```

**Causa:** Contextos de auth/tenant no están cargados  
**Solución:** Verificar `useAuth()` y `useTenant()`

### **Escenario D: Formato de API Incorrecto**

**Síntomas en Console:**
```
🔍 DEBUG: API response received: { hasData: false, hasDoctors: true }
```

**Causa:** API retorna formato antiguo  
**Solución:** Ya implementado con fallback `result.data || result.doctors`

## 🎯 **VALIDACIÓN FINAL**

### **Criterios de Éxito:**

1. **Console Logs Claros:** Todos los debug logs aparecen sin errores
2. **API Calls Exitosos:** Status 200 en todas las llamadas
3. **Datos Procesados:** Counts correctos en logs (3 pacientes, 5 doctores)
4. **UI Actualizada:** Páginas muestran los datos correctos

### **Si Todo Funciona:**

- ✅ Remover debug logs (opcional)
- ✅ Documentar la solución
- ✅ Validar en otros navegadores

### **Si Persisten Problemas:**

- 🔍 Capturar screenshots de console logs
- 🔍 Verificar Network tab para API calls
- 🔍 Revisar Application tab para cookies/localStorage
- 🔍 Probar en modo incógnito

## 📋 **CHECKLIST DE VALIDACIÓN**

```bash
□ Servidor iniciado (npm run dev)
□ Login exitoso como admin
□ Console abierto en DevTools
□ Página /patients probada
  □ Debug logs aparecen
  □ API call exitoso (200)
  □ Datos procesados correctamente
  □ UI muestra 3 pacientes
□ Página /staff/schedules probada
  □ Debug logs aparecen
  □ API call exitoso (200)
  □ Datos procesados correctamente
  □ UI muestra 5 doctores
□ No hay errores en console
□ Network tab muestra calls exitosos
```

---

**📅 Fecha:** 2025-01-26  
**🔬 Estado:** Debug logs implementados, fix crítico aplicado  
**🎯 Próximo Paso:** Validar en navegador con debug logs  
**⏱️ Tiempo Estimado:** 15-30 minutos para validación completa
