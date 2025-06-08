#!/usr/bin/env node

/**
 * Modal Workflow Fix Validation Script
 * 
 * Validates that the SimplifiedWhatsAppInstanceModal properly implements
 * the two-step workflow and no longer bypasses the connect endpoint.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

const fs = require('fs');

console.log('🔍 MODAL WORKFLOW FIX VALIDATION');
console.log('='.repeat(60));

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  issues: []
};

// =====================================================
// TEST 1: Modal Two-Step Workflow Implementation
// =====================================================

console.log('\n📋 TEST 1: Modal Two-Step Workflow Implementation');
console.log('-'.repeat(50));

try {
  const modalContent = fs.readFileSync('src/components/channels/SimplifiedWhatsAppInstanceModal.tsx', 'utf8');
  
  // Check 1: Ensure handleComplete calls connect endpoint first
  if (modalContent.includes('/api/whatsapp/instances/${createdInstanceId}/connect')) {
    console.log('✅ Modal calls connect endpoint before QR generation');
    results.passed++;
  } else {
    console.log('❌ Modal does not call connect endpoint');
    results.failed++;
    results.issues.push('Modal bypasses connect endpoint');
  }
  
  // Check 2: Ensure fetchQRCode has workflow validation
  if (modalContent.includes("connectionStatus !== 'connecting'")) {
    console.log('✅ QR fetch function validates connecting state');
    results.passed++;
  } else {
    console.log('❌ QR fetch function lacks workflow validation');
    results.failed++;
    results.issues.push('QR fetch function allows bypass of workflow validation');
  }
  
  // Check 3: Ensure no direct QR fetching in handleComplete
  if (!modalContent.includes('fetchQRCode(); // Start fetching QR code immediately')) {
    console.log('✅ Modal does not immediately fetch QR codes');
    results.passed++;
  } else {
    console.log('❌ Modal still immediately fetches QR codes');
    results.failed++;
    results.issues.push('Modal still has immediate QR code fetching');
  }
  
  // Check 4: Ensure proper error handling for connect failures
  if (modalContent.includes('Failed to connect instance')) {
    console.log('✅ Modal has proper connect error handling');
    results.passed++;
  } else {
    console.log('❌ Modal lacks connect error handling');
    results.failed++;
    results.issues.push('Modal lacks proper error handling for connection failures');
  }
  
  // Check 5: Ensure UI explains two-step process
  if (modalContent.includes('Paso 2: Conectar WhatsApp')) {
    console.log('✅ Modal UI explains two-step workflow');
    results.passed++;
  } else {
    console.log('❌ Modal UI does not explain two-step workflow');
    results.failed++;
    results.issues.push('Modal UI lacks two-step workflow explanation');
  }
  
} catch (error) {
  console.log('❌ Could not read modal component');
  results.failed++;
  results.issues.push(`Modal file read error: ${error.message}`);
}

// =====================================================
// TEST 2: Workflow Sequence Validation
// =====================================================

console.log('\n📋 TEST 2: Workflow Sequence Validation');
console.log('-'.repeat(50));

try {
  const modalContent = fs.readFileSync('src/components/channels/SimplifiedWhatsAppInstanceModal.tsx', 'utf8');
  
  // Check sequence: handleComplete → connect endpoint → fetchQRCode
  const handleCompleteMatch = modalContent.match(/const handleComplete = async \(\) => \{[\s\S]*?\};/);
  
  if (handleCompleteMatch) {
    const handleCompleteCode = handleCompleteMatch[0];
    
    // Check if connect endpoint is called before fetchQRCode
    const connectIndex = handleCompleteCode.indexOf('/api/whatsapp/instances/');
    const fetchIndex = handleCompleteCode.indexOf('fetchQRCode()');
    
    if (connectIndex !== -1 && fetchIndex !== -1 && connectIndex < fetchIndex) {
      console.log('✅ Connect endpoint called before QR fetch');
      results.passed++;
    } else {
      console.log('❌ Incorrect sequence: QR fetch before connect endpoint');
      results.failed++;
      results.issues.push('Workflow sequence is incorrect');
    }
    
    // Check if proper async/await is used
    if (handleCompleteCode.includes('await fetch') && handleCompleteCode.includes('connectResponse')) {
      console.log('✅ Proper async handling for connect endpoint');
      results.passed++;
    } else {
      console.log('❌ Improper async handling for connect endpoint');
      results.failed++;
      results.issues.push('Connect endpoint not properly awaited');
    }
  } else {
    console.log('❌ Could not find handleComplete function');
    results.failed++;
    results.issues.push('handleComplete function not found');
  }
  
} catch (error) {
  console.log('❌ Error analyzing workflow sequence');
  results.failed++;
  results.issues.push(`Workflow sequence analysis error: ${error.message}`);
}

// =====================================================
// TEST 3: State Management Validation
// =====================================================

console.log('\n📋 TEST 3: State Management Validation');
console.log('-'.repeat(50));

try {
  const modalContent = fs.readFileSync('src/components/channels/SimplifiedWhatsAppInstanceModal.tsx', 'utf8');
  
  // Check 1: Ensure connectionStatus is set to 'connecting' before connect call
  if (modalContent.includes("setConnectionStatus('connecting')")) {
    console.log('✅ Connection status properly set to connecting');
    results.passed++;
  } else {
    console.log('❌ Connection status not properly managed');
    results.failed++;
    results.issues.push('Connection status not set to connecting');
  }
  
  // Check 2: Ensure workflow validation in fetchQRCode
  if (modalContent.includes('Workflow validation passed - instance is in connecting state')) {
    console.log('✅ QR fetch validates workflow state');
    results.passed++;
  } else {
    console.log('❌ QR fetch does not validate workflow state');
    results.failed++;
    results.issues.push('QR fetch lacks workflow state validation');
  }
  
  // Check 3: Ensure error state handling
  if (modalContent.includes("setConnectionStatus('error')")) {
    console.log('✅ Error state properly handled');
    results.passed++;
  } else {
    console.log('❌ Error state not properly handled');
    results.failed++;
    results.issues.push('Error state not properly managed');
  }
  
} catch (error) {
  console.log('❌ Error analyzing state management');
  results.failed++;
  results.issues.push(`State management analysis error: ${error.message}`);
}

// =====================================================
// VALIDATION SUMMARY
// =====================================================

console.log('\n' + '='.repeat(60));
console.log('📊 MODAL WORKFLOW FIX VALIDATION RESULTS');
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
// WORKFLOW BYPASS PREVENTION ASSESSMENT
// =====================================================

console.log('\n' + '='.repeat(60));
console.log('🛡️ WORKFLOW BYPASS PREVENTION ASSESSMENT');
console.log('='.repeat(60));

if (successRate >= 90) {
  console.log('\n🎉 EXCELLENT: Modal workflow bypass has been eliminated');
  console.log('✅ Modal properly calls connect endpoint before QR generation');
  console.log('✅ QR fetch function validates workflow state');
  console.log('✅ Proper error handling for connection failures');
  console.log('✅ UI clearly explains two-step process');
  
} else if (successRate >= 75) {
  console.log('\n⚠️ GOOD: Most workflow bypass issues resolved');
  console.log('✅ Core workflow fixes are in place');
  console.log('⚠️ Some minor issues need attention');
  
} else {
  console.log('\n🚨 CRITICAL: Workflow bypass still exists');
  console.log('❌ Modal may still bypass two-step workflow');
  console.log('🛑 DO NOT DEPLOY until all issues are fixed');
}

// =====================================================
// NEXT STEPS
// =====================================================

console.log('\n' + '='.repeat(60));
console.log('📋 NEXT STEPS');
console.log('='.repeat(60));

if (successRate >= 90) {
  console.log('\n1. 🧪 Manual Testing:');
  console.log('   • Test modal instance creation');
  console.log('   • Verify connect button behavior');
  console.log('   • Confirm QR generation only after connect');
  
  console.log('\n2. 🔍 Browser Console Verification:');
  console.log('   • Should see "STEP 2: Initiating connection"');
  console.log('   • Should see "Connection initiated successfully"');
  console.log('   • Should see "Workflow validation passed"');
  
} else {
  console.log('\n1. 🔧 Fix Remaining Issues:');
  results.issues.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue}`);
  });
  
  console.log('\n2. 🧪 Re-run Validation:');
  console.log('   • Fix all issues above');
  console.log('   • Run this script again');
  console.log('   • Achieve 90%+ success rate');
}

console.log('\n' + '='.repeat(60));
console.log('✨ Modal Workflow Fix Validation Complete!');
console.log('='.repeat(60));

// Exit with appropriate code
process.exit(successRate >= 90 ? 0 : 1);
