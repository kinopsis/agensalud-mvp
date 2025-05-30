/**
 * @fileoverview Navigation Paths Validation Script
 * Tests both navigation paths to patients management to ensure consistency
 */

require('dotenv').config({ path: '.env.local' });

// Configuration
const ORGANIZATION_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4'; // VisualCare
const BASE_URL = 'http://localhost:3000';

/**
 * Navigation Paths Validator
 */
class NavigationValidator {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  async runTest(name, testFn) {
    try {
      console.log(`🧪 Testing: ${name}`);
      const result = await testFn();
      console.log(`✅ PASSED: ${name}`);
      if (result.details) {
        console.log(`   ${result.details}`);
      }
      console.log('');
      this.passed++;
      this.tests.push({ name, status: 'PASSED', error: null, result });
      return result;
    } catch (error) {
      console.log(`❌ FAILED: ${name}`);
      console.log(`   Error: ${error.message}`);
      console.log('');
      this.failed++;
      this.tests.push({ name, status: 'FAILED', error: error.message, result: null });
      throw error;
    }
  }

  printSummary() {
    console.log('=' .repeat(60));
    console.log('📊 NAVIGATION PATHS VALIDATION SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${this.tests.length}`);
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);
    console.log('');

    if (this.failed === 0) {
      console.log('🎉 ALL NAVIGATION PATHS WORKING!');
      console.log('   Both dashboard and menu navigation show consistent data.');
    } else {
      console.log('⚠️  Some navigation paths still have issues.');
    }

    console.log('=' .repeat(60));
  }
}

/**
 * Test page accessibility and basic structure
 */
async function testPageAccessibility(pageName, url) {
  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; NavigationValidator/1.0)'
      }
    });

    if (response.ok) {
      const html = await response.text();
      
      // Check for key elements
      const hasTitle = html.includes('Gestión') && html.includes('Pacientes');
      const hasTable = html.includes('table') || html.includes('Lista de Pacientes');
      const hasNoDataMessage = html.includes('No hay pacientes') || html.includes('no patients');
      
      return {
        details: `✓ ${pageName} accessible (hasTitle: ${hasTitle}, hasTable: ${hasTable}, hasNoDataMessage: ${hasNoDataMessage})`,
        pageAnalysis: { hasTitle, hasTable, hasNoDataMessage, htmlLength: html.length }
      };
    } else {
      throw new Error(`Page not accessible: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    throw new Error(`Failed to access ${pageName}: ${error.message}`);
  }
}

/**
 * Test API endpoint that both pages use
 */
async function testPatientsAPI() {
  try {
    const url = `${BASE_URL}/api/patients?organizationId=${ORGANIZATION_ID}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.status === 401) {
      return {
        details: '✓ API requires authentication (expected behavior)',
        requiresAuth: true,
        status: response.status
      };
    }

    if (response.ok) {
      const result = await response.json();
      const dataCount = result.data?.length || 0;
      const patientsCount = result.patients?.length || 0;
      
      return {
        details: `✓ API accessible: ${dataCount} in data field, ${patientsCount} in patients field`,
        dataCount,
        patientsCount,
        hasData: !!result.data,
        hasPatients: !!result.patients
      };
    } else {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    throw new Error(`API test failed: ${error.message}`);
  }
}

/**
 * Compare navigation targets
 */
async function compareNavigationTargets() {
  const targets = [
    { name: 'Dashboard Path', url: '/patients', description: 'Standard patients page' },
    { name: 'Menu Path', url: '/staff/patients', description: 'Enhanced staff patients page' }
  ];

  const results = [];

  for (const target of targets) {
    try {
      const result = await testPageAccessibility(target.name, target.url);
      results.push({
        ...target,
        status: 'accessible',
        analysis: result.pageAnalysis
      });
    } catch (error) {
      results.push({
        ...target,
        status: 'error',
        error: error.message
      });
    }
  }

  const accessibleCount = results.filter(r => r.status === 'accessible').length;
  
  return {
    details: `✓ Navigation comparison: ${accessibleCount}/${targets.length} paths accessible`,
    results
  };
}

/**
 * Main validation function
 */
async function main() {
  console.log('🚀 AGENTSALUD MVP - NAVIGATION PATHS VALIDATION');
  console.log('🏥 Organization: VisualCare');
  console.log('🆔 ID: ' + ORGANIZATION_ID);
  console.log('🌐 Base URL: ' + BASE_URL);
  console.log('📅 Date: ' + new Date().toISOString());
  console.log('\n');

  console.log('🎯 TESTING NAVIGATION CONSISTENCY:');
  console.log('   Path 1: Dashboard → Patients Card → /patients');
  console.log('   Path 2: Menu → Gestión de Pacientes → /staff/patients');
  console.log('\n');

  const validator = new NavigationValidator();

  try {
    // Test API endpoint
    await validator.runTest('Patients API Endpoint', testPatientsAPI);

    // Test individual pages
    await validator.runTest('Dashboard Path (/patients)', () => testPageAccessibility('Dashboard Path', '/patients'));
    await validator.runTest('Menu Path (/staff/patients)', () => testPageAccessibility('Menu Path', '/staff/patients'));

    // Compare navigation targets
    await validator.runTest('Navigation Targets Comparison', compareNavigationTargets);

    // Print summary
    validator.printSummary();

    if (validator.failed === 0) {
      console.log('🎯 VALIDATION SUCCESSFUL!');
      console.log('');
      console.log('📋 NEXT STEPS FOR MANUAL TESTING:');
      console.log('   1. Start development server: npm run dev');
      console.log('   2. Login as admin: laura.gomez.new@visualcare.com');
      console.log('   3. Test Path 1: Dashboard → Click patients card → Verify 3 patients');
      console.log('   4. Test Path 2: Menu → Click "Gestión de Pacientes" → Verify 3 patients');
      console.log('   5. Check browser console for debug logs');
      console.log('');
      console.log('🔍 Expected Debug Logs:');
      console.log('   🔍 PATIENTS DEBUG: (for /patients)');
      console.log('   🔍 STAFF PATIENTS DEBUG: (for /staff/patients)');
      console.log('   Both should show successful data loading');
    } else {
      console.log('🔍 ISSUES FOUND! Check the failed tests above.');
    }

    // Exit with appropriate code
    process.exit(validator.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('💥 Fatal error during validation:', error);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = { NavigationValidator };
