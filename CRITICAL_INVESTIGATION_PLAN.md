# 🔍 PLAN DE INVESTIGACIÓN - PROBLEMAS CRÍTICOS DE RESERVA DE CITAS

## 📋 **RESUMEN EJECUTIVO**

**Problemas identificados**: 2 problemas críticos en el sistema de reserva de citas  
**Impacto**: Bloqueo de creación de citas válidas y fechas bloqueadas en flujo de corrección  
**Prioridad**: **CRÍTICA** - Afecta funcionalidad core del MVP  

---

## 🎯 **PROBLEMA 1: Validación de Filtrado de Horarios en Creación de Citas**

### **📊 Análisis Inicial**

#### **Hipótesis del problema**:
El filtro de horarios pasados implementado en `SmartSuggestionsEngine.ts` puede estar afectando incorrectamente la creación real de citas, bloqueando horarios válidos.

#### **Componentes involucrados**:
1. **`SmartSuggestionsEngine.ts`** - Filtro de 4 horas implementado recientemente
2. **`UnifiedAppointmentFlow.tsx`** - Flujo manual de creación
3. **`ChatBot.tsx`** - Flujo de IA
4. **`/api/doctors/availability`** - API de disponibilidad
5. **`OptimalAppointmentFinder.ts`** - Búsqueda de citas óptimas

#### **Puntos de investigación**:
- ✅ **Separación de contextos**: ¿El filtro de sugerencias afecta la creación real?
- ✅ **APIs independientes**: ¿Las APIs de disponibilidad aplican el filtro incorrectamente?
- ✅ **Validación en frontend**: ¿Los componentes de selección bloquean horarios válidos?
- ✅ **Diferencias entre flujos**: ¿Manual vs IA tienen validaciones diferentes?

### **🔬 Metodología de Investigación**

#### **Fase 1: Análisis de Flujo de Datos (30 min)**
1. **Mapear flujo completo** desde selección hasta creación
2. **Identificar puntos de filtrado** en cada componente
3. **Verificar separación** entre sugerencias y disponibilidad real
4. **Documentar diferencias** entre flujo manual y IA

#### **Fase 2: Pruebas Específicas (20 min)**
1. **Crear cita para mañana 9:00 AM** (debe funcionar)
2. **Crear cita hoy con 5+ horas** (debe funcionar)  
3. **Crear cita hoy con 2 horas** (debe bloquearse)
4. **Comparar comportamiento** manual vs IA

#### **Fase 3: Corrección Dirigida (40 min)**
1. **Aislar filtro de sugerencias** del flujo de creación
2. **Corregir APIs** si aplican filtro incorrectamente
3. **Validar componentes** de selección de horarios
4. **Implementar pruebas** específicas

---

## 🎯 **PROBLEMA 2: Fechas Bloqueadas en Flujo de Corrección**

### **📊 Análisis Inicial**

#### **Hipótesis del problema**:
Al regresar desde confirmación para corregir fecha, el estado del componente `WeeklyAvailabilitySelector` no se resetea correctamente, manteniendo fechas en modo "solo lectura".

#### **Componentes involucrados**:
1. **`WeeklyAvailabilitySelector.tsx`** - Selector de fechas con estado
2. **`UnifiedAppointmentFlow.tsx`** - Navegación hacia atrás
3. **Estado de navegación** - Diferencia entre inicial vs edición
4. **Lógica de habilitación** de fechas

#### **Puntos de investigación**:
- ✅ **Estado de componente**: ¿Se preserva estado de "edición" al regresar?
- ✅ **Props de habilitación**: ¿Se pasan props incorrectas en modo edición?
- ✅ **Navegación hacia atrás**: ¿`handleBack()` resetea estado correctamente?
- ✅ **Diferencias de modo**: ¿Hay diferencias entre estado inicial vs edición?

### **🔬 Metodología de Investigación**

#### **Fase 1: Análisis de Estado (20 min)**
1. **Mapear estado** de `WeeklyAvailabilitySelector` en cada paso
2. **Identificar props** que controlan habilitación de fechas
3. **Verificar navegación** hacia atrás desde confirmación
4. **Documentar diferencias** entre modo inicial y edición

#### **Fase 2: Pruebas de Navegación (15 min)**
1. **Completar flujo** hasta confirmación
2. **Hacer clic "Regresar"** o "Editar fecha"
3. **Verificar fechas** están seleccionables
4. **Confirmar no hay** filtro de "solo lectura"

#### **Fase 3: Corrección de Estado (35 min)**
1. **Resetear estado** correctamente en navegación hacia atrás
2. **Corregir props** de habilitación en modo edición
3. **Validar comportamiento** en todos los escenarios
4. **Implementar pruebas** de navegación

---

## 🛠️ **PLAN DE IMPLEMENTACIÓN**

### **⏱️ Timeline Total: 2.5 horas**

#### **Hora 1: Investigación y Análisis**
- **0:00-0:30**: Problema 1 - Análisis de flujo de datos
- **0:30-0:50**: Problema 1 - Pruebas específicas
- **0:50-1:00**: Break y documentación inicial

#### **Hora 2: Investigación Problema 2**
- **1:00-1:20**: Problema 2 - Análisis de estado
- **1:20-1:35**: Problema 2 - Pruebas de navegación
- **1:35-2:00**: Documentación de hallazgos

#### **Hora 2.5: Implementación de Correcciones**
- **2:00-2:40**: Implementación de correcciones
- **2:40-2:50**: Pruebas de validación
- **2:50-3:00**: Documentación final

### **📋 Entregables**

#### **Documentación**:
1. **Reporte de análisis** con root cause de cada problema
2. **Mapeo de flujo** de datos y estado
3. **Comparación** manual vs IA
4. **Script de testing** manual

#### **Implementación**:
1. **Correcciones específicas** para cada problema
2. **Pruebas unitarias** actualizadas
3. **Validación** de correcciones anteriores
4. **Preservación** de arquitectura multi-tenant

### **🎯 Criterios de Éxito**

#### **Problema 1 - Validación de Filtrado**:
- ✅ Crear cita mañana 9:00 AM funciona
- ✅ Crear cita hoy 5+ horas funciona
- ✅ Crear cita hoy 2 horas se bloquea
- ✅ Comportamiento consistente manual vs IA

#### **Problema 2 - Fechas Bloqueadas**:
- ✅ Regresar desde confirmación funciona
- ✅ Fechas futuras están seleccionables
- ✅ No hay filtro de "solo lectura"
- ✅ Navegación fluida en ambas direcciones

---

## 🚨 **CONSIDERACIONES CRÍTICAS**

### **Preservar Funcionalidad Existente**:
- ✅ Mantener regla de 4 horas para horarios del día actual
- ✅ Preservar correcciones anteriores (loading infinito, filtrado IA)
- ✅ Mantener arquitectura multi-tenant
- ✅ Conservar límites de 500 líneas por archivo

### **Validación Exhaustiva**:
- ✅ Probar ambos flujos (manual y IA)
- ✅ Validar navegación en ambas direcciones
- ✅ Confirmar comportamiento en casos edge
- ✅ Verificar compatibilidad con correcciones anteriores

---

**🎯 OBJETIVO: RESOLVER AMBOS PROBLEMAS CRÍTICOS SIN ROMPER FUNCIONALIDAD EXISTENTE**
