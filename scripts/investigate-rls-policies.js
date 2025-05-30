/**
 * @fileoverview RLS Policies Investigation Tool
 * Investigates las diferencias entre service role key vs anon key
 * y cómo las políticas RLS afectan el acceso a datos
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const ORGANIZATION_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4'; // VisualCare
const ADMIN_USER_ID = '6318225b-d0d4-4585-9a7d-3a1e0f536d0d'; // Laura Gómez
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

/**
 * RLS Investigation Results Tracker
 */
class RLSInvestigator {
  constructor() {
    this.findings = [];
    this.issues = [];
  }

  addFinding(category, description, data = null) {
    this.findings.push({ category, description, data });
  }

  addIssue(category, description, severity = 'medium') {
    this.issues.push({ category, description, severity });
  }

  printReport() {
    console.log('=' .repeat(60));
    console.log('🔍 RLS POLICIES INVESTIGATION REPORT');
    console.log('=' .repeat(60));
    
    console.log(`🔍 Total Findings: ${this.findings.length}`);
    console.log(`❌ Total Issues: ${this.issues.length}`);
    console.log('');

    if (this.findings.length > 0) {
      console.log('📋 KEY FINDINGS:');
      this.findings.forEach((finding, index) => {
        console.log(`   ${index + 1}. [${finding.category}] ${finding.description}`);
        if (finding.data) {
          console.log(`      Data: ${JSON.stringify(finding.data, null, 2)}`);
        }
      });
      console.log('');
    }

    if (this.issues.length > 0) {
      console.log('❌ ISSUES IDENTIFIED:');
      this.issues.forEach((issue, index) => {
        const severity = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
        console.log(`   ${index + 1}. ${severity} [${issue.category}] ${issue.description}`);
      });
      console.log('');
    }

    console.log('=' .repeat(60));
  }
}

/**
 * Test with Service Role Key (bypasses RLS)
 */
async function testServiceRoleClient(investigator) {
  console.log('🔧 Testing Service Role Client (bypasses RLS)...\n');

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Test users query
    const { data: users, error: usersError } = await serviceClient
      .from('profiles')
      .select('id, email, first_name, last_name, role, organization_id')
      .eq('organization_id', ORGANIZATION_ID);

    if (usersError) {
      investigator.addIssue('Service Client', `Users query failed: ${usersError.message}`, 'high');
    } else {
      investigator.addFinding('Service Client', `Users query successful: ${users?.length || 0} users`, {
        count: users?.length || 0,
        roles: users?.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {})
      });
    }

    // Test patients query
    const { data: patients, error: patientsError } = await serviceClient
      .from('patients')
      .select(`
        id,
        profile_id,
        organization_id,
        profiles!inner(first_name, last_name, email, role)
      `)
      .eq('organization_id', ORGANIZATION_ID);

    if (patientsError) {
      investigator.addIssue('Service Client', `Patients query failed: ${patientsError.message}`, 'high');
    } else {
      investigator.addFinding('Service Client', `Patients query successful: ${patients?.length || 0} patients`, {
        count: patients?.length || 0
      });
    }

    // Test doctors query
    const { data: doctors, error: doctorsError } = await serviceClient
      .from('doctors')
      .select(`
        id,
        profile_id,
        organization_id,
        profiles!inner(first_name, last_name, email, role)
      `)
      .eq('organization_id', ORGANIZATION_ID);

    if (doctorsError) {
      investigator.addIssue('Service Client', `Doctors query failed: ${doctorsError.message}`, 'high');
    } else {
      investigator.addFinding('Service Client', `Doctors query successful: ${doctors?.length || 0} doctors`, {
        count: doctors?.length || 0
      });
    }

  } catch (error) {
    investigator.addIssue('Service Client', `Connection failed: ${error.message}`, 'high');
  }
}

/**
 * Test with Anon Key + User Session (applies RLS)
 */
