# 🧪 SCRIPT DE VALIDACIÓN RÁPIDA - CORRECCIONES CRÍTICAS

## 🎯 **OBJETIVO**
Validar rápidamente que las 2 correcciones críticas funcionan correctamente en el sistema de citas de AgentSalud MVP.

---

## ⚡ **VALIDACIÓN RÁPIDA - 5 MINUTOS**

### **🔧 PROBLEMA 1: Filtrado de Horarios IA (2 minutos)**

#### **Paso 1: Verificar filtro en SmartSuggestionsEngine**
```bash
# Abrir consola del navegador y ejecutar:
console.log('Hora actual:', new Date().toLocaleTimeString());
```

#### **Paso 2: Probar sugerencias IA**
1. **Ir a**: Página principal o chatbot
2. **Escribir**: "Quiero una cita para hoy"
3. **Observar**: Solo horarios con 4+ horas de anticipación
4. **Verificar en consola**: Mensajes de filtrado

**✅ CRITERIO DE ÉXITO**: 
- No aparecen horarios pasados
- Solo horarios con 4+ horas de anticipación
- Logs en consola confirman filtrado

---

### **🔧 PROBLEMA 2: Estado de Carga en Cancelación (3 minutos)**

#### **Paso 1: Ir a página de citas**
```
URL: http://localhost:3000/appointments
```

#### **Paso 2: Probar cancelación desde reagendamiento**
1. **Hacer clic**: "Reagendar" en cualquier cita
2. **Hacer clic**: "Cancelar Cita" (botón rojo inferior izquierdo)
3. **Seleccionar**: Cualquier motivo de cancelación
4. **Hacer clic**: "Confirmar Cancelación"
5. **Observar**: Ambos modales se cierran automáticamente

**✅ CRITERIO DE ÉXITO**: 
- Modal de cancelación se abre correctamente
- Botón muestra "Cancelando..." durante operación
- Ambos modales se cierran automáticamente
- No hay estado de loading infinito

---

## 🔍 **VALIDACIÓN DETALLADA - 10 MINUTOS**

### **PROBLEMA 1: Casos edge del filtrado**

#### **Caso 1: Horario exacto en límite de 4 horas**
```javascript
// En consola del navegador:
const now = new Date();
const fourHoursLater = new Date(now.getTime() + 4 * 60 * 60 * 1000);
console.log('Límite exacto:', fourHoursLater.toLocaleTimeString());
```
- **Probar**: Solicitar cita para esa hora exacta
- **Esperado**: Debe ser aceptada

#### **Caso 2: Horario 1 minuto antes del límite**
```javascript
// En consola del navegador:
const now = new Date();
const almostFourHours = new Date(now.getTime() + (4 * 60 * 60 * 1000) - 60000);
console.log('1 minuto antes del límite:', almostFourHours.toLocaleTimeString());
```
- **Probar**: Solicitar cita para esa hora
- **Esperado**: Debe ser rechazada

#### **Caso 3: Día futuro**
- **Probar**: Solicitar cita para mañana a cualquier hora
- **Esperado**: Todos los horarios disponibles deben aparecer

### **PROBLEMA 2: Casos edge de cancelación**

#### **Caso 1: Cancelación con error de red**
1. **Abrir DevTools** → Network tab
2. **Activar**: "Offline" mode
3. **Intentar cancelar** una cita
4. **Verificar**: Error se maneja correctamente
5. **Desactivar**: "Offline" mode

#### **Caso 2: Múltiples clics rápidos**
1. **Abrir modal** de cancelación
2. **Hacer clic múltiple** en "Confirmar Cancelación"
3. **Verificar**: Solo se procesa una vez

#### **Caso 3: Cancelación exitosa**
1. **Cancelar cita** normalmente
2. **Verificar**: Cita aparece como cancelada en la lista
3. **Verificar**: No hay errores en consola

---

## 📊 **CHECKLIST DE VALIDACIÓN**

### **✅ PROBLEMA 1: Filtrado de Horarios IA**
- [ ] No aparecen horarios pasados en sugerencias
- [ ] Regla de 4 horas se aplica correctamente
- [ ] Días futuros muestran todos los horarios
- [ ] Logs de filtrado aparecen en consola
- [ ] Fallback funciona cuando no hay opciones válidas

### **✅ PROBLEMA 2: Estado de Carga en Cancelación**
- [ ] Modal de cancelación se abre desde reagendamiento
- [ ] Botón muestra estado de loading durante operación
- [ ] Ambos modales se cierran después de cancelación exitosa
- [ ] No hay estado de loading infinito
- [ ] Se previenen múltiples envíos

---

## 🚨 **SEÑALES DE ALERTA**

### **❌ PROBLEMA 1: Filtrado NO funciona si...**
- Aparecen horarios pasados en sugerencias IA
- Se pueden seleccionar horarios con menos de 4 horas
- No hay logs de filtrado en consola
- Fechas pasadas aparecen como opciones

### **❌ PROBLEMA 2: Cancelación NO funciona si...**
- Modal se queda en loading infinito
- Modales no se cierran después de cancelación
- Se pueden hacer múltiples envíos
- Errores no controlados en consola

---

## 🛠️ **DEBUGGING RÁPIDO**

### **Si el filtrado de horarios falla:**
```javascript
// Verificar en consola:
console.log('Filtro activo:', window.SmartSuggestionsEngine?.filterValidTimeSlots);
```

### **Si la cancelación falla:**
```javascript
// Verificar estado en consola:
console.log('Estado modal:', document.querySelector('[data-testid="cancel-modal"]'));
```

---

## 📝 **REPORTE DE RESULTADOS**

```
VALIDACIÓN RÁPIDA - RESULTADOS:

PROBLEMA 1 - Filtrado de Horarios IA:
✅/❌ No aparecen horarios pasados: [RESULTADO]
✅/❌ Regla de 4 horas aplicada: [RESULTADO]
✅/❌ Logs de filtrado visibles: [RESULTADO]

PROBLEMA 2 - Estado de Carga en Cancelación:
✅/❌ Modal se abre correctamente: [RESULTADO]
✅/❌ Loading state funciona: [RESULTADO]
✅/❌ Modales se cierran automáticamente: [RESULTADO]
✅/❌ No hay loading infinito: [RESULTADO]

ESTADO GENERAL: ✅ APROBADO / ❌ REQUIERE CORRECCIÓN
```

---

**⏱️ TIEMPO ESTIMADO TOTAL: 5-10 MINUTOS**  
**🎯 OBJETIVO: VALIDACIÓN RÁPIDA Y EFECTIVA**
