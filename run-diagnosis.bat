@echo off
set NEXT_PUBLIC_SUPABASE_URL=https://fjvletqwwmxusgthwphr.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmxldHF3d214dXNndGh3cGhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODIwNzYwMCwiZXhwIjoyMDYzNzgzNjAwfQ.xH7oxFwYfYPaeWrgqtUgRX5k-TIz90Qd98kaoD5Cy0s
set EVOLUTION_API_BASE_URL=https://evo.torrecentral.com/
set EVOLUTION_API_KEY=ixisatbi7f3p9m1ip37hibanq0vjq8nc

echo 🔍 PASO 1: DIAGNÓSTICO INICIAL (DRY RUN)
echo ==========================================
node scripts/fix-whatsapp-state-inconsistency.js --dry-run --verbose

echo.
echo 🔧 PASO 2: APLICAR RESOLUCIÓN
echo ==============================
node scripts/fix-whatsapp-state-inconsistency.js --verbose

echo.
echo ✅ PASO 3: VALIDACIÓN POST-RESOLUCIÓN
echo ======================================
node scripts/fix-whatsapp-state-inconsistency.js --dry-run --verbose
