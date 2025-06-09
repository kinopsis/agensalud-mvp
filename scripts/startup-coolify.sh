#!/bin/sh

# =====================================================
# AGENTSALUD MVP - COOLIFY STARTUP SCRIPT
# =====================================================
# Ensures proper environment variable loading and application startup
# 
# @author AgentSalud DevOps Team
# @date January 2025

set -e

echo "🚀 AgentSalud MVP - Coolify Startup"
echo "=================================="

# Function to validate environment variables
validate_env_vars() {
    echo "🔍 Validating environment variables..."
    
    local required_vars=(
        "NODE_ENV"
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "NEXTAUTH_SECRET"
    )
    
    local missing_vars=()
    local placeholder_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        elif [[ "${!var}" == *"placeholder"* ]]; then
            placeholder_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        echo "⚠️ Missing environment variables: ${missing_vars[*]}"
        echo "   Application will start but may have limited functionality"
    fi
    
    if [ ${#placeholder_vars[@]} -gt 0 ]; then
        echo "⚠️ Placeholder values detected: ${placeholder_vars[*]}"
        echo "   Please update these in Coolify environment variables"
    fi
    
    if [ ${#missing_vars[@]} -eq 0 ] && [ ${#placeholder_vars[@]} -eq 0 ]; then
        echo "✅ All environment variables properly configured"
    fi
}

# Function to wait for dependencies
wait_for_dependencies() {
    echo "🔗 Checking external dependencies..."
    
    if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ] && [[ "$NEXT_PUBLIC_SUPABASE_URL" != *"placeholder"* ]]; then
        echo "   Testing Supabase connectivity..."
        if curl -s --max-time 10 "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" > /dev/null; then
            echo "   ✅ Supabase is reachable"
        else
            echo "   ⚠️ Supabase connectivity issues (will retry during runtime)"
        fi
    else
        echo "   ⚠️ Supabase URL not configured or using placeholder"
    fi
}

# Function to prepare application
prepare_application() {
    echo "📦 Preparing application..."
    
    # Ensure proper permissions
    if [ -d "/app/uploads" ]; then
        chmod 755 /app/uploads
        echo "   ✅ Upload directory permissions set"
    fi
    
    # Create necessary directories
    mkdir -p /tmp/agentsalud-logs
    echo "   ✅ Log directory created"
    
    echo "   ✅ Application preparation complete"
}

# Main startup sequence
main() {
    echo "Starting AgentSalud MVP deployment..."
    echo "Timestamp: $(date)"
    echo "Node version: $(node --version)"
    echo "Environment: ${NODE_ENV:-development}"
    echo ""
    
    validate_env_vars
    echo ""
    
    wait_for_dependencies
    echo ""
    
    prepare_application
    echo ""
    
    echo "🎯 Starting Next.js server..."
    echo "Port: ${PORT:-3000}"
    echo "Hostname: ${HOSTNAME:-0.0.0.0}"
    echo ""
    
    # Start the application
    exec node server.js
}

# Run main function
main "$@"