async function testAnonClientWithAuth(investigator) {
  console.log('🔐 Testing Anon Client with User Authentication (applies RLS)...\n');

  const anonClient = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Simulate user login
    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
      email: 'laura.gomez.new@visualcare.com',
      password: 'password123'
    });

    if (authError) {
      investigator.addIssue('Anon Client', `Authentication failed: ${authError.message}`, 'high');
      return;
    }

    investigator.addFinding('Anon Client', 'Authentication successful', {
      user_id: authData.user?.id,
      email: authData.user?.email
    });

    // Wait a moment for session to be established
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test users query with RLS
    const { data: users, error: usersError } = await anonClient
      .from('profiles')
      .select('id, email, first_name, last_name, role, organization_id')
      .eq('organization_id', ORGANIZATION_ID);

    if (usersError) {
      investigator.addIssue('Anon Client RLS', `Users query failed: ${usersError.message}`, 'high');
    } else {
      investigator.addFinding('Anon Client RLS', `Users query with RLS: ${users?.length || 0} users`, {
        count: users?.length || 0,
        roles: users?.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {})
      });
    }

    // Test patients query with RLS
    const { data: patients, error: patientsError } = await anonClient
      .from('patients')
      .select(`
        id,
        profile_id,
        organization_id,
        profiles!inner(first_name, last_name, email, role)
      `)
      .eq('organization_id', ORGANIZATION_ID);

    if (patientsError) {
      investigator.addIssue('Anon Client RLS', `Patients query failed: ${patientsError.message}`, 'high');
    } else {
      investigator.addFinding('Anon Client RLS', `Patients query with RLS: ${patients?.length || 0} patients`, {
        count: patients?.length || 0
      });
    }

    // Test doctors query with RLS
    const { data: doctors, error: doctorsError } = await anonClient
      .from('doctors')
      .select(`
        id,
        profile_id,
        organization_id,
        profiles!inner(first_name, last_name, email, role)
      `)
      .eq('organization_id', ORGANIZATION_ID);

    if (doctorsError) {
      investigator.addIssue('Anon Client RLS', `Doctors query failed: ${doctorsError.message}`, 'high');
    } else {
      investigator.addFinding('Anon Client RLS', `Doctors query with RLS: ${doctors?.length || 0} doctors`, {
        count: doctors?.length || 0
      });
    }

    // Test RLS helper functions
    const { data: userOrgId, error: orgError } = await anonClient
      .rpc('get_user_organization_id');

    if (orgError) {
      investigator.addIssue('RLS Functions', `get_user_organization_id failed: ${orgError.message}`, 'high');
    } else {
      investigator.addFinding('RLS Functions', `get_user_organization_id result: ${userOrgId}`, {
        expected: ORGANIZATION_ID,
        actual: userOrgId,
        match: userOrgId === ORGANIZATION_ID
      });
    }

    const { data: userRole, error: roleError } = await anonClient
      .rpc('get_user_role');

    if (roleError) {
      investigator.addIssue('RLS Functions', `get_user_role failed: ${roleError.message}`, 'high');
    } else {
      investigator.addFinding('RLS Functions', `get_user_role result: ${userRole}`, {
        role: userRole,
        expected: 'admin'
      });
    }

    // Sign out
    await anonClient.auth.signOut();

  } catch (error) {
    investigator.addIssue('Anon Client', `Test failed: ${error.message}`, 'high');
  }
}

/**
 * Test RLS policies directly
 */
async function testRLSPolicies(investigator) {
  console.log('📋 Testing RLS Policies Directly...\n');

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check if RLS is enabled on tables
    const { data: rlsStatus, error: rlsError } = await serviceClient
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .in('tablename', ['profiles', 'patients', 'doctors', 'appointments'])
      .eq('schemaname', 'public');

    if (rlsError) {
      investigator.addIssue('RLS Status', `Failed to check RLS status: ${rlsError.message}`, 'high');
    } else {
      investigator.addFinding('RLS Status', 'RLS status for tables', rlsStatus);
    }

    // Check RLS policies
    const { data: policies, error: policiesError } = await serviceClient
      .from('pg_policies')
      .select('tablename, policyname, permissive, roles, cmd, qual, with_check')
      .in('tablename', ['profiles', 'patients', 'doctors', 'appointments']);

    if (policiesError) {
      investigator.addIssue('RLS Policies', `Failed to fetch policies: ${policiesError.message}`, 'high');
    } else {
      investigator.addFinding('RLS Policies', `Found ${policies?.length || 0} policies`, {
        count: policies?.length || 0,
        tables: policies?.reduce((acc, p) => { acc[p.tablename] = (acc[p.tablename] || 0) + 1; return acc; }, {})
      });
    }

    // Test helper functions existence
    const { data: functions, error: functionsError } = await serviceClient
      .from('pg_proc')
      .select('proname, prosrc')
      .in('proname', ['get_user_organization_id', 'get_user_role']);

    if (functionsError) {
      investigator.addIssue('RLS Functions', `Failed to check functions: ${functionsError.message}`, 'medium');
    } else {
      investigator.addFinding('RLS Functions', `Found ${functions?.length || 0} helper functions`, {
        functions: functions?.map(f => f.proname) || []
      });
    }

  } catch (error) {
    investigator.addIssue('RLS Policies', `Test failed: ${error.message}`, 'high');
  }
}

