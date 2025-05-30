/**
 * @fileoverview Specific Pages Testing Tool
 * Tests the exact pages that are showing issues:
 * 1. /patients - showing 0 patients instead of 3
 * 2. /staff/schedules - showing 0 doctors instead of 5
 */

require('dotenv').config({ path: '.env.local' });

// Configuration
const ORGANIZATION_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4'; // VisualCare
const BASE_URL = 'http://localhost:3000';

/**
 * Page Testing Results Tracker
 */
class PageTester {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.issues = [];
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
      this.issues.push({ category: name, description: error.message });
      throw error;
    }
  }

  addIssue(category, description, severity = 'medium') {
    this.issues.push({ category, description, severity });
  }

  printSummary() {
    console.log('=' .repeat(60));
    console.log('📊 SPECIFIC PAGES TESTING SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${this.tests.length}`);
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);
    console.log('');

    if (this.issues.length > 0) {
      console.log('🔍 ISSUES IDENTIFIED:');
      this.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. [${issue.category}] ${issue.description}`);
      });
      console.log('');
    }

    console.log('=' .repeat(60));
  }
}

/**
 * Test if server is running
 */
async function testServerAvailability() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      return { details: '✓ Server is running and accessible' };
    } else {
      throw new Error(`Server responded with ${response.status}`);
    }
  } catch (error) {
    // Try alternative endpoint
    try {
      const response = await fetch(`${BASE_URL}/`, {
        method: 'GET'
      });
      
      if (response.ok) {
        return { details: '✓ Server is running (tested via root endpoint)' };
      } else {
        throw new Error(`Server not accessible: ${error.message}`);
      }
    } catch (altError) {
      throw new Error(`Server not accessible: ${altError.message}`);
    }
  }
}

/**
 * Test patients page accessibility
 */
async function testPatientsPageAccess() {
  try {
    const response = await fetch(`${BASE_URL}/patients`, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; PageTester/1.0)'
      }
    });

    if (response.ok) {
      const html = await response.text();
      
      // Check if page contains expected elements
      const hasTitle = html.includes('Gestión de Pacientes') || html.includes('Patients');
      const hasNoDataMessage = html.includes('No hay pacientes') || html.includes('no patients');
      const hasLoadingState = html.includes('Cargando') || html.includes('Loading');
      
      return {
        details: `✓ Patients page accessible (hasTitle: ${hasTitle}, hasNoDataMessage: ${hasNoDataMessage}, hasLoadingState: ${hasLoadingState})`,
        pageAnalysis: { hasTitle, hasNoDataMessage, hasLoadingState, htmlLength: html.length }
      };
    } else {
      throw new Error(`Page not accessible: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    throw new Error(`Failed to access patients page: ${error.message}`);
  }
}

/**
 * Test staff schedules page accessibility
 */
async function testStaffSchedulesPageAccess() {
  try {
    const response = await fetch(`${BASE_URL}/staff/schedules`, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; PageTester/1.0)'
      }
    });

    if (response.ok) {
      const html = await response.text();
      
      // Check if page contains expected elements
      const hasTitle = html.includes('Gestión de Horarios') || html.includes('Schedule');
      const hasNoDoctorsMessage = html.includes('No hay doctores') || html.includes('no doctors');
      const hasLoadingState = html.includes('Cargando') || html.includes('Loading');
      
      return {
        details: `✓ Staff schedules page accessible (hasTitle: ${hasTitle}, hasNoDoctorsMessage: ${hasNoDoctorsMessage}, hasLoadingState: ${hasLoadingState})`,
        pageAnalysis: { hasTitle, hasNoDoctorsMessage, hasLoadingState, htmlLength: html.length }
      };
    } else {
      throw new Error(`Page not accessible: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    throw new Error(`Failed to access staff schedules page: ${error.message}`);
  }
}

/**
 * Test debug tool accessibility
 */
async function testDebugToolAccess() {
  try {
    const response = await fetch(`${BASE_URL}/debug/frontend-issues`, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; PageTester/1.0)'
      }
    });

    if (response.ok) {
      const html = await response.text();
      
      // Check if debug tool is accessible
      const hasDebugTitle = html.includes('Frontend Issues Debug') || html.includes('Debug');
      const hasControlPanel = html.includes('Control Panel') || html.includes('Run All Tests');
      
      return {
        details: `✓ Debug tool accessible (hasDebugTitle: ${hasDebugTitle}, hasControlPanel: ${hasControlPanel})`,
        pageAnalysis: { hasDebugTitle, hasControlPanel, htmlLength: html.length }
      };
    } else {
      throw new Error(`Debug tool not accessible: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    throw new Error(`Failed to access debug tool: ${error.message}`);
  }
}

