/**
 * @fileoverview Management Pages Diagnostic Tool
 * Investigates why management pages show inconsistent data
 * compared to dashboard counts for AgentSalud MVP
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const ORGANIZATION_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4'; // VisualCare
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Diagnostic Results Tracker
 */
class DiagnosticTool {
  constructor() {
    this.issues = [];
    this.findings = [];
  }

  addIssue(category, description, severity = 'medium') {
    this.issues.push({ category, description, severity });
  }

  addFinding(category, description, data = null) {
    this.findings.push({ category, description, data });
  }

  printReport() {
    console.log('=' .repeat(60));
    console.log('📊 MANAGEMENT PAGES DIAGNOSTIC REPORT');
    console.log('=' .repeat(60));
    
    console.log(`🔍 Total Issues Found: ${this.issues.length}`);
    console.log(`📋 Total Findings: ${this.findings.length}`);
    console.log('');

    if (this.issues.length > 0) {
      console.log('❌ ISSUES IDENTIFIED:');
      this.issues.forEach((issue, index) => {
        const severity = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
        console.log(`   ${index + 1}. ${severity} [${issue.category}] ${issue.description}`);
      });
      console.log('');
    }

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

    console.log('=' .repeat(60));
  }
}

/**
 * Test database connectivity and data integrity
 */
async function testDatabaseConnectivity(diagnostic) {
  console.log('🔌 Testing Database Connectivity...\n');

  try {
    // Test basic connection
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', ORGANIZATION_ID)
      .single();

    if (orgError) {
      diagnostic.addIssue('Database', `Organization query failed: ${orgError.message}`, 'high');
      return false;
    }

    diagnostic.addFinding('Database', `Organization found: ${orgData.name}`, orgData);

    // Test each table
    const tables = ['profiles', 'patients', 'doctors', 'appointments'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .eq('organization_id', ORGANIZATION_ID)
        .limit(1);

      if (error) {
        diagnostic.addIssue('Database', `${table} table query failed: ${error.message}`, 'high');
      } else {
        diagnostic.addFinding('Database', `${table} table accessible: ${data?.length || 0} records found`);
      }
    }

    return true;

  } catch (error) {
    diagnostic.addIssue('Database', `Connection failed: ${error.message}`, 'high');
    return false;
  }
}

/**
 * Test API endpoints simulation
 */
