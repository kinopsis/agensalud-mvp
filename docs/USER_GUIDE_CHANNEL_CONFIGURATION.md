# 📖 **GUÍA DE USUARIO: CONFIGURACIÓN DE CANALES**

## 🎯 **Introducción**

Esta guía te ayudará a configurar y gestionar los canales de comunicación en AgentSalud MVP desde el dashboard unificado. Aprenderás a configurar WhatsApp, gestionar instancias y optimizar el rendimiento de tu asistente IA.

---

## 🚀 **Acceso al Dashboard de Canales**

### **Paso 1: Navegación**

1. Inicia sesión en AgentSalud con tu cuenta de administrador
2. En el menú lateral, busca **"Canales de Comunicación"**
3. Haz clic para acceder al dashboard unificado

### **Paso 2: Vista General**

El dashboard te mostrará:
- **Métricas en tiempo real**: Canales activos, conversaciones, citas creadas
- **Tabs por canal**: WhatsApp, Telegram, Voice (próximamente)
- **Lista de instancias**: Cards con información y acciones

---

## ⚙️ **Configuración de WhatsApp**

### **Crear Nueva Instancia**

1. En el tab de **WhatsApp**, haz clic en **"Crear Instancia"**
2. Completa la información básica:
   - **Nombre de instancia**: Ej. "WhatsApp Consultas"
   - **Número de teléfono**: Formato internacional (+57300123456)
   - **URL de webhook**: Tu endpoint para recibir eventos

### **Configurar Evolution API**

La integración con WhatsApp requiere Evolution API:

1. **URL Base**: Dirección de tu servidor Evolution API
2. **API Key**: Clave de autenticación (mantén segura)
3. **Nombre de instancia**: Identificador único en Evolution API

> 💡 **Tip**: Usa el botón "Probar Conexión" para verificar la configuración

---

## 🔧 **Configuración Avanzada**

### **Sección General**

#### **Respuesta Automática**
- **Habilitada**: El asistente IA responde automáticamente
- **Deshabilitada**: Solo procesa mensajes sin responder

#### **Límites del Sistema**
- **Chats Concurrentes**: Máximo 100 (recomendado)
- **Mensajes por Minuto**: Máximo 60 (evita bloqueos de WhatsApp)
- **Timeout de Sesión**: 30 minutos (libera recursos automáticamente)

### **Sección Webhook**

#### **Configuración de URL**
```
https://tu-dominio.com/api/channels/whatsapp/webhook
```

#### **Eventos Recomendados**
- ✅ **Mensaje Recibido**: Esencial para procesamiento
- ✅ **Actualización de Conexión**: Monitoreo de estado
- ✅ **Cita Creada**: Seguimiento de conversiones
- ⚠️ **Mensaje Enviado**: Solo si necesitas auditoría completa

#### **Secreto de Webhook**
- Usa el botón **"Generar"** para crear un secreto seguro
- Guarda el secreto en tu sistema para validar eventos

### **Sección Inteligencia Artificial**

#### **Selección de Modelo**

| Modelo | Velocidad | Inteligencia | Costo | Recomendado para |
|--------|-----------|--------------|-------|------------------|
| **GPT-3.5 Turbo** | ⚡ Rápido | 🧠 Buena | 💰 Bajo | Consultas generales |
| **GPT-4** | 🐌 Lento | 🧠🧠🧠 Excelente | 💰💰💰 Alto | Casos complejos |
| **GPT-4 Turbo** | ⚡ Rápido | 🧠🧠 Muy buena | 💰💰 Medio | **Recomendado** |

#### **Configuración de Creatividad**

- **Muy Conservador (0.1)**: Respuestas muy predecibles
- **Conservador (0.3)**: Respuestas consistentes
- **Balanceado (0.7)**: **Recomendado para medicina**
- **Creativo (1.0)**: Más variación en respuestas
- **Muy Creativo (1.5)**: Máxima creatividad (no recomendado)

#### **Parámetros Avanzados**
- **Máximo de Tokens**: 500-1000 (balance entre detalle y velocidad)
- **Timeout**: 30 segundos (evita esperas largas)

### **Sección WhatsApp Específica**

#### **Configuración de Número**
- Usa el formato internacional completo: `+57300123456`
- Verifica que el número esté registrado en WhatsApp Business

