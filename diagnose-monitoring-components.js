#!/usr/bin/env node

/**
 * Diagnose Monitoring Components
 * 
 * Script para diagnosticar por qué los componentes de monitoreo
 * no se están activando para la nueva instancia WhatsApp
 */

console.log('🔍 Diagnosing WhatsApp Monitoring Components');
console.log('============================================');

// Browser console script to check component status
const diagnosticScript = `
console.log('🔍 WHATSAPP MONITORING COMPONENTS DIAGNOSTIC');
console.log('===========================================');

// 1. Check if monitoring registry exists
console.log('\\n1. MONITORING REGISTRY STATUS:');
if (window.monitoringRegistry) {
  console.log('✅ Monitoring registry found');
  console.log('📊 Active monitors:', window.monitoringRegistry.getActiveMonitors());
  console.log('📊 Registry status:', window.monitoringRegistry.getStatus());
} else {
  console.log('❌ Monitoring registry NOT found in window');
}

// 2. Check React components in DOM
console.log('\\n2. REACT COMPONENTS IN DOM:');
const channelCards = document.querySelectorAll('[data-testid*="channel"], [class*="channel"], [class*="instance"]');
console.log('📱 Channel/Instance cards found:', channelCards.length);

channelCards.forEach((card, index) => {
  console.log(\`  Card \${index + 1}:\`, {
    className: card.className,
    textContent: card.textContent.substring(0, 100) + '...',
    hasConnectionIndicator: !!card.querySelector('[class*="connection"], [class*="status"]')
  });
});

// 3. Check for WhatsApp instances in React DevTools
console.log('\\n3. REACT DEVTOOLS CHECK:');
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  console.log('✅ React DevTools available');
  try {
    const reactFiber = document.querySelector('#__next')._reactInternalFiber || 
                      document.querySelector('#__next')._reactInternals;
    if (reactFiber) {
      console.log('✅ React fiber found');
    }
  } catch (e) {
    console.log('⚠️ Could not access React fiber:', e.message);
  }
} else {
  console.log('❌ React DevTools not available');
}

// 4. Check for active intervals and timeouts
console.log('\\n4. ACTIVE INTERVALS/TIMEOUTS:');
let activeIntervals = 0;
let activeTimeouts = 0;

// Check for intervals (rough estimate)
for (let i = 1; i < 1000; i++) {
  try {
    const intervalId = setInterval(() => {}, 999999);
    if (intervalId === i) activeIntervals++;
    clearInterval(intervalId);
  } catch (e) {
    // Interval ID exists
    activeIntervals++;
  }
}

console.log('📊 Estimated active intervals:', activeIntervals);

// 5. Check network requests
console.log('\\n5. RECENT NETWORK ACTIVITY:');
if (window.performance && window.performance.getEntriesByType) {
  const recentRequests = window.performance.getEntriesByType('resource')
    .filter(entry => entry.name.includes('whatsapp') || entry.name.includes('api'))
    .slice(-10);
  
  console.log('📡 Recent WhatsApp/API requests:');
  recentRequests.forEach(req => {
    console.log(\`  \${req.name} - \${req.responseStatus || 'unknown'}\`);
  });
} else {
  console.log('⚠️ Performance API not available');
}

// 6. Check for specific WhatsApp instance
console.log('\\n6. SPECIFIC INSTANCE CHECK:');
const targetInstanceId = '610a212a-2d00-4aac-88b9-b510b082455a';
console.log('🎯 Looking for instance:', targetInstanceId);

// Check in DOM
const instanceElements = document.querySelectorAll(\`[data-instance-id="\${targetInstanceId}"], [id*="\${targetInstanceId}"], [class*="\${targetInstanceId.substring(0, 8)}"]\`);
console.log('📱 Instance elements in DOM:', instanceElements.length);

// Check in localStorage
const localStorageKeys = Object.keys(localStorage).filter(key => 
  key.includes('whatsapp') || key.includes(targetInstanceId)
);
console.log('💾 Related localStorage keys:', localStorageKeys);

// Check in sessionStorage
const sessionStorageKeys = Object.keys(sessionStorage).filter(key => 
  key.includes('whatsapp') || key.includes(targetInstanceId)
);
console.log('💾 Related sessionStorage keys:', sessionStorageKeys);

// 7. Check current page and route
console.log('\\n7. CURRENT PAGE STATUS:');
console.log('📍 Current URL:', window.location.href);
console.log('📍 Current pathname:', window.location.pathname);
console.log('📍 Page title:', document.title);

// Check if we're on the channels page
const isChannelsPage = window.location.pathname.includes('channels');
console.log('📱 On channels page:', isChannelsPage);

// 8. Manual component activation test
console.log('\\n8. MANUAL COMPONENT TEST:');
console.log('🧪 Testing if we can manually trigger monitoring...');

if (window.monitoringRegistry && isChannelsPage) {
  try {
    const testResult = window.monitoringRegistry.register(
      targetInstanceId,
      'manual-test-' + Date.now(),
      30000
    );
    console.log('🧪 Manual registration test:', testResult);
    
    // Clean up test
    setTimeout(() => {
      window.monitoringRegistry.unregister(targetInstanceId);
      console.log('🧹 Cleaned up manual test');
    }, 1000);
  } catch (e) {
    console.log('❌ Manual test failed:', e.message);
  }
} else {
  console.log('⚠️ Cannot run manual test (missing registry or not on channels page)');
}

console.log('\\n🎯 DIAGNOSTIC SUMMARY:');
console.log('======================');
console.log('✅ Check monitoring registry status');
console.log('✅ Check React components in DOM');
console.log('✅ Check active intervals/timeouts');
console.log('✅ Check recent network requests');
console.log('✅ Check for specific instance elements');
console.log('✅ Check current page and route');
console.log('✅ Test manual component activation');
console.log('');
console.log('📋 Next steps based on results:');
console.log('1. If monitoring registry missing → Check component imports');
console.log('2. If no instance elements → Check navigation after creation');
console.log('3. If no active intervals → Check component mounting');
console.log('4. If no network requests → Check API endpoints');
`;

