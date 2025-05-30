const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase Connection...\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('📋 Environment Variables:');
  console.log(`URL: ${supabaseUrl}`);
  console.log(`Key: ${supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NOT SET'}\n`);

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables!');
    return;
  }

  if (supabaseUrl.includes('placeholder')) {
    console.error('❌ Still using placeholder URL!');
    return;
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test basic connection with a simple query that doesn't involve RLS
    console.log('🔗 Testing basic connection...');
    const { data, error } = await supabase.rpc('get_current_timestamp');

    if (error) {
      console.error('❌ Connection failed:', error.message);
      return;
    }

    console.log('✅ Basic connection successful!');

    // Test auth functionality
    console.log('\n🔐 Testing auth functionality...');
    const { data: authData, error: authError } = await supabase.auth.getSession();

    if (authError) {
      console.error('❌ Auth test failed:', authError.message);
      return;
    }

    console.log('✅ Auth functionality working!');
    console.log('📊 Current session:', authData.session ? 'Active' : 'No active session');

    console.log('\n🎉 All tests passed! Supabase is properly configured.');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testSupabaseConnection();
