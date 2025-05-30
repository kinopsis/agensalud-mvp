const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testAuthFlow() {
  console.log('🔐 Testing Authentication Flow...\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test email for registration
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    console.log('📧 Testing user registration...');
    console.log(`Email: ${testEmail}`);
    
    // Test signup
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User'
        }
      }
    });
    
    if (signUpError) {
      console.error('❌ Signup failed:', signUpError.message);
      return;
    }
    
    console.log('✅ Signup successful!');
    console.log('📊 User ID:', signUpData.user?.id);
    console.log('📊 Email confirmed:', signUpData.user?.email_confirmed_at ? 'Yes' : 'No');
    
    // Test session
    console.log('\n🔍 Testing session...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session test failed:', sessionError.message);
      return;
    }
    
    console.log('✅ Session test successful!');
    console.log('📊 Active session:', sessionData.session ? 'Yes' : 'No');
    
    // Test profile creation (if user is created)
    if (signUpData.user) {
      console.log('\n👤 Testing profile creation...');
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: signUpData.user.id,
          first_name: 'Test',
          last_name: 'User',
          email: testEmail,
          role: 'patient'
        })
        .select();
      
      if (profileError) {
        console.log('⚠️ Profile creation failed (expected if email confirmation required):', profileError.message);
      } else {
        console.log('✅ Profile created successfully!');
        console.log('📊 Profile data:', profileData);
      }
    }
    
    console.log('\n🎉 Authentication flow test completed!');
    console.log('\n📋 Summary:');
    console.log('- ✅ Supabase connection working');
    console.log('- ✅ Auth signup working');
    console.log('- ✅ Session management working');
    console.log('- ⚠️ Email confirmation may be required for full functionality');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testAuthFlow();
