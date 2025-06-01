# 🔍 DEBUG PROBLEMA 1 - INCONSISTENCIA DE FECHAS DÍA 29

## 📋 **ANÁLISIS INICIAL**

**Problema identificado**: Día 29 muestra horarios del día 30  
**Componentes involucrados**:
- `WeeklyAvailabilitySelector.tsx` - Generación de datos de semana
- `AvailabilityIndicator.tsx` - Renderizado y selección de días
- `/api/appointments/availability` - API de disponibilidad por rango
- `/api/doctors/availability` - API de disponibilidad específica

---

## 🔬 **ANÁLISIS DE FLUJO DE DATOS**

### **Paso 1: Generación de fechas en WeeklyAvailabilitySelector**
```typescript
// En useWeeklyAvailabilityData (líneas 129-173)
for (let i = 0; i < 7; i++) {
  const date = new Date(startDate);
  date.setDate(startDate.getDate() + i);  // ← PUNTO CRÍTICO 1
  
  mockData.push({
    date: date.toISOString().split('T')[0],  // ← PUNTO CRÍTICO 2
    dayName: dayNames[date.getDay()],
    slotsCount,
    // ...
  });
}
```

### **Paso 2: Renderizado en AvailabilityIndicator**
```typescript
// En WeeklyAvailability component (líneas 274-286)
{weekData.map((day) => (
  <AvailabilityIndicator
    key={day.date}
    date={day.date}  // ← PUNTO CRÍTICO 3
    onClick={() => onDateSelect?.(day.date)}  // ← PUNTO CRÍTICO 4
  />
))}
```

### **Paso 3: Selección y llamada a API**
```typescript
// En handleDateSelect (líneas 308-315)
const handleDateSelect = (date: string) => {
  if (minDate && date < minDate) {
    return;
  }
  
  onDateSelect(date);  // ← PUNTO CRÍTICO 5
}
```

---

## 🚨 **HIPÓTESIS DE ROOT CAUSE**

### **Hipótesis 1: Problema de Zona Horaria**
- **Descripción**: `new Date()` y `toISOString()` pueden causar desfase de fechas
- **Evidencia**: `toISOString()` siempre devuelve UTC, pero `new Date(startDate)` puede interpretar como local
- **Impacto**: Fecha mostrada ≠ fecha enviada a API

### **Hipótesis 2: Inconsistencia en Cálculo de Semana**
- **Descripción**: `setDate()` puede causar overflow de mes
- **Evidencia**: Si `startDate` es 29 de mayo y se suma 1, puede ir al 30 pero con problemas de mes
- **Impacto**: Fechas calculadas incorrectamente

### **Hipótesis 3: Mapeo Incorrecto en API**
- **Descripción**: API recibe fecha correcta pero mapea datos incorrectos
- **Evidencia**: `/api/appointments/availability` procesa rangos de fechas
- **Impacto**: Datos de disponibilidad asociados a fecha incorrecta

---

## 🧪 **PLAN DE DEBUGGING ESPECÍFICO**

### **Test 1: Verificar Generación de Fechas**
```javascript
// Debugging en WeeklyAvailabilitySelector.tsx
console.log('=== DEBUG FECHA GENERACIÓN ===');
console.log('startDate original:', startDate);
console.log('startDate.getTimezoneOffset():', startDate.getTimezoneOffset());

for (let i = 0; i < 7; i++) {
  const date = new Date(startDate);
  console.log(`Día ${i}:`);
  console.log('  - date antes setDate:', date.toISOString());
  console.log('  - startDate.getDate():', startDate.getDate());
  console.log('  - i:', i);
  
  date.setDate(startDate.getDate() + i);
  
  console.log('  - date después setDate:', date.toISOString());
  console.log('  - date.getDate():', date.getDate());
  console.log('  - date.getDay():', date.getDay());
  console.log('  - ISO string:', date.toISOString().split('T')[0]);
  console.log('  - Local string:', date.toLocaleDateString('en-CA')); // YYYY-MM-DD
  console.log('---');
}
```