/**
 * Test API endpoints directly (without authentication)
 */
async function testAPIEndpointsDirectly() {
  const endpoints = [
    '/api/patients',
    '/api/doctors',
    '/api/appointments'
  ];

  const results = [];

  for (const endpoint of endpoints) {
    try {
      const url = `${BASE_URL}${endpoint}?organizationId=${ORGANIZATION_ID}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      results.push({
        endpoint,
        status: response.status,
        statusText: response.statusText,
        accessible: response.status !== 404
      });
    } catch (error) {
      results.push({
        endpoint,
        status: 'ERROR',
        statusText: error.message,
        accessible: false
      });
    }
  }

  const accessibleCount = results.filter(r => r.accessible).length;
  
  return {
    details: `✓ API endpoints tested: ${accessibleCount}/${endpoints.length} accessible`,
    endpointResults: results
  };
}

/**
 * Main testing function
 */
async function main() {
  console.log('🚀 AGENTSALUD MVP - SPECIFIC PAGES TESTING');
  console.log('🏥 Organization: VisualCare');
  console.log('🆔 ID: ' + ORGANIZATION_ID);
  console.log('🌐 Base URL: ' + BASE_URL);
  console.log('📅 Date: ' + new Date().toISOString());
  console.log('\n');

  console.log('🎯 TESTING SPECIFIC PROBLEM PAGES:');
  console.log('   1. /patients - Should show 3 patients but shows 0');
  console.log('   2. /staff/schedules - Should show 5 doctors but shows 0');
  console.log('\n');

  const pageTester = new PageTester();

  try {
    // Test server availability
    await pageTester.runTest('Server Availability', testServerAvailability);

    // Test API endpoints
    await pageTester.runTest('API Endpoints Direct Access', testAPIEndpointsDirectly);

    // Test specific pages
    await pageTester.runTest('Patients Page Access', testPatientsPageAccess);
    await pageTester.runTest('Staff Schedules Page Access', testStaffSchedulesPageAccess);

    // Test debug tool
    await pageTester.runTest('Debug Tool Access', testDebugToolAccess);

    // Print summary
    pageTester.printSummary();

    if (pageTester.failed === 0) {
      console.log('🎯 ALL PAGES ACCESSIBLE!');
      console.log('');
      console.log('📋 NEXT STEPS:');
      console.log('   1. Start development server: npm run dev');
      console.log('   2. Login as admin: laura.gomez.new@visualcare.com');
      console.log('   3. Test debug tool: http://localhost:3000/debug/frontend-issues');
      console.log('   4. Test patients page: http://localhost:3000/patients');
      console.log('   5. Test schedules page: http://localhost:3000/staff/schedules');
      console.log('');
      console.log('🔍 If pages are accessible but show no data:');
      console.log('   - The issue is in frontend component logic');
      console.log('   - Use browser dev tools to check console errors');
      console.log('   - Use network tab to see API calls');
      console.log('   - Use the debug tool to test API calls in browser context');
    } else {
      console.log('🔍 ISSUES FOUND! Check the failed tests above.');
    }

    // Exit with appropriate code
    process.exit(pageTester.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('💥 Fatal error during testing:', error);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = { PageTester };
