# 🔍 **PLAN SECUENCIAL DE DEBUGGING - AgentSalud MVP**

## 📊 **PROBLEMA IDENTIFICADO**

### **Síntomas Específicos:**
1. **Página de Pacientes (`/patients`)**: Muestra "No hay pacientes" (0) cuando debería mostrar 3 pacientes
2. **Gestión de Horarios (`/staff/schedules`)**: Muestra "No hay doctores disponibles" (0) cuando debería mostrar 5 doctores

### **Estado de Validación:**
- ✅ **APIs Backend**: Funcionan correctamente (validado con scripts)
- ✅ **Base de Datos**: Contiene los datos esperados (3 pacientes, 5 doctores)
- ✅ **Políticas RLS**: Corregidas y funcionando
- ❌ **Frontend Display**: No muestra los datos en las páginas específicas

## 🎯 **METODOLOGÍA SECUENCIAL**

### **FASE 1: DIAGNÓSTICO INICIAL** ⏱️ 15 minutos

#### **Paso 1.1: Verificar Servidor en Funcionamiento**
```bash
# Iniciar servidor de desarrollo
npm run dev

# Verificar que el servidor esté corriendo
curl http://localhost:3000/
```

#### **Paso 1.2: Probar Herramienta de Debug en Navegador**
```bash
# URL de debug tool
http://localhost:3000/debug/frontend-issues

# Login como admin
Email: laura.gomez.new@visualcare.com
Password: password123
```

**Resultado Esperado:** Debug tool debe mostrar todas las APIs funcionando correctamente

#### **Paso 1.3: Verificar Páginas Problemáticas**
```bash
# Página de pacientes
http://localhost:3000/patients

# Página de horarios
http://localhost:3000/staff/schedules
```

**Resultado Esperado:** Confirmar que las páginas muestran 0 datos

### **FASE 2: ANÁLISIS DE CAUSA RAÍZ** ⏱️ 20 minutos

#### **Paso 2.1: Inspección de Console del Navegador**
1. Abrir DevTools (F12)
2. Ir a Console tab
3. Navegar a `/patients`
4. Buscar errores JavaScript
5. Repetir para `/staff/schedules`

**Posibles Causas:**
- Errores de JavaScript que impiden el fetching
- Problemas de estado en React components
- Errores de autenticación en contexto del navegador

#### **Paso 2.2: Análisis de Network Tab**
1. Abrir DevTools → Network tab
2. Navegar a `/patients`
3. Verificar llamadas a `/api/patients`
4. Revisar status codes y responses
5. Repetir para `/staff/schedules` y `/api/doctors`

**Indicadores Clave:**
- ✅ Status 200: API funciona, problema en frontend
- ❌ Status 401/403: Problema de autenticación
- ❌ Status 500: Error en servidor
- ❌ No hay llamadas: Problema en lógica de fetching

#### **Paso 2.3: Verificación de Contextos de Autenticación**
1. Verificar `useAuth()` context en páginas
2. Verificar `useTenant()` context en páginas
3. Confirmar que `profile` y `organization` están disponibles

### **FASE 3: IDENTIFICACIÓN ESPECÍFICA** ⏱️ 25 minutos

#### **Paso 3.1: Debug de Página de Pacientes**

**Archivo:** `src/app/(dashboard)/patients/page.tsx`

**Puntos de Verificación:**
```typescript
// Línea 95-98: useEffect dependency
useEffect(() => {
  if (profile && organization?.id) {
    fetchPatients(); // ¿Se ejecuta?
  }
}, [profile, organization, filters]);

// Línea 147: Asignación de datos
const result = await response.json();
setPatients(result.data || []); // ¿result.data existe?

// Línea 401: Condición de renderizado
filteredPatients.length === 0 ? // ¿Por qué es 0?
```

**Debug Steps:**
1. Agregar `console.log` en `fetchPatients()`
2. Verificar que `useEffect` se ejecute
3. Verificar response de API
4. Verificar que `setPatients` se llame con datos

#### **Paso 3.2: Debug de Página de Horarios**

**Archivo:** `src/app/(dashboard)/staff/schedules/page.tsx`

**Puntos de Verificación:**
```typescript
// Buscar función fetchDoctors()
// Verificar useEffect que la llama
// Verificar setDoctors() call
// Verificar filteredDoctors.length
```

