# 🧪 GUÍA DE TESTING - CORRECCIONES REAGENDAMIENTO

## 🎯 **OBJETIVO**
Validar manualmente las 3 correcciones críticas implementadas en el sistema de reagendamiento de AgentSalud MVP.

---

## 📋 **CHECKLIST DE VALIDACIÓN**

### **✅ PROBLEMA 1: Información del Doctor**

#### **Escenario 1: Doctor con información completa**
1. **Acción**: Abrir modal de reagendamiento para una cita con doctor asignado
2. **Verificar**: Se muestra "Dr. [Nombre] [Apellido]" en la sección de información actual
3. **Resultado esperado**: ✅ Nombre completo del doctor visible

#### **Escenario 2: Doctor con información parcial**
1. **Acción**: Probar con cita donde doctor solo tiene nombre O apellido
2. **Verificar**: Se muestra "Dr. [Nombre disponible]"
3. **Resultado esperado**: ✅ Información parcial mostrada correctamente

#### **Escenario 3: Sin información del doctor**
1. **Acción**: Probar con cita sin doctor asignado
2. **Verificar**: Se muestra "Dr. [Nombre no disponible]"
3. **Resultado esperado**: ✅ Fallback apropiado mostrado

---

### **✅ PROBLEMA 2: Fechas Pasadas**

#### **Escenario 1: Navegación de calendario**
1. **Acción**: Abrir modal de reagendamiento
2. **Verificar**: Solo fechas futuras están habilitadas
3. **Verificar**: Fechas pasadas aparecen en gris y no son clickeables
4. **Resultado esperado**: ✅ Solo fechas futuras seleccionables

#### **Escenario 2: Navegación entre semanas**
1. **Acción**: Intentar navegar a semanas anteriores
2. **Verificar**: No se puede navegar a semanas completamente en el pasado
3. **Resultado esperado**: ✅ Navegación limitada a fechas válidas

#### **Escenario 3: Fecha de hoy**
1. **Acción**: Verificar que la fecha actual esté disponible
2. **Verificar**: Hoy debe estar marcado como disponible
3. **Resultado esperado**: ✅ Fecha actual seleccionable

---

### **✅ PROBLEMA 3: Cancelación Integrada**

#### **Escenario 1: Botón de cancelación visible**
1. **Acción**: Abrir modal de reagendamiento
2. **Verificar**: Botón "Cancelar Cita" visible en la parte inferior izquierda
3. **Resultado esperado**: ✅ Botón rojo con ícono de papelera visible

#### **Escenario 2: Flujo de cancelación**
1. **Acción**: Hacer clic en "Cancelar Cita"
2. **Verificar**: Se abre modal de cancelación superpuesto
3. **Acción**: Seleccionar motivo de cancelación
4. **Acción**: Confirmar cancelación
5. **Verificar**: Ambos modales se cierran
6. **Verificar**: Cita aparece como cancelada en la lista
7. **Resultado esperado**: ✅ Flujo completo funcional

#### **Escenario 3: Cancelación del modal de cancelación**
1. **Acción**: Abrir modal de cancelación desde reagendamiento
2. **Acción**: Hacer clic en "Cancelar" en el modal de cancelación
3. **Verificar**: Solo se cierra el modal de cancelación
4. **Verificar**: Modal de reagendamiento permanece abierto
5. **Resultado esperado**: ✅ Navegación entre modales correcta

---

## 🔍 **CASOS EDGE A VALIDAR**

### **Datos Inconsistentes**
- [ ] Citas con estructura de doctor como array vs objeto
- [ ] Citas con campos de doctor nulos o undefined
- [ ] Citas con perfiles de doctor vacíos

### **Fechas Límite**
- [ ] Cambio de día a medianoche
- [ ] Navegación en fin/inicio de mes
- [ ] Comportamiento en años bisiestos

### **Estados de Carga**
- [ ] Modal de reagendamiento con loading=true
- [ ] Cancelación con estados de carga
- [ ] Manejo de errores de red

---

## 🎮 **INSTRUCCIONES PASO A PASO**

### **Preparación**
```bash
# 1. Iniciar el servidor de desarrollo
npm run dev

# 2. Navegar a la página de citas
http://localhost:3000/appointments

# 3. Asegurarse de tener citas de prueba disponibles
```

### **Ejecución de Tests**

#### **Test 1: Información del Doctor**
1. Localizar una cita en la lista
2. Hacer clic en "Reagendar"
3. **VERIFICAR**: Información del doctor en la sección superior
4. **CAPTURAR**: Screenshot de la información mostrada

#### **Test 2: Fechas Pasadas**
1. En el modal de reagendamiento
2. Observar el calendario semanal
3. **VERIFICAR**: Fechas pasadas en gris/deshabilitadas
4. Intentar hacer clic en fecha pasada
5. **VERIFICAR**: No se puede seleccionar
6. **CAPTURAR**: Screenshot del calendario

#### **Test 3: Cancelación Integrada**
1. En el modal de reagendamiento
2. Localizar botón "Cancelar Cita" (rojo, esquina inferior izquierda)
3. Hacer clic en el botón
4. **VERIFICAR**: Modal de cancelación se abre
5. Seleccionar motivo "Conflicto de horario"
6. Hacer clic en "Confirmar Cancelación"
7. **VERIFICAR**: Ambos modales se cierran
8. **VERIFICAR**: Cita aparece como cancelada
9. **CAPTURAR**: Screenshots del proceso

---

## 📊 **REPORTE DE RESULTADOS**

### **Formato de Reporte**
```
PROBLEMA 1 - Información del Doctor:
✅/❌ Escenario 1: [Resultado]
✅/❌ Escenario 2: [Resultado]
✅/❌ Escenario 3: [Resultado]

PROBLEMA 2 - Fechas Pasadas:
✅/❌ Escenario 1: [Resultado]
✅/❌ Escenario 2: [Resultado]
✅/❌ Escenario 3: [Resultado]

PROBLEMA 3 - Cancelación Integrada:
✅/❌ Escenario 1: [Resultado]
✅/❌ Escenario 2: [Resultado]
✅/❌ Escenario 3: [Resultado]

CASOS EDGE:
✅/❌ Datos inconsistentes: [Resultado]
✅/❌ Fechas límite: [Resultado]
✅/❌ Estados de carga: [Resultado]
```

---

## 🚨 **QUÉ HACER SI ENCUENTRAS PROBLEMAS**

1. **Capturar evidencia**: Screenshots + descripción detallada
2. **Verificar consola**: Revisar errores en DevTools
3. **Reproducir**: Intentar replicar el problema
4. **Documentar**: Pasos exactos para reproducir
5. **Reportar**: Crear issue con toda la información

---

## ✅ **CRITERIOS DE ACEPTACIÓN**

**APROBADO** si:
- ✅ Información del doctor se muestra correctamente en todos los casos
- ✅ Solo fechas futuras son seleccionables
- ✅ Botón de cancelación funciona y está integrado
- ✅ No hay errores en consola
- ✅ UX es intuitiva y fluida

**RECHAZADO** si:
- ❌ Cualquier información del doctor falta o es incorrecta
- ❌ Se pueden seleccionar fechas pasadas
- ❌ Cancelación no funciona o no está integrada
- ❌ Hay errores críticos en consola
- ❌ UX es confusa o rota

---

**🎯 OBJETIVO: 100% DE ESCENARIOS APROBADOS**
