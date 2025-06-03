# 🎨 **WIREFRAMES: SISTEMA MANUAL DE CAMBIO DE ESTADOS**

## 📋 **INTERFAZ MEJORADA vs. SISTEMA ACTUAL**

### **ANTES: Ciclo Automático Limitado**
```
┌─────────────────────────────────────────────────────────────────┐
│ [📅 Hoy] [🕐 10:30 AM] [🟡 Pendiente] ← Click (solo 3 estados) │
│                                                                 │
│ Consulta General • Dr. Juan Pérez • María González             │
│ [👁️ Ver] [✏️ Reagendar] [❌ Cancelar]                          │
└─────────────────────────────────────────────────────────────────┘

❌ PROBLEMAS:
- Solo 3 estados: pending → confirmed → completed
- Sin diferenciación de cancelaciones
- Sin captura de razones
- Sin validación de permisos
```

### **DESPUÉS: Control Manual Granular**
```
┌─────────────────────────────────────────────────────────────────┐
│ [📅 Hoy] [🕐 10:30 AM] [🟡 Pendiente ▼] ← Dropdown inteligente │
│                        ┌─────────────────────────────────────┐  │
│                        │ 💰 Pendiente de Pago               │  │
│                        │ ✅ Confirmada                       │  │
│                        │ ❌ Cancelada por Clínica • Confirm │  │
│                        └─────────────────────────────────────┘  │
│ Consulta General • Dr. Juan Pérez • María González             │
│ [👁️ Ver] [✏️ Reagendar] [❌ Cancelar]                          │
└─────────────────────────────────────────────────────────────────┘

✅ MEJORAS:
- 10 estados completos según rol
- Iconografía visual clara
- Confirmación para cambios críticos
- Captura de razones obligatorias
```

---

## 🎯 **FLUJO DE INTERACCIÓN DETALLADO**

### **Paso 1: Estado Inicial**
```
┌─────────────────────────────────────────────────────────────────┐
│ [📅 Mar, 3 jun] [🕐 9:00 AM] [🟡 Pendiente ▼]                  │
│                                                                 │
│ 🩺 Consulta General                                             │
│ 👨‍⚕️ Dr. Sofía Torres • 👤 Carmen Ruiz                           │
│ 📍 Consultorio 1 • 💰 Consultar                                │
│                                                                 │
│ [👁️] [✏️ Reagendar] [❌ Cancelar]                               │
└─────────────────────────────────────────────────────────────────┘
```

### **Paso 2: Click en Badge de Estado**
```
┌─────────────────────────────────────────────────────────────────┐
│ [📅 Mar, 3 jun] [🕐 9:00 AM] [🟡 Pendiente ▼]                  │
│                        ┌─────────────────────────────────────┐  │
│                        │ Cambiar estado a:                   │  │
│                        ├─────────────────────────────────────┤  │
│                        │ 💰 Pendiente de Pago               │  │
│                        │    Requiere pago de depósito       │  │
│                        ├─────────────────────────────────────┤  │
│                        │ ✅ Confirmada                       │  │
│                        │    Cita confirmada y programada    │  │
│                        ├─────────────────────────────────────┤  │
│                        │ ❌ Cancelada por Clínica           │  │
│                        │    Cancelada por la clínica        │  │
│                        │    • Requiere confirmación         │  │
│                        └─────────────────────────────────────┘  │
│ 🩺 Consulta General                                             │
│ 👨‍⚕️ Dr. Sofía Torres • 👤 Carmen Ruiz                           │
└─────────────────────────────────────────────────────────────────┘
```

### **Paso 3: Selección de Estado Crítico**
```
┌─────────────────────────────────────────────────────────────────┐
│                    CONFIRMAR CAMBIO DE ESTADO                  │
│                                                                 │
│ [❌] ¿Está seguro que desea cambiar el estado a:               │
│      "Cancelada por Clínica"?                                  │
│                                                                 │
│ Motivo del cambio *                                             │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Doctor no disponible por emergencia médica                 │ │
│ │                                                             │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                              [Cancelar] [✅ Confirmar]         │
└─────────────────────────────────────────────────────────────────┘
```

