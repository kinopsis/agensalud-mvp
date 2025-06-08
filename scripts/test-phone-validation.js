/**
 * Phone Number Validation Test Script
 * 
 * Quick validation script to test the enhanced phone number validation logic
 * without requiring the full test framework setup.
 */

// Replicate the validation functions for testing
function validatePhoneNumber(phoneNumber, allowEmpty = false) {
  // Allow empty for QR code flow where phone number is optional
  if (allowEmpty && (!phoneNumber || phoneNumber.trim() === '')) {
    return true;
  }
  
  // If phone number provided, validate and normalize
  if (phoneNumber && phoneNumber.trim()) {
    // Auto-normalize (add + if missing for international numbers)
    const normalized = phoneNumber.trim().startsWith('+') ? phoneNumber.trim() : `+${phoneNumber.trim()}`;
    
    // International format: +[country code][number] (10-15 digits)
    const phoneRegex = /^\+\d{10,15}$/;
    return phoneRegex.test(normalized);
  }
  
  // If not allowing empty and no valid phone number provided
  return allowEmpty;
}

function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber || !phoneNumber.trim()) {
    return '';
  }
  
  const trimmed = phoneNumber.trim();
  return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
}

function getValidationErrors(instanceName, phoneNumber, isQRCodeFlow = true) {
  const errors = {};
  
  // Simple instance name validation
  if (!instanceName || instanceName.length < 3 || instanceName.length > 50) {
    errors.instance_name = 'El nombre debe tener entre 3 y 50 caracteres (solo letras, números y espacios)';
  }
  
  // Enhanced phone number validation with QR code flow context
  if (!validatePhoneNumber(phoneNumber, isQRCodeFlow)) {
    if (isQRCodeFlow) {
      errors.phone_number = 'Formato inválido. Usa formato internacional (ej: +57300123456) o déjalo vacío para detectar automáticamente';
    } else {
      errors.phone_number = 'Ingresa un número válido en formato internacional (ej: +57300123456)';
    }
  }
  
  return errors;
}

// Test cases
console.log('=== PHONE NUMBER VALIDATION TESTING ===');
console.log('');

const testCases = [
  // Valid cases with + prefix
  { input: '+57300123456', allowEmpty: false, expected: true, description: 'Valid Colombian number with +' },
  { input: '+1234567890', allowEmpty: false, expected: true, description: 'Valid US number with +' },
  { input: '+34600222111', allowEmpty: false, expected: true, description: 'Valid Spanish number with +' },
  
  // Valid cases without + prefix (should be auto-normalized)
  { input: '57300123456', allowEmpty: false, expected: true, description: 'Valid Colombian number without + (auto-normalized)' },
  { input: '1234567890', allowEmpty: false, expected: true, description: 'Valid US number without + (auto-normalized)' },
  { input: '34600222111', allowEmpty: false, expected: true, description: 'Valid Spanish number without + (auto-normalized)' },
  
  // QR code flow (empty allowed)
  { input: '', allowEmpty: true, expected: true, description: 'Empty for QR code flow' },
  { input: '   ', allowEmpty: true, expected: true, description: 'Whitespace for QR code flow' },
  
  // Invalid cases
  { input: '', allowEmpty: false, expected: false, description: 'Empty not allowed in strict mode' },
  { input: '+1-234-567-8900', allowEmpty: false, expected: false, description: 'Invalid format with dashes' },
  { input: '+1 234 567 8900', allowEmpty: false, expected: false, description: 'Invalid format with spaces' },
  { input: '123', allowEmpty: false, expected: false, description: 'Too short' },
  { input: '+1234567890123456', allowEmpty: false, expected: false, description: 'Too long' },
];

console.log('📱 Phone Number Validation Results:');
console.log('');

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  const result = validatePhoneNumber(testCase.input, testCase.allowEmpty);
  const passed = result === testCase.expected;
  const status = passed ? '✅ PASS' : '❌ FAIL';
  
  console.log(`${index + 1}. ${testCase.description}`);
  console.log(`   Input: "${testCase.input}" (allowEmpty: ${testCase.allowEmpty})`);
  console.log(`   Expected: ${testCase.expected}, Got: ${result} - ${status}`);
  console.log('');
  
  if (passed) passedTests++;
});

console.log('=== PHONE NUMBER NORMALIZATION TESTING ===');
console.log('');

const normalizationCases = [
  { input: '57300123456', expected: '+57300123456', description: 'Add + to Colombian number' },
  { input: '+57300123456', expected: '+57300123456', description: 'Preserve + in Colombian number' },
  { input: '  1234567890  ', expected: '+1234567890', description: 'Trim and add + to US number' },
  { input: '', expected: '', description: 'Empty string remains empty' },
  { input: '   ', expected: '', description: 'Whitespace becomes empty' },
];

console.log('🔄 Phone Number Normalization Results:');
console.log('');

normalizationCases.forEach((testCase, index) => {
  const result = normalizePhoneNumber(testCase.input);
  const passed = result === testCase.expected;
  const status = passed ? '✅ PASS' : '❌ FAIL';
  
  console.log(`${index + 1}. ${testCase.description}`);
  console.log(`   Input: "${testCase.input}"`);
  console.log(`   Expected: "${testCase.expected}", Got: "${result}" - ${status}`);
  console.log('');
  
  if (passed) passedTests++;
});

totalTests += normalizationCases.length;

console.log('=== VALIDATION ERRORS TESTING ===');
console.log('');

const validationCases = [
  { instance: 'ValidInstance', phone: '', qrFlow: true, expectedErrors: 0, description: 'QR code flow with empty phone' },
  { instance: 'ValidInstance', phone: '57300123456', qrFlow: true, expectedErrors: 0, description: 'QR code flow with valid phone' },
  { instance: 'ValidInstance', phone: '', qrFlow: false, expectedErrors: 1, description: 'Strict mode with empty phone' },
  { instance: 'AB', phone: 'invalid', qrFlow: true, expectedErrors: 2, description: 'Invalid instance and phone' },
  { instance: 'ValidInstance', phone: '+57300123456', qrFlow: true, expectedErrors: 0, description: 'Valid instance and phone with +' },
];

console.log('🔍 Validation Errors Results:');
console.log('');

validationCases.forEach((testCase, index) => {
  const errors = getValidationErrors(testCase.instance, testCase.phone, testCase.qrFlow);
  const errorCount = Object.keys(errors).length;
  const passed = errorCount === testCase.expectedErrors;
  const status = passed ? '✅ PASS' : '❌ FAIL';
  
  console.log(`${index + 1}. ${testCase.description}`);
  console.log(`   Instance: "${testCase.instance}", Phone: "${testCase.phone}", QR Flow: ${testCase.qrFlow}`);
  console.log(`   Expected errors: ${testCase.expectedErrors}, Got: ${errorCount} - ${status}`);
  if (errorCount > 0) {
    console.log(`   Errors: ${JSON.stringify(errors, null, 2)}`);
  }
  console.log('');
  
  if (passed) passedTests++;
});

totalTests += validationCases.length;

console.log('=== FINAL RESULTS ===');
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${totalTests - passedTests}`);
console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

if (passedTests === totalTests) {
  console.log('🎉 ALL TESTS PASSED! Phone number validation implementation is working correctly.');
} else {
  console.log('⚠️ Some tests failed. Please review the implementation.');
}
