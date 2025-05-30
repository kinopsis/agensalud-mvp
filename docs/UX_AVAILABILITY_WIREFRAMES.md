# Wireframes y Mockups - Mejora de Disponibilidad de Doctores

## 🎨 **WIREFRAMES CONCEPTUALES**

### **PROPUESTA 1: VISTA SEMANAL HÍBRIDA**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REAGENDAR CITA                                   │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 📅 Consulta General - Dr. Pedro Sánchez                                │ │
│ │ Actual: 2025-06-05 08:00 → Nueva fecha y hora:                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │  [◀ Semana Anterior]    15-21 Diciembre 2024    [Semana Siguiente ▶]   │ │
│ │                                                                         │ │
│ │  LUN 16    MAR 17    MIE 18    JUE 19    VIE 20    SAB 21    DOM 22   │ │
│ │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐       │ │
│ │  │ ●●○○ │  │ ●●●○ │  │ ○○○○ │  │ ●●○○ │  │ ●●●● │  │ ●○○○ │  │ ○○○○ │       │ │
│ │  │ 4    │  │ 6    │  │ 0    │  │ 4    │  │ 8    │  │ 2    │  │ 0    │       │ │
│ │  │slots │  │slots │  │slots │  │slots │  │slots │  │slots │  │slots │       │ │
│ │  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘       │ │
│ │                              🚫              🟢              🔴         │ │
│ │                           No disp        Muchos         Pocos          │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ HORARIOS DISPONIBLES - Viernes 20 Diciembre                            │ │
│ │                                                                         │ │
│ │ 🌅 MAÑANA                    🌇 TARDE                    🌙 NOCHE       │ │
│ │ ┌─────┐ ┌─────┐ ┌─────┐    ┌─────┐ ┌─────┐ ┌─────┐    ┌─────┐ ┌─────┐ │ │
│ │ │08:00│ │08:30│ │09:00│    │14:00│ │14:30│ │15:00│    │18:00│ │18:30│ │ │
│ │ └─────┘ └─────┘ └─────┘    └─────┘ └─────┘ └─────┘    └─────┘ └─────┘ │ │
│ │ ┌─────┐ ┌─────┐ ┌─────┐    ┌─────┐                                     │ │
│ │ │09:30│ │10:00│ │10:30│    │15:30│                                     │ │
│ │ └─────┘ └─────┘ └─────┘    └─────┘                                     │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│                    [Cancelar]              [Confirmar Reagendado]           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### **PROPUESTA 2: SUGERENCIAS INTELIGENTES**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REAGENDAR CITA                                   │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 📅 Consulta General - Dr. Pedro Sánchez                                │ │
│ │ Actual: 2025-06-05 08:00 → Selecciona nueva fecha y hora:              │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 🌟 RECOMENDADO PARA TI                                                  │ │
│ │                                                                         │ │
│ │ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐             │ │
│ │ │ 🕘 Mañ 19 Dic   │ │ 🕐 Tar 20 Dic   │ │ 🕙 Mañ 21 Dic   │             │ │
│ │ │ 09:00 - 09:30   │ │ 14:30 - 15:00   │ │ 10:00 - 10:30   │             │ │
│ │ │                 │ │                 │ │                 │             │ │
│ │ │ ⭐ Popular       │ │ 🕐 Flexible     │ │ 🚀 Próximo      │             │ │
│ │ │ (Elegido 80%)   │ │ (Cambio fácil)  │ │ (En 2 días)     │             │ │
│ │ │                 │ │                 │ │                 │             │ │
│ │ │ [Seleccionar]   │ │ [Seleccionar]   │ │ [Seleccionar]   │             │ │
│ │ └─────────────────┘ └─────────────────┘ └─────────────────┘             │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 📅 OTROS HORARIOS DISPONIBLES                                          │ │
│ │                                                                         │ │
│ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │ │
│ │ │ 🌅 MAÑANA   │ │ 🌇 TARDE    │ │ 🌙 NOCHE    │ │ 📅 MÁS      │         │ │
│ │ │ 6 horarios  │ │ 4 horarios  │ │ 2 horarios  │ │ FECHAS      │         │ │
│ │ │ disponibles │ │ disponibles │ │ disponibles │ │             │         │ │
│ │ │             │ │             │ │             │ │ [Ver más]   │         │ │
│ │ │ [Ver todos] │ │ [Ver todos] │ │ [Ver todos] │ │             │         │ │
│ │ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│                    [Cancelar]              [Confirmar Reagendado]           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### **PROPUESTA 3: VISTA COMPACTA CON EXPANSIÓN**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REAGENDAR CITA                                   │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 📅 Consulta General - Dr. Pedro Sánchez                                │ │
│ │ Actual: 2025-06-05 08:00 → Encuentra tu nueva cita:                    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 🚀 PRÓXIMAS FECHAS DISPONIBLES                                         │ │
│ │                                                                         │ │
│ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │ │
│ │ │ 📅 HOY      │ │ 📅 MAÑANA   │ │ 📅 VIE 20   │ │ 📅 LUN 23   │         │ │
│ │ │ 16 Dic      │ │ 17 Dic      │ │ 20 Dic      │ │ 23 Dic      │         │ │
│ │ │             │ │             │ │             │ │             │         │ │
│ │ │ 2 slots     │ │ 8 slots     │ │ 6 slots     │ │ 4 slots     │         │ │
│ │ │ 🔴 Pocos    │ │ 🟢 Muchos   │ │ 🟡 Medio    │ │ 🟡 Medio    │         │ │
│ │ │             │ │             │ │             │ │             │         │ │
│ │ │ [Ver horas] │ │ [Ver horas] │ │ [Ver horas] │ │ [Ver horas] │         │ │
│ │ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 🔍 MÁS OPCIONES                                                        │ │
│ │                                                                         │ │
│ │ ┌─────────────────┐              ┌─────────────────┐                    │ │
│ │ │ 📅 Ver más      │              │ 📅 Ver calendario│                    │ │
│ │ │ fechas          │              │ completo        │                    │ │
│ │ │                 │              │                 │                    │ │
│ │ │ Próximas 2      │              │ Vista mensual   │                    │ │
│ │ │ semanas         │              │ con todos los   │                    │ │
│ │ │                 │              │ horarios        │                    │ │
│ │ │ [Explorar]      │              │ [Abrir]         │                    │ │
│ │ └─────────────────┘              └─────────────────┘                    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│                    [Cancelar]              [Continuar]                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🎯 **ESTADOS Y INTERACCIONES**

