/**
 * =====================================================
 * AGENTSALUD MVP - RUNTIME ENVIRONMENT REPLACEMENT
 * =====================================================
 * Replaces placeholder values in built Next.js files with runtime environment variables
 * Use this if Coolify build arguments are not available
 * 
 * @author AgentSalud DevOps Team
 * @date January 2025
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Runtime Environment Variable Replacement');
console.log('==========================================');

// Configuration - ALL API KEYS AND SECRETS
const REPLACEMENTS = {
  // Supabase Configuration
  'https://placeholder.supabase.co': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder-signature-for-build-time-only': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,

  // OpenAI Configuration
  'sk-placeholder-openai-api-key-for-build-time-only': process.env.OPENAI_API_KEY,

  // Evolution API Configuration
  'https://placeholder-evolution-api.com': process.env.EVOLUTION_API_BASE_URL,
  'placeholder-evolution-api-key': process.env.EVOLUTION_API_KEY,

  // NextAuth Configuration
  'placeholder-nextauth-secret-32-characters-long': process.env.NEXTAUTH_SECRET,
  'http://localhost:3000': process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL,

  // Additional API Keys (if present)
  'placeholder-jwt-secret': process.env.JWT_SECRET,
  'placeholder-encryption-key': process.env.ENCRYPTION_KEY
};

// Files to process
const FILES_TO_PROCESS = [
  '.next/static/**/*.js',
  '.next/server/**/*.js',
  '.next/standalone/**/*.js'
];

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    Object.entries(REPLACEMENTS).forEach(([placeholder, replacement]) => {
      if (replacement && content.includes(placeholder)) {
        content = content.replace(new RegExp(placeholder, 'g'), replacement);
        modified = true;
        console.log(`  ✅ Replaced ${placeholder.substring(0, 30)}... in ${path.basename(filePath)}`);
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function findJSFiles(dir) {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item.endsWith('.js')) {
        files.push(fullPath);
      }
    });
  }
  
  traverse(dir);
  return files;
}

function main() {
  console.log('🔍 Environment Variables Status:');
  console.log('================================');

  // Check all critical environment variables
  const criticalVars = {
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
    'EVOLUTION_API_BASE_URL': process.env.EVOLUTION_API_BASE_URL,
    'EVOLUTION_API_KEY': process.env.EVOLUTION_API_KEY,
    'NEXTAUTH_SECRET': process.env.NEXTAUTH_SECRET,
    'NEXTAUTH_URL': process.env.NEXTAUTH_URL
  };

  let hasPlaceholders = false;
  let missingVars = 0;

  Object.entries(criticalVars).forEach(([name, value]) => {
    if (!value) {
      console.log(`  ❌ ${name}: NOT_SET`);
      missingVars++;
    } else if (value.includes('placeholder')) {
      console.log(`  ⚠️ ${name}: PLACEHOLDER VALUE`);
      hasPlaceholders = true;
    } else {
      if (name.includes('KEY') || name.includes('SECRET')) {
        console.log(`  ✅ ${name}: SET (${value.length} chars)`);
      } else {
        console.log(`  ✅ ${name}: ${value}`);
      }
    }
  });

  console.log('');

  // Validate critical environment variables
  if (missingVars > 0) {
    console.error(`❌ ${missingVars} critical environment variables not set.`);
    console.error('   This indicates Coolify environment variables are not being injected.');
    console.error('   Skipping replacement - application will use build-time placeholder values.');
    return;
  }

  if (hasPlaceholders) {
    console.error('❌ Some environment variables still contain placeholder values.');
    console.error('   This indicates partial Coolify environment variable injection.');
    console.error('   Proceeding with replacement for available production values...');
  }
  
  // Process files
  const directories = ['.next/static', '.next/server', '.next/standalone'];
  let totalFiles = 0;
  let modifiedFiles = 0;
  
  directories.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`📁 Processing ${dir}...`);
      const files = findJSFiles(dir);
      
      files.forEach(file => {
        totalFiles++;
        if (replaceInFile(file)) {
          modifiedFiles++;
        }
      });
    }
  });
  
  console.log('');
  console.log('📊 Summary:');
  console.log(`  Total files processed: ${totalFiles}`);
  console.log(`  Files modified: ${modifiedFiles}`);
  
  if (modifiedFiles > 0) {
    console.log('✅ Runtime environment variable replacement completed successfully!');
  } else {
    console.log('ℹ️ No placeholder values found to replace.');
  }
}

// Run the replacement
main();
