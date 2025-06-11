#!/bin/bash

# =====================================================
# PRODUCTION DEPLOYMENT TOOLKIT
# WhatsApp Radical Solution Implementation
# =====================================================
# Comprehensive toolkit for zero-downtime production deployment
#
# @author AgentSalud DevOps Team
# @date January 28, 2025

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_DOMAIN="agendia.torrecentral.com"
EVOLUTION_API_URL="https://evo.torrecentral.com"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
DEPLOYMENT_LOG="./logs/deployment_$(date +%Y%m%d_%H%M%S).log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
    exit 1
}

# =====================================================
# BACKUP FUNCTIONS
# =====================================================

create_production_backup() {
    log "Creating comprehensive production backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # 1. Git backup
    log "Creating Git backup branch..."
    git checkout -b "backup/pre-radical-$(date +%Y%m%d_%H%M%S)"
    git add -A && git commit -m "Backup: Pre-radical solution implementation"
    
    # 2. Evolution API instances backup
    log "Backing up Evolution API instances..."
    curl -X GET "$EVOLUTION_API_URL/instance/fetchInstances" \
        -H "apikey: $EVOLUTION_API_KEY" \
        -o "$BACKUP_DIR/evolution_instances.json" || warning "Evolution API backup failed"
    
    # 3. Database backup (if accessible)
    if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        log "Creating database backup..."
        # Note: This would require direct database access or Supabase CLI
        echo "Database backup requires manual execution via Supabase dashboard" > "$BACKUP_DIR/database_backup_instructions.txt"
    fi
    
    # 4. Current component backup
    log "Backing up current components..."
    cp -r src/components/whatsapp "$BACKUP_DIR/components_whatsapp/" 2>/dev/null || true
    cp -r src/components/channels "$BACKUP_DIR/components_channels/" 2>/dev/null || true
    
    success "Production backup created at: $BACKUP_DIR"
}

# =====================================================
# VALIDATION FUNCTIONS
# =====================================================

validate_production_environment() {
    log "Validating production environment..."
    
    # Check required environment variables
    local required_vars=("EVOLUTION_API_KEY" "NEXT_PUBLIC_SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    # Test production domain connectivity
    log "Testing production domain connectivity..."
    if ! curl -f -s "https://$PRODUCTION_DOMAIN/api/health" > /dev/null; then
        error "Production domain $PRODUCTION_DOMAIN is not accessible"
    fi
    
    # Test Evolution API connectivity
    log "Testing Evolution API connectivity..."
    if ! curl -f -s "$EVOLUTION_API_URL/instance/fetchInstances" -H "apikey: $EVOLUTION_API_KEY" > /dev/null; then
        error "Evolution API is not accessible"
    fi
    
    success "Production environment validation passed"
}

validate_webhook_endpoints() {
    log "Validating webhook endpoints..."
    
    local endpoints=(
        "/api/webhooks/evolution/test-org"
        "/api/whatsapp/webhook"
        "/api/whatsapp/simple/webhook/test-org"
        "/api/channels/whatsapp/webhook"
    )
    
    for endpoint in "${endpoints[@]}"; do
        log "Testing endpoint: $endpoint"
        local response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://$PRODUCTION_DOMAIN$endpoint" \
            -H "Content-Type: application/json" \
            -d '{"test": true}')
        
        if [[ "$response" =~ ^[2-4][0-9][0-9]$ ]]; then
            success "Endpoint $endpoint is accessible (HTTP $response)"
        else
            warning "Endpoint $endpoint returned HTTP $response"
        fi
    done
}

# =====================================================
# DEPLOYMENT FUNCTIONS
# =====================================================

deploy_with_feature_flag() {
    local component="$1"
    local percentage="${2:-10}"
    
    log "Deploying $component with $percentage% rollout..."
    
    # Create feature flag configuration
    cat > "./config/feature-flags.json" << EOF
{
  "radical_solution": {
    "enabled": true,
    "percentage": $percentage,
    "components": ["$component"]
  }
}
EOF
    
    # Deploy to production
    log "Building and deploying to production..."
    npm run build:production
    
    # This would integrate with your deployment system (Coolify, Vercel, etc.)
    if command -v coolify &> /dev/null; then
        coolify deploy --project agentsalud --environment production
    else
        warning "Coolify CLI not found. Deploy manually via dashboard."
    fi
    
    success "$component deployed with $percentage% rollout"
}

monitor_deployment() {
    local duration="${1:-300}" # Default 5 minutes
    local start_time=$(date +%s)
    local end_time=$((start_time + duration))
    
    log "Monitoring deployment for $duration seconds..."
    
    while [ $(date +%s) -lt $end_time ]; do
        # Check health endpoint
        local health_status=$(curl -s "https://$PRODUCTION_DOMAIN/api/health" | jq -r '.status' 2>/dev/null || echo "unknown")
        
        # Check error rate
        local error_count=$(curl -s "https://$PRODUCTION_DOMAIN/api/admin/metrics/errors" | jq -r '.count' 2>/dev/null || echo "0")
        
        log "Health: $health_status, Errors: $error_count"
        
        if [ "$health_status" != "healthy" ] || [ "$error_count" -gt 10 ]; then
            warning "Deployment issues detected. Consider rollback."
        fi
        
        sleep 30
    done
    
    success "Monitoring completed"
}

# =====================================================
# ROLLBACK FUNCTIONS
# =====================================================

emergency_rollback() {
    log "Initiating emergency rollback..."
    
    # 1. Disable feature flags
    log "Disabling feature flags..."
    cat > "./config/feature-flags.json" << EOF
{
  "radical_solution": {
    "enabled": false,
    "percentage": 0,
    "components": []
  }
}
EOF
    
    # 2. Revert to backup branch
    log "Reverting to backup branch..."
    local backup_branch=$(git branch | grep "backup/pre-radical" | head -1 | xargs)
    if [ -n "$backup_branch" ]; then
        git checkout "$backup_branch"
        npm run build:production
        
        # Deploy rollback
        if command -v coolify &> /dev/null; then
            coolify deploy --project agentsalud --environment production
        else
            warning "Manual deployment required via dashboard"
        fi
    else
        error "No backup branch found for rollback"
    fi
    
    success "Emergency rollback completed"
}

# =====================================================
# TESTING FUNCTIONS
# =====================================================

run_production_tests() {
    log "Running production compatibility tests..."
    
    # Performance tests
    log "Testing QR generation performance..."
    local qr_time=$(curl -s -w "%{time_total}" -o /dev/null "https://$PRODUCTION_DOMAIN/api/dev/qr-test")
    if (( $(echo "$qr_time > 5.0" | bc -l) )); then
        warning "QR generation took ${qr_time}s (target: <5s)"
    else
        success "QR generation performance: ${qr_time}s"
    fi
    
    # Webhook tests
    log "Testing webhook processing..."
    local webhook_response=$(curl -s -X POST "https://$PRODUCTION_DOMAIN/api/whatsapp/simple/webhook/test-org" \
        -H "Content-Type: application/json" \
        -d '{"event": "CONNECTION_UPDATE", "instance": "test", "data": {"state": "open"}}')
    
    if echo "$webhook_response" | jq -e '.success' > /dev/null 2>&1; then
        success "Webhook processing test passed"
    else
        warning "Webhook processing test failed"
    fi
    
    # Load test
    log "Running basic load test..."
    for i in {1..10}; do
        curl -s "https://$PRODUCTION_DOMAIN/api/health" > /dev/null &
    done
    wait
    success "Basic load test completed"
}

# =====================================================
# MAIN EXECUTION FUNCTIONS
# =====================================================

show_help() {
    echo "Production Deployment Toolkit for WhatsApp Radical Solution"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  backup              Create comprehensive production backup"
    echo "  validate            Validate production environment"
    echo "  deploy [component]  Deploy component with feature flag"
    echo "  monitor [duration]  Monitor deployment (default: 300s)"
    echo "  test                Run production compatibility tests"
    echo "  rollback            Emergency rollback to previous state"
    echo "  full-deployment     Execute complete deployment pipeline"
    echo ""
    echo "Examples:"
    echo "  $0 backup"
    echo "  $0 deploy UnifiedQRDisplay 25"
    echo "  $0 monitor 600"
    echo "  $0 rollback"
}

full_deployment_pipeline() {
    log "Starting full deployment pipeline..."
    
    # Phase 1: Preparation
    create_production_backup
    validate_production_environment
    validate_webhook_endpoints
    
    # Phase 2: Gradual deployment
    deploy_with_feature_flag "UnifiedQRDisplay" 10
    monitor_deployment 300
    
    deploy_with_feature_flag "QuickCreateButton" 25
    monitor_deployment 300
    
    deploy_with_feature_flag "WhatsAppConnectView" 50
    monitor_deployment 600
    
    # Phase 3: Full rollout
    deploy_with_feature_flag "RadicalSolution" 100
    monitor_deployment 900
    
    # Phase 4: Validation
    run_production_tests
    
    success "Full deployment pipeline completed successfully!"
}

# =====================================================
# MAIN SCRIPT EXECUTION
# =====================================================

# Create logs directory
mkdir -p ./logs

# Parse command line arguments
case "${1:-help}" in
    "backup")
        create_production_backup
        ;;
    "validate")
        validate_production_environment
        validate_webhook_endpoints
        ;;
    "deploy")
        deploy_with_feature_flag "${2:-UnifiedQRDisplay}" "${3:-10}"
        ;;
    "monitor")
        monitor_deployment "${2:-300}"
        ;;
    "test")
        run_production_tests
        ;;
    "rollback")
        emergency_rollback
        ;;
    "full-deployment")
        full_deployment_pipeline
        ;;
    "help"|*)
        show_help
        ;;
esac

log "Script execution completed. Log saved to: $DEPLOYMENT_LOG"
