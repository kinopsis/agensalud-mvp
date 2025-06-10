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

// Configuration
const REPLACEMENTS = {
  'https://placeholder.supabase.co': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder-signature-for-build-time-only': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
  console.log('Environment variables:');
  console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET'}`);
  console.log(`  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET'}`);
  console.log('');
  
  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('❌ Required environment variables not set. Skipping replacement.');
    return;
  }
  
  if (process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
    console.error('❌ Environment variables still contain placeholder values. Skipping replacement.');
    return;
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
