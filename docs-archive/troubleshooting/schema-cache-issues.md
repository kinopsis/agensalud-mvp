# Supabase Schema Cache Troubleshooting Guide

## Overview

This guide provides step-by-step procedures for diagnosing and resolving Supabase PostgREST schema cache issues in the AgentSalud MVP system.

## Common Schema Cache Errors

### 1. Relation Does Not Exist (Error 42P01)

**Error Message:**
```
relation "public.table_name" does not exist
```

**Symptoms:**
- API returns 500 error
- Console shows PostgreSQL error code 42P01
- Table exists in Supabase dashboard but API can't access it

**Diagnosis Steps:**

1. **Verify Table Exists:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'your_table_name';
   ```

2. **Check RLS Status:**
   ```sql
   SELECT schemaname, tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'your_table_name';
   ```

3. **Verify Policies:**
   ```sql
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
   FROM pg_policies 
   WHERE tablename = 'your_table_name';
   ```

**Resolution Steps:**

1. **Force Schema Cache Refresh:**
   - Restart your Next.js development server
   - In production: restart the application

2. **Verify Supabase Connection:**
   ```javascript
   // Test basic connectivity
   const { data, error } = await supabase
     .from('profiles')  // Use a known working table
     .select('count')
     .limit(1);
   ```

3. **Check Environment Variables:**
   ```bash
   # Verify correct project ID
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

### 2. Schema Cache Relationship Error (Error PGRST200)

**Error Message:**
```
Could not find a relationship between 'table1' and 'table2' in the schema cache
```

**Symptoms:**
- Joins fail in Supabase queries
- Foreign key relationships not recognized
- Error code PGRST200

**Diagnosis Steps:**

1. **Check Foreign Key Constraints:**
   ```sql
   SELECT
     tc.table_name, 
     kcu.column_name, 
     ccu.table_name AS foreign_table_name,
     ccu.column_name AS foreign_column_name 
   FROM information_schema.table_constraints AS tc 
   JOIN information_schema.key_column_usage AS kcu
     ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage AS ccu
     ON ccu.constraint_name = tc.constraint_name
   WHERE tc.constraint_type = 'FOREIGN KEY' 
   AND tc.table_name = 'your_table_name';
   ```

2. **Verify Relationship Syntax:**
   ```javascript
   // Correct syntax for nested relationships
   const { data } = await supabase
     .from('appointments')
     .select(`
       *,
       doctor:doctors!appointments_doctor_id_fkey(
         profiles(first_name, last_name)
       )
     `);
   ```

**Resolution Steps:**

1. **Use Correct Foreign Key Names:**
   - Check actual constraint names in database
   - Use exact names in Supabase queries

2. **Verify Table Relationships:**
   ```sql
   -- Check if foreign key exists
   SELECT constraint_name 
   FROM information_schema.table_constraints 
   WHERE table_name = 'appointments' 
   AND constraint_type = 'FOREIGN KEY';
   ```

## Monitoring and Prevention

### 1. Implement Schema Cache Monitoring

```javascript
import { withSchemaCacheMonitoring } from '@/lib/monitoring/supabase-monitor';

// Wrap all Supabase operations
const { data, error } = await withSchemaCacheMonitoring(
  () => supabase.from('table_name').select('*'),
  {
    endpoint: '/api/endpoint',
    table: 'table_name',
    operation: 'SELECT'
  }
);
```

### 2. Health Check Implementation

```javascript
import { checkSchemaCacheHealth } from '@/lib/monitoring/supabase-monitor';

// Regular health checks
const healthCheck = await checkSchemaCacheHealth(supabase);
if (!healthCheck.healthy) {
  console.error('Schema cache issues detected:', healthCheck.errors);
}
```

## Step-by-Step Troubleshooting Procedure

### Phase 1: Initial Diagnosis

1. **Check Error Logs:**
   ```bash
   # In development
   npm run dev
   # Check console for error codes and messages
   ```

2. **Verify Environment:**
   ```javascript
   // Check Supabase configuration
   console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
   console.log('Project ID:', process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]);
   ```

