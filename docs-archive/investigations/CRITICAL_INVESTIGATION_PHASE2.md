# 🔍 INVESTIGACIÓN CRÍTICA FASE 2 - PROBLEMAS WEEKLYAVAILABILITYSELECTOR

## 📋 **RESUMEN EJECUTIVO**

**Fecha**: 2025-01-27  
**Investigador**: Augment Agent (Expert Frontend Debugger & Product Manager)  
**Problemas identificados**: 3 problemas críticos post-correcciones anteriores  
**Prioridad**: **CRÍTICA** - Afecta funcionalidad core del selector de fechas  
**Estado**: **INICIANDO INVESTIGACIÓN**  

---

## 🎯 **PROBLEMAS A INVESTIGAR**

### **🚨 PROBLEMA 1: Inconsistencia de Disponibilidad en Fecha Específica (Día 29)**
- **Síntoma**: Día 29 muestra horarios del día 30
- **Impacto**: **CRÍTICO** - Datos incorrectos mostrados al usuario
- **Componente**: `WeeklyAvailabilitySelector.tsx`
- **Hipótesis**: Desfase de fechas en mapeo UI ↔ API

### **🚨 PROBLEMA 2: Navegación Semanal Bloqueada - Botón "Anterior" No Funcional**
- **Síntoma**: Navegación hacia atrás bloqueada después de avanzar semanas
- **Impacto**: **CRÍTICO** - UX rota para navegación
- **Componente**: `WeeklyAvailabilitySelector.tsx` - funciones de navegación
- **Hipótesis**: Conflicto con corrección reciente de `getMinDate()`

### **🔍 PROBLEMA 3: Análisis de UX - Contador de Doctores por Ubicación**
- **Síntoma**: Falta información para toma de decisiones
- **Impacto**: **MEDIO** - Oportunidad de mejora UX
- **Componente**: Selección de ubicaciones en `UnifiedAppointmentFlow`
- **Objetivo**: Análisis costo-beneficio de implementación

---

## 🛠️ **METODOLOGÍA DE INVESTIGACIÓN**

### **⏱️ FASE 1: INVESTIGACIÓN (60 min)**
- **0:00-0:20**: Problema 1 - Análisis de mapeo de fechas
- **0:20-0:40**: Problema 2 - Debugging de navegación semanal
- **0:40-0:60**: Problema 3 - Análisis de UX y APIs disponibles

### **⏱️ FASE 2: IMPLEMENTACIÓN (90 min)**
- **1:00-1:45**: Correcciones para Problemas 1 y 2
- **1:45-2:30**: Análisis detallado y mockups para Problema 3

### **⏱️ FASE 3: VALIDACIÓN (45 min)**
- **2:30-3:00**: Pruebas manuales y automatizadas
- **3:00-3:15**: Validación de regresiones
- **3:15-3:30**: Documentación final

---

## 🔬 **PLAN DE INVESTIGACIÓN DETALLADO**

### **PROBLEMA 1: Inconsistencia de Fechas**

#### **Puntos de investigación**:
1. **Función `onDateSelect`** en WeeklyAvailabilitySelector
2. **Mapeo de fechas** entre UI y parámetros de API
3. **Endpoint `/api/doctors/availability`** - parámetros enviados
4. **Zona horaria** - UTC vs local en cálculos
5. **Formateo de fechas** - ISO vs Date vs string local

#### **Casos de prueba específicos**:
```bash
# Caso 1: Verificar parámetros de API
1. Hacer clic en día 29
2. Inspeccionar Network tab → verificar parámetros enviados
3. Confirmar que fecha = "2025-05-29"

# Caso 2: Verificar datos recibidos
1. Analizar respuesta de API para día 29
2. Confirmar que horarios corresponden al 29, no al 30
3. Comparar con días adyacentes (28 y 30)

# Caso 3: Debugging de zona horaria
1. Verificar Date objects en diferentes timezones
2. Confirmar formateo consistente ISO 8601
3. Probar en navegadores con diferentes configuraciones
```

### **PROBLEMA 2: Navegación Semanal Bloqueada**

