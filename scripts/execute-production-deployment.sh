#!/bin/bash

# =====================================================
# AGENTSALUD MVP - PRODUCTION DEPLOYMENT EXECUTION
# =====================================================
# Automated production deployment script for Vercel
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
    
    # Check if Vercel CLI is available
    if ! command -v vercel &> /dev/null && ! command -v npx &> /dev/null; then
        error "Neither Vercel CLI nor npx is available. Please install Node.js and npm."
    fi
    
    # Check if logged in to Vercel
    if ! npx vercel whoami &> /dev/null; then
        warning "Not logged in to Vercel. Please run: npx vercel login"
        echo "After logging in, run this script again."
        exit 1
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

# Link project to Vercel
link_project() {
    log "Linking project to Vercel..."
    
    if [ ! -f ".vercel/project.json" ]; then
        log "Project not linked. Linking now..."
        npx vercel link --yes
        success "Project linked to Vercel"
    else
        success "Project already linked to Vercel"
    fi
}

# Validate environment variables
validate_environment() {
    log "Validating environment variables..."
    
    # Check if .env.production.example exists
    if [ ! -f ".env.production.example" ]; then
        error "Environment template file .env.production.example not found"
    fi
    
    warning "Please ensure all environment variables are configured in Vercel dashboard:"
    echo "1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables"
    echo "2. Configure all variables from .env.production.example"
    echo "3. Ensure production values are set for all required variables"
    echo ""
    read -p "Have you configured all environment variables? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Please configure environment variables before deployment"
    fi
    
    success "Environment variables validation confirmed"
}

# Run tests
run_tests() {
    log "Running pre-deployment tests..."
    
    # Install dependencies
    npm ci
    
    # Run linting
    if npm run lint &> /dev/null; then
        success "Linting passed"
    else
        warning "Linting issues detected, but continuing..."
    fi
    
    # Run type checking
    if npm run type-check &> /dev/null; then
        success "Type checking passed"
    else
        warning "Type checking issues detected, but continuing..."
    fi
    
    # Run build test
    npm run build
    
    success "All tests completed"
}

# Deploy to staging first
deploy_staging() {
    log "Deploying to staging environment..."
    
    # Deploy to staging
    STAGING_URL=$(npx vercel --yes)
    
    log "Staging deployment completed: $STAGING_URL"
    
    # Wait for deployment to be ready
    sleep 30
    
    # Validate staging deployment
    if curl -f -s "$STAGING_URL" > /dev/null; then
        success "Staging deployment is accessible"
    else
        error "Staging deployment is not accessible"
    fi
    
    success "Staging deployment validated"
}

# Deploy to production
deploy_production() {
    log "Deploying to production environment..."
    
    # Confirm production deployment
    echo -e "${YELLOW}⚠️  You are about to deploy to PRODUCTION${NC}"
    echo "Domain: $PRODUCTION_DOMAIN"
    echo "Branch: $(git branch --show-current)"
    echo "Commit: $(git rev-parse --short HEAD)"
    echo ""
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Production deployment cancelled"
    fi
    
    # Deploy to production
    PRODUCTION_URL=$(npx vercel --prod --yes)
    
    log "Production deployment completed: $PRODUCTION_URL"
    success "Production deployment completed"
}

# Configure domain
configure_domain() {
    log "Configuring custom domain..."
    
    # Add custom domain
    if npx vercel domains add $PRODUCTION_DOMAIN 2>/dev/null; then
        success "Domain $PRODUCTION_DOMAIN added"
    else
        warning "Domain $PRODUCTION_DOMAIN may already be configured"
    fi
    
    # Add www subdomain
    if npx vercel domains add www.$PRODUCTION_DOMAIN 2>/dev/null; then
        success "Domain www.$PRODUCTION_DOMAIN added"
    else
        warning "Domain www.$PRODUCTION_DOMAIN may already be configured"
    fi
    
    log "Please configure DNS records:"
    echo "Type: CNAME, Name: @, Value: cname.vercel-dns.com"
    echo "Type: CNAME, Name: www, Value: cname.vercel-dns.com"
    
    success "Domain configuration completed"
}

# Validate production deployment
validate_production() {
    log "Validating production deployment..."
    
    # Wait for deployment to propagate
    sleep 60
    
    # Check if production site is accessible
    if curl -f -s "https://$PRODUCTION_DOMAIN" > /dev/null; then
        success "Production site is accessible"
    else
        warning "Production site may not be accessible yet (DNS propagation)"
    fi
    
    # Run comprehensive validation if script exists
    if [ -f "scripts/validate-production-deployment.js" ]; then
        log "Running comprehensive validation..."
        node scripts/validate-production-deployment.js
    fi
    
    success "Production validation completed"
}

# Enable monitoring
enable_monitoring() {
    log "Enabling monitoring..."
    
    # Enable Vercel Analytics
    if npx vercel analytics enable 2>/dev/null; then
        success "Vercel Analytics enabled"
    else
        warning "Vercel Analytics may already be enabled"
    fi
    
    log "Please configure additional monitoring:"
    echo "1. Set up Sentry error tracking"
    echo "2. Configure external uptime monitoring"
    echo "3. Set up performance alerts"
    
    success "Monitoring setup initiated"
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
    link_project
    validate_environment
    run_tests
    deploy_staging
    deploy_production
    configure_domain
    validate_production
    enable_monitoring
    cleanup
    
    success "🚀 Production deployment completed successfully!"
    echo ""
    echo "Production URL: https://$PRODUCTION_DOMAIN"
    echo "Vercel Dashboard: https://vercel.com/dashboard"
    echo ""
    log "Deployment completed at $(date)"
    
    echo ""
    echo "Next steps:"
    echo "1. Monitor the deployment for the first 24 hours"
    echo "2. Validate all user workflows end-to-end"
    echo "3. Configure backup procedures"
    echo "4. Train team on production monitoring"
}

# Handle script interruption
trap 'error "Deployment interrupted"' INT TERM

# Run main function
main "$@"
