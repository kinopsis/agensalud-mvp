#!/bin/sh

# =====================================================
# AGENTSALUD MVP - MANUAL ENVIRONMENT FIX
# =====================================================
# Manual script to replace placeholder values in production
# Use this when build arguments and automatic replacement fail
# 
# @author AgentSalud DevOps Team
# @date January 2025

echo "🔧 Manual Environment Variable Fix"
echo "================================="
echo "Timestamp: $(date)"
echo ""

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: server.js not found. Are you in the application directory?"
    exit 1
fi

# Check if environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL not set"
    exit 1
fi

if [ "$NEXT_PUBLIC_SUPABASE_URL" = "https://placeholder.supabase.co" ]; then
    echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL is still placeholder value"
    echo "   Current value: $NEXT_PUBLIC_SUPABASE_URL"
    echo "   This indicates Coolify environment variables are not properly set"
    exit 1
fi

echo "✅ Environment variables detected:"
echo "   NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY: $(echo $NEXT_PUBLIC_SUPABASE_ANON_KEY | cut -c1-20)..."
echo ""

# Find and replace in .next directory
echo "🔍 Searching for placeholder values in built files..."

PLACEHOLDER_URL="https://placeholder.supabase.co"
PLACEHOLDER_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder-signature-for-build-time-only"

PRODUCTION_URL="$NEXT_PUBLIC_SUPABASE_URL"
PRODUCTION_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY"

# Count files with placeholders
PLACEHOLDER_FILES=$(find .next -name "*.js" -type f -exec grep -l "$PLACEHOLDER_URL" {} \; 2>/dev/null | wc -l)

if [ "$PLACEHOLDER_FILES" -eq 0 ]; then
    echo "ℹ️ No placeholder values found in built files"
    echo "   This might indicate the build already used production values"
else
    echo "📁 Found $PLACEHOLDER_FILES files with placeholder values"
    echo ""
    echo "🔄 Replacing placeholder values..."
    
    # Replace URL placeholders
    find .next -name "*.js" -type f -exec sed -i "s|$PLACEHOLDER_URL|$PRODUCTION_URL|g" {} \; 2>/dev/null
    
    # Replace key placeholders
    find .next -name "*.js" -type f -exec sed -i "s|$PLACEHOLDER_KEY|$PRODUCTION_KEY|g" {} \; 2>/dev/null
    
    echo "✅ Replacement completed"
fi

echo ""
echo "🔍 Verification:"

# Verify replacements
REMAINING_PLACEHOLDERS=$(find .next -name "*.js" -type f -exec grep -l "$PLACEHOLDER_URL" {} \; 2>/dev/null | wc -l)

if [ "$REMAINING_PLACEHOLDERS" -eq 0 ]; then
    echo "✅ All placeholder URLs replaced successfully"
else
    echo "⚠️ $REMAINING_PLACEHOLDERS files still contain placeholder URLs"
fi

echo ""
echo "🎯 Manual fix completed!"
echo "   Restart the application to apply changes"
echo "   Test health check: curl https://agendia.torrecentral.com/api/health"
