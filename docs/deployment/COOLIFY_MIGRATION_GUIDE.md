# 🚀 AgentSalud MVP - Guía de Migración a Coolify

## 📋 Resumen Ejecutivo

Esta guía te ayudará a migrar AgentSalud MVP desde Vercel a Coolify, obteniendo mayor control sobre la infraestructura, costos más predecibles y mejor compliance para aplicaciones médicas.

## 🎯 Ventajas de Coolify para AgentSalud

### **Beneficios Específicos:**
- **🏥 HIPAA Compliance**: Control total sobre datos médicos sensibles
- **💰 Costos Predecibles**: Sin sorpresas en facturación, ideal para startups
- **📱 WhatsApp Estable**: Webhooks más confiables para Evolution API
- **🔒 Seguridad Avanzada**: Control completo sobre configuración de seguridad
- **⚡ Performance**: Optimización específica para tu caso de uso
- **🔧 Flexibilidad**: Configuración personalizada para todos los servicios

### **Comparación Vercel vs Coolify:**
| Aspecto | Vercel | Coolify |
|---------|--------|---------|
| **Costo mensual** | $20-200+ | $5-50 |
| **Control infraestructura** | Limitado | Total |
| **HIPAA Compliance** | Complejo | Nativo |
| **WhatsApp Webhooks** | Inestable | Estable |
| **Base de datos** | Externa | Integrada |
| **Backup control** | Limitado | Total |

## 📋 Plan de Migración Paso a Paso

### **Fase 1: Preparación (1-2 días)**

#### **1.1 Configurar Servidor Coolify**
```bash
# Instalar Coolify en tu servidor
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# Acceder al dashboard
https://tu-servidor.com:8000
```

#### **1.2 Preparar Archivos de Configuración**
```bash
# Copiar archivos de configuración
cp .env.coolify.example .env
cp docker-compose.yml ./
cp Dockerfile ./

# Configurar variables de entorno
nano .env
```

#### **1.3 Configurar DNS**
```bash
# Configurar registros DNS
A record: agentsalud.com → IP_DEL_SERVIDOR
A record: evolution.agentsalud.com → IP_DEL_SERVIDOR
A record: *.agentsalud.com → IP_DEL_SERVIDOR
```

### **Fase 2: Migración de Base de Datos (1 día)**

#### **2.1 Backup de Supabase**
```bash
# Exportar datos desde Supabase
pg_dump "postgresql://user:pass@host:5432/db" > backup.sql

# O usar Supabase CLI
supabase db dump --file backup.sql
```

#### **2.2 Configurar PostgreSQL en Coolify**
```bash
# El PostgreSQL se configura automáticamente con docker-compose
# Verificar configuración en .env:
POSTGRES_DB=agentsalud
POSTGRES_USER=agentsalud
POSTGRES_PASSWORD=tu_password_seguro
```

#### **2.3 Importar Datos**
```bash
# Importar backup a nueva base de datos
docker-compose exec postgres psql -U agentsalud -d agentsalud < backup.sql
```

### **Fase 3: Deployment (1 día)**

#### **3.1 Ejecutar Deployment**
```bash
# Hacer ejecutable el script
chmod +x scripts/deploy-coolify.sh

# Ejecutar deployment
./scripts/deploy-coolify.sh
```

#### **3.2 Configurar SSL**
```bash
# En el dashboard de Coolify:
# 1. Ir a tu proyecto
# 2. Configurar dominios
# 3. Habilitar SSL automático
# 4. Verificar certificados
```

#### **3.3 Configurar Evolution API**
```bash
# Evolution API se despliega automáticamente
# Verificar en: https://evolution.agentsalud.com
# Configurar webhooks: https://agentsalud.com/api/webhooks/evolution
```

### **Fase 4: Validación y Optimización (1 día)**

#### **4.1 Testing Completo**
```bash
# Ejecutar tests de validación
node scripts/validate-coolify-deployment.js

# Tests manuales:
# - Autenticación de usuarios
# - Creación de citas
# - Integración WhatsApp
# - APIs funcionando
```

#### **4.2 Configurar Monitoreo**
```bash
# Configurar en Coolify dashboard:
# - Health checks
# - Resource monitoring
# - Log aggregation
# - Backup automation
```

## 🔧 Configuración Detallada

### **Variables de Entorno Críticas**
```bash
# Aplicación principal
NEXT_PUBLIC_APP_URL=https://agentsalud.com
NEXTAUTH_SECRET=tu_secret_32_caracteres_minimo
DATABASE_URL=postgresql://agentsalud:password@postgres:5432/agentsalud

# WhatsApp/Evolution API
EVOLUTION_API_BASE_URL=https://evolution.agentsalud.com
EVOLUTION_API_KEY=tu_evolution_api_key
WEBHOOK_GLOBAL_URL=https://agentsalud.com/api/webhooks/evolution

# OpenAI
OPENAI_API_KEY=tu_openai_api_key

# Redis
REDIS_URL=redis://:password@redis:6379
```

### **Configuración de Nginx**
El archivo `nginx/nginx.conf` incluye:
- SSL termination
- Rate limiting
- Security headers
- Proxy para Evolution API
- Compresión gzip
- Cache optimization

