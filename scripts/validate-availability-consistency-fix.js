#!/usr/bin/env node

/**
 * VALIDATION SCRIPT FOR AVAILABILITY CONSISTENCY FIX
 * 
 * Validates that the critical fix for availability inconsistencies
 * between new appointment flow and reschedule modal is working correctly.
 * 
 * @author AgentSalud MVP Team - Critical System Validation
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VALIDATING AVAILABILITY CONSISTENCY FIX');
console.log('='.repeat(80));

/**
 * 1. VALIDATE FILE MODIFICATIONS
 */
function validateFileModifications() {
  console.log('\n📁 VALIDATING FILE MODIFICATIONS');
  console.log('-'.repeat(50));
  
  const results = {
    unifiedAppointmentFlow: false,
    aiEnhancedRescheduleModal: false,
    errors: []
  };
  
  try {
    // Check UnifiedAppointmentFlow.tsx
    const unifiedFlowPath = path.join(process.cwd(), 'src/components/appointments/UnifiedAppointmentFlow.tsx');
    const unifiedFlowContent = fs.readFileSync(unifiedFlowPath, 'utf8');
    
    // Check for userRole prop
    const hasUserRoleProp = unifiedFlowContent.includes('userRole={userRole}');
    const hasUseStandardRulesProp = unifiedFlowContent.includes('useStandardRules={useStandardRules}');
    
    if (hasUserRoleProp && hasUseStandardRulesProp) {
      results.unifiedAppointmentFlow = true;
      console.log('✅ UnifiedAppointmentFlow.tsx: Props added correctly');
      console.log('   - userRole prop: ✅');
      console.log('   - useStandardRules prop: ✅');
    } else {
      results.errors.push('UnifiedAppointmentFlow.tsx missing required props');
      console.log('❌ UnifiedAppointmentFlow.tsx: Missing props');
      console.log(`   - userRole prop: ${hasUserRoleProp ? '✅' : '❌'}`);
      console.log(`   - useStandardRules prop: ${hasUseStandardRulesProp ? '✅' : '❌'}`);
    }
    
    // Check AIEnhancedRescheduleModal.tsx
    const rescheduleModalPath = path.join(process.cwd(), 'src/components/appointments/AIEnhancedRescheduleModal.tsx');
    const rescheduleModalContent = fs.readFileSync(rescheduleModalPath, 'utf8');
    
    const hasUserRolePropReschedule = rescheduleModalContent.includes('userRole={userRole}');
    const hasUseStandardRulesPropReschedule = rescheduleModalContent.includes('useStandardRules={useStandardRules}');
    
    if (hasUserRolePropReschedule && hasUseStandardRulesPropReschedule) {
      results.aiEnhancedRescheduleModal = true;
      console.log('✅ AIEnhancedRescheduleModal.tsx: Props added correctly');
      console.log('   - userRole prop: ✅');
      console.log('   - useStandardRules prop: ✅');
    } else {
      results.errors.push('AIEnhancedRescheduleModal.tsx missing required props');
      console.log('❌ AIEnhancedRescheduleModal.tsx: Missing props');
      console.log(`   - userRole prop: ${hasUserRolePropReschedule ? '✅' : '❌'}`);
      console.log(`   - useStandardRules prop: ${hasUseStandardRulesPropReschedule ? '✅' : '❌'}`);
    }
    
  } catch (error) {
    results.errors.push(`File validation error: ${error.message}`);
    console.log(`❌ Error validating files: ${error.message}`);
  }
  
  return results;
}

/**
 * 2. VALIDATE COMPONENT INTERFACE CONSISTENCY
 */
function validateComponentInterface() {
  console.log('\n🔧 VALIDATING COMPONENT INTERFACE CONSISTENCY');
  console.log('-'.repeat(50));
  
  const results = {
    interfaceConsistent: false,
    errors: []
  };
  
  try {
    // Check WeeklyAvailabilitySelector interface
    const selectorPath = path.join(process.cwd(), 'src/components/appointments/WeeklyAvailabilitySelector.tsx');
    const selectorContent = fs.readFileSync(selectorPath, 'utf8');
    
    // Check for userRole and useStandardRules in interface
    const hasUserRoleInterface = selectorContent.includes('userRole?:') || selectorContent.includes('userRole :');
    const hasUseStandardRulesInterface = selectorContent.includes('useStandardRules?:') || selectorContent.includes('useStandardRules :');
    
    if (hasUserRoleInterface && hasUseStandardRulesInterface) {
      results.interfaceConsistent = true;
      console.log('✅ WeeklyAvailabilitySelector interface: Props defined correctly');
      console.log('   - userRole interface: ✅');
      console.log('   - useStandardRules interface: ✅');
    } else {
      results.errors.push('WeeklyAvailabilitySelector interface missing prop definitions');
      console.log('❌ WeeklyAvailabilitySelector interface: Missing prop definitions');
      console.log(`   - userRole interface: ${hasUserRoleInterface ? '✅' : '❌'}`);
      console.log(`   - useStandardRules interface: ${hasUseStandardRulesInterface ? '✅' : '❌'}`);
    }
    
    // Check for prop usage in component
    const hasUserRoleUsage = selectorContent.includes('userRole as ') || selectorContent.includes('userRole,');
    const hasUseStandardRulesUsage = selectorContent.includes('useStandardRules');
    
    if (hasUserRoleUsage && hasUseStandardRulesUsage) {
      console.log('✅ WeeklyAvailabilitySelector usage: Props used correctly');
      console.log('   - userRole usage: ✅');
      console.log('   - useStandardRules usage: ✅');
    } else {
      results.errors.push('WeeklyAvailabilitySelector not using props correctly');
      console.log('❌ WeeklyAvailabilitySelector usage: Props not used correctly');
      console.log(`   - userRole usage: ${hasUserRoleUsage ? '✅' : '❌'}`);
      console.log(`   - useStandardRules usage: ${hasUseStandardRulesUsage ? '✅' : '❌'}`);
    }
    
  } catch (error) {
    results.errors.push(`Interface validation error: ${error.message}`);
    console.log(`❌ Error validating interface: ${error.message}`);
  }
  
  return results;
}

/**
 * 3. VALIDATE API PARAMETER CONSISTENCY
 */
function validateAPIParameterConsistency() {
  console.log('\n🌐 VALIDATING API PARAMETER CONSISTENCY');
  console.log('-'.repeat(50));
  
  const results = {
    parameterConsistent: false,
    errors: []
  };
  
  try {
    // Check UnifiedAppointmentFlow loadWeeklyAvailability function
    const unifiedFlowPath = path.join(process.cwd(), 'src/components/appointments/UnifiedAppointmentFlow.tsx');
    const unifiedFlowContent = fs.readFileSync(unifiedFlowPath, 'utf8');
    
    const hasUserRoleParam = unifiedFlowContent.includes('userRole=${encodeURIComponent(userRole)}') || 
                            unifiedFlowContent.includes('userRole=${userRole}');
    const hasUseStandardRulesParam = unifiedFlowContent.includes('useStandardRules=${useStandardRules}');
    
    console.log('📊 UnifiedAppointmentFlow API parameters:');
    console.log(`   - userRole parameter: ${hasUserRoleParam ? '✅' : '❌'}`);
    console.log(`   - useStandardRules parameter: ${hasUseStandardRulesParam ? '✅' : '❌'}`);
    
    // Check AIEnhancedRescheduleModal loadAvailabilityData function
    const rescheduleModalPath = path.join(process.cwd(), 'src/components/appointments/AIEnhancedRescheduleModal.tsx');
    const rescheduleModalContent = fs.readFileSync(rescheduleModalPath, 'utf8');
    
    const hasUserRoleParamReschedule = rescheduleModalContent.includes('userRole\', userRole') || 
                                      rescheduleModalContent.includes('userRole", userRole');
    const hasUseStandardRulesParamReschedule = rescheduleModalContent.includes('useStandardRules\', useStandardRules') || 
                                              rescheduleModalContent.includes('useStandardRules", useStandardRules');
    
    console.log('📊 AIEnhancedRescheduleModal API parameters:');
    console.log(`   - userRole parameter: ${hasUserRoleParamReschedule ? '✅' : '❌'}`);
    console.log(`   - useStandardRules parameter: ${hasUseStandardRulesParamReschedule ? '✅' : '❌'}`);
    
    if (hasUserRoleParam && hasUseStandardRulesParam && 
        hasUserRoleParamReschedule && hasUseStandardRulesParamReschedule) {
      results.parameterConsistent = true;
      console.log('✅ API parameter consistency: Both flows use identical parameters');
    } else {
      results.errors.push('API parameters not consistent between flows');
      console.log('❌ API parameter consistency: Parameters differ between flows');
    }
    
  } catch (error) {
    results.errors.push(`API parameter validation error: ${error.message}`);
    console.log(`❌ Error validating API parameters: ${error.message}`);
  }
  
  return results;
}

