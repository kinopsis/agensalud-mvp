/**
 * =====================================================
 * AGENTSALUD MVP - STARTUP ENVIRONMENT VALIDATOR
 * =====================================================
 * Node.js startup script for reliable Coolify deployment
 * Validates environment and starts the Next.js server
 * 
 * @author AgentSalud DevOps Team
 * @date January 2025
 */

const { spawn } = require('child_process');

console.log('🚀 AgentSalud MVP - Starting...');
console.log('================================');
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log(`Node version: ${process.version}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Platform: ${process.platform}`);
console.log('');

// Validate environment variables
function validateEnvironment() {
    console.log('🔍 Validating environment variables...');
    
    const requiredVars = [
        'NODE_ENV',
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'NEXTAUTH_SECRET'
    ];
    
    const missingVars = [];
    const placeholderVars = [];
    
    requiredVars.forEach(varName => {
        const value = process.env[varName];
        if (!value) {
            missingVars.push(varName);
        } else if (value.includes('placeholder')) {
            placeholderVars.push(varName);
        }
    });
    
    if (missingVars.length > 0) {
        console.log(`⚠️ Missing environment variables: ${missingVars.join(', ')}`);
        console.log('   Application will start but may have limited functionality');
    }
    
    if (placeholderVars.length > 0) {
        console.log(`⚠️ Placeholder values detected: ${placeholderVars.join(', ')}`);
        console.log('   Please update these in Coolify environment variables');
    }
    
    if (missingVars.length === 0 && placeholderVars.length === 0) {
        console.log('✅ All environment variables properly configured');
    }
    
    // Log Supabase configuration
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        if (process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co') {
            console.log(`✅ Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
        } else {
            console.log('⚠️ Using placeholder Supabase URL');
        }
    }
    
    console.log('');
}

// Start the Next.js server
function startServer() {
    console.log('🎯 Starting Next.js server...');
    console.log(`Port: ${process.env.PORT || 3000}`);
    console.log(`Hostname: ${process.env.HOSTNAME || '0.0.0.0'}`);
    console.log('');
    
    // Start the server process
    const server = spawn('node', ['server.js'], {
        stdio: 'inherit',
        env: process.env
    });
    
    server.on('error', (error) => {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    });
    
    server.on('exit', (code) => {
        console.log(`Server exited with code ${code}`);
        process.exit(code);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
        console.log('Received SIGTERM, shutting down gracefully...');
        server.kill('SIGTERM');
    });
    
    process.on('SIGINT', () => {
        console.log('Received SIGINT, shutting down gracefully...');
        server.kill('SIGINT');
    });
}

// Main startup sequence
function main() {
    try {
        validateEnvironment();
        startServer();
    } catch (error) {
        console.error('❌ Startup failed:', error);
        process.exit(1);
    }
}

// Run main function
main();
