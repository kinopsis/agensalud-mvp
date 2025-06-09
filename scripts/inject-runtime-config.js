#!/usr/bin/env node

/**
 * RUNTIME CONFIGURATION INJECTOR
 * Injects runtime environment variables into Next.js standalone build
 * for proper Supabase configuration in Coolify deployment
 * 
 * @author AgentSalud DevOps Team
 * @date January 2025
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 INJECTING RUNTIME CONFIGURATION');
console.log('==================================\n');

// Runtime configuration template
const createRuntimeConfig = () => {
  const config = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NODE_ENV: process.env.NODE_ENV || 'production'
  };

  // Validate required environment variables
  const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  const missingVars = requiredVars.filter(varName => !config[varName] || config[varName].includes('placeholder'));

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}: ${config[varName] || 'not set'}`);
    });
    console.error('\n🔧 Please set these variables in Coolify environment configuration');
    return null;
  }

  console.log('✅ Runtime configuration validated:');
  console.log(`   - NEXT_PUBLIC_SUPABASE_URL: ${config.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`   - NEXT_PUBLIC_SUPABASE_ANON_KEY: ${config.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'not set'}`);
  console.log(`   - NEXTAUTH_URL: ${config.NEXTAUTH_URL}`);
  console.log(`   - NODE_ENV: ${config.NODE_ENV}`);

  return config;
};

// Inject configuration into HTML files
const injectConfigIntoHtml = (htmlPath, config) => {
  if (!fs.existsSync(htmlPath)) {
    console.warn(`⚠️ HTML file not found: ${htmlPath}`);
    return false;
  }

  try {
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Create runtime config script
    const configScript = `
<script>
  window.__RUNTIME_CONFIG__ = ${JSON.stringify(config, null, 2)};
  console.log('🔧 Runtime configuration injected:', window.__RUNTIME_CONFIG__);
</script>`;

    // Inject before closing head tag
    if (htmlContent.includes('</head>')) {
      htmlContent = htmlContent.replace('</head>', `${configScript}\n</head>`);
      fs.writeFileSync(htmlPath, htmlContent, 'utf8');
      console.log(`✅ Configuration injected into: ${htmlPath}`);
      return true;
    } else {
      console.warn(`⚠️ No </head> tag found in: ${htmlPath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error injecting config into ${htmlPath}:`, error.message);
    return false;
  }
};

// Main execution
const main = () => {
  const config = createRuntimeConfig();
  
  if (!config) {
    console.error('❌ Runtime configuration validation failed');
    process.exit(1);
  }

  // Find and update HTML files in the standalone build
  const possibleHtmlPaths = [
    '.next/standalone/public/index.html',
    'public/index.html',
    '.next/server/pages/_document.html'
  ];

  let injectedCount = 0;
  
  for (const htmlPath of possibleHtmlPaths) {
    if (injectConfigIntoHtml(htmlPath, config)) {
      injectedCount++;
    }
  }

  if (injectedCount === 0) {
    console.warn('⚠️ No HTML files found for configuration injection');
    console.warn('Runtime configuration will rely on server-side environment variables only');
  }

  console.log(`\n🎉 Runtime configuration injection completed`);
  console.log(`📊 Files updated: ${injectedCount}`);
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createRuntimeConfig, injectConfigIntoHtml };