async function testAPIEndpoints(diagnostic) {
  console.log('🔌 Testing API Endpoints Logic...\n');

  try {
    // Test Users API logic
    const { data: usersData, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        organization_id,
        created_at,
        phone,
        is_active,
        last_sign_in_at,
        organizations!inner(
          name,
          slug
        )
      `)
      .eq('organization_id', ORGANIZATION_ID);

    if (usersError) {
      diagnostic.addIssue('API', `Users API logic failed: ${usersError.message}`, 'high');
    } else {
      diagnostic.addFinding('API', `Users API logic works: ${usersData?.length || 0} users`, {
        count: usersData?.length || 0,
        sample: usersData?.[0] || null
      });

      // Check for missing organization data
      const usersWithoutOrg = usersData?.filter(u => !u.organizations || u.organizations.length === 0) || [];
      if (usersWithoutOrg.length > 0) {
        diagnostic.addIssue('API', `${usersWithoutOrg.length} users missing organization data`, 'medium');
      }
    }

    // Test Patients API logic
    const { data: patientsData, error: patientsError } = await supabase
      .from('patients')
      .select(`
        id,
        profile_id,
        organization_id,
        created_at,
        profiles!inner(
          first_name,
          last_name,
          email,
          phone,
          is_active
        )
      `)
      .eq('organization_id', ORGANIZATION_ID);

    if (patientsError) {
      diagnostic.addIssue('API', `Patients API logic failed: ${patientsError.message}`, 'high');
    } else {
      diagnostic.addFinding('API', `Patients API logic works: ${patientsData?.length || 0} patients`, {
        count: patientsData?.length || 0,
        sample: patientsData?.[0] || null
      });

      // Check for missing profile data
      const patientsWithoutProfile = patientsData?.filter(p => !p.profiles || p.profiles.length === 0) || [];
      if (patientsWithoutProfile.length > 0) {
        diagnostic.addIssue('API', `${patientsWithoutProfile.length} patients missing profile data`, 'medium');
      }
    }

  } catch (error) {
    diagnostic.addIssue('API', `API testing failed: ${error.message}`, 'high');
  }
}

/**
 * Test authentication and permissions
 */
async function testAuthenticationFlow(diagnostic) {
  console.log('🔐 Testing Authentication Flow...\n');

  try {
    // Get all users for the organization
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, role, is_active')
      .eq('organization_id', ORGANIZATION_ID);

    if (usersError) {
      diagnostic.addIssue('Auth', `Failed to fetch users: ${usersError.message}`, 'high');
      return;
    }

    diagnostic.addFinding('Auth', `Found ${users?.length || 0} users in organization`);

    // Check role distribution
    const roleDistribution = users?.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {}) || {};

    diagnostic.addFinding('Auth', 'Role distribution', roleDistribution);

    // Check for admin users
    const adminUsers = users?.filter(u => u.role === 'admin') || [];
    if (adminUsers.length === 0) {
      diagnostic.addIssue('Auth', 'No admin users found - management pages may not be accessible', 'high');
    } else {
      diagnostic.addFinding('Auth', `${adminUsers.length} admin users found`);
    }

    // Check for inactive users
    const inactiveUsers = users?.filter(u => !u.is_active) || [];
    if (inactiveUsers.length > 0) {
      diagnostic.addFinding('Auth', `${inactiveUsers.length} inactive users found`);
    }

  } catch (error) {
    diagnostic.addIssue('Auth', `Authentication testing failed: ${error.message}`, 'high');
  }
}

/**
 * Test data relationships and integrity
 */
async function testDataRelationships(diagnostic) {
  console.log('🔗 Testing Data Relationships...\n');

  try {
    // Test profile-patient relationship
    const { data: patients } = await supabase
      .from('patients')
      .select('profile_id')
      .eq('organization_id', ORGANIZATION_ID);

    const { data: patientProfiles } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('organization_id', ORGANIZATION_ID)
      .eq('role', 'patient');

    const patientIds = new Set(patients?.map(p => p.profile_id) || []);
    const profileIds = new Set(patientProfiles?.map(p => p.id) || []);

    // Check for orphaned patients
    const orphanedPatients = patients?.filter(p => !profileIds.has(p.profile_id)) || [];
    if (orphanedPatients.length > 0) {
      diagnostic.addIssue('Data', `${orphanedPatients.length} patients without corresponding profiles`, 'medium');
    }

    // Check for patient profiles without patient records
    const profilesWithoutPatients = patientProfiles?.filter(p => !patientIds.has(p.id)) || [];
    if (profilesWithoutPatients.length > 0) {
      diagnostic.addIssue('Data', `${profilesWithoutPatients.length} patient profiles without patient records`, 'medium');
    }

    diagnostic.addFinding('Data', `Patient-Profile relationship check completed`, {
      patients: patients?.length || 0,
      patientProfiles: patientProfiles?.length || 0,
      orphanedPatients: orphanedPatients.length,
      profilesWithoutPatients: profilesWithoutPatients.length
    });

    // Test doctor-profile relationship
    const { data: doctors } = await supabase
      .from('doctors')
      .select('profile_id')
      .eq('organization_id', ORGANIZATION_ID);

    const { data: doctorProfiles } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('organization_id', ORGANIZATION_ID)
      .eq('role', 'doctor');

    const doctorIds = new Set(doctors?.map(d => d.profile_id) || []);
    const doctorProfileIds = new Set(doctorProfiles?.map(p => p.id) || []);

    const orphanedDoctors = doctors?.filter(d => !doctorProfileIds.has(d.profile_id)) || [];
    const doctorProfilesWithoutDoctors = doctorProfiles?.filter(p => !doctorIds.has(p.id)) || [];

    if (orphanedDoctors.length > 0) {
      diagnostic.addIssue('Data', `${orphanedDoctors.length} doctors without corresponding profiles`, 'medium');
    }

    if (doctorProfilesWithoutDoctors.length > 0) {
      diagnostic.addIssue('Data', `${doctorProfilesWithoutDoctors.length} doctor profiles without doctor records`, 'medium');
    }

    diagnostic.addFinding('Data', `Doctor-Profile relationship check completed`, {
      doctors: doctors?.length || 0,
      doctorProfiles: doctorProfiles?.length || 0,
      orphanedDoctors: orphanedDoctors.length,
      doctorProfilesWithoutDoctors: doctorProfilesWithoutDoctors.length
    });

  } catch (error) {
    diagnostic.addIssue('Data', `Data relationship testing failed: ${error.message}`, 'high');
  }
}

/**
 * Generate recommendations
 */
function generateRecommendations(diagnostic) {
  console.log('💡 RECOMMENDATIONS:\n');

  const highIssues = diagnostic.issues.filter(i => i.severity === 'high');
  const mediumIssues = diagnostic.issues.filter(i => i.severity === 'medium');

  if (highIssues.length > 0) {
    console.log('🔴 HIGH PRIORITY FIXES:');
    highIssues.forEach((issue, index) => {
      console.log(`   ${index + 1}. Fix ${issue.category}: ${issue.description}`);
    });
    console.log('');
  }

  if (mediumIssues.length > 0) {
    console.log('🟡 MEDIUM PRIORITY IMPROVEMENTS:');
    mediumIssues.forEach((issue, index) => {
      console.log(`   ${index + 1}. Improve ${issue.category}: ${issue.description}`);
    });
    console.log('');
  }

  if (diagnostic.issues.length === 0) {
    console.log('✅ No critical issues found in data layer.');
    console.log('   The problem may be in the frontend components or authentication flow.');
    console.log('   Recommended next steps:');
    console.log('   1. Test the management pages in browser with authenticated user');
    console.log('   2. Check browser console for JavaScript errors');
    console.log('   3. Verify authentication context is properly initialized');
    console.log('   4. Check if API calls are being made with correct parameters');
  }

  console.log('');
}

/**
 * Main diagnostic function
 */
async function main() {
  console.log('🚀 AGENTSALUD MVP - MANAGEMENT PAGES DIAGNOSTIC');
  console.log('🏥 Organization: VisualCare');
  console.log('🆔 ID: ' + ORGANIZATION_ID);
  console.log('📅 Date: ' + new Date().toISOString());
  console.log('\n');

  const diagnostic = new DiagnosticTool();

  try {
    // Run all diagnostic tests
    const dbConnected = await testDatabaseConnectivity(diagnostic);
    
    if (dbConnected) {
      await testAPIEndpoints(diagnostic);
      await testAuthenticationFlow(diagnostic);
      await testDataRelationships(diagnostic);
    }

    // Generate report
    diagnostic.printReport();
    generateRecommendations(diagnostic);

    // Exit with appropriate code
    const hasHighIssues = diagnostic.issues.some(i => i.severity === 'high');
    process.exit(hasHighIssues ? 1 : 0);

  } catch (error) {
    console.error('💥 Fatal error during diagnostic:', error);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = { DiagnosticTool };
