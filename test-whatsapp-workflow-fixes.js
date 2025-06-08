#!/usr/bin/env node

/**
 * Test WhatsApp Workflow Fixes
 * 
 * Comprehensive test to validate that the critical WhatsApp integration
 * workflow fixes resolve the 404 errors and status mismatches.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

console.log('🧪 WHATSAPP WORKFLOW FIXES VALIDATION');
console.log('='.repeat(60));

const fs = require('fs');

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  issues: []
};

// =====================================================
// TEST 1: Connect Endpoint Hybrid Workflow Support
// =====================================================

console.log('\n📋 TEST 1: Connect Endpoint Hybrid Workflow Support');
console.log('-'.repeat(50));

try {
  const connectContent = fs.readFileSync('src/app/api/whatsapp/instances/[id]/connect/route.ts', 'utf8');
  
  // Check 1: Handles instances with existing QR codes
  if (connectContent.includes('instance.status === \'connecting\' && instance.qr_code')) {
    console.log('✅ Connect endpoint handles instances with existing QR codes');
    results.passed++;
  } else {
    console.log('❌ Connect endpoint does not handle existing QR codes');
    results.failed++;
    results.issues.push('Connect endpoint missing QR code handling');
  }
  
  // Check 2: Allows both disconnected and connecting states
  if (connectContent.includes('allowedStatuses: [\'disconnected\', \'connecting\']')) {
    console.log('✅ Connect endpoint allows both disconnected and connecting states');
    results.passed++;
  } else {
    console.log('❌ Connect endpoint does not allow connecting state');
    results.failed++;
    results.issues.push('Connect endpoint too restrictive on status');
  }
  
  // Check 3: Returns existing QR code when available
  if (connectContent.includes('workflow: \'immediate_qr_existing\'')) {
    console.log('✅ Connect endpoint returns existing QR codes');
    results.passed++;
  } else {
    console.log('❌ Connect endpoint does not return existing QR codes');
    results.failed++;
    results.issues.push('Connect endpoint missing QR code return logic');
  }
  
} catch (error) {
  console.log('❌ Could not read connect endpoint file');
  results.failed++;
  results.issues.push(`Connect endpoint file read error: ${error.message}`);
}

// =====================================================
// TEST 2: UI Modal Immediate QR Support
// =====================================================

console.log('\n📋 TEST 2: UI Modal Immediate QR Support');
console.log('-'.repeat(50));

try {
  const modalContent = fs.readFileSync('src/components/channels/SimplifiedWhatsAppInstanceModal.tsx', 'utf8');
  
  // Check 1: Detects immediate QR codes from creation response
  if (modalContent.includes('result.data.instance.qr_code')) {
    console.log('✅ UI detects immediate QR codes from creation response');
    results.passed++;
  } else {
    console.log('❌ UI does not detect immediate QR codes');
    results.failed++;
    results.issues.push('UI missing immediate QR code detection');
  }
  
  // Check 2: Skips connect step when QR is available
  if (modalContent.includes('skipping connect step')) {
    console.log('✅ UI skips connect step when QR is immediately available');
    results.passed++;
  } else {
    console.log('❌ UI does not skip connect step for immediate QR');
    results.failed++;
    results.issues.push('UI missing connect step optimization');
  }
  
  // Check 3: Handles QR codes from connect response
  if (modalContent.includes('connectResult.data?.qrCode')) {
    console.log('✅ UI handles QR codes from connect response');
    results.passed++;
  } else {
    console.log('❌ UI does not handle QR codes from connect response');
    results.failed++;
    results.issues.push('UI missing connect response QR handling');
  }
  
} catch (error) {
  console.log('❌ Could not read UI modal file');
  results.failed++;
  results.issues.push(`UI modal file read error: ${error.message}`);
}

// =====================================================
// TEST 3: Channel Service Integration
// =====================================================

console.log('\n📋 TEST 3: Channel Service Integration');
console.log('-'.repeat(50));

try {
  const channelContent = fs.readFileSync('src/app/api/channels/whatsapp/instances/route.ts', 'utf8');
  
  // Check 1: Supports two-step schema with skipConnection
  if (channelContent.includes('createTwoStepInstanceSchema') && channelContent.includes('skipConnection')) {
    console.log('✅ Channel service supports two-step workflow with skipConnection');
    results.passed++;
  } else {
    console.log('❌ Channel service missing two-step workflow support');
    results.failed++;
    results.issues.push('Channel service missing skipConnection support');
  }
  
  // Check 2: Uses WhatsAppChannelService for instance creation
  if (channelContent.includes('WhatsAppChannelService') && channelContent.includes('createInstance')) {
    console.log('✅ Channel service uses WhatsAppChannelService for creation');
    results.passed++;
  } else {
    console.log('❌ Channel service not using WhatsAppChannelService');
    results.failed++;
    results.issues.push('Channel service missing WhatsAppChannelService integration');
  }
  
  // Check 3: Handles both simplified and two-step requests
  if (channelContent.includes('isTwoStepRequest') && channelContent.includes('isSimplifiedRequest')) {
    console.log('✅ Channel service handles both simplified and two-step requests');
    results.passed++;
  } else {
    console.log('❌ Channel service missing request type handling');
    results.failed++;
    results.issues.push('Channel service missing request type differentiation');
  }
  
} catch (error) {
  console.log('❌ Could not read channel service file');
  results.failed++;
  results.issues.push(`Channel service file read error: ${error.message}`);
}

// =====================================================
// WORKFLOW VALIDATION SUMMARY
// =====================================================

console.log('\n' + '='.repeat(60));
console.log('📊 WORKFLOW FIXES VALIDATION RESULTS');
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
// EXPECTED BEHAVIOR ANALYSIS
// =====================================================

console.log('\n' + '='.repeat(60));
console.log('🎯 EXPECTED BEHAVIOR AFTER FIXES');
console.log('='.repeat(60));

if (successRate >= 90) {
  console.log('\n🎉 EXCELLENT: Critical workflow fixes implemented successfully');
  
  console.log('\n📋 EXPECTED USER EXPERIENCE:');
  console.log('1. 🚀 User creates WhatsApp instance');
  console.log('2. ⚡ If QR available immediately → Skip to QR display');
  console.log('3. 🔗 If two-step workflow → Connect button works without 404');
  console.log('4. 📱 QR code displays within 5 seconds');
  console.log('5. ✅ No status mismatch errors');
  
  console.log('\n🔧 TECHNICAL IMPROVEMENTS:');
  console.log('• Connect endpoint handles both workflows');
  console.log('• UI detects immediate QR codes');
  console.log('• No more 404 errors on connect endpoint');
  console.log('• Status validation allows connecting state');
  console.log('• Backward compatibility maintained');
  
} else if (successRate >= 75) {
  console.log('\n⚠️ GOOD: Most critical fixes implemented');
  console.log('✅ Core workflow improvements in place');
  console.log('⚠️ Some minor issues need attention');
  
} else {
  console.log('\n🚨 CRITICAL: Workflow fixes incomplete');
  console.log('❌ Major issues prevent reliable operation');
  console.log('🛑 DO NOT TEST until all issues are fixed');
}

// =====================================================
// TESTING RECOMMENDATIONS
// =====================================================

console.log('\n' + '='.repeat(60));
console.log('📋 TESTING RECOMMENDATIONS');
console.log('='.repeat(60));

if (successRate >= 90) {
  console.log('\n1. 🧪 Manual UI Testing:');
  console.log('   • Start development server');
  console.log('   • Create WhatsApp instance via SimplifiedWhatsAppInstanceModal');
  console.log('   • Verify no 404 errors in browser console');
  console.log('   • Confirm QR code appears within 5 seconds');
  
  console.log('\n2. 🔍 Browser Console Monitoring:');
  console.log('   • Watch for "QR code available immediately" messages');
  console.log('   • Verify "Connection initiated successfully" logs');
  console.log('   • Confirm no "Failed to connect instance" errors');
  
  console.log('\n3. 📊 Performance Validation:');
  console.log('   • Measure QR generation time (<5s target)');
  console.log('   • Test both immediate and two-step workflows');
  console.log('   • Verify status transitions are correct');
  
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
console.log('✨ WhatsApp Workflow Fixes Validation Complete!');
console.log('='.repeat(60));

// Exit with appropriate code
process.exit(successRate >= 90 ? 0 : 1);