### **FASE 4: IMPLEMENTACIÓN DE FIXES** ⏱️ 30 minutos

#### **Escenario A: Problema de Estado de React**

**Síntomas:** API calls exitosos pero datos no se muestran

**Solución:**
```typescript
// Agregar debug logs
console.log('DEBUG: fetchPatients called', { profile, organization });
console.log('DEBUG: API response', result);
console.log('DEBUG: Setting patients', result.data);

// Verificar que setPatients se llame correctamente
setPatients(result.data || []);
```

#### **Escenario B: Problema de Dependencias useEffect**

**Síntomas:** useEffect no se ejecuta cuando debería

**Solución:**
```typescript
// Verificar dependencias
useEffect(() => {
  console.log('DEBUG: useEffect triggered', { profile, organization });
  if (profile && organization?.id) {
    fetchPatients();
  }
}, [profile, organization, filters]); // ¿Dependencias correctas?
```

#### **Escenario C: Problema de Formato de Datos**

**Síntomas:** API retorna datos pero en formato incorrecto

**Solución:**
```typescript
// Verificar estructura de response
console.log('DEBUG: Full API response', result);
console.log('DEBUG: Data field', result.data);
console.log('DEBUG: Data type', typeof result.data);
console.log('DEBUG: Data length', result.data?.length);
```

### **FASE 5: VALIDACIÓN Y TESTING** ⏱️ 15 minutos

#### **Paso 5.1: Verificar Fixes**
1. Recargar páginas problemáticas
2. Verificar que muestren datos correctos
3. Probar filtros y búsquedas
4. Verificar que stats se actualicen

#### **Paso 5.2: Testing Completo**
```bash
# Ejecutar debug tool
http://localhost:3000/debug/frontend-issues

# Verificar todas las páginas
http://localhost:3000/patients        # Debe mostrar 3 pacientes
http://localhost:3000/staff/schedules # Debe mostrar 5 doctores
http://localhost:3000/dashboard       # Stats deben coincidir
```

#### **Paso 5.3: Validación Cross-Browser**
1. Probar en Chrome
2. Probar en Firefox
3. Verificar console errors en ambos

## 🛠️ **HERRAMIENTAS DE DEBUGGING**

### **Scripts Disponibles:**
```bash
npm run debug:api-calls          # Debug de consultas Supabase
npm run validate:api-fixes       # Validar formato de APIs
node scripts/test-specific-pages.js  # Test de páginas específicas
```

### **Debug Tools en Navegador:**
- `http://localhost:3000/debug/frontend-issues` - Debug tool en vivo
- `http://localhost:3000/debug/management-pages` - Debug de APIs

### **Browser DevTools:**
- **Console:** Errores JavaScript y debug logs
- **Network:** API calls y responses
- **React DevTools:** Estado de componentes
- **Application:** Cookies y localStorage

## 📊 **CRITERIOS DE ÉXITO**

### **Resultado Final Esperado:**
- ✅ Página de pacientes muestra 3 pacientes
- ✅ Página de horarios muestra 5 doctores
- ✅ Stats en dashboard coinciden con datos reales
- ✅ No hay errores en console del navegador
- ✅ API calls funcionan correctamente en Network tab

### **Métricas de Validación:**
- **Tiempo total:** ≤ 2 horas
- **Páginas corregidas:** 2/2
- **APIs funcionando:** 4/4
- **Errores de console:** 0
- **Consistencia de datos:** 100%

## 🚨 **ESCALACIÓN**

### **Si el problema persiste después de 2 horas:**
1. Documentar todos los hallazgos
2. Crear issue detallado con logs
3. Considerar rollback a versión anterior
4. Solicitar revisión de código por segundo desarrollador

### **Puntos de Escalación:**
- **1 hora:** Si no se identifica causa raíz
- **1.5 horas:** Si fixes no funcionan
- **2 horas:** Escalación completa

---

**📅 Fecha:** 2025-01-26  
**🔬 Metodología:** Sequential Thinking  
**🎯 Objetivo:** Resolver inconsistencias de datos frontend  
**⏱️ Tiempo Estimado:** 1.5-2 horas  
**🏥 Organización:** VisualCare (927cecbe-d9e5-43a4-b9d0-25f942ededc4)