/**
 * Compare results and identify discrepancies
 */
function analyzeDiscrepancies(investigator) {
  console.log('🔍 Analyzing Discrepancies...\n');

  const serviceFindings = investigator.findings.filter(f => f.category === 'Service Client');
  const rlsFindings = investigator.findings.filter(f => f.category === 'Anon Client RLS');

  // Compare user counts
  const serviceUsers = serviceFindings.find(f => f.description.includes('Users query'))?.data?.count || 0;
  const rlsUsers = rlsFindings.find(f => f.description.includes('Users query'))?.data?.count || 0;

  if (serviceUsers !== rlsUsers) {
    investigator.addIssue('Data Discrepancy', 
      `Users count mismatch: Service=${serviceUsers}, RLS=${rlsUsers}`, 'high');
  }

  // Compare patient counts
  const servicePatients = serviceFindings.find(f => f.description.includes('Patients query'))?.data?.count || 0;
  const rlsPatients = rlsFindings.find(f => f.description.includes('Patients query'))?.data?.count || 0;

  if (servicePatients !== rlsPatients) {
    investigator.addIssue('Data Discrepancy', 
      `Patients count mismatch: Service=${servicePatients}, RLS=${rlsPatients}`, 'high');
  }

  // Compare doctor counts
  const serviceDoctors = serviceFindings.find(f => f.description.includes('Doctors query'))?.data?.count || 0;
  const rlsDoctors = rlsFindings.find(f => f.description.includes('Doctors query'))?.data?.count || 0;

  if (serviceDoctors !== rlsDoctors) {
    investigator.addIssue('Data Discrepancy', 
      `Doctors count mismatch: Service=${serviceDoctors}, RLS=${rlsDoctors}`, 'high');
  }

  investigator.addFinding('Analysis', 'Discrepancy analysis completed', {
    service: { users: serviceUsers, patients: servicePatients, doctors: serviceDoctors },
    rls: { users: rlsUsers, patients: rlsPatients, doctors: rlsDoctors }
  });
}

/**
 * Main investigation function
 */
async function main() {
  console.log('🚀 AGENTSALUD MVP - RLS POLICIES INVESTIGATION');
  console.log('🏥 Organization: VisualCare');
  console.log('🆔 ID: ' + ORGANIZATION_ID);
  console.log('👤 Test User: Laura Gómez (Admin)');
  console.log('📅 Date: ' + new Date().toISOString());
  console.log('\n');

  const investigator = new RLSInvestigator();

  try {
    // Run all investigation tests
    await testServiceRoleClient(investigator);
    await testAnonClientWithAuth(investigator);
    await testRLSPolicies(investigator);
    analyzeDiscrepancies(investigator);

    // Generate report
    investigator.printReport();

    // Provide recommendations
    console.log('💡 RECOMMENDATIONS:\n');
    
    const highIssues = investigator.issues.filter(i => i.severity === 'high');
    
    if (highIssues.length > 0) {
      console.log('🔴 CRITICAL ISSUES TO FIX:');
      highIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.category}: ${issue.description}`);
      });
      console.log('');
    }

    if (investigator.issues.length === 0) {
      console.log('✅ No critical RLS issues found.');
      console.log('   The problem may be in API route handlers or frontend context.');
    }

    // Exit with appropriate code
    process.exit(highIssues.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('💥 Fatal error during investigation:', error);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = { RLSInvestigator };
