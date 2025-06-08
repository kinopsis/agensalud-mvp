#!/bin/bash

# =====================================================
# AGENTSALUD MVP - PRODUCTION DEPLOYMENT SCRIPT
# =====================================================
# Automated deployment script for Vercel production environment
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
PRODUCTION_DOMAIN="agentsalud.com"
STAGING_DOMAIN="staging-agentsalud.vercel.app"

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
    log "Checking prerequisites..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        error "Vercel CLI is not installed. Run: npm i -g vercel"
    fi
    
    # Check if logged in to Vercel
    if ! vercel whoami &> /dev/null; then
        error "Not logged in to Vercel. Run: vercel login"
    fi
    
    # Check if Node.js version is compatible
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js version 18 or higher is required. Current: $(node --version)"
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
    
    success "Prerequisites check passed"
}

# Validate environment variables
validate_environment() {
    log "Validating environment variables..."
    
    REQUIRED_VARS=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "OPENAI_API_KEY"
        "NEXTAUTH_SECRET"
        "EVOLUTION_API_KEY"
    )
    
    MISSING_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
        if ! vercel env ls | grep -q "$var"; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -ne 0 ]; then
        error "Missing required environment variables: ${MISSING_VARS[*]}"
    fi
    
    success "Environment variables validation passed"
}

# Run tests
run_tests() {
    log "Running tests..."
    
    # Install dependencies
    npm ci
    
    # Run linting
    npm run lint
    
    # Run type checking
    npm run type-check
    
    # Run unit tests
    npm test -- --passWithNoTests
    
    # Run build test
    npm run build
    
    success "All tests passed"
}

# Deploy to staging first
deploy_staging() {
    log "Deploying to staging environment..."
    
    # Deploy to staging
    vercel --target staging --yes
    
    # Get staging URL
    STAGING_URL=$(vercel ls | grep staging | awk '{print $2}' | head -1)
    
    log "Staging deployment completed: $STAGING_URL"
    
    # Run staging validation
    validate_staging_deployment "$STAGING_URL"
    
    success "Staging deployment validated"
}

# Validate staging deployment
validate_staging_deployment() {
    local staging_url=$1
    log "Validating staging deployment..."
    
    # Check if staging site is accessible
    if ! curl -f -s "$staging_url" > /dev/null; then
        error "Staging site is not accessible: $staging_url"
    fi
    
    # Check API health endpoint
    if ! curl -f -s "$staging_url/api/health" > /dev/null; then
        error "API health check failed on staging"
    fi
    
    # Check authentication endpoint
    if ! curl -f -s "$staging_url/api/auth/session" > /dev/null; then
        warning "Auth endpoint check failed (may be expected)"
    fi
    
    success "Staging validation completed"
}

# Deploy to production
deploy_production() {
    log "Deploying to production environment..."
    
    # Confirm production deployment
    echo -e "${YELLOW}⚠️  You are about to deploy to PRODUCTION${NC}"
    echo "Domain: $PRODUCTION_DOMAIN"
    echo "Branch: $(git branch --show-current)"
    echo "Commit: $(git rev-parse --short HEAD)"
    echo
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Production deployment cancelled"
    fi
    
    # Deploy to production
    vercel --prod --yes
    
    success "Production deployment completed"
}

# Validate production deployment
validate_production() {
    log "Validating production deployment..."
    
    # Wait for deployment to propagate
    sleep 30
    
    # Check if production site is accessible
    if ! curl -f -s "https://$PRODUCTION_DOMAIN" > /dev/null; then
        error "Production site is not accessible: https://$PRODUCTION_DOMAIN"
    fi
    
    # Check API health endpoint
    if ! curl -f -s "https://$PRODUCTION_DOMAIN/api/health" > /dev/null; then
        error "API health check failed on production"
    fi
    
    # Check SSL certificate
    if ! curl -I -s "https://$PRODUCTION_DOMAIN" | grep -q "HTTP/2 200"; then
        warning "SSL certificate or HTTP/2 check failed"
    fi
    
    # Run comprehensive validation
    node scripts/validate-production-deployment.js
    
    success "Production validation completed"
}

# Cleanup
cleanup() {
    log "Cleaning up..."
    
    # Remove build artifacts if needed
    rm -rf .next
    rm -rf node_modules/.cache
    
    success "Cleanup completed"
}

# Main deployment flow
main() {
    log "Starting AgentSalud MVP production deployment..."
    
    check_prerequisites
    validate_environment
    run_tests
    deploy_staging
    deploy_production
    validate_production
    cleanup
    
    success "🚀 Production deployment completed successfully!"
    echo
    echo "Production URL: https://$PRODUCTION_DOMAIN"
    echo "Vercel Dashboard: https://vercel.com/dashboard"
    echo
    log "Deployment completed at $(date)"
}

# Handle script interruption
trap 'error "Deployment interrupted"' INT TERM

# Run main function
main "$@"
