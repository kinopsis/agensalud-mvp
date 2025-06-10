#!/bin/sh

# =====================================================
# AGENTSALUD MVP - COOLIFY ENVIRONMENT VALIDATION
# =====================================================
# Script to validate environment variables in Coolify deployment
# 
# @author AgentSalud DevOps Team
# @date January 2025

echo "🔍 Coolify Environment Variable Validation"
echo "=========================================="
echo "Timestamp: $(date)"
echo ""

# Function to check if variable is set and not placeholder
check_env_var() {
    local var_name="$1"
    local var_value="$2"
    local expected_pattern="$3"
    
    if [ -z "$var_value" ]; then
        echo "❌ $var_name: NOT SET"
        return 1
    elif echo "$var_value" | grep -q "placeholder"; then
        echo "⚠️ $var_name: PLACEHOLDER VALUE DETECTED"
        echo "   Value: ${var_value:0:30}..."
        return 1
    elif [ -n "$expected_pattern" ] && ! echo "$var_value" | grep -q "$expected_pattern"; then
        echo "⚠️ $var_name: UNEXPECTED FORMAT"
        echo "   Value: ${var_value:0:30}..."
        return 1
    else
        echo "✅ $var_name: CONFIGURED"
        if [ "$var_name" = "NEXT_PUBLIC_SUPABASE_URL" ]; then
            echo "   URL: $var_value"
        else
            echo "   Length: ${#var_value} characters"
        fi
        return 0
    fi
}

# Check required environment variables
echo "📋 Checking Required Environment Variables:"
echo ""

# Node Environment
check_env_var "NODE_ENV" "$NODE_ENV" "production"
NODE_ENV_OK=$?

# Supabase Configuration
check_env_var "NEXT_PUBLIC_SUPABASE_URL" "$NEXT_PUBLIC_SUPABASE_URL" "https://.*\.supabase\.co"
SUPABASE_URL_OK=$?

check_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_ANON_KEY" "eyJ"
SUPABASE_ANON_OK=$?

check_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" "eyJ"
SUPABASE_SERVICE_OK=$?

# NextAuth Configuration
check_env_var "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET" ""
NEXTAUTH_SECRET_OK=$?

check_env_var "NEXTAUTH_URL" "$NEXTAUTH_URL" "https://agendia.torrecentral.com"
NEXTAUTH_URL_OK=$?

echo ""
echo "🔗 Testing External Connectivity:"
echo ""

# Test Supabase connectivity
if [ $SUPABASE_URL_OK -eq 0 ]; then
    echo "Testing Supabase connectivity..."
    if curl -s --max-time 10 "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" > /dev/null 2>&1; then
        echo "✅ Supabase: REACHABLE"
        SUPABASE_CONN_OK=0
    else
        echo "❌ Supabase: CONNECTION FAILED"
        SUPABASE_CONN_OK=1
    fi
else
    echo "⚠️ Supabase: SKIPPED (URL not configured)"
    SUPABASE_CONN_OK=1
fi

echo ""
echo "📊 Summary:"
echo "==========="

# Calculate overall status
TOTAL_CHECKS=6
PASSED_CHECKS=0

[ $NODE_ENV_OK -eq 0 ] && PASSED_CHECKS=$((PASSED_CHECKS + 1))
[ $SUPABASE_URL_OK -eq 0 ] && PASSED_CHECKS=$((PASSED_CHECKS + 1))
[ $SUPABASE_ANON_OK -eq 0 ] && PASSED_CHECKS=$((PASSED_CHECKS + 1))
[ $SUPABASE_SERVICE_OK -eq 0 ] && PASSED_CHECKS=$((PASSED_CHECKS + 1))
[ $NEXTAUTH_SECRET_OK -eq 0 ] && PASSED_CHECKS=$((PASSED_CHECKS + 1))
[ $NEXTAUTH_URL_OK -eq 0 ] && PASSED_CHECKS=$((PASSED_CHECKS + 1))

echo "Environment Variables: $PASSED_CHECKS/$TOTAL_CHECKS configured"
echo "Supabase Connectivity: $([ $SUPABASE_CONN_OK -eq 0 ] && echo "✅ Working" || echo "❌ Failed")"

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ] && [ $SUPABASE_CONN_OK -eq 0 ]; then
    echo ""
    echo "🎉 ALL CHECKS PASSED - Production Ready!"
    exit 0
else
    echo ""
    echo "⚠️ ISSUES DETECTED - Review Coolify Environment Variables"
    echo ""
    echo "🔧 Next Steps:"
    echo "1. Check Coolify Environment Variables section"
    echo "2. Ensure all variables are set without placeholder values"
    echo "3. Redeploy application after fixing variables"
    echo "4. Re-run this validation script"
    exit 1
fi