console.log('📋 INSTRUCTIONS:');
console.log('================');
console.log('');
console.log('1. Open your browser and navigate to the WhatsApp channels page');
console.log('2. Open Developer Tools (F12)');
console.log('3. Go to the Console tab');
console.log('4. Copy and paste the following diagnostic script:');
console.log('');
console.log('--- COPY FROM HERE ---');
console.log(diagnosticScript);
console.log('--- COPY TO HERE ---');
console.log('');
console.log('5. Press Enter to execute');
console.log('6. Review the diagnostic results');
console.log('7. Share the output for further analysis');
console.log('');
console.log('🎯 WHAT TO LOOK FOR:');
console.log('====================');
console.log('');
console.log('✅ GOOD SIGNS:');
console.log('- Monitoring registry found and active');
console.log('- Instance elements present in DOM');
console.log('- Active intervals for monitoring');
console.log('- Recent API requests to WhatsApp endpoints');
console.log('');
console.log('❌ PROBLEM INDICATORS:');
console.log('- Monitoring registry missing or empty');
console.log('- No instance elements in DOM');
console.log('- No active monitoring intervals');
console.log('- No recent WhatsApp API requests');
console.log('- Not on channels page after instance creation');
console.log('');
console.log('🔧 COMMON FIXES:');
console.log('================');
console.log('');
console.log('If monitoring registry missing:');
console.log('→ Check that monitoringRegistry.ts is imported');
console.log('→ Verify component mounting order');
console.log('');
console.log('If no instance elements:');
console.log('→ Check navigation after instance creation');
console.log('→ Verify data fetching in channels page');
console.log('');
console.log('If no active intervals:');
console.log('→ Check ConnectionStatusIndicator mounting');
console.log('→ Verify useConnectionStatusMonitor activation');
console.log('');
console.log('If no API requests:');
console.log('→ Check endpoint URLs and authentication');
console.log('→ Verify network connectivity');

console.log('');
console.log('💡 TIP: Run this diagnostic before and after creating a new WhatsApp instance');
console.log('to see what changes and identify where the flow breaks.');
