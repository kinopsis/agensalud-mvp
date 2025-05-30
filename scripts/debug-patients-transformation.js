/**
 * @fileoverview Debug Patients API Data Transformation
 * Investigates the specific data transformation logic in patients API
 * that might be causing empty results
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const ORGANIZATION_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4'; // VisualCare

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
 * Debug the exact transformation logic used in patients API
 */
async function debugPatientsTransformation() {
  console.log('🔍 DEBUGGING PATIENTS API DATA TRANSFORMATION');
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

    // Step 1: Raw Supabase query (same as in patients API)
    console.log('\n📋 STEP 1: RAW SUPABASE QUERY');
    console.log('-' .repeat(40));

    const { data: patientsData, error: queryError } = await client
      .from('patients')
      .select(`
        id,
        profile_id,
        organization_id,
        emergency_contact_name,
        emergency_contact_phone,
        medical_notes,
        created_at,
        profiles!inner(
          first_name,
          last_name,
          email,
          phone,
          date_of_birth,
          gender,
          address,
          city,
          is_active
        )
      `)
      .eq('organization_id', ORGANIZATION_ID);

    if (queryError) {
      console.log(`❌ Query error: ${queryError.message}`);
      return;
    }

    console.log(`✅ Raw query result: ${patientsData?.length || 0} patients found`);
    
    if (patientsData && patientsData.length > 0) {
      console.log('\n📋 First Raw Patient Structure:');
      const firstRaw = patientsData[0];
      console.log(`   - Patient ID: ${firstRaw.id}`);
      console.log(`   - Profile ID: ${firstRaw.profile_id}`);
      console.log(`   - Profiles type: ${Array.isArray(firstRaw.profiles) ? 'Array' : typeof firstRaw.profiles}`);
      console.log(`   - Profiles content: ${JSON.stringify(firstRaw.profiles, null, 2)}`);
    }

    // Step 2: Apply the exact transformation logic from the API
    console.log('\n🔄 STEP 2: APPLYING TRANSFORMATION LOGIC');
    console.log('-' .repeat(40));

    let transformedPatients = patientsData?.map(patient => {
      console.log(`\n🔍 Transforming patient ${patient.id}:`);
      console.log(`   - profiles type: ${Array.isArray(patient.profiles) ? 'Array' : typeof patient.profiles}`);
      console.log(`   - profiles length: ${Array.isArray(patient.profiles) ? patient.profiles.length : 'N/A'}`);
      
      // This is the exact logic from the API
      const profile = Array.isArray(patient.profiles) && patient.profiles.length > 0
        ? patient.profiles[0]
        : null;

      console.log(`   - profile extracted: ${profile ? 'YES' : 'NO'}`);
      if (profile) {
        console.log(`   - profile.first_name: "${profile.first_name}"`);
        console.log(`   - profile.last_name: "${profile.last_name}"`);
        console.log(`   - profile.email: "${profile.email}"`);
        console.log(`   - profile.is_active: ${profile.is_active}`);
      }

      const transformed = {
        id: patient.id,
        profile_id: patient.profile_id,
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        date_of_birth: profile?.date_of_birth,
        gender: profile?.gender,
        address: profile?.address,
        city: profile?.city,
        emergency_contact_name: patient.emergency_contact_name,
        emergency_contact_phone: patient.emergency_contact_phone,
        medical_notes: patient.medical_notes,
        created_at: patient.created_at,
        is_active: profile?.is_active || false,
        total_appointments: 0, // Simplified for debugging
        upcoming_appointments: 0,
        last_appointment: null
      };

      console.log(`   - transformed.first_name: "${transformed.first_name}"`);
      console.log(`   - transformed.last_name: "${transformed.last_name}"`);
      console.log(`   - transformed.email: "${transformed.email}"`);
      console.log(`   - transformed.is_active: ${transformed.is_active}`);

      return transformed;
    }) || [];

    console.log(`\n✅ Transformation complete: ${transformedPatients.length} patients transformed`);

    // Step 3: Check if transformation resulted in empty data
    console.log('\n📊 STEP 3: TRANSFORMATION ANALYSIS');
    console.log('-' .repeat(40));

    const patientsWithNames = transformedPatients.filter(p => p.first_name && p.last_name);
    const patientsWithEmails = transformedPatients.filter(p => p.email);
    const activePatients = transformedPatients.filter(p => p.is_active);

    console.log(`📊 Transformation Results:`);
    console.log(`   - Total transformed: ${transformedPatients.length}`);
    console.log(`   - With names: ${patientsWithNames.length}`);
    console.log(`   - With emails: ${patientsWithEmails.length}`);
    console.log(`   - Active: ${activePatients.length}`);

    if (transformedPatients.length > 0) {
      console.log('\n📋 First Transformed Patient:');
      const first = transformedPatients[0];
      console.log(`   - Name: "${first.first_name} ${first.last_name}"`);
      console.log(`   - Email: "${first.email}"`);
      console.log(`   - Active: ${first.is_active}`);
      console.log(`   - All fields: ${JSON.stringify(first, null, 2)}`);
    }

    // Step 4: Compare with direct profiles query
    console.log('\n🔍 STEP 4: DIRECT PROFILES COMPARISON');
    console.log('-' .repeat(40));

    const { data: directProfiles, error: profilesError } = await client
      .from('profiles')
      .select('*')
      .eq('organization_id', ORGANIZATION_ID)
      .eq('role', 'patient');

    if (profilesError) {
      console.log(`❌ Profiles query error: ${profilesError.message}`);
    } else {
      console.log(`✅ Direct profiles query: ${directProfiles?.length || 0} patient profiles found`);
      
      if (directProfiles && directProfiles.length > 0) {
        console.log('\n📋 First Direct Profile:');
        const firstProfile = directProfiles[0];
        console.log(`   - Name: "${firstProfile.first_name} ${firstProfile.last_name}"`);
        console.log(`   - Email: "${firstProfile.email}"`);
        console.log(`   - Active: ${firstProfile.is_active}`);
        console.log(`   - Role: "${firstProfile.role}"`);
      }
    }

    // Summary and recommendations
    console.log('\n🎯 DEBUGGING SUMMARY');
    console.log('=' .repeat(60));

    if (patientsData && patientsData.length > 0 && transformedPatients.length === 0) {
      console.log('❌ ISSUE FOUND: Raw data exists but transformation fails');
      console.log('🔍 Likely cause: profiles join structure issue');
      console.log('💡 Recommendation: Check if profiles is array vs object');
    } else if (patientsData && patientsData.length > 0 && transformedPatients.length > 0 && patientsWithNames.length === 0) {
      console.log('❌ ISSUE FOUND: Transformation succeeds but names are empty');
      console.log('🔍 Likely cause: profile extraction logic issue');
      console.log('💡 Recommendation: Fix profile array/object handling');
    } else if (transformedPatients.length > 0 && patientsWithNames.length > 0) {
      console.log('✅ TRANSFORMATION WORKING: Data is properly transformed');
      console.log('🔍 Issue may be in: API filtering, frontend processing, or state management');
    } else {
      console.log('❌ NO RAW DATA: Issue is in the base query or RLS policies');
    }

    // Sign out
    await client.auth.signOut();

  } catch (error) {
    console.error('💥 Fatal error during debugging:', error);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  debugPatientsTransformation();
}

module.exports = { debugPatientsTransformation };
