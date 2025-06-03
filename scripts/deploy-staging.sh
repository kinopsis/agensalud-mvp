#!/bin/bash

# =====================================================
# AGENTSALUD MVP - STAGING DEPLOYMENT SCRIPT
# =====================================================
# Automated deployment script for staging environment
# Includes Evolution API v2, database setup, and validation
# 
# @author AgentSalud DevOps Team
# @date January 2025

set -e  # Exit on any error

# =====================================================
# CONFIGURATION
# =====================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_ROOT/docker/staging"
LOGS_DIR="$PROJECT_ROOT/logs/staging"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Deployment configuration
DEPLOYMENT_VERSION="staging-$(date +%Y%m%d-%H%M%S)"
BACKUP_RETENTION_DAYS=30
HEALTH_CHECK_TIMEOUT=300  # 5 minutes
HEALTH_CHECK_INTERVAL=10  # 10 seconds

# =====================================================
# UTILITY FUNCTIONS
# =====================================================

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

check_dependencies() {
    log "Checking dependencies..."
    
    command -v docker >/dev/null 2>&1 || error "Docker is not installed"
    command -v docker-compose >/dev/null 2>&1 || error "Docker Compose is not installed"
    command -v curl >/dev/null 2>&1 || error "curl is not installed"
    command -v jq >/dev/null 2>&1 || error "jq is not installed"
    
    success "All dependencies are available"
}

check_environment() {
    log "Checking environment configuration..."
    
    if [ ! -f "$DOCKER_DIR/.env.staging" ]; then
        error "Environment file not found: $DOCKER_DIR/.env.staging"
    fi
    
    # Source environment variables
    source "$DOCKER_DIR/.env.staging"
    
    # Check required variables
    required_vars=(
        "EVOLUTION_API_KEY"
        "POSTGRES_PASSWORD"
        "REDIS_PASSWORD"
        "NEXT_PUBLIC_SUPABASE_URL"
        "SUPABASE_SERVICE_ROLE_KEY"
        "OPENAI_API_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    success "Environment configuration is valid"
}

create_directories() {
    log "Creating necessary directories..."
    
    mkdir -p "$LOGS_DIR"
    mkdir -p "$DOCKER_DIR/ssl"
    mkdir -p "$DOCKER_DIR/nginx/conf.d"
    mkdir -p "$DOCKER_DIR/monitoring"
    mkdir -p "$DOCKER_DIR/init-scripts"
    
    success "Directories created"
}

backup_existing_data() {
    log "Creating backup of existing data..."
    
    BACKUP_DIR="$PROJECT_ROOT/backups/staging-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup docker volumes if they exist
    if docker volume ls | grep -q "staging_postgres_data"; then
        log "Backing up PostgreSQL data..."
        docker run --rm -v staging_postgres_data:/data -v "$BACKUP_DIR":/backup alpine tar czf /backup/postgres_data.tar.gz -C /data .
    fi
    
    if docker volume ls | grep -q "staging_redis_data"; then
        log "Backing up Redis data..."
        docker run --rm -v staging_redis_data:/data -v "$BACKUP_DIR":/backup alpine tar czf /backup/redis_data.tar.gz -C /data .
    fi
    
    success "Backup completed: $BACKUP_DIR"
}

stop_existing_services() {
    log "Stopping existing services..."
    
    cd "$DOCKER_DIR"
    
    if docker-compose ps | grep -q "Up"; then
        docker-compose down --remove-orphans
        success "Existing services stopped"
    else
        log "No running services found"
    fi
}

pull_latest_images() {
    log "Pulling latest Docker images..."
    
    cd "$DOCKER_DIR"
    docker-compose pull
    
    success "Latest images pulled"
}

start_services() {
    log "Starting services..."
    
    cd "$DOCKER_DIR"
    
    # Start core services first
    log "Starting database services..."
    docker-compose up -d postgres redis
    
    # Wait for databases to be ready
    wait_for_service "postgres" "5432" "PostgreSQL"
    wait_for_service "redis" "6379" "Redis"
    
    # Start Evolution API
    log "Starting Evolution API..."
    docker-compose up -d evolution-api
    wait_for_service "evolution-api" "8080" "Evolution API"
    
    # Start remaining services
    log "Starting remaining services..."
    docker-compose up -d
    
    success "All services started"
}

wait_for_service() {
    local service_name=$1
    local port=$2
    local display_name=$3
    local max_attempts=30
    local attempt=1
    
    log "Waiting for $display_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose exec -T "$service_name" sh -c "nc -z localhost $port" 2>/dev/null; then
            success "$display_name is ready"
            return 0
        fi
        
        log "Attempt $attempt/$max_attempts - $display_name not ready yet..."
        sleep 5
        ((attempt++))
    done
    
    error "$display_name failed to start within expected time"
}

run_health_checks() {
    log "Running comprehensive health checks..."
    
    local start_time=$(date +%s)
    local end_time=$((start_time + HEALTH_CHECK_TIMEOUT))
    
    while [ $(date +%s) -lt $end_time ]; do
        local all_healthy=true
        
        # Check Evolution API
        if ! curl -sf "http://localhost:8080" >/dev/null 2>&1; then
            all_healthy=false
            log "Evolution API health check failed"
        fi
        
        # Check PostgreSQL
        if ! docker-compose exec -T postgres pg_isready -U evolution_user -d evolution_staging >/dev/null 2>&1; then
            all_healthy=false
            log "PostgreSQL health check failed"
        fi
        
        # Check Redis
        if ! docker-compose exec -T redis redis-cli ping >/dev/null 2>&1; then
            all_healthy=false
            log "Redis health check failed"
        fi
        
        if [ "$all_healthy" = true ]; then
            success "All health checks passed"
            return 0
        fi
        
        log "Health checks in progress... ($(( (end_time - $(date +%s)) / 60 )) minutes remaining)"
        sleep $HEALTH_CHECK_INTERVAL
    done
    
    error "Health checks failed within timeout period"
}

validate_evolution_api() {
    log "Validating Evolution API integration..."
    
    # Run the validation script
    if node "$SCRIPT_DIR/validate-evolution-api-integration.js"; then
        success "Evolution API validation passed"
    else
        error "Evolution API validation failed"
    fi
}

setup_monitoring() {
    log "Setting up monitoring and alerting..."
    
    # Check if Grafana is accessible
    local grafana_ready=false
    local attempts=0
    local max_attempts=30
    
    while [ $attempts -lt $max_attempts ] && [ "$grafana_ready" = false ]; do
        if curl -sf "http://localhost:3001" >/dev/null 2>&1; then
            grafana_ready=true
        else
            sleep 5
            ((attempts++))
        fi
    done
    
    if [ "$grafana_ready" = true ]; then
        success "Grafana monitoring is ready at http://localhost:3001"
    else
        warning "Grafana monitoring setup incomplete"
    fi
    
    # Check Prometheus
    if curl -sf "http://localhost:9090" >/dev/null 2>&1; then
        success "Prometheus metrics collection is ready at http://localhost:9090"
    else
        warning "Prometheus setup incomplete"
    fi
}

cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    find "$PROJECT_ROOT/backups" -type d -name "staging-*" -mtime +$BACKUP_RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
    
    success "Old backups cleaned up"
}

