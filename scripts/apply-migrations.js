/**
 * Script to apply database migrations
 * Run with: node scripts/apply-migrations.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration(migrationFile) {
  try {
    console.log(`Applying migration: ${migrationFile}`);
    
    const migrationPath = path.join(__dirname, '..', 'src', 'lib', 'supabase', 'migrations', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          console.error(`Error executing statement: ${statement.substring(0, 100)}...`);
          console.error(error);
          return false;
        }
      }
    }
    
    console.log(`✅ Migration ${migrationFile} applied successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Error applying migration ${migrationFile}:`, error);
    return false;
  }
}

async function main() {
  console.log('Starting database migrations...');
  
  // Apply new migrations
  const migrations = [
    '004_add_subscription_plan.sql',
    '005_add_missing_tables.sql'
  ];
  
  for (const migration of migrations) {
    const success = await applyMigration(migration);
    if (!success) {
      console.error('Migration failed, stopping...');
      process.exit(1);
    }
  }
  
  console.log('✅ All migrations applied successfully!');
}

main().catch(console.error);