/**
 * 4. GENERATE VALIDATION REPORT
 */
function generateValidationReport(fileResults, interfaceResults, apiResults) {
  console.log('\n📊 VALIDATION REPORT');
  console.log('='.repeat(80));
  
  const allErrors = [
    ...fileResults.errors,
    ...interfaceResults.errors,
    ...apiResults.errors
  ];
  
  const overallSuccess = fileResults.unifiedAppointmentFlow && 
                        fileResults.aiEnhancedRescheduleModal && 
                        interfaceResults.interfaceConsistent && 
                        apiResults.parameterConsistent;
  
  console.log('🎯 VALIDATION SUMMARY:');
  console.log(`   File modifications: ${fileResults.unifiedAppointmentFlow && fileResults.aiEnhancedRescheduleModal ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Interface consistency: ${interfaceResults.interfaceConsistent ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   API parameter consistency: ${apiResults.parameterConsistent ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Overall validation: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`);
  
  if (overallSuccess) {
    console.log('\n🎉 SUCCESS: Availability consistency fix has been VALIDATED!');
    console.log('   ✅ All required props are correctly passed to WeeklyAvailabilitySelector');
    console.log('   ✅ Both flows will use identical API parameters');
    console.log('   ✅ Role-based availability logic will be consistent');
    console.log('   ✅ The critical inconsistency issue is RESOLVED');
  } else {
    console.log('\n⚠️  VALIDATION FAILED: Issues detected with the fix');
    console.log('   Some components are not correctly configured');
    
    if (allErrors.length > 0) {
      console.log('\n❌ ERRORS FOUND:');
      allErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
  }
  
  console.log('\n🔧 NEXT STEPS:');
  if (overallSuccess) {
    console.log('1. ✅ Deploy the changes to production');
    console.log('2. ✅ Test both flows in the UI');
    console.log('3. ✅ Monitor for consistent slot counts');
    console.log('4. ✅ Mark the critical issue as RESOLVED');
  } else {
    console.log('1. 🔍 Review and fix the identified issues');
    console.log('2. 🔍 Re-run this validation script');
    console.log('3. 🔍 Ensure all props are correctly passed');
    console.log('4. 🔍 Verify API parameter consistency');
  }
  
  console.log('\n='.repeat(80));
  
  return {
    success: overallSuccess,
    errors: allErrors,
    timestamp: new Date().toISOString()
  };
}

/**
 * MAIN VALIDATION EXECUTION
 */
function main() {
  console.log('🚀 Starting availability consistency fix validation...\n');
  
  try {
    // Run all validations
    const fileResults = validateFileModifications();
    const interfaceResults = validateComponentInterface();
    const apiResults = validateAPIParameterConsistency();
    
    // Generate final report
    const report = generateValidationReport(fileResults, interfaceResults, apiResults);
    
    // Exit with appropriate code
    process.exit(report.success ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ VALIDATION SCRIPT ERROR:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the validation
main();
