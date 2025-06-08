@echo off
set NEXT_PUBLIC_SUPABASE_URL=https://fjvletqwwmxusgthwphr.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmxldHF3d214dXNndGh3cGhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODIwNzYwMCwiZXhwIjoyMDYzNzgzNjAwfQ.xH7oxFwYfYPaeWrgqtUgRX5k-TIz90Qd98kaoD5Cy0s
set EVOLUTION_API_BASE_URL=https://evo.torrecentral.com/
set EVOLUTION_API_KEY=ixisatbi7f3p9m1ip37hibanq0vjq8nc

echo 🔍 EJECUTANDO DIAGNÓSTICO DE FLUJO DE AUTENTICACIÓN WHATSAPP
echo ============================================================
node debug-whatsapp-auth-flow.js