#### **Puntos de investigación**:
1. **Funciones `handlePreviousWeek`/`handleNextWeek`**
2. **Validación de `minDate`** y su interacción con navegación
3. **Estado de fechas** mínimas/máximas en componente
4. **Conflicto con `getMinDate()`** de corrección anterior
5. **Rangos de fechas** que bloquean navegación

#### **Casos de prueba específicos**:
```bash
# Caso 1: Navegación progresiva
1. Navegar 2-3 semanas hacia adelante
2. Intentar regresar con botón "Anterior"
3. Verificar que llega hasta semana del 29 de mayo

# Caso 2: Validación de restricciones
1. Inspeccionar props minDate en WeeklyAvailabilitySelector
2. Verificar que no interfiere con navegación semanal
3. Confirmar rangos de fechas válidos

# Caso 3: Navegación bidireccional
1. Probar múltiples ciclos adelante/atrás
2. Detectar inconsistencias en estado
3. Verificar límites de navegación
```

### **PROBLEMA 3: Análisis UX - Contador de Doctores**

#### **Criterios de evaluación**:
1. **Valor para usuario**: ¿Reduce incertidumbre?
2. **Eficiencia de flujo**: ¿Disminuye tiempo de reserva?
3. **Factibilidad técnica**: ¿Impacto en rendimiento?
4. **Consistencia de datos**: ¿Conteos precisos en tiempo real?
5. **Experiencia móvil**: ¿Funciona en pantallas pequeñas?

#### **Análisis requerido**:
```bash
# Análisis 1: UX actual
1. Evaluar paso de selección de ubicaciones
2. Identificar puntos de fricción
3. Medir tiempo de decisión promedio

# Análisis 2: APIs disponibles
1. Verificar datos de doctores por ubicación
2. Evaluar costo de consultas adicionales
3. Analizar precisión de conteos

# Análisis 3: Competidores
1. Revisar mejores prácticas en reserva médica
2. Analizar implementaciones similares
3. Evaluar valor diferencial
```

---

## 📊 **CRITERIOS DE ÉXITO**

### **Problema 1 - Inconsistencia de Fechas**:
- ✅ Día 29 muestra horarios exclusivos del 29 de mayo
- ✅ Parámetros de API coinciden con fecha seleccionada
- ✅ No hay desfase de zona horaria
- ✅ Comportamiento consistente en todos los navegadores

### **Problema 2 - Navegación Semanal**:
- ✅ Botón "Anterior" funciona sin restricciones incorrectas
- ✅ Navegación bidireccional fluida
- ✅ No hay conflicto con corrección de `getMinDate()`
- ✅ Acceso a todas las semanas futuras válidas

### **Problema 3 - Análisis UX**:
- ✅ Recomendación fundamentada con datos
- ✅ Mockups/wireframes si se aprueba implementación
- ✅ Análisis costo-beneficio detallado
- ✅ Plan de implementación con timeline

---

## 🚨 **PRESERVACIÓN DE CORRECCIONES ANTERIORES**

### **Validación de regresiones**:
- ✅ **Filtrado de horarios IA**: SmartSuggestionsEngine mantiene regla de 4 horas
- ✅ **Estado de loading**: Cancelación de citas sin loading infinito
- ✅ **Fechas flexibles**: Modo edición permite fechas previamente seleccionadas
- ✅ **Arquitectura multi-tenant**: Sin cambios en aislamiento de datos
- ✅ **Límites de archivo**: 500 líneas respetadas

---

## 📋 **ENTREGABLES PLANIFICADOS**

### **Documentación**:
1. **Reporte técnico** con root cause analysis y screenshots
2. **Análisis de UX** completo con recomendaciones
3. **Script de validación** manual paso a paso
4. **Reporte de regresión** de correcciones anteriores

### **Implementación**:
1. **Correcciones** para Problemas 1 y 2
2. **Pruebas unitarias** específicas (80%+ cobertura)
3. **Documentación JSDoc** detallada
4. **Mockups/wireframes** para Problema 3 si aplica

---

**🎯 OBJETIVO: RESOLVER PROBLEMAS CRÍTICOS SIN ROMPER FUNCIONALIDAD EXISTENTE**

**⏱️ TIEMPO ESTIMADO TOTAL: 3 HORAS**  
**🔄 ESTADO: INICIANDO FASE 1 - INVESTIGACIÓN**
