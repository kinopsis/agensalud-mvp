#!/bin/sh

# =====================================================
# AGENTSALUD MVP - SIMPLE COOLIFY STARTUP SCRIPT
# =====================================================
# Minimal startup script for reliable Coolify deployment
# 
# @author AgentSalud DevOps Team
# @date January 2025

set -e

echo "🚀 AgentSalud MVP - Starting..."
echo "Timestamp: $(date)"
echo "Node version: $(node --version)"
echo "Environment: ${NODE_ENV:-development}"

# Basic environment variable check
if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    if [ "$NEXT_PUBLIC_SUPABASE_URL" != "https://placeholder.supabase.co" ]; then
        echo "✅ Supabase URL configured: $NEXT_PUBLIC_SUPABASE_URL"
    else
        echo "⚠️ Using placeholder Supabase URL"
    fi
else
    echo "⚠️ NEXT_PUBLIC_SUPABASE_URL not set"
fi

# Create necessary directories
mkdir -p /tmp/agentsalud-logs

echo "🎯 Starting Next.js server on port ${PORT:-3000}..."

# Start the application
exec node server.js