### **Test 2: Verificar Selección de Fecha**
```javascript
// Debugging en handleDateSelect
const handleDateSelect = (date: string) => {
  console.log('=== DEBUG SELECCIÓN FECHA ===');
  console.log('Fecha seleccionada:', date);
  console.log('Fecha como Date object:', new Date(date));
  console.log('Fecha Date object ISO:', new Date(date).toISOString());
  console.log('minDate:', minDate);
  console.log('Comparación date < minDate:', date < minDate);
  
  if (minDate && date < minDate) {
    console.log('BLOQUEADO por minDate');
    return;
  }
  
  console.log('LLAMANDO onDateSelect con:', date);
  onDateSelect(date);
};
```

### **Test 3: Verificar Llamada a API**
```javascript
// Debugging en UnifiedAppointmentFlow cuando recibe la fecha
const handleDateSelect = (date: string) => {
  console.log('=== DEBUG API CALL ===');
  console.log('Fecha recibida en UnifiedAppointmentFlow:', date);
  console.log('Parámetros que se enviarán a API:');
  console.log('  - organizationId:', organizationId);
  console.log('  - serviceId:', formData.service_id);
  console.log('  - doctorId:', formData.doctor_id);
  console.log('  - date:', date);
  
  // Verificar URL que se construirá
  const url = `/api/doctors/availability?organizationId=${organizationId}&date=${date}`;
  console.log('URL de API:', url);
};
```

---

## 🔍 **CASOS DE PRUEBA ESPECÍFICOS**

### **Caso 1: Día 29 de Mayo 2025**
```bash
# Configuración de prueba
- Semana actual: 25-31 mayo 2025
- Día específico: Jueves 29 mayo 2025
- Fecha esperada: "2025-05-29"

# Verificaciones:
1. ¿weekData[4].date === "2025-05-29"?
2. ¿Al hacer clic en día 29, onDateSelect recibe "2025-05-29"?
3. ¿API recibe parámetro date=2025-05-29?
4. ¿Horarios mostrados corresponden al 29, no al 30?
```

### **Caso 2: Comparación con Días Adyacentes**
```bash
# Día 28 (Miércoles)
- Fecha esperada: "2025-05-28"
- Verificar: Horarios correctos para el 28

# Día 30 (Viernes)  
- Fecha esperada: "2025-05-30"
- Verificar: Horarios correctos para el 30

# Análisis comparativo:
- ¿Hay patrón de desfase en todos los días?
- ¿Solo afecta al día 29?
- ¿Problema específico de fin de mes?
```

### **Caso 3: Diferentes Navegadores/Zonas Horarias**
```bash
# Chrome con timezone UTC-5
# Firefox con timezone UTC-5  
# Safari con timezone UTC-5
# Edge con timezone UTC-5

# Verificar consistencia en:
- Generación de fechas
- Formateo ISO
- Llamadas a API
- Datos recibidos
```

---

## 📊 **PUNTOS DE VERIFICACIÓN**

### **✅ Verificaciones Exitosas Esperadas**:
1. **Generación**: `weekData[4].date === "2025-05-29"`
2. **Selección**: `onDateSelect` recibe `"2025-05-29"`
3. **API Call**: URL contiene `date=2025-05-29`
4. **Respuesta**: Horarios corresponden al 29 de mayo
5. **Consistencia**: Comportamiento igual en todos los navegadores

### **❌ Señales de Problema**:
1. **Desfase de fecha**: `weekData[4].date !== "2025-05-29"`
2. **Selección incorrecta**: `onDateSelect` recibe fecha diferente
3. **API incorrecta**: URL contiene fecha diferente
4. **Datos incorrectos**: Horarios del 30 mostrados para el 29
5. **Inconsistencia**: Comportamiento diferente entre navegadores

---

## 🛠️ **CORRECCIONES POTENCIALES**

### **Si es problema de zona horaria**:
```typescript
// Usar Date.UTC para evitar problemas de timezone
const date = new Date(Date.UTC(
  startDate.getFullYear(),
  startDate.getMonth(),
  startDate.getDate() + i
));
```

### **Si es problema de setDate overflow**:
```typescript
// Usar método más seguro para sumar días
const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
```

### **Si es problema de formateo**:
```typescript
// Usar formateo más explícito
const formatDateSafe = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```

---

**🎯 OBJETIVO: IDENTIFICAR Y CORREGIR DESFASE DE FECHAS EN DÍA 29**

**⏱️ TIEMPO ESTIMADO: 20 MINUTOS**  
**🔄 ESTADO: LISTO PARA DEBUGGING**
