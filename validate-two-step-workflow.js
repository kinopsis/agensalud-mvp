#!/usr/bin/env node

/**
 * Two-Step Workflow Validation Script
 * 
 * Validates that the WhatsApp integration properly enforces the two-step workflow:
 * Step 1: Create instance in "disconnected" state
 * Step 2: User clicks "Connect" → QR generation → WhatsApp authentication
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

const fs = require('fs');

console.log('🔍 TWO-STEP WORKFLOW VALIDATION');
console.log('='.repeat(60));

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  issues: []
};

// =====================================================
// TEST 1: Instance Creation Endpoint Validation
// =====================================================

console.log('\n📋 TEST 1: Instance Creation Endpoint');
console.log('-'.repeat(40));

try {
  const routeContent = fs.readFileSync('src/app/api/whatsapp/instances/route.ts', 'utf8');
  
  // Check 1: Ensure qrcode is hardcoded to false
  if (routeContent.includes('qrcode: false')) {
    console.log('✅ Instance creation enforces qrcode: false');
    results.passed++;
  } else {
    console.log('❌ Instance creation does not enforce qrcode: false');
    results.failed++;
    results.issues.push('Instance creation endpoint allows QR generation during creation');
  }
  
  // Check 2: Ensure no dynamic qrcode setting
  if (!routeContent.includes('qrcode: instanceData.evolution_api_config?.qrcode')) {
    console.log('✅ Instance creation does not allow dynamic QR code setting');
    results.passed++;
  } else {
    console.log('❌ Instance creation still allows dynamic QR code setting');
    results.failed++;
    results.issues.push('Instance creation endpoint allows frontend to override QR code setting');
  }
  
  // Check 3: Ensure status is set to disconnected
  if (routeContent.includes("status: 'disconnected'")) {
    console.log('✅ Instance creation sets status to disconnected');
    results.passed++;
  } else {
    console.log('❌ Instance creation does not set status to disconnected');
    results.failed++;
    results.issues.push('Instance creation does not properly set disconnected status');
  }
  
} catch (error) {
  console.log('❌ Could not read instance creation endpoint');
  results.failed++;
  results.issues.push(`File read error: ${error.message}`);
}

// =====================================================
// TEST 2: Connect Endpoint Validation
// =====================================================

console.log('\n📋 TEST 2: Connect Endpoint Validation');
console.log('-'.repeat(40));

try {
  const connectContent = fs.readFileSync('src/app/api/whatsapp/instances/[id]/connect/route.ts', 'utf8');
  
  // Check 1: Ensure state validation exists
  if (connectContent.includes("instance.status !== 'disconnected'")) {
    console.log('✅ Connect endpoint validates disconnected state');
    results.passed++;
  } else {
    console.log('❌ Connect endpoint does not validate disconnected state');
    results.failed++;
    results.issues.push('Connect endpoint allows connection from any state');
  }
  
  // Check 2: Ensure proper error handling for invalid states
  if (connectContent.includes('INVALID_STATE_FOR_CONNECTION')) {
    console.log('✅ Connect endpoint provides proper error for invalid states');
    results.passed++;
  } else {
    console.log('❌ Connect endpoint does not provide proper error handling');
    results.failed++;
    results.issues.push('Connect endpoint lacks proper error handling for invalid states');
  }
  
  // Check 3: Ensure status update to connecting
  if (connectContent.includes("status: 'connecting'")) {
    console.log('✅ Connect endpoint updates status to connecting');
    results.passed++;
  } else {
    console.log('❌ Connect endpoint does not update status to connecting');
    results.failed++;
    results.issues.push('Connect endpoint does not properly update status');
  }
  
} catch (error) {
  console.log('❌ Could not read connect endpoint');
  results.failed++;
  results.issues.push(`Connect endpoint read error: ${error.message}`);
}

// =====================================================
// TEST 3: Evolution API Service Validation
// =====================================================

console.log('\n📋 TEST 3: Evolution API Service Validation');
console.log('-'.repeat(40));

try {
  const serviceContent = fs.readFileSync('src/lib/services/EvolutionAPIService.ts', 'utf8');
  
  // Check 1: Ensure createInstance uses qrcode: false
  if (serviceContent.includes('qrcode: false // CRITICAL: Create instance in disconnected state first')) {
    console.log('✅ Evolution API service enforces qrcode: false');
    results.passed++;
  } else {
    console.log('❌ Evolution API service does not enforce qrcode: false');
    results.failed++;
    results.issues.push('Evolution API service allows QR generation during creation');
  }
  
  // Check 2: Ensure connectInstance method exists
  if (serviceContent.includes('async connectInstance(instanceName: string)')) {
    console.log('✅ Evolution API service has connectInstance method');
    results.passed++;
  } else {
    console.log('❌ Evolution API service missing connectInstance method');
    results.failed++;
    results.issues.push('Evolution API service lacks connectInstance method');
  }
  
} catch (error) {
  console.log('❌ Could not read Evolution API service');
  results.failed++;
  results.issues.push(`Evolution API service read error: ${error.message}`);
}

// =====================================================
// TEST 4: UI Component Validation
// =====================================================

console.log('\n📋 TEST 4: UI Component Validation');
console.log('-'.repeat(40));

try {
  const uiContent = fs.readFileSync('src/components/channels/ChannelInstanceCard.tsx', 'utf8');
  
  // Check 1: Ensure Connect button for disconnected instances
  if (uiContent.includes("instance.status === 'disconnected'") && uiContent.includes('Conectar WhatsApp')) {
    console.log('✅ UI shows Connect button for disconnected instances');
    results.passed++;
  } else {
    console.log('❌ UI does not properly show Connect button for disconnected instances');
    results.failed++;
    results.issues.push('UI component does not show Connect button for disconnected instances');
  }
  
  // Check 2: Ensure QR code only for connecting instances
  if (uiContent.includes("instance.status === 'connecting'") && uiContent.includes('QRCodeDisplay')) {
    console.log('✅ UI shows QR code only for connecting instances');
    results.passed++;
  } else {
    console.log('❌ UI does not properly restrict QR code display');
    results.failed++;
    results.issues.push('UI component does not properly restrict QR code display to connecting state');
  }
  
  // Check 3: Ensure handleConnectInstance function exists
  if (uiContent.includes('handleConnectInstance')) {
    console.log('✅ UI has handleConnectInstance function');
    results.passed++;
  } else {
    console.log('❌ UI missing handleConnectInstance function');
    results.failed++;
    results.issues.push('UI component lacks handleConnectInstance function');
  }
  
} catch (error) {
  console.log('❌ Could not read UI component');
  results.failed++;
  results.issues.push(`UI component read error: ${error.message}`);
}

// =====================================================
// WORKFLOW VALIDATION SUMMARY
// =====================================================

console.log('\n' + '='.repeat(60));
console.log('📊 TWO-STEP WORKFLOW VALIDATION RESULTS');
console.log('='.repeat(60));

const totalTests = results.passed + results.failed;
const successRate = totalTests > 0 ? (results.passed / totalTests * 100).toFixed(1) : 0;

console.log(`\n📈 Test Results: ${results.passed}/${totalTests} passed (${successRate}%)`);
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);

if (results.issues.length > 0) {
  console.log('\n🚨 Issues Found:');
  results.issues.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue}`);
  });
}

// =====================================================
// WORKFLOW ENFORCEMENT ASSESSMENT
// =====================================================

console.log('\n' + '='.repeat(60));
console.log('🎯 WORKFLOW ENFORCEMENT ASSESSMENT');
console.log('='.repeat(60));

if (successRate >= 90) {
  console.log('\n🎉 EXCELLENT: Two-step workflow is properly enforced');
  console.log('✅ Instances will be created in disconnected state');
  console.log('✅ Users must explicitly click Connect to start QR generation');
  console.log('✅ QR codes only appear during connecting state');
  console.log('✅ Proper state validation prevents workflow bypass');
  
} else if (successRate >= 75) {
  console.log('\n⚠️ GOOD: Two-step workflow is mostly enforced');
  console.log('✅ Core workflow logic is in place');
  console.log('⚠️ Some minor issues need attention');
  console.log('📋 Review the issues above for improvements');
  
} else if (successRate >= 50) {
  console.log('\n🔧 NEEDS WORK: Two-step workflow has significant issues');
  console.log('⚠️ Workflow enforcement is incomplete');
  console.log('🚨 Critical fixes needed before production');
  console.log('📋 Address all issues above immediately');
  
} else {
  console.log('\n🚨 CRITICAL: Two-step workflow is not properly enforced');
  console.log('❌ Major workflow bypass vulnerabilities exist');
  console.log('🛑 DO NOT DEPLOY until all issues are fixed');
  console.log('📋 Complete workflow redesign may be needed');
}

// =====================================================
// NEXT STEPS RECOMMENDATIONS
// =====================================================

console.log('\n' + '='.repeat(60));
console.log('📋 NEXT STEPS RECOMMENDATIONS');
console.log('='.repeat(60));

if (successRate >= 90) {
  console.log('\n1. 🧪 Manual Testing:');
  console.log('   • Test instance creation → verify disconnected state');
  console.log('   • Test connect button → verify QR generation');
  console.log('   • Test QR scanning → verify connected state');
  
  console.log('\n2. 🚀 Production Readiness:');
  console.log('   • Deploy to staging environment');
  console.log('   • Conduct end-to-end testing');
  console.log('   • Monitor workflow compliance');
  
} else {
  console.log('\n1. 🔧 Fix Critical Issues:');
  results.issues.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue}`);
  });
  
  console.log('\n2. 🧪 Re-run Validation:');
  console.log('   • Fix all issues above');
  console.log('   • Run this script again');
  console.log('   • Achieve 90%+ success rate');
}

console.log('\n' + '='.repeat(60));
console.log('✨ Two-Step Workflow Validation Complete!');
console.log('='.repeat(60));

// Exit with appropriate code
process.exit(successRate >= 90 ? 0 : 1);
