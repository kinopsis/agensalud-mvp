# 📱 Guía de Configuración WhatsApp Business - AgentSalud MVP

**Versión**: 1.0  
**Fecha**: Enero 2025  
**Audiencia**: Clientes Piloto y Administradores  
**Tiempo Estimado**: 15-30 minutos

## 📋 Resumen

Esta guía te ayudará a configurar WhatsApp Business en AgentSalud MVP para recibir y gestionar citas médicas a través de mensajes de WhatsApp. El proceso incluye la creación de una instancia, conexión mediante código QR, y configuración de respuestas automáticas.

### ✅ Requisitos Previos
- [ ] Cuenta activa en AgentSalud MVP
- [ ] Rol de Administrador en tu organización
- [ ] Número de teléfono dedicado para WhatsApp Business
- [ ] WhatsApp Business instalado en tu teléfono
- [ ] Acceso a internet estable

## 🚀 Paso 1: Acceder al Dashboard de Canales

### 1.1 Iniciar Sesión
1. Ve a [https://staging.agentsalud.com](https://staging.agentsalud.com)
2. Inicia sesión con tus credenciales de administrador
3. Navega a **"Canales"** en el menú principal

### 1.2 Verificar Permisos
- Asegúrate de tener rol **Admin** o **SuperAdmin**
- Si no tienes acceso, contacta a tu administrador principal

## 📱 Paso 2: Crear Instancia WhatsApp

### 2.1 Nueva Instancia
1. Haz clic en **"+ Nueva Instancia"**
2. Selecciona **"WhatsApp Business"** como tipo de canal
3. Completa el formulario:

```
Nombre de la Instancia: [Ej: "Clínica Central WhatsApp"]
Número de Teléfono: [Ej: +57300123456]
Descripción: [Ej: "Canal principal para citas médicas"]
```

### 2.2 Configuración Avanzada
```
✅ Respuestas Automáticas: Habilitado
✅ IA para Agendamiento: Habilitado
✅ Horarios de Atención: 8:00 AM - 6:00 PM
✅ Notificaciones: Habilitado
```

### 2.3 Crear Instancia
- Haz clic en **"Crear Instancia"**
- Espera la confirmación (5-10 segundos)

## 🔗 Paso 3: Conectar WhatsApp mediante QR

### 3.1 Generar Código QR
1. En la lista de instancias, busca tu nueva instancia
2. Haz clic en **"Conectar"** o el ícono de QR
3. Se generará un código QR automáticamente

### 3.2 Escanear con WhatsApp Business
1. Abre **WhatsApp Business** en tu teléfono
2. Ve a **Configuración** → **Dispositivos Vinculados**
3. Toca **"Vincular un dispositivo"**
4. Escanea el código QR mostrado en pantalla

### 3.3 Verificar Conexión
- El estado cambiará a **"Conectado"** (verde)
- Recibirás un mensaje de confirmación en WhatsApp
- El QR desaparecerá automáticamente

> ⚠️ **Importante**: El código QR expira en 60 segundos. Si no lo escaneas a tiempo, se generará uno nuevo automáticamente.

## ⚙️ Paso 4: Configurar Respuestas Automáticas

### 4.1 Mensaje de Bienvenida
```
¡Hola! 👋 Bienvenido a [Nombre de tu Clínica].

Puedo ayudarte a:
📅 Agendar una cita médica
📋 Consultar tus citas existentes
📞 Obtener información de contacto
🕐 Conocer nuestros horarios

¿En qué puedo ayudarte hoy?
```

### 4.2 Horarios de Atención
```
Horarios de Atención:
🕐 Lunes a Viernes: 8:00 AM - 6:00 PM
🕐 Sábados: 8:00 AM - 2:00 PM
🚫 Domingos: Cerrado

Fuera de horario, responderemos tu mensaje lo antes posible.
```

### 4.3 Mensaje de Agendamiento
```
Para agendar una cita, puedes decirme:
• "Necesito una cita con cardiología"
• "Quiero agendar para mañana"
• "Disponibilidad para la próxima semana"

¿Qué tipo de cita necesitas? 🏥
```

## 🤖 Paso 5: Probar la Integración AI

### 5.1 Enviar Mensaje de Prueba
Desde otro teléfono, envía un mensaje como:
```
"Hola, necesito una cita con cardiología para la próxima semana"
```

### 5.2 Verificar Respuesta AI
El sistema debe responder automáticamente con:
```
¡Hola! Te ayudo a agendar tu cita con cardiología. 

Tengo disponibilidad para la próxima semana:
📅 Martes 30 de Enero - 10:00 AM con Dr. García
📅 Miércoles 31 de Enero - 2:00 PM con Dr. López
📅 Jueves 1 de Febrero - 9:00 AM con Dr. García

¿Cuál prefieres? Responde con el número de opción.
```

### 5.3 Completar Agendamiento
1. Responde con tu opción preferida
2. Confirma tus datos personales
3. Recibe confirmación de la cita

## 📊 Paso 6: Monitorear Actividad

### 6.1 Dashboard de Métricas
En el dashboard de canales verás:
- **Mensajes 24h**: Cantidad de mensajes recibidos
- **Conversaciones 24h**: Conversaciones únicas
- **Citas Agendadas**: Citas creadas via WhatsApp
- **Tasa de Éxito**: Porcentaje de conversiones

### 6.2 Alertas y Notificaciones
- **Desconexión**: Si WhatsApp se desconecta
- **Errores**: Si hay problemas con la AI
- **Volumen Alto**: Si hay muchos mensajes pendientes

## 🔧 Solución de Problemas Comunes

### ❌ Problema: QR No Se Genera
**Solución**:
1. Actualiza la página (F5)
2. Verifica tu conexión a internet
3. Contacta soporte si persiste

### ❌ Problema: WhatsApp No Se Conecta
**Solución**:
1. Verifica que el número sea correcto
2. Asegúrate de usar WhatsApp Business (no WhatsApp normal)
3. Intenta con un QR nuevo

### ❌ Problema: AI No Responde
**Solución**:
1. Verifica que la IA esté habilitada
2. Revisa los horarios de atención
3. Comprueba el estado de la instancia

### ❌ Problema: Mensajes No Llegan
**Solución**:
1. Verifica el estado de conexión (debe estar verde)
2. Revisa la configuración de webhooks
3. Contacta soporte técnico

## 📞 Soporte y Contacto

### 🆘 Soporte Técnico
- **Email**: soporte@agentsalud.com
- **WhatsApp**: +57 300 123 4567
- **Horario**: Lunes a Viernes, 8:00 AM - 6:00 PM

### 📚 Recursos Adicionales
- [Documentación Completa](https://docs.agentsalud.com)
- [Videos Tutoriales](https://youtube.com/agentsalud)
- [FAQ](https://agentsalud.com/faq)

## ✅ Checklist de Configuración Completa

- [ ] Instancia WhatsApp creada exitosamente
- [ ] Código QR escaneado y conectado
- [ ] Estado de conexión: **Conectado** (verde)
- [ ] Respuestas automáticas configuradas
- [ ] Mensaje de prueba enviado y respondido
- [ ] AI procesando solicitudes correctamente
- [ ] Métricas visibles en dashboard
- [ ] Equipo capacitado en uso básico

## 🎯 Próximos Pasos

### Después de la Configuración
1. **Capacitar al Equipo**: Asegúrate de que tu personal sepa cómo funciona
2. **Promocionar el Canal**: Informa a tus pacientes sobre WhatsApp
3. **Monitorear Métricas**: Revisa diariamente el rendimiento
4. **Optimizar Respuestas**: Ajusta mensajes según feedback

### Funcionalidades Avanzadas (Próximamente)
- 📞 **Llamadas de Voz**: Integración con agentes de voz
- 📱 **Telegram**: Canal adicional de comunicación
- 📊 **Analytics Avanzados**: Reportes detallados
- 🔄 **Integraciones**: Conexión con otros sistemas

---

**¿Necesitas ayuda?** Nuestro equipo está disponible para asistirte en cada paso del proceso. ¡No dudes en contactarnos!

**Última Actualización**: Enero 2025  
**Versión del Sistema**: AgentSalud MVP v1.0
