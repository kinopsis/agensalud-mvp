#!/bin/bash

# =====================================================
# AGENTSALUD MVP - PRODUCTION SUPABASE FIX SCRIPT
# =====================================================
# Comprehensive script to diagnose and fix Supabase configuration issues
# in Coolify production deployment
#
# @author AgentSalud DevOps Team
# @date January 2025

set -e

echo "🔧 AGENTSALUD MVP - PRODUCTION SUPABASE FIX"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "success") echo -e "${GREEN}✅ $message${NC}" ;;
        "error") echo -e "${RED}❌ $message${NC}" ;;
        "warning") echo -e "${YELLOW}⚠️ $message${NC}" ;;
        "info") echo -e "${BLUE}ℹ️ $message${NC}" ;;
    esac
}

# Step 1: Validate Environment Variables
echo "📋 Step 1: Validating Environment Variables"
echo "-------------------------------------------"

required_vars=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "NEXTAUTH_SECRET"
    "NEXTAUTH_URL"
)

missing_vars=()
placeholder_vars=()

for var in "${required_vars[@]}"; do
    value="${!var}"
    if [ -z "$value" ]; then
        missing_vars+=("$var")
        print_status "error" "$var is not set"
    elif [[ "$value" == *"placeholder"* ]]; then
        placeholder_vars+=("$var")
        print_status "warning" "$var contains placeholder value"
    else
        print_status "success" "$var is properly configured"
    fi
done

# Step 2: Check Supabase URL Format
echo ""
echo "🌐 Step 2: Validating Supabase URL Format"
echo "-----------------------------------------"

if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    if [[ "$NEXT_PUBLIC_SUPABASE_URL" =~ ^https://.*\.supabase\.co$ ]]; then
        print_status "success" "Supabase URL format is valid"
    else
        print_status "error" "Invalid Supabase URL format. Expected: https://project.supabase.co"
    fi
else
    print_status "error" "NEXT_PUBLIC_SUPABASE_URL is not set"
fi

# Step 3: Test Supabase Connectivity
echo ""
echo "🔗 Step 3: Testing Supabase Connectivity"
echo "----------------------------------------"

if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ] && [ -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    if ! [[ "$NEXT_PUBLIC_SUPABASE_URL" == *"placeholder"* ]]; then
        echo "Testing connection to: $NEXT_PUBLIC_SUPABASE_URL"
        
        # Test REST API endpoint
        response=$(curl -s -w "%{http_code}" -o /dev/null \
            -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
            -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
            "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" \
            --connect-timeout 10 \
            --max-time 30 || echo "000")
        
        if [ "$response" = "200" ] || [ "$response" = "401" ]; then
            print_status "success" "Supabase REST API is reachable (HTTP $response)"
        else
            print_status "error" "Supabase REST API unreachable (HTTP $response)"
        fi
        
        # Test Auth endpoint
        auth_response=$(curl -s -w "%{http_code}" -o /dev/null \
            -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
            "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/settings" \
            --connect-timeout 10 \
            --max-time 30 || echo "000")
        
        if [ "$auth_response" = "200" ]; then
            print_status "success" "Supabase Auth API is reachable (HTTP $auth_response)"
        else
            print_status "warning" "Supabase Auth API response: HTTP $auth_response"
        fi
    else
        print_status "warning" "Skipping connectivity test - placeholder URL detected"
    fi
else
    print_status "error" "Cannot test connectivity - missing URL or API key"
fi

# Step 4: Validate Application Health
echo ""
echo "🏥 Step 4: Testing Application Health Check"
echo "------------------------------------------"

if [ -n "$NEXTAUTH_URL" ]; then
    health_url="$NEXTAUTH_URL/api/health"
    echo "Testing health endpoint: $health_url"
    
    health_response=$(curl -s -w "%{http_code}" -o /tmp/health_check.json \
        "$health_url" \
        --connect-timeout 10 \
        --max-time 30 || echo "000")
    
    if [ "$health_response" = "200" ] || [ "$health_response" = "503" ]; then
        print_status "success" "Health endpoint reachable (HTTP $health_response)"
        
        # Parse health check response
        if command -v jq &> /dev/null && [ -f /tmp/health_check.json ]; then
            db_status=$(jq -r '.services.database.status' /tmp/health_check.json 2>/dev/null || echo "unknown")
            env_status=$(jq -r '.services.environment.status' /tmp/health_check.json 2>/dev/null || echo "unknown")
            
            print_status "info" "Database health: $db_status"
            print_status "info" "Environment health: $env_status"
        fi
    else
        print_status "error" "Health endpoint unreachable (HTTP $health_response)"
    fi
else
    print_status "warning" "Cannot test health endpoint - NEXTAUTH_URL not set"
fi

# Step 5: Generate Fix Recommendations
echo ""
echo "🔧 Step 5: Fix Recommendations"
echo "------------------------------"

if [ ${#missing_vars[@]} -gt 0 ] || [ ${#placeholder_vars[@]} -gt 0 ]; then
    print_status "error" "Configuration issues detected!"
    echo ""
    echo "REQUIRED ACTIONS:"
    echo "=================="
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        echo "1. Set missing environment variables in Coolify:"
        for var in "${missing_vars[@]}"; do
            echo "   - $var"
        done
        echo ""
    fi
    
    if [ ${#placeholder_vars[@]} -gt 0 ]; then
        echo "2. Replace placeholder values in Coolify:"
        for var in "${placeholder_vars[@]}"; do
            echo "   - $var"
        done
        echo ""
    fi
    
    echo "COOLIFY CONFIGURATION STEPS:"
    echo "============================"
    echo "1. Log into Coolify dashboard"
    echo "2. Navigate to AgentSalud application"
    echo "3. Go to Environment Variables section"
    echo "4. Set/update the following variables:"
    echo ""
    echo "   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
    echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here"
    echo "   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here"
    echo "   NEXTAUTH_SECRET=your-32-character-secret-here"
    echo "   NEXTAUTH_URL=https://agendia.torrecentral.com"
    echo ""
    echo "5. Save configuration"
    echo "6. Restart/redeploy the application"
    echo ""
    
    echo "SUPABASE CONFIGURATION STEPS:"
    echo "============================="
    echo "1. Log into Supabase dashboard"
    echo "2. Go to Project Settings > API"
    echo "3. Copy the correct values:"
    echo "   - Project URL"
    echo "   - Anon/Public key"
    echo "   - Service Role key"
    echo "4. Go to Authentication > URL Configuration"
    echo "5. Add https://agendia.torrecentral.com to allowed origins"
    echo "6. Set redirect URLs to https://agendia.torrecentral.com/auth/callback"
    echo ""
    
    exit 1
else
    print_status "success" "All environment variables are properly configured!"
    echo ""
    echo "🎉 CONFIGURATION VALIDATION PASSED"
    echo "================================="
    echo "Your Supabase configuration appears to be correct."
    echo "If you're still experiencing issues, check:"
    echo ""
    echo "1. Browser console for detailed error messages"
    echo "2. Coolify deployment logs for startup errors"
    echo "3. Supabase dashboard for project status"
    echo "4. Network connectivity between Coolify and Supabase"
    echo ""
    
    exit 0
fi
