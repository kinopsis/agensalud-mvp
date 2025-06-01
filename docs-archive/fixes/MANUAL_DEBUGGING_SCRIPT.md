# 🔍 SCRIPT DE DEBUGGING MANUAL - PROBLEMA 1

## 📋 **INSTRUCCIONES PARA REPRODUCIR EL PROBLEMA**

**URL**: http://localhost:3001/appointments/book  
**Objetivo**: Identificar inconsistencia de fechas en día 29  
**Herramientas**: DevTools Console (F12)  

---

## 🎯 **PASOS PARA REPRODUCIR**

### **Paso 1: Preparar DevTools**
```bash
1. Abrir http://localhost:3001/appointments/book
2. Presionar F12 para abrir DevTools
3. Ir a la pestaña "Console"
4. Limpiar console (Ctrl+L o botón clear)
```

### **Paso 2: Completar flujo hasta selección de fecha**
```bash
1. Seleccionar servicio: "Examen Visual Completo"
2. Hacer clic "Siguiente"
3. Seleccionar flujo: "Personalizada"
4. Hacer clic "Siguiente"
5. Seleccionar doctor: Cualquier doctor disponible
6. Hacer clic "Siguiente"
7. Seleccionar ubicación: Cualquier ubicación
8. Hacer clic "Siguiente"
```

### **Paso 3: Observar logs de generación de fechas**
```bash
# En Console, buscar logs que empiecen con:
"=== DEBUG FECHA GENERACIÓN ==="

# Verificar:
1. ¿startDate original es correcto?
2. ¿Los cálculos de fecha son correctos?
3. ¿El día 4 (índice) corresponde al 29 de mayo?
4. ¿La fecha ISO generada es "2025-05-29"?
```

### **Paso 4: Hacer clic en día 29**
```bash
1. Localizar el día 29 en la vista semanal
2. Hacer clic en el día 29
3. Observar logs en Console
```

### **Paso 5: Verificar logs de selección**
```bash
# En Console, buscar logs que empiecen con:
"=== DEBUG SELECCIÓN FECHA ==="

# Verificar:
1. ¿Fecha seleccionada es "2025-05-29"?
2. ¿Date object corresponde al 29 de mayo?
3. ¿No hay bloqueo por minDate?
```

### **Paso 6: Verificar logs de recepción en UnifiedFlow**
```bash
# En Console, buscar logs que empiecen con:
"=== DEBUG UNIFIED FLOW - FECHA RECIBIDA ==="

# Verificar:
1. ¿Fecha recibida es "2025-05-29"?
2. ¿URL de API contiene date=2025-05-29?
3. ¿formData se actualiza correctamente?
```

### **Paso 7: Verificar logs de llamada a API**
```bash
# En Console, buscar logs que empiecen con:
"=== DEBUG LOAD AVAILABILITY ==="

# Verificar:
1. ¿formData.appointment_date es "2025-05-29"?
2. ¿URL completa contiene date=2025-05-29?
3. ¿Respuesta de API es correcta?
4. ¿data.date procesada por API es "2025-05-29"?
5. ¿data.day_of_week corresponde al jueves (4)?
```

---

## 🔍 **ANÁLISIS DE LOGS**

### **Log 1: Generación de Fechas**
```javascript
// ESPERADO para día 29 (índice 4):
{
  date: "2025-05-29",
  dayName: "Jueves",
  getDay: 4,
  isoString: "2025-05-29"
}

// PROBLEMA si se ve:
{
  date: "2025-05-30",  // ← INCORRECTO
  dayName: "Viernes",  // ← INCORRECTO
  getDay: 5,          // ← INCORRECTO
}
```

### **Log 2: Selección de Fecha**
```javascript
// ESPERADO:
Fecha seleccionada: "2025-05-29"
Fecha como Date object: Thu May 29 2025 00:00:00 GMT-0500

// PROBLEMA si se ve:
Fecha seleccionada: "2025-05-30"  // ← INCORRECTO
```

### **Log 3: Llamada a API**
```javascript
// ESPERADO:
URL completa de API: "/api/doctors/availability?organizationId=...&date=2025-05-29"
data.date (fecha procesada por API): "2025-05-29"
data.day_of_week: 4

// PROBLEMA si se ve:
data.date: "2025-05-30"  // ← INCORRECTO
data.day_of_week: 5      // ← INCORRECTO
```