### **ESTADO 1: CARGA INICIAL**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REAGENDAR CITA                                   │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 📅 Consulta General - Dr. Pedro Sánchez                                │ │
│ │ Actual: 2025-06-05 08:00                                               │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 🔄 Cargando disponibilidad...                                          │ │
│ │                                                                         │ │
│ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │ │
│ │ │ ░░░░░░░░░░░ │ │ ░░░░░░░░░░░ │ │ ░░░░░░░░░░░ │ │ ░░░░░░░░░░░ │         │ │
│ │ │ ░░░░░░░░░░░ │ │ ░░░░░░░░░░░ │ │ ░░░░░░░░░░░ │ │ ░░░░░░░░░░░ │         │ │
│ │ │ ░░░░░░░░░░░ │ │ ░░░░░░░░░░░ │ │ ░░░░░░░░░░░ │ │ ░░░░░░░░░░░ │         │ │
│ │ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘         │ │
│ │                                                                         │ │
│ │ Analizando horarios del Dr. Pedro Sánchez...                           │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│                    [Cancelar]              [Cargando...]                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### **ESTADO 2: SIN DISPONIBILIDAD**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REAGENDAR CITA                                   │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 📅 Consulta General - Dr. Pedro Sánchez                                │ │
│ │ Actual: 2025-06-05 08:00                                               │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 😔 No hay disponibilidad esta semana                                   │ │
│ │                                                                         │ │
│ │ El Dr. Pedro Sánchez no tiene horarios disponibles                     │ │
│ │ en las próximas fechas.                                                 │ │
│ │                                                                         │ │
│ │ 💡 SUGERENCIAS:                                                        │ │
│ │                                                                         │ │
│ │ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐             │ │
│ │ │ 📅 Próxima      │ │ 👨‍⚕️ Otro        │ │ 🔔 Notificar    │             │ │
│ │ │ semana          │ │ doctor          │ │ cuando haya     │             │ │
│ │ │                 │ │                 │ │ disponibilidad  │             │ │
│ │ │ Ver horarios    │ │ Misma           │ │                 │             │ │
│ │ │ 23-29 Dic       │ │ especialidad    │ │ Te avisaremos   │             │ │
│ │ │                 │ │                 │ │ por email       │             │ │
│ │ │ [Ver fechas]    │ │ [Ver doctores]  │ │ [Activar]       │             │ │
│ │ └─────────────────┘ └─────────────────┘ └─────────────────┘             │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│                    [Cancelar]              [Explorar opciones]             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### **ESTADO 3: SELECCIÓN CONFIRMADA**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REAGENDAR CITA                                   │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 📅 Consulta General - Dr. Pedro Sánchez                                │ │
│ │ Actual: 2025-06-05 08:00 → Nueva: 2025-12-20 14:30                     │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ✅ NUEVA CITA SELECCIONADA                                             │ │
│ │                                                                         │ │
│ │ 📅 Viernes, 20 de Diciembre de 2024                                    │ │
│ │ 🕐 14:30 - 15:00 (30 minutos)                                          │ │
│ │ 👨‍⚕️ Dr. Pedro Sánchez                                                  │ │
│ │ 🏥 Sede Principal                                                       │ │
│ │ 🩺 Consulta General                                                     │ │
│ │                                                                         │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ ℹ️ INFORMACIÓN IMPORTANTE                                           │ │ │
│ │ │                                                                     │ │ │
│ │ │ • Tu cita anterior será cancelada automáticamente                   │ │ │
│ │ │ • Recibirás confirmación por email y SMS                           │ │ │
│ │ │ • Puedes cancelar hasta 24h antes sin costo                        │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│                    [Volver]                [✅ Confirmar Reagendado]        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📱 **VERSIÓN MÓVIL**