3. **Test Basic Connectivity:**
   ```javascript
   const testConnection = async () => {
     const { data, error } = await supabase.from('profiles').select('count').limit(1);
     console.log('Connection test:', { data, error });
   };
   ```

### Phase 2: Table-Specific Diagnosis

1. **Verify Table Existence:**
   ```sql
   SELECT table_name, table_type 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

2. **Check Table Structure:**
   ```sql
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns 
   WHERE table_name = 'problematic_table_name'
   ORDER BY ordinal_position;
   ```

3. **Verify RLS Policies:**
   ```sql
   SELECT policyname, permissive, roles, cmd, qual
   FROM pg_policies 
   WHERE tablename = 'problematic_table_name';
   ```

### Phase 3: Relationship Diagnosis

1. **Check Foreign Keys:**
   ```sql
   SELECT 
     tc.constraint_name,
     tc.table_name,
     kcu.column_name,
     ccu.table_name AS referenced_table,
     ccu.column_name AS referenced_column
   FROM information_schema.table_constraints tc
   JOIN information_schema.key_column_usage kcu 
     ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage ccu 
     ON ccu.constraint_name = tc.constraint_name
   WHERE tc.constraint_type = 'FOREIGN KEY'
   AND tc.table_name = 'problematic_table_name';
   ```

2. **Test Relationships:**
   ```javascript
   // Test simple join
   const { data, error } = await supabase
     .from('appointments')
     .select('id, patient:profiles!appointments_patient_id_fkey(first_name)')
     .limit(1);
   ```

### Phase 4: Resolution

1. **Schema Cache Refresh:**
   ```bash
   # Development
   # Stop server (Ctrl+C)
   npm run dev
   
   # Production
   # Restart application/container
   ```

2. **Verify Fix:**
   ```javascript
   // Test the previously failing operation
   const { data, error } = await supabase
     .from('problematic_table')
     .select('*')
     .limit(1);
   
   console.log('Fix verification:', { success: !error, error });
   ```

## Prevention Strategies

### 1. Proactive Monitoring

```javascript
// Add to all API routes
import { withSchemaCacheMonitoring } from '@/lib/monitoring/supabase-monitor';

export async function GET(request) {
  const { data, error } = await withSchemaCacheMonitoring(
    () => supabase.from('table').select('*'),
    { endpoint: request.url, table: 'table', operation: 'SELECT' }
  );
  
  // Handle response...
}
```

### 2. Regular Health Checks

```javascript
// Implement in application startup
const performHealthCheck = async () => {
  const health = await checkSchemaCacheHealth(supabase);
  if (!health.healthy) {
    console.warn('Schema cache health issues:', health.errors);
    // Send alert to monitoring system
  }
};

// Run every 5 minutes
setInterval(performHealthCheck, 5 * 60 * 1000);
```

### 3. Error Recovery

```javascript
import { retryOnSchemaCacheError } from '@/lib/monitoring/supabase-monitor';

// Automatic retry for schema cache errors
const { data, error } = await retryOnSchemaCacheError(
  () => supabase.from('table').select('*'),
  { endpoint: '/api/endpoint', table: 'table' },
  { retryAttempts: 3, retryDelay: 1000 }
);
```

## Emergency Procedures

### Critical System Failure

1. **Immediate Actions:**
   - Check Supabase dashboard status
   - Verify environment variables
   - Restart application

2. **Escalation:**
   - Check Supabase status page
   - Contact Supabase support if needed
   - Implement fallback mechanisms

3. **Recovery:**
   - Monitor error rates
   - Verify all functionality
   - Document incident for future prevention

## Tools and Resources

### Useful SQL Queries

```sql
-- List all tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check RLS status for all tables
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- List all foreign keys
SELECT tc.table_name, tc.constraint_name, kcu.column_name, ccu.table_name AS referenced_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```

### Monitoring Dashboard

Create a simple monitoring endpoint:

```javascript
// /api/health/schema-cache
export async function GET() {
  const health = await checkSchemaCacheHealth(supabase);
  return NextResponse.json(health);
}
```

This guide should be referenced whenever schema cache issues are encountered in the AgentSalud MVP system.
