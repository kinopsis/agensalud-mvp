# 🔄 Plan de Rollback - AgentSalud MVP Staging

**Versión**: 1.0  
**Fecha**: Enero 2025  
**Responsable**: DevOps Team - AgentSalud MVP  
**Tiempo de Ejecución**: 15-30 minutos

## 📋 Resumen

Este documento describe los procedimientos de rollback para el environment staging de AgentSalud MVP, incluyendo la reversión de servicios, datos, y configuraciones en caso de issues críticos durante o después del deployment.

### 🚨 Criterios para Activar Rollback

#### Criterios Críticos (Rollback Inmediato)
- ❌ Evolution API no responde por >5 minutos
- ❌ Base de datos corrupta o inaccesible
- ❌ Pérdida de datos de instancias WhatsApp
- ❌ Falla de seguridad o breach detectado
- ❌ >50% de funcionalidades core no operativas

#### Criterios de Advertencia (Evaluación Requerida)
- ⚠️ Performance degradado >50%
- ⚠️ Errores intermitentes en webhooks
- ⚠️ QR codes no generándose consistentemente
- ⚠️ Mensajes WhatsApp con delay >10s
- ⚠️ Monitoring/alertas no funcionando

## 🔧 Procedimientos de Rollback

### 🚀 Rollback Rápido (5-10 minutos)

#### Paso 1: Detener Servicios Actuales
```bash
#!/bin/bash
cd /path/to/docker/staging

# Detener todos los servicios
docker-compose down --remove-orphans

# Verificar que todos los contenedores estén detenidos
docker ps | grep agentsalud-staging
```

#### Paso 2: Restaurar Versión Anterior
```bash
# Cambiar a la versión anterior (backup automático)
BACKUP_VERSION=$(ls -t /backups/staging-* | head -1)
echo "Restaurando desde: $BACKUP_VERSION"

# Restaurar configuración
cp $BACKUP_VERSION/docker-compose.yml ./docker-compose.yml
cp $BACKUP_VERSION/.env.staging ./.env.staging
```

#### Paso 3: Restaurar Datos
```bash
# Restaurar volúmenes de datos
docker volume rm staging_postgres_data staging_redis_data

# Restaurar desde backup
docker run --rm -v staging_postgres_data:/data -v $BACKUP_VERSION:/backup alpine sh -c "cd /data && tar xzf /backup/postgres_data.tar.gz"
docker run --rm -v staging_redis_data:/data -v $BACKUP_VERSION:/backup alpine sh -c "cd /data && tar xzf /backup/redis_data.tar.gz"
```

#### Paso 4: Iniciar Servicios Anteriores
```bash
# Iniciar servicios con configuración anterior
docker-compose up -d

# Verificar estado
docker-compose ps
```

### 🔄 Rollback Completo (15-30 minutos)

#### Paso 1: Evaluación de Estado
```bash
#!/bin/bash
# Script de evaluación pre-rollback

echo "=== EVALUACIÓN DE ESTADO ACTUAL ==="
echo "Timestamp: $(date)"

# Verificar servicios
echo "--- Servicios Docker ---"
docker-compose ps

# Verificar conectividad Evolution API
echo "--- Evolution API Status ---"
curl -f http://localhost:8080 && echo "OK" || echo "FAILED"

# Verificar base de datos
echo "--- Database Status ---"
docker-compose exec postgres pg_isready -U evolution_user -d evolution_staging

# Verificar logs recientes
echo "--- Logs Recientes ---"
docker-compose logs --tail=50 evolution-api
```

#### Paso 2: Backup de Estado Actual
```bash
# Crear backup del estado actual antes del rollback
ROLLBACK_BACKUP="/backups/pre-rollback-$(date +%Y%m%d-%H%M%S)"
mkdir -p $ROLLBACK_BACKUP

# Backup de configuración actual
cp docker-compose.yml $ROLLBACK_BACKUP/
cp .env.staging $ROLLBACK_BACKUP/

# Backup de logs
docker-compose logs > $ROLLBACK_BACKUP/services.log

# Backup de datos críticos
docker run --rm -v staging_postgres_data:/data -v $ROLLBACK_BACKUP:/backup alpine tar czf /backup/postgres_current.tar.gz -C /data .
```

#### Paso 3: Identificar Versión de Rollback
```bash
# Listar backups disponibles
echo "=== BACKUPS DISPONIBLES ==="
ls -la /backups/staging-* | head -5

# Seleccionar versión estable más reciente
STABLE_VERSION="/backups/staging-20250127-180000"  # Ejemplo
echo "Rollback target: $STABLE_VERSION"
```

#### Paso 4: Ejecutar Rollback Completo
```bash
# Detener servicios
docker-compose down --volumes --remove-orphans

# Limpiar volúmenes
docker volume prune -f

# Restaurar configuración
cp $STABLE_VERSION/docker-compose.yml ./
cp $STABLE_VERSION/.env.staging ./

# Restaurar datos
docker volume create staging_postgres_data
docker volume create staging_redis_data

docker run --rm -v staging_postgres_data:/data -v $STABLE_VERSION:/backup alpine sh -c "cd /data && tar xzf /backup/postgres_data.tar.gz"
docker run --rm -v staging_redis_data:/data -v $STABLE_VERSION:/backup alpine sh -c "cd /data && tar xzf /backup/redis_data.tar.gz"

# Iniciar servicios
docker-compose up -d
```

#### Paso 5: Validación Post-Rollback
```bash
# Esperar a que servicios estén listos
sleep 30

# Validar Evolution API
curl -f http://localhost:8080 || echo "ERROR: Evolution API no responde"

# Validar base de datos
docker-compose exec postgres pg_isready -U evolution_user -d evolution_staging || echo "ERROR: Database no disponible"

# Validar instancias WhatsApp
curl -H "apikey: $EVOLUTION_API_KEY" http://localhost:8080/instance/fetchInstances || echo "ERROR: No se pueden obtener instancias"

# Ejecutar health checks
node /scripts/validate-evolution-api-integration.js
```

## 📊 Validación Post-Rollback

### Checklist de Validación
- [ ] Evolution API responde correctamente
- [ ] Base de datos accesible y consistente
- [ ] Instancias WhatsApp preservadas
- [ ] Webhooks funcionando
- [ ] QR codes generándose
- [ ] Mensajes de prueba funcionando
- [ ] Monitoring operativo
- [ ] Logs sin errores críticos

### Tests de Funcionalidad
```bash
# Test 1: API Health
curl -f http://localhost:8080

# Test 2: Instance List
curl -H "apikey: $EVOLUTION_API_KEY" http://localhost:8080/instance/fetchInstances

# Test 3: QR Generation
curl -H "apikey: $EVOLUTION_API_KEY" http://localhost:8080/instance/qrcode/test-instance

# Test 4: Webhook Test
curl -X POST http://localhost:3000/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"test","instance":"test","data":{}}'
```

## 🚨 Procedimientos de Emergencia

### Rollback de Emergencia (2-5 minutos)
```bash
#!/bin/bash
# Script de rollback de emergencia - ejecutar solo en crisis

echo "🚨 INICIANDO ROLLBACK DE EMERGENCIA"

# Detener todo inmediatamente
docker stop $(docker ps -q --filter "name=agentsalud")

# Restaurar última versión conocida estable
EMERGENCY_BACKUP="/backups/emergency-stable"
if [ -d "$EMERGENCY_BACKUP" ]; then
    cp $EMERGENCY_BACKUP/* ./
    docker-compose up -d
    echo "✅ Rollback de emergencia completado"
else
    echo "❌ ERROR: Backup de emergencia no encontrado"
fi
```

### Contactos de Emergencia
```
🚨 ESCALATION CONTACTS
├── DevOps Lead: +57 300 123 4567
├── Product Manager: +57 300 123 4568
├── Technical Lead: +57 300 123 4569
└── Emergency Hotline: +57 300 123 4570

📧 EMAIL ALERTS
├── devops@agentsalud.com
├── alerts@agentsalud.com
└── emergency@agentsalud.com
```

## 📝 Documentación de Rollback

### Template de Reporte de Rollback
```markdown
# REPORTE DE ROLLBACK

**Fecha**: [YYYY-MM-DD HH:MM:SS]
**Ejecutado por**: [Nombre del operador]
**Tipo de Rollback**: [Rápido/Completo/Emergencia]

## Motivo del Rollback
[Descripción detallada del problema que motivó el rollback]

## Versión Anterior
- **Versión Rollback**: [staging-YYYYMMDD-HHMMSS]
- **Versión Restaurada**: [staging-YYYYMMDD-HHMMSS]

## Procedimiento Ejecutado
- [ ] Backup de estado actual
- [ ] Detención de servicios
- [ ] Restauración de datos
- [ ] Restauración de configuración
- [ ] Inicio de servicios
- [ ] Validación post-rollback

## Tiempo de Ejecución
- **Inicio**: [HH:MM:SS]
- **Fin**: [HH:MM:SS]
- **Duración Total**: [X minutos]

## Estado Post-Rollback
- **Evolution API**: [OK/ERROR]
- **Base de Datos**: [OK/ERROR]
- **Instancias WhatsApp**: [X instancias preservadas]
- **Funcionalidad**: [% operativo]

## Acciones de Seguimiento
1. [Acción 1]
2. [Acción 2]
3. [Acción 3]

## Lecciones Aprendidas
[Qué se puede mejorar para futuros deployments]
```

## 🔍 Monitoreo Post-Rollback

### Métricas a Vigilar (Primeras 2 horas)
- **API Response Time**: <2s
- **Error Rate**: <1%
- **Database Connections**: Estables
- **Memory Usage**: <80%
- **CPU Usage**: <70%
- **Disk Space**: >20% libre

### Alertas Críticas
```yaml
alerts:
  - name: post_rollback_api_down
    condition: evolution_api_health != "healthy"
    duration: 1m
    severity: critical
    
  - name: post_rollback_high_errors
    condition: error_rate > 5%
    duration: 5m
    severity: warning
    
  - name: post_rollback_performance
    condition: response_time > 5s
    duration: 3m
    severity: warning
```

## ✅ Checklist de Finalización

### Post-Rollback Inmediato
- [ ] Servicios operativos confirmados
- [ ] Funcionalidad crítica validada
- [ ] Clientes notificados (si aplica)
- [ ] Equipo de soporte informado
- [ ] Monitoreo intensivo activado

### Seguimiento (24-48 horas)
- [ ] Métricas de performance estables
- [ ] No errores críticos reportados
- [ ] Feedback de usuarios recopilado
- [ ] Root cause analysis iniciado
- [ ] Plan de corrección desarrollado

### Documentación
- [ ] Reporte de rollback completado
- [ ] Lecciones aprendidas documentadas
- [ ] Procedimientos actualizados
- [ ] Equipo debriefed
- [ ] Mejoras identificadas

---

**Última Actualización**: Enero 2025  
**Próxima Revisión**: Post-deployment  
**Responsable**: DevOps Team - AgentSalud MVP  
**Estado**: ✅ Listo para Uso
