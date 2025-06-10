#!/bin/sh

# =====================================================
# AGENTSALUD MVP - COOLIFY ENVIRONMENT DIAGNOSIS
# =====================================================
# Diagnose Coolify environment variable injection issues
# 
# @author AgentSalud DevOps Team
# @date January 2025

echo "🔍 Coolify Environment Variable Diagnosis"
echo "========================================"
echo "Timestamp: $(date)"
echo "Container ID: $(hostname)"
echo ""

echo "📋 Environment Variable Status:"
echo "------------------------------"

# Check critical environment variables
check_env_var() {
    local var_name="$1"
    local var_value="${!var_name}"
    
    if [ -z "$var_value" ]; then
        echo "❌ $var_name: NOT SET"
    elif echo "$var_value" | grep -q "placeholder"; then
        echo "⚠️ $var_name: PLACEHOLDER VALUE"
        echo "   Value: ${var_value:0:50}..."
    else
        echo "✅ $var_name: CONFIGURED"
        if [ "$var_name" = "NEXT_PUBLIC_SUPABASE_URL" ]; then
            echo "   Value: $var_value"
        else
            echo "   Length: ${#var_value} characters"
        fi
    fi
}

# Check all critical variables
check_env_var "NODE_ENV"
check_env_var "NEXT_PUBLIC_SUPABASE_URL"
check_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY"
check_env_var "SUPABASE_SERVICE_ROLE_KEY"
check_env_var "NEXTAUTH_SECRET"
check_env_var "NEXTAUTH_URL"

echo ""
echo "🔍 Environment Variable Count:"
echo "   Total environment variables: $(env | wc -l)"
echo "   NEXT_PUBLIC_* variables: $(env | grep -c '^NEXT_PUBLIC_' || echo '0')"
echo ""

echo "🔍 Docker Environment Check:"
echo "   Running in container: $([ -f /.dockerenv ] && echo 'YES' || echo 'NO')"
echo "   Container hostname: $(hostname)"
echo ""

echo "🔍 File System Check:"
echo "   Current directory: $(pwd)"
echo "   server.js exists: $([ -f server.js ] && echo 'YES' || echo 'NO')"
echo "   .next directory exists: $([ -d .next ] && echo 'YES' || echo 'NO')"
echo ""

echo "🔍 Coolify Integration Check:"
echo "   COOLIFY_* variables: $(env | grep -c '^COOLIFY_' || echo '0')"
if [ "$(env | grep -c '^COOLIFY_')" -gt 0 ]; then
    echo "   Coolify variables found:"
    env | grep '^COOLIFY_' | sed 's/^/     /'
fi

echo ""
echo "📊 Diagnosis Summary:"
echo "==================="

# Count issues
missing_count=0
placeholder_count=0

for var in "NODE_ENV" "NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "NEXTAUTH_SECRET"; do
    var_value="${!var}"
    if [ -z "$var_value" ]; then
        missing_count=$((missing_count + 1))
    elif echo "$var_value" | grep -q "placeholder"; then
        placeholder_count=$((placeholder_count + 1))
    fi
done

if [ $missing_count -eq 0 ] && [ $placeholder_count -eq 0 ]; then
    echo "✅ All environment variables properly configured"
    echo "   Runtime replacement should work correctly"
elif [ $placeholder_count -gt 0 ]; then
    echo "⚠️ $placeholder_count variables have placeholder values"
    echo "   This indicates Coolify environment variables are not being injected"
    echo "   Check Coolify dashboard environment variable configuration"
else
    echo "❌ $missing_count variables are missing"
    echo "   Critical configuration issue - check Coolify setup"
fi

echo ""
echo "🔧 Next Steps:"
echo "============="
echo "1. Check Coolify dashboard environment variables"
echo "2. Verify docker-compose.yml environment section"
echo "3. Restart container to apply environment changes"
echo "4. Test health endpoint: curl http://localhost:3000/api/health"
echo ""