---

## 🚨 **SEÑALES DE PROBLEMA**

### **❌ Problema Confirmado Si:**
1. **Desfase en generación**: Día 4 genera fecha diferente a "2025-05-29"
2. **Selección incorrecta**: Click en día 29 envía fecha diferente
3. **API incorrecta**: URL contiene fecha diferente a la seleccionada
4. **Datos incorrectos**: Horarios mostrados no corresponden al 29

### **✅ Funcionamiento Correcto Si:**
1. **Generación correcta**: Día 4 genera "2025-05-29"
2. **Selección correcta**: Click en día 29 envía "2025-05-29"
3. **API correcta**: URL contiene "date=2025-05-29"
4. **Datos correctos**: Horarios corresponden al 29 de mayo

---

## 📊 **CASOS DE PRUEBA ADICIONALES**

### **Caso 1: Verificar días adyacentes**
```bash
# Probar día 28 (miércoles)
1. Hacer clic en día 28
2. Verificar logs: ¿fecha es "2025-05-28"?
3. Verificar horarios: ¿corresponden al 28?

# Probar día 30 (viernes)
1. Hacer clic en día 30
2. Verificar logs: ¿fecha es "2025-05-30"?
3. Verificar horarios: ¿corresponden al 30?
```

### **Caso 2: Navegación semanal**
```bash
# Navegar a semana anterior
1. Hacer clic "Anterior"
2. Verificar generación de fechas
3. Probar selección de días

# Navegar a semana siguiente
1. Hacer clic "Siguiente"
2. Verificar generación de fechas
3. Probar selección de días
```

### **Caso 3: Diferentes navegadores**
```bash
# Repetir pruebas en:
- Chrome
- Firefox
- Edge
- Safari (si disponible)

# Verificar consistencia de comportamiento
```

---

## 🛠️ **ANÁLISIS DE ROOT CAUSE**

### **Si el problema está en generación de fechas:**
```javascript
// Buscar en logs de "DEBUG FECHA GENERACIÓN"
// Verificar cálculos de setDate()
// Posible problema de overflow de mes
```

### **Si el problema está en selección:**
```javascript
// Buscar en logs de "DEBUG SELECCIÓN FECHA"
// Verificar mapeo entre UI y datos
// Posible problema en AvailabilityIndicator
```

### **Si el problema está en API:**
```javascript
// Buscar en logs de "DEBUG LOAD AVAILABILITY"
// Verificar parámetros enviados vs recibidos
// Posible problema de zona horaria
```

---

## 📋 **REPORTE DE RESULTADOS**

```
DEBUGGING MANUAL - RESULTADOS:

Fecha de prueba: ___________
Navegador: ___________
Hora local: ___________

GENERACIÓN DE FECHAS:
✅/❌ Día 4 genera "2025-05-29": [RESULTADO]
✅/❌ Cálculos de setDate correctos: [RESULTADO]
✅/❌ ISO strings correctos: [RESULTADO]

SELECCIÓN DE FECHA:
✅/❌ Click en día 29 envía "2025-05-29": [RESULTADO]
✅/❌ Date object correcto: [RESULTADO]
✅/❌ No hay bloqueo por minDate: [RESULTADO]

LLAMADA A API:
✅/❌ URL contiene "date=2025-05-29": [RESULTADO]
✅/❌ API procesa fecha correcta: [RESULTADO]
✅/❌ day_of_week es 4 (jueves): [RESULTADO]

HORARIOS MOSTRADOS:
✅/❌ Corresponden al 29 de mayo: [RESULTADO]
✅/❌ No son horarios del 30: [RESULTADO]

ROOT CAUSE IDENTIFICADO:
_________________________________
_________________________________

CORRECCIÓN REQUERIDA:
_________________________________
_________________________________
```

---

**🎯 OBJETIVO: IDENTIFICAR EXACTAMENTE DÓNDE OCURRE EL DESFASE DE FECHAS**

**⏱️ TIEMPO ESTIMADO: 10-15 MINUTOS**  
**🔄 ESTADO: LISTO PARA DEBUGGING MANUAL**