#### **Códigos QR**
- **Habilitado**: Permite conexión por QR
- **Auto-renovación**: Renueva automáticamente códigos expirados
- **Intervalo**: 5 minutos (recomendado)

#### **Características de WhatsApp**
- **Confirmaciones de Lectura**: ✅ Recomendado
- **Indicador de Escritura**: ✅ Mejora UX
- **Actualizaciones de Presencia**: ⚠️ Opcional

---

## 📊 **Monitoreo y Métricas**

### **Métricas del Dashboard**

#### **Canales Activos**
- Número de instancias conectadas
- Estado de conexión en tiempo real

#### **Conversaciones Hoy**
- Total de conversaciones iniciadas en 24h
- Incluye todas las instancias activas

#### **Citas Creadas**
- Conversiones exitosas a citas médicas
- Métrica clave de rendimiento del asistente

### **Métricas por Instancia**

Cada card de instancia muestra:
- **Mensajes 24h**: Volumen de mensajes procesados
- **Conversaciones**: Hilos de conversación activos
- **Citas**: Citas generadas por esta instancia
- **Teléfono**: Número asociado a la instancia

---

## 🔍 **Solución de Problemas**

### **Problemas Comunes**

#### **Instancia Desconectada**
1. Verifica la conexión a internet
2. Revisa la configuración de Evolution API
3. Usa "Probar Conexión" en configuración
4. Reinicia la instancia si es necesario

#### **No Recibe Mensajes**
1. Verifica la configuración del webhook
2. Comprueba que los eventos estén suscritos
3. Revisa los logs del servidor
4. Usa "Probar Webhook" para validar conectividad

#### **IA No Responde**
1. Verifica que la IA esté habilitada
2. Comprueba el modelo seleccionado
3. Revisa los límites de tokens
4. Verifica la configuración de auto-respuesta

#### **Códigos QR No Aparecen**
1. Asegúrate de que QR esté habilitado
2. Verifica el estado de la instancia
3. Intenta refrescar el código QR
4. Revisa la configuración de Evolution API

### **Estados de Instancia**

| Estado | Descripción | Acción Recomendada |
|--------|-------------|-------------------|
| 🟢 **Conectado** | Funcionando correctamente | Ninguna |
| 🟡 **Conectando** | Estableciendo conexión | Esperar 1-2 minutos |
| 🔴 **Desconectado** | Sin conexión | Verificar configuración |
| ⚠️ **Error** | Error en la configuración | Revisar logs y configuración |
| 🔧 **Mantenimiento** | En mantenimiento | Esperar finalización |

---

## 💡 **Mejores Prácticas**

### **Configuración Inicial**
1. **Comienza simple**: Habilita solo funciones básicas
2. **Prueba gradualmente**: Agrega características una por una
3. **Monitorea métricas**: Observa el rendimiento antes de escalar
4. **Documenta cambios**: Mantén registro de configuraciones

### **Optimización de Rendimiento**
1. **Ajusta límites**: Según tu capacidad de servidor
2. **Optimiza IA**: Usa el modelo apropiado para tu caso
3. **Gestiona webhooks**: Suscríbete solo a eventos necesarios
4. **Monitorea regularmente**: Revisa métricas semanalmente

### **Seguridad**
1. **Protege API Keys**: Nunca compartas claves de acceso
2. **Usa HTTPS**: Siempre para webhooks y APIs
3. **Rota secretos**: Cambia secretos periódicamente
4. **Audita accesos**: Revisa logs de configuración

### **Escalabilidad**
1. **Planifica crecimiento**: Considera límites futuros
2. **Distribuye carga**: Usa múltiples instancias si es necesario
3. **Optimiza recursos**: Ajusta timeouts y límites
4. **Prepara respaldos**: Mantén configuraciones documentadas

---

## 📞 **Soporte**

### **Recursos de Ayuda**
- **Documentación Técnica**: `/docs/CHANNEL_SYSTEM_ARCHITECTURE.md`
- **Guía de APIs**: `/docs/API_DOCUMENTATION.md`
- **Logs del Sistema**: Panel de administración → Logs

### **Contacto**
- **Email**: soporte@agentsalud.com
- **Documentación**: [docs.agentsalud.com](https://docs.agentsalud.com)
- **Estado del Sistema**: [status.agentsalud.com](https://status.agentsalud.com)

---

**Última actualización**: 2025-01-28  
**Versión**: 1.0.0  
**Equipo**: AgentSalud Development Team