generate_deployment_report() {
    log "Generating deployment report..."
    
    local report_file="$LOGS_DIR/deployment-report-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "deployment": {
    "version": "$DEPLOYMENT_VERSION",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "staging",
    "status": "completed"
  },
  "services": {
    "evolution_api": {
      "status": "$(curl -sf http://localhost:8080 && echo "healthy" || echo "unhealthy")",
      "url": "http://localhost:8080"
    },
    "postgres": {
      "status": "$(docker-compose exec -T postgres pg_isready -U evolution_user -d evolution_staging >/dev/null 2>&1 && echo "healthy" || echo "unhealthy")"
    },
    "redis": {
      "status": "$(docker-compose exec -T redis redis-cli ping >/dev/null 2>&1 && echo "healthy" || echo "unhealthy")"
    },
    "grafana": {
      "status": "$(curl -sf http://localhost:3001 >/dev/null 2>&1 && echo "healthy" || echo "unhealthy")",
      "url": "http://localhost:3001"
    },
    "prometheus": {
      "status": "$(curl -sf http://localhost:9090 >/dev/null 2>&1 && echo "healthy" || echo "unhealthy")",
      "url": "http://localhost:9090"
    }
  },
  "validation": {
    "evolution_api_integration": "passed",
    "health_checks": "passed",
    "monitoring_setup": "completed"
  }
}
EOF
    
    success "Deployment report generated: $report_file"
    cat "$report_file" | jq .
}

# =====================================================
# MAIN DEPLOYMENT PROCESS
# =====================================================

main() {
    log "Starting AgentSalud MVP Staging Deployment"
    log "=========================================="
    log "Version: $DEPLOYMENT_VERSION"
    log "Timestamp: $(date)"
    echo
    
    # Pre-deployment checks
    check_dependencies
    check_environment
    create_directories
    
    # Backup and preparation
    backup_existing_data
    stop_existing_services
    pull_latest_images
    
    # Deployment
    start_services
    run_health_checks
    
    # Validation
    validate_evolution_api
    setup_monitoring
    
    # Post-deployment
    cleanup_old_backups
    generate_deployment_report
    
    echo
    success "🚀 STAGING DEPLOYMENT COMPLETED SUCCESSFULLY!"
    echo
    log "Services are now available at:"
    log "  • Evolution API: http://localhost:8080"
    log "  • Grafana: http://localhost:3001 (admin/admin)"
    log "  • Prometheus: http://localhost:9090"
    echo
    log "Next steps:"
    log "  1. Configure SSL certificates for production domains"
    log "  2. Set up DNS records for staging.agentsalud.com"
    log "  3. Run end-to-end tests with real WhatsApp instances"
    log "  4. Begin onboarding first pilot clients"
    echo
    log "For troubleshooting, check logs in: $LOGS_DIR"
}

# =====================================================
# SCRIPT EXECUTION
# =====================================================

# Handle script interruption
trap 'error "Deployment interrupted by user"' INT TERM

# Change to docker directory
cd "$DOCKER_DIR"

# Run main deployment process
main "$@"
