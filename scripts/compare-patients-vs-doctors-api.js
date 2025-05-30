/**
 * @fileoverview Compare Patients vs Doctors API Response
 * Investigates why patients page shows 0 patients while doctors page works correctly
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const ORGANIZATION_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4'; // VisualCare
const BASE_URL = 'http://localhost:3000';

// Test credentials
const TEST_CREDENTIALS = {
  email: 'laura.gomez.new@visualcare.com',
  password: 'password123'
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

/**
 * Compare API responses between patients and doctors
 */
async function compareAPIs() {
  console.log('🔍 COMPARING PATIENTS vs DOCTORS API RESPONSES');
  console.log('=' .repeat(60));

  const client = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Authenticate
    console.log('🔐 Authenticating...');
    const { data: authData, error: authError } = await client.auth.signInWithPassword(TEST_CREDENTIALS);
    if (authError) {
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    console.log('✅ Authentication successful');

    // Test Patients API
    console.log('\n📋 TESTING PATIENTS API');
    console.log('-' .repeat(30));
    
    const patientsUrl = `${BASE_URL}/api/patients?organizationId=${ORGANIZATION_ID}`;
    console.log(`🌐 URL: ${patientsUrl}`);

    const patientsResponse = await fetch(patientsUrl, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sb-access-token=${authData.session.access_token}; sb-refresh-token=${authData.session.refresh_token}`
      },
    });

    console.log(`📊 Status: ${patientsResponse.status} ${patientsResponse.statusText}`);

    if (patientsResponse.ok) {
      const patientsResult = await patientsResponse.json();
      console.log('📋 Patients API Response Structure:');
      console.log(`   - success: ${patientsResult.success}`);
      console.log(`   - data: ${Array.isArray(patientsResult.data) ? 'Array' : typeof patientsResult.data}`);
      console.log(`   - data.length: ${patientsResult.data?.length || 'N/A'}`);
      
      if (patientsResult.data && patientsResult.data.length > 0) {
        console.log('📋 First Patient Structure:');
        const firstPatient = patientsResult.data[0];
        console.log(`   - Keys: ${Object.keys(firstPatient).join(', ')}`);
        console.log(`   - first_name: "${firstPatient.first_name}"`);
        console.log(`   - last_name: "${firstPatient.last_name}"`);
        console.log(`   - email: "${firstPatient.email}"`);
        console.log(`   - is_active: ${firstPatient.is_active}`);
      } else {
        console.log('❌ No patients data found');
      }
    } else {
      const errorData = await patientsResponse.json().catch(() => ({}));
      console.log(`❌ Patients API Error: ${errorData.error || 'Unknown error'}`);
    }

    // Test Doctors API
    console.log('\n👨‍⚕️ TESTING DOCTORS API');
    console.log('-' .repeat(30));
    
    const doctorsUrl = `${BASE_URL}/api/doctors?organizationId=${ORGANIZATION_ID}`;
    console.log(`🌐 URL: ${doctorsUrl}`);

    const doctorsResponse = await fetch(doctorsUrl, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sb-access-token=${authData.session.access_token}; sb-refresh-token=${authData.session.refresh_token}`
      },
    });

    console.log(`📊 Status: ${doctorsResponse.status} ${doctorsResponse.statusText}`);

    if (doctorsResponse.ok) {
      const doctorsResult = await doctorsResponse.json();
      console.log('👨‍⚕️ Doctors API Response Structure:');
      console.log(`   - success: ${doctorsResult.success}`);
      console.log(`   - data: ${Array.isArray(doctorsResult.data) ? 'Array' : typeof doctorsResult.data}`);
      console.log(`   - data.length: ${doctorsResult.data?.length || 'N/A'}`);
      
      if (doctorsResult.data && doctorsResult.data.length > 0) {
        console.log('👨‍⚕️ First Doctor Structure:');
        const firstDoctor = doctorsResult.data[0];
        console.log(`   - Keys: ${Object.keys(firstDoctor).join(', ')}`);
        console.log(`   - name: "${firstDoctor.name}"`);
        console.log(`   - specialization: "${firstDoctor.specialization}"`);
        console.log(`   - is_available: ${firstDoctor.is_available}`);
      } else {
        console.log('❌ No doctors data found');
      }
    } else {
      const errorData = await doctorsResponse.json().catch(() => ({}));
      console.log(`❌ Doctors API Error: ${errorData.error || 'Unknown error'}`);
    }

    // Direct Supabase comparison
    console.log('\n🔍 DIRECT SUPABASE COMPARISON');
    console.log('-' .repeat(30));

    // Test patients query directly
    console.log('📋 Direct Patients Query:');
    const { data: directPatients, error: patientsError } = await client
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
      console.log(`❌ Direct patients query error: ${patientsError.message}`);
    } else {
      console.log(`✅ Direct patients query: ${directPatients?.length || 0} patients found`);
      if (directPatients && directPatients.length > 0) {
        console.log('📋 First Direct Patient:');
        const firstDirectPatient = directPatients[0];
        console.log(`   - profiles type: ${Array.isArray(firstDirectPatient.profiles) ? 'Array' : typeof firstDirectPatient.profiles}`);
        console.log(`   - profiles content: ${JSON.stringify(firstDirectPatient.profiles)}`);
      }
    }

    // Test doctors query directly
    console.log('\n👨‍⚕️ Direct Doctors Query:');
    const { data: directDoctors, error: doctorsError } = await client
      .from('doctors')
      .select(`
        id,
        specialization,
        is_available,
        profiles!inner(
          first_name,
          last_name,
          email
        )
      `)
      .eq('organization_id', ORGANIZATION_ID);

    if (doctorsError) {
      console.log(`❌ Direct doctors query error: ${doctorsError.message}`);
    } else {
      console.log(`✅ Direct doctors query: ${directDoctors?.length || 0} doctors found`);
      if (directDoctors && directDoctors.length > 0) {
        console.log('👨‍⚕️ First Direct Doctor:');
        const firstDirectDoctor = directDoctors[0];
        console.log(`   - profiles type: ${Array.isArray(firstDirectDoctor.profiles) ? 'Array' : typeof firstDirectDoctor.profiles}`);
        console.log(`   - profiles content: ${JSON.stringify(firstDirectDoctor.profiles)}`);
      }
    }

    // Summary
    console.log('\n📊 COMPARISON SUMMARY');
    console.log('=' .repeat(60));
    
    const patientsWorking = patientsResponse.ok && patientsResult?.data?.length > 0;
    const doctorsWorking = doctorsResponse.ok && doctorsResult?.data?.length > 0;
    
    console.log(`📋 Patients API: ${patientsWorking ? '✅ WORKING' : '❌ NOT WORKING'}`);
    console.log(`👨‍⚕️ Doctors API: ${doctorsWorking ? '✅ WORKING' : '❌ NOT WORKING'}`);
    
    if (!patientsWorking && doctorsWorking) {
      console.log('\n🎯 ISSUE IDENTIFIED: Patients API has specific problems while Doctors API works');
      console.log('🔍 Recommended investigation:');
      console.log('   1. Check patients API data transformation logic');
      console.log('   2. Verify profiles join structure in patients query');
      console.log('   3. Compare API response formats between patients and doctors');
    } else if (patientsWorking && doctorsWorking) {
      console.log('\n🎯 BOTH APIs WORKING: Issue may be in frontend component logic');
      console.log('🔍 Recommended investigation:');
      console.log('   1. Check frontend filtering logic');
      console.log('   2. Verify React state management');
      console.log('   3. Check useEffect dependencies');
    }

    // Sign out
    await client.auth.signOut();

  } catch (error) {
    console.error('💥 Fatal error during comparison:', error);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  compareAPIs();
}

module.exports = { compareAPIs };
