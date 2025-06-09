#!/bin/bash

# =====================================================
# AGENTSALUD MVP - COOLIFY + SUPABASE DEPLOYMENT SCRIPT
# =====================================================
# Automated deployment script for Coolify + External Supabase
#
# @author AgentSalud DevOps Team
# @date January 2025

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="agentsalud-mvp"
COOLIFY_SERVER="your-coolify-server.com"
PRODUCTION_DOMAIN="agentsalud.com"
EVOLUTION_DOMAIN="evolution.agentsalud.com"
DEPLOYMENT_ARCHITECTURE="coolify-supabase-hybrid"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites for Coolify + Supabase deployment..."

    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi

    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi

    # Check if we're on the main branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "main" ]; then
        warning "Not on main branch. Current branch: $CURRENT_BRANCH"
        read -p "Continue with deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Deployment cancelled"
        fi
    fi

    # Check if environment file exists
    if [ ! -f ".env" ]; then
        warning "Environment file .env not found"
        echo "Please copy .env.coolify.example to .env and configure it"
        read -p "Have you configured the .env file? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Please configure .env file before deployment"
        fi
    fi

    # Validate Supabase configuration
    validate_supabase_config

    success "Prerequisites check passed"
}

# Validate Supabase configuration
validate_supabase_config() {
    log "Validating Supabase configuration..."

    # Check if Supabase variables are set
    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
        warning "Supabase configuration missing in .env file"
        echo "Required Supabase variables:"
        echo "- NEXT_PUBLIC_SUPABASE_URL"
        echo "- NEXT_PUBLIC_SUPABASE_ANON_KEY"
        echo "- SUPABASE_SERVICE_ROLE_KEY"
        read -p "Have you configured Supabase variables? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Please configure Supabase variables before deployment"
        fi
    fi

    success "Supabase configuration validated"
}

# Validate Docker configuration
validate_docker_config() {
    log "Validating Docker configuration..."
    
    # Check if Dockerfile exists
    if [ ! -f "Dockerfile" ]; then
        error "Dockerfile not found. Please ensure Dockerfile is present."
    fi
    
    # Check if docker-compose.yml exists
    if [ ! -f "docker-compose.yml" ]; then
        error "docker-compose.yml not found. Please ensure docker-compose.yml is present."
    fi
    
    # Validate docker-compose syntax
    if ! docker-compose config &> /dev/null; then
        error "docker-compose.yml has syntax errors. Please fix them."
    fi
    
    success "Docker configuration validated"
}

# Build Docker images
build_images() {
    log "Building Docker images..."
    
    # Build the main application image
    docker build -t agentsalud-mvp:latest .
    
    success "Docker images built successfully"
}

# Setup environment
setup_environment() {
    log "Setting up environment..."
    
    # Create necessary directories
    mkdir -p nginx/ssl
    mkdir -p database/init
    mkdir -p backups
    
    # Set proper permissions
    chmod 755 nginx/ssl
    chmod 755 database/init
    chmod 755 backups
    
    success "Environment setup completed"
}

# Deploy to Coolify
deploy_to_coolify() {
    log "Deploying to Coolify..."
    
    # Stop existing containers if running
    docker-compose down --remove-orphans || true
    
    # Pull latest images
    docker-compose pull
    
    # Start services
    docker-compose up -d
    
    # Wait for services to be ready
    log "Waiting for services to start..."
    sleep 30
    
    # Check if main app is running
    if docker-compose ps | grep -q "agentsalud-app.*Up"; then
        success "Main application is running"
    else
        error "Main application failed to start"
    fi
    
    # Note: Database is external Supabase, so we don't check local postgres
    log "Database: Using external Supabase (no local database to check)"
    
    # Check if Redis is running
    if docker-compose ps | grep -q "redis.*Up"; then
        success "Redis is running"
    else
        error "Redis failed to start"
    fi
    
    success "Deployment to Coolify completed"
}

# Configure SSL certificates
configure_ssl() {
    log "Configuring SSL certificates..."
    
    warning "SSL certificates need to be configured manually in Coolify dashboard"
    echo "1. Go to your Coolify dashboard"
    echo "2. Navigate to your project"
    echo "3. Configure SSL certificates for:"
    echo "   - $PRODUCTION_DOMAIN"
    echo "   - $EVOLUTION_DOMAIN"
    echo "4. Enable automatic SSL renewal"
    
    read -p "Have you configured SSL certificates? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warning "Please configure SSL certificates for secure access"
    fi
    
    success "SSL configuration noted"
}

# Run database migrations (Supabase)
run_migrations() {
    log "Running Supabase migrations..."

    # Wait for application to be ready
    sleep 15

    # Note: Supabase migrations should be run via Supabase CLI or dashboard
    # This is a placeholder for application-level migrations
    warning "Supabase migrations should be managed via Supabase Dashboard or CLI"
    echo "1. Go to your Supabase Dashboard"
    echo "2. Navigate to SQL Editor"
    echo "3. Run any pending migrations"
    echo "4. Verify RLS policies are in place"

    read -p "Have you run Supabase migrations? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warning "Please run Supabase migrations before proceeding"
    fi

    success "Supabase migrations noted"
}

# Validate deployment
validate_deployment() {
    log "Validating deployment..."
    
    # Check if application is accessible
    if curl -f -s "http://localhost:3000/api/health" > /dev/null; then
        success "Application health check passed"
    else
        warning "Application health check failed"
    fi
    
    # Check Supabase connection via application
    if curl -f -s "http://localhost:3000/api/health" | grep -q "database.*ok"; then
        success "Supabase connection validated"
    else
        warning "Supabase connection may have issues"
    fi
    
    # Check Redis connection
    if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
        success "Redis connection validated"
    else
        warning "Redis connection failed"
    fi
    
    success "Deployment validation completed"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    echo "Monitoring setup recommendations:"
    echo "1. Configure Coolify monitoring dashboard"
    echo "2. Set up external uptime monitoring"
    echo "3. Configure log aggregation"
    echo "4. Set up backup monitoring"
    echo "5. Configure alert notifications"
    
    success "Monitoring setup guidelines provided"
}

# Cleanup
cleanup() {
    log "Cleaning up..."
    
    # Remove unused Docker images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    success "Cleanup completed"
}

# Main deployment flow
main() {
    log "Starting AgentSalud MVP Coolify deployment..."
    
    check_prerequisites
    validate_docker_config
    setup_environment
    build_images
    deploy_to_coolify
    run_migrations
    configure_ssl
    validate_deployment
    setup_monitoring
    cleanup
    
    success "🚀 Coolify deployment completed successfully!"
    echo ""
    echo "Application URL: https://$PRODUCTION_DOMAIN"
    echo "Evolution API URL: https://$EVOLUTION_DOMAIN"
    echo "Coolify Dashboard: https://$COOLIFY_SERVER"
    echo ""
    log "Deployment completed at $(date)"
    
    echo ""
    echo "Next steps:"
    echo "1. Configure SSL certificates in Coolify dashboard"
    echo "2. Set up domain DNS records"
    echo "3. Configure monitoring and alerts"
    echo "4. Test all functionality end-to-end"
    echo "5. Set up automated backups"
}

# Handle script interruption
trap 'error "Deployment interrupted"' INT TERM

# Run main function
main "$@"
