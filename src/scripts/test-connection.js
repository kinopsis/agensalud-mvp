#!/usr/bin/env node

/**
 * Script to test connections to Supabase and OpenAI
 * Run with: node src/scripts/test-connection.js
 */

require('dotenv').config({ path: '.env.local' });

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Supabase environment variables not configured');
    return false;
  }
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    if (response.ok) {
      console.log('✅ Supabase connection successful');
      return true;
    } else {
      console.log(`❌ Supabase connection failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Supabase connection error: ${error.message}`);
    return false;
  }
}

async function testOpenAIConnection() {
  console.log('🔍 Testing OpenAI connection...');
  
  const openaiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiKey) {
    console.log('❌ OpenAI API key not configured');
    return false;
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${openaiKey}`
      }
    });
    
    if (response.ok) {
      console.log('✅ OpenAI connection successful');
      return true;
    } else {
      console.log(`❌ OpenAI connection failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ OpenAI connection error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing external service connections...\n');
  
  const supabaseOk = await testSupabaseConnection();
  const openaiOk = await testOpenAIConnection();
  
  console.log('\n📊 Connection Summary:');
  console.log(`Supabase: ${supabaseOk ? '✅' : '❌'}`);
  console.log(`OpenAI: ${openaiOk ? '✅' : '❌'}`);
  
  if (supabaseOk && openaiOk) {
    console.log('\n🎉 All connections successful! Ready to start development.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some connections failed. Please check your environment variables.');
    process.exit(1);
  }
}

main().catch(console.error);