### **VISTA COMPACTA MÓVIL**

```
┌─────────────────────────────┐
│ ← Reagendar Cita         ⋮ │
├─────────────────────────────┤
│ 📅 Consulta General         │
│ Dr. Pedro Sánchez           │
│ Actual: 05/06 08:00         │
├─────────────────────────────┤
│ 🌟 RECOMENDADO              │
│                             │
│ ┌─────────────────────────┐ │
│ │ 🕘 Mañ 19 Dic           │ │
│ │ 09:00 - 09:30           │ │
│ │ ⭐ Popular (80%)         │ │
│ │ [Seleccionar]           │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ 🕐 Tar 20 Dic           │ │
│ │ 14:30 - 15:00           │ │
│ │ 🕐 Flexible             │ │
│ │ [Seleccionar]           │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ 📅 MÁS HORARIOS             │
│                             │
│ 🌅 Mañana (6) 🌇 Tarde (4)  │
│ 🌙 Noche (2)  📅 Más fechas │
├─────────────────────────────┤
│ [Cancelar] [Confirmar]      │
└─────────────────────────────┘
```

## 🎨 **SISTEMA DE ICONOS Y COLORES**

### **ICONOGRAFÍA**

```
📅 Fechas y calendario
🕐 Horarios específicos
👨‍⚕️ Doctores
🏥 Ubicaciones
🩺 Servicios médicos
⭐ Recomendaciones
🌟 Destacados
🔴 Baja disponibilidad
🟡 Media disponibilidad
🟢 Alta disponibilidad
⚫ No disponible
🌅 Mañana
🌇 Tarde
🌙 Noche
✅ Confirmado
❌ Cancelado
🔄 Cargando
💡 Sugerencias
🔔 Notificaciones
```

### **PALETA DE COLORES**

```
DISPONIBILIDAD:
🟢 Verde:  #10B981 (Alta - 6+ slots)
🟡 Amarillo: #F59E0B (Media - 3-5 slots)
🔴 Rojo:   #EF4444 (Baja - 1-2 slots)
⚫ Gris:   #6B7280 (No disponible)

ESTADOS:
🔵 Azul:   #3B82F6 (Seleccionado)
🟣 Púrpura: #8B5CF6 (Recomendado)
🟠 Naranja: #F97316 (Advertencia)

FONDOS:
⚪ Blanco:  #FFFFFF (Principal)
🔘 Gris claro: #F9FAFB (Secundario)
🔘 Gris medio: #F3F4F6 (Deshabilitado)
```

## 🔄 **FLUJOS DE INTERACCIÓN**

### **FLUJO PRINCIPAL: SELECCIÓN RÁPIDA**

```
1. Usuario abre modal
   ↓
2. Sistema carga sugerencias inteligentes
   ↓
3. Usuario ve 3 opciones recomendadas
   ↓
4. Usuario hace clic en una opción
   ↓
5. Sistema muestra confirmación
   ↓
6. Usuario confirma reagendado
   ↓
7. Sistema procesa y confirma
```

### **FLUJO ALTERNATIVO: EXPLORACIÓN DETALLADA**

```
1. Usuario abre modal
   ↓
2. Usuario hace clic en "Ver más fechas"
   ↓
3. Sistema muestra vista semanal
   ↓
4. Usuario navega entre semanas
   ↓
5. Usuario selecciona día específico
   ↓
6. Sistema muestra slots del día
   ↓
7. Usuario selecciona slot
   ↓
8. Sistema muestra confirmación
   ↓
9. Usuario confirma reagendado
```

### **FLUJO DE ERROR: SIN DISPONIBILIDAD**

```
1. Usuario abre modal
   ↓
2. Sistema no encuentra disponibilidad
   ↓
3. Sistema muestra mensaje explicativo
   ↓
4. Sistema ofrece alternativas:
   - Próxima semana
   - Otro doctor
   - Notificaciones
   ↓
5. Usuario selecciona alternativa
   ↓
6. Sistema redirige al flujo apropiado
```

**Estos wireframes proporcionan una base sólida para la implementación de las mejoras de UX, priorizando la claridad visual, la eficiencia de navegación y la reducción de fricción en el proceso de reagendado de citas.**
