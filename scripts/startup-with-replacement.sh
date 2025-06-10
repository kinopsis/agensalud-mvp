#!/bin/sh

# =====================================================
# AGENTSALUD MVP - STARTUP WITH RUNTIME REPLACEMENT
# =====================================================
# Startup script that validates environment variables and performs
# runtime replacement of placeholder values in built Next.js files
# 
# @author AgentSalud DevOps Team
# @date January 2025

echo "🚀 AgentSalud MVP - Runtime Environment Startup"
echo "=============================================="
echo "Timestamp: $(date)"
echo ""

# Check environment variables status
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL not set"
    echo "   This indicates Coolify environment variables are not properly configured"
    exit 1
fi

if [ "$NEXT_PUBLIC_SUPABASE_URL" = "https://placeholder.supabase.co" ]; then
    echo "⚠️ NEXT_PUBLIC_SUPABASE_URL is still placeholder value"
    echo "   This indicates Coolify environment variables are not being injected"
    echo "   Attempting to start with build-time values (runtime replacement will not work)"
    echo ""
    echo "🚨 WARNING: Application will use placeholder configuration"
    echo "   Please check Coolify environment variable configuration"
    echo ""
else
    echo "✅ Environment variables configured:"
    echo "   NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"
    echo ""

    # Perform runtime replacement only if we have production values
    echo "🔄 Performing runtime environment variable replacement..."
    ./manual-env-fix.sh

    # Inject runtime configuration for client-side access
    echo "🔧 Injecting runtime configuration..."
    ./scripts/inject-runtime-config.sh
fi

echo ""
echo "🎯 Starting Next.js server..."
exec node server.js
