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

# Validate environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL not set"
    exit 1
fi

if [ "$NEXT_PUBLIC_SUPABASE_URL" = "https://placeholder.supabase.co" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL is still placeholder"
    echo "   Check Coolify environment variables configuration"
    exit 1
fi

echo "✅ Environment variables configured:"
echo "   NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"
echo ""

# Perform runtime replacement
echo "🔄 Performing runtime environment variable replacement..."
./manual-env-fix.sh

echo ""
echo "🎯 Starting Next.js server..."
exec node server.js
