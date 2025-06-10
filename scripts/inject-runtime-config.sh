#!/bin/sh

# =====================================================
# AGENTSALUD MVP - RUNTIME CONFIG INJECTION
# =====================================================
# Inject runtime configuration into HTML files for client-side access
# This allows client-side code to access production environment variables
# 
# @author AgentSalud DevOps Team
# @date January 2025

echo "🔧 Runtime Config Injection"
echo "=========================="
echo "Timestamp: $(date)"
echo ""

# Check if we have production environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ "$NEXT_PUBLIC_SUPABASE_URL" = "https://placeholder.supabase.co" ]; then
    echo "⚠️ No production environment variables available"
    echo "   Skipping runtime config injection"
    exit 0
fi

echo "✅ Injecting runtime configuration..."
echo "   NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"
echo ""

# Create runtime config script
RUNTIME_CONFIG="<script>
window.__RUNTIME_CONFIG__ = {
  NEXT_PUBLIC_SUPABASE_URL: '$NEXT_PUBLIC_SUPABASE_URL',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: '$NEXT_PUBLIC_SUPABASE_ANON_KEY'
};
console.log('🔧 Runtime config injected:', window.__RUNTIME_CONFIG__);
</script>"

# Find and inject into HTML files
find .next -name "*.html" -type f -exec sed -i "s|</head>|$RUNTIME_CONFIG</head>|g" {} \; 2>/dev/null

echo "✅ Runtime config injection completed"
echo ""