### **Paso 4: Estado Actualizado**
```
┌─────────────────────────────────────────────────────────────────┐
│ [📅 Mar, 3 jun] [🕐 9:00 AM] [🔴 Cancelada por Clínica]        │
│                                                                 │
│ 🩺 Consulta General                                             │
│ 👨‍⚕️ Dr. Sofía Torres • 👤 Carmen Ruiz                           │
│ 📍 Consultorio 1 • 💰 Consultar                                │
│                                                                 │
│ ℹ️ Motivo: Doctor no disponible por emergencia médica          │
│                                                                 │
│ [👁️] [Estado Final - No modificable]                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 **DISEÑO VISUAL POR ROL**

### **STAFF/ADMIN: Control Completo**
```
Dropdown Estados Disponibles:
┌─────────────────────────────────────────────────────────────┐
│ 💰 Pendiente de Pago        │ Requiere depósito             │
│ ✅ Confirmada               │ Cita confirmada               │
│ 🔄 Reagendada              │ Reprogramada • Requiere razón │
│ ▶️ En Curso                │ Consulta en progreso          │
│ ✅ Completada              │ Consulta finalizada           │
│ 👤 Cancelada por Paciente  │ Cancelación • Requiere razón  │
│ 🏥 Cancelada por Clínica   │ Cancelación • Requiere razón  │
│ ⚠️ No Show                 │ Ausencia • Requiere razón     │
└─────────────────────────────────────────────────────────────┘
```

### **DOCTOR: Estados Clínicos**
```
Dropdown Estados Disponibles:
┌─────────────────────────────────────────────────────────────┐
│ ▶️ En Curso                │ Iniciar consulta              │
│ ✅ Completada              │ Finalizar consulta            │
│ ⚠️ No Show                 │ Paciente no se presentó       │
└─────────────────────────────────────────────────────────────┘
```

### **PATIENT: Estados Limitados**
```
Dropdown Estados Disponibles:
┌─────────────────────────────────────────────────────────────┐
│ 👤 Cancelar mi Cita        │ Cancelación • Requiere razón  │
│ 🔄 Solicitar Reagendar     │ Reprogramar • Requiere razón  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 **DISEÑO RESPONSIVE**

### **Desktop (>768px)**
```
┌─────────────────────────────────────────────────────────────────┐
│ [📅 Fecha] [🕐 Hora] [🟡 Estado ▼] │ Servicio • Doctor • Paciente │ [Acciones] │
└─────────────────────────────────────────────────────────────────┘
```

### **Tablet (768px)**
```
┌─────────────────────────────────────────────────────────────────┐
│ [📅 Fecha] [🕐 Hora] [🟡 Estado ▼]                              │
│ Servicio • Doctor • Paciente                    [Acciones]     │
└─────────────────────────────────────────────────────────────────┘
```

### **Mobile (<768px)**
```
┌─────────────────────────────────────────────────────────────────┐
│ [📅 Fecha] [🕐 Hora]                                            │
│ [🟡 Estado ▼]                                                   │
│ Servicio • Doctor                                               │
│ 👤 Paciente                                                     │
│                                              [Acciones]        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 **ESPECIFICACIONES TÉCNICAS**

### **Componente StatusChangeDropdown**
```tsx
<StatusChangeDropdown
  appointmentId="apt-123"
  currentStatus="pending"
  userRole="staff"
  availableTransitions={["pendiente_pago", "confirmed", "cancelada_clinica"]}
  onStatusChange={async (newStatus, reason) => {
    // Validación + API call + Auditoría
  }}
  size="sm"
  disabled={false}
/>
```

### **Estados que Requieren Confirmación**
- `cancelada_paciente` - Impacto en paciente
- `cancelada_clinica` - Impacto operativo  
- `no_show` - Registro de ausencia
- `completed` - Finalización definitiva

### **Estados que Requieren Razón Obligatoria**
- `cancelada_paciente` - Motivo de cancelación
- `cancelada_clinica` - Motivo operativo
- `no_show` - Detalles de ausencia
- `reagendada` - Motivo de reprogramación

### **Validación de Transiciones**
```tsx
// Ejemplo: Staff puede cambiar pending → confirmed
const isValid = isValidTransition('pending', 'confirmed', 'staff'); // true

// Ejemplo: Patient NO puede cambiar confirmed → completed  
const isValid = isValidTransition('confirmed', 'completed', 'patient'); // false
```

---

## ✅ **BENEFICIOS DE LA NUEVA INTERFAZ**

### **Para Personal Administrativo**
- ✅ **Control granular** sobre todos los estados
- ✅ **Diferenciación clara** entre tipos de cancelación
- ✅ **Captura automática** de razones para auditoría
- ✅ **Validación en tiempo real** de permisos
- ✅ **Interfaz intuitiva** con iconografía médica

### **Para Doctores**
- ✅ **Estados clínicos específicos** (en_curso, completed, no_show)
- ✅ **Control durante consulta** sin interferencia administrativa
- ✅ **Registro simple** de ausencias de pacientes

### **Para Pacientes**
- ✅ **Acciones limitadas** pero claras (cancelar, reagendar)
- ✅ **Captura de motivos** para mejor comunicación
- ✅ **Interfaz simplificada** sin opciones confusas

### **Para el Sistema**
- ✅ **Auditoría completa** con razones documentadas
- ✅ **Cumplimiento médico** con trazabilidad total
- ✅ **Notificaciones automáticas** según tipo de cambio
- ✅ **Validación robusta** de reglas de negocio

---

## 🚀 **IMPLEMENTACIÓN INMEDIATA**

La nueva interfaz está **lista para implementación** y reemplazará completamente el sistema de ciclo automático limitado, proporcionando al personal administrativo el **control granular necesario** para gestionar eficientemente el flujo de trabajo médico diario.