### **Configuración de Docker**
- **Multi-stage build** para optimización
- **Health checks** para todos los servicios
- **Volumes persistentes** para datos
- **Networks aisladas** para seguridad
- **Resource limits** para estabilidad

## 📊 Monitoreo y Mantenimiento

### **Dashboard de Coolify**
- **Resource usage**: CPU, RAM, Disk
- **Service status**: Todos los contenedores
- **Logs centralizados**: Aplicación y servicios
- **Backup status**: Automático y manual

### **Monitoreo Externo Recomendado**
```bash
# Uptime monitoring
- UptimeRobot: https://agentsalud.com/api/health
- Pingdom: Monitoreo desde múltiples ubicaciones

# Error tracking
- Sentry: Configurado en variables de entorno
- LogRocket: Para debugging de frontend

# Performance monitoring
- New Relic: APM completo
- DataDog: Infraestructura y aplicación
```

### **Backup Automático**
```bash
# Configurar en Coolify:
# 1. Database backup diario
# 2. Files backup semanal
# 3. Configuration backup mensual
# 4. Retention: 30 días
```

## 🚨 Troubleshooting

### **Problemas Comunes y Soluciones**

#### **1. Aplicación no inicia**
```bash
# Verificar logs
docker-compose logs agentsalud-app

# Verificar variables de entorno
docker-compose exec agentsalud-app env | grep -E "(DATABASE|NEXTAUTH|OPENAI)"

# Reiniciar servicios
docker-compose restart agentsalud-app
```

#### **2. Base de datos no conecta**
```bash
# Verificar PostgreSQL
docker-compose exec postgres pg_isready -U agentsalud

# Verificar conexión desde app
docker-compose exec agentsalud-app npm run db:test

# Verificar logs de PostgreSQL
docker-compose logs postgres
```

#### **3. WhatsApp no funciona**
```bash
# Verificar Evolution API
curl https://evolution.agentsalud.com/manager/status

# Verificar webhooks
curl -X POST https://agentsalud.com/api/webhooks/evolution/test

# Reiniciar Evolution API
docker-compose restart evolution-api
```

#### **4. SSL no funciona**
```bash
# Verificar certificados en Coolify dashboard
# Regenerar certificados si es necesario
# Verificar DNS records
# Verificar nginx configuration
```

## 💰 Análisis de Costos

### **Coolify vs Vercel - Proyección Anual**

| Concepto | Vercel | Coolify |
|----------|--------|---------|
| **Hosting** | $2,400/año | $600/año |
| **Base de datos** | $1,200/año | $0 (incluido) |
| **Bandwidth** | $600/año | $0 (incluido) |
| **SSL** | $0 | $0 |
| **Monitoring** | $300/año | $100/año |
| **Total** | **$4,500/año** | **$700/año** |
| **Ahorro** | - | **$3,800/año** |

### **ROI de la Migración**
- **Tiempo de migración**: 4-5 días
- **Costo de migración**: $2,000 (tiempo desarrollador)
- **Ahorro anual**: $3,800
- **ROI**: 190% en el primer año

## ✅ Checklist de Migración

### **Pre-migración**
- [ ] Servidor Coolify configurado
- [ ] DNS records configurados
- [ ] Backup de Supabase realizado
- [ ] Variables de entorno configuradas
- [ ] Archivos Docker preparados

### **Durante migración**
- [ ] Servicios desplegados correctamente
- [ ] Base de datos migrada
- [ ] SSL configurado
- [ ] Evolution API funcionando
- [ ] Tests de funcionalidad pasados

### **Post-migración**
- [ ] Monitoreo configurado
- [ ] Backups automáticos activos
- [ ] Performance optimizado
- [ ] Equipo entrenado
- [ ] Documentación actualizada

## 🎉 Beneficios Post-Migración

### **Inmediatos**
- ✅ **Control total** sobre infraestructura
- ✅ **Costos reducidos** en 85%
- ✅ **WhatsApp estable** y confiable
- ✅ **Compliance HIPAA** nativo

### **A Mediano Plazo**
- ✅ **Escalabilidad** controlada
- ✅ **Performance** optimizado
- ✅ **Backup** y recovery robusto
- ✅ **Monitoreo** avanzado

### **A Largo Plazo**
- ✅ **Independencia** de proveedores
- ✅ **Flexibilidad** total
- ✅ **Costos** predecibles
- ✅ **Crecimiento** sostenible

---

## 📞 Soporte y Recursos

### **Documentación Adicional**
- `scripts/deploy-coolify.sh`: Script de deployment automatizado
- `docker-compose.yml`: Configuración completa de servicios
- `nginx/nginx.conf`: Configuración optimizada de proxy
- `.env.coolify.example`: Template de variables de entorno

### **Contacto para Soporte**
- **Documentación**: Esta guía completa
- **Scripts**: Automatización incluida
- **Troubleshooting**: Sección de problemas comunes
- **Monitoreo**: Dashboard integrado

**🚀 ¡Listo para migrar a Coolify y obtener control total sobre AgentSalud MVP!**
