/**
 * @fileoverview Management APIs Testing Script
 * Tests the actual API endpoints that management pages use
 * to identify why pages show inconsistent data
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const ORGANIZATION_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4'; // VisualCare
const BASE_URL = 'http://localhost:3000';

/**
 * Test API endpoints directly
 */
async function testAPIs() {
  console.log('🚀 TESTING MANAGEMENT APIs - AgentSalud MVP');
  console.log('🏥 Organization: VisualCare');
  console.log('🆔 ID: ' + ORGANIZATION_ID);
  console.log('🌐 Base URL: ' + BASE_URL);
  console.log('\n');

  const tests = [
    {
      name: 'Users API',
      url: `/api/users?organizationId=${ORGANIZATION_ID}`,
      expectedCount: 13
    },
    {
      name: 'Patients API',
      url: `/api/patients?organizationId=${ORGANIZATION_ID}`,
      expectedCount: 3
    },
    {
      name: 'Doctors API (if exists)',
      url: `/api/doctors?organizationId=${ORGANIZATION_ID}`,
      expectedCount: 5
    },
    {
      name: 'Appointments API (if exists)',
      url: `/api/appointments?organizationId=${ORGANIZATION_ID}`,
      expectedCount: 10
    }
  ];

  for (const test of tests) {
    await testAPI(test);
  }
}

async function testAPI(test) {
  try {
    console.log(`🧪 Testing: ${test.name}`);
    console.log(`   URL: ${BASE_URL}${test.url}`);

    const response = await fetch(`${BASE_URL}${test.url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: In real browser, cookies would be included automatically
      }
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   ❌ FAILED: ${errorText}`);
      console.log('');
      return;
    }

    const result = await response.json();
    const actualCount = result.data ? result.data.length : 0;

    console.log(`   Expected Count: ${test.expectedCount}`);
    console.log(`   Actual Count: ${actualCount}`);

    if (actualCount === test.expectedCount) {
      console.log(`   ✅ PASSED: Counts match`);
    } else {
      console.log(`   ❌ FAILED: Count mismatch (diff: ${actualCount - test.expectedCount})`);
      
      // Show sample data for debugging
      if (result.data && result.data.length > 0) {
        console.log(`   Sample data:`, JSON.stringify(result.data[0], null, 2));
      }
    }

  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
  }

  console.log('');
}

/**
 * Test authentication context
 */
async function testAuthContext() {
  console.log('🔐 Testing Authentication Context...\n');

  try {
    const response = await fetch(`${BASE_URL}/api/auth/session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log(`Auth Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const session = await response.json();
      console.log('Session exists:', !!session.user);
      if (session.user) {
        console.log('User ID:', session.user.id);
        console.log('User Email:', session.user.email);
      }
    } else {
      console.log('❌ No active session - APIs will fail');
    }

  } catch (error) {
    console.log(`❌ Auth test error: ${error.message}`);
  }

  console.log('');
}

/**
 * Create a test page to validate in browser
 */
function generateTestPage() {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AgentSalud - Management APIs Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .test-result { margin: 10px 0; padding: 10px; border-radius: 5px; }
        .success { background-color: #d4edda; border: 1px solid #c3e6cb; }
        .error { background-color: #f8d7da; border: 1px solid #f5c6cb; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; }
        button { padding: 10px 20px; margin: 5px; cursor: pointer; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🏥 AgentSalud MVP - Management APIs Test</h1>
    <p><strong>Organization:</strong> VisualCare (${ORGANIZATION_ID})</p>
    
    <div id="results"></div>
    
    <button onclick="testAllAPIs()">🧪 Test All APIs</button>
    <button onclick="testUsersAPI()">👥 Test Users API</button>
    <button onclick="testPatientsAPI()">🏥 Test Patients API</button>
    <button onclick="clearResults()">🗑️ Clear Results</button>

    <script>
        const ORGANIZATION_ID = '${ORGANIZATION_ID}';
        const resultsDiv = document.getElementById('results');

        function addResult(title, content, type = 'info') {
            const div = document.createElement('div');
            div.className = \`test-result \${type}\`;
            div.innerHTML = \`<h3>\${title}</h3><div>\${content}</div>\`;
            resultsDiv.appendChild(div);
        }

        function clearResults() {
            resultsDiv.innerHTML = '';
        }

        async function testAPI(name, url, expectedCount) {
            try {
                addResult(\`Testing \${name}\`, \`Calling: \${url}\`, 'warning');
                
                const response = await fetch(url);
                const result = await response.json();
                
                if (!response.ok) {
                    addResult(\`❌ \${name} Failed\`, \`Status: \${response.status}<br>Error: \${result.error || 'Unknown error'}\`, 'error');
                    return;
                }
                
                const actualCount = result.data ? result.data.length : 0;
                const match = actualCount === expectedCount;
                
                addResult(
                    \`\${match ? '✅' : '❌'} \${name} Result\`,
                    \`Expected: \${expectedCount}<br>Actual: \${actualCount}<br>Status: \${match ? 'PASSED' : 'FAILED'}\`,
                    match ? 'success' : 'error'
                );
                
                if (result.data && result.data.length > 0) {
                    addResult(\`📋 \${name} Sample Data\`, \`<pre>\${JSON.stringify(result.data[0], null, 2)}</pre>\`);
                }
                
            } catch (error) {
                addResult(\`❌ \${name} Error\`, \`\${error.message}\`, 'error');
            }
        }

        async function testUsersAPI() {
            await testAPI('Users API', \`/api/users?organizationId=\${ORGANIZATION_ID}\`, 13);
        }

        async function testPatientsAPI() {
            await testAPI('Patients API', \`/api/patients?organizationId=\${ORGANIZATION_ID}\`, 3);
        }

        async function testAllAPIs() {
            clearResults();
            addResult('🚀 Starting API Tests', 'Testing all management APIs...', 'warning');
            
            await testUsersAPI();
            await testPatientsAPI();
            
            // Test other APIs if they exist
            await testAPI('Doctors API', \`/api/doctors?organizationId=\${ORGANIZATION_ID}\`, 5);
            await testAPI('Appointments API', \`/api/appointments?organizationId=\${ORGANIZATION_ID}\`, 10);
            
            addResult('✅ Tests Complete', 'All API tests have been executed.', 'success');
        }

        // Auto-run tests on page load
        window.addEventListener('load', () => {
            addResult('🏥 AgentSalud Management APIs Tester', 'Ready to test APIs. Click "Test All APIs" to begin.', 'warning');
        });
    </script>
</body>
</html>
  `;

  return html;
}

/**
 * Main execution
 */
async function main() {
  console.log('📝 Generating browser test page...\n');
  
  const testPageHTML = generateTestPage();
  
  // Save test page
  const fs = require('fs');
  fs.writeFileSync('test-management-apis.html', testPageHTML);
  
  console.log('✅ Test page generated: test-management-apis.html');
  console.log('📖 Instructions:');
  console.log('   1. Start the Next.js development server: npm run dev');
  console.log('   2. Login to AgentSalud as an Admin user');
  console.log('   3. Open test-management-apis.html in your browser');
  console.log('   4. Click "Test All APIs" to validate the endpoints');
  console.log('\n');

  console.log('🔍 Note: This script cannot test APIs directly due to authentication requirements.');
  console.log('   The generated HTML page will test APIs in the browser context with proper cookies.');
  console.log('\n');

  // Try to test without auth (will likely fail but shows the structure)
  console.log('🧪 Attempting basic connectivity test (will likely fail due to auth)...\n');
  await testAuthContext();
}

// Execute if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testAPI, generateTestPage };
