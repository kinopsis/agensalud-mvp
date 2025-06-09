#!/usr/bin/env node

/**
 * =====================================================
 * AGENTSALUD MVP - COOLIFY + SUPABASE DEPLOYMENT VALIDATION
 * =====================================================
 * Comprehensive validation script for Coolify + External Supabase
 *
 * @author AgentSalud DevOps Team
 * @date January 2025
 */

const https = require('https');
const http = require('http');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

// Configuration
const CONFIG = {
    APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://agentsalud.com',
    EVOLUTION_URL: process.env.EVOLUTION_API_BASE_URL || 'https://evolution.agentsalud.com',
    LOCAL_APP_URL: 'http://localhost:3000',
    LOCAL_EVOLUTION_URL: 'http://localhost:8080',
    TIMEOUT: 10000
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Utility functions
const log = (message, color = 'blue') => {
    console.log(`${colors[color]}[${new Date().toISOString()}] ${message}${colors.reset}`);
};

const success = (message) => log(`✅ ${message}`, 'green');
const error = (message) => log(`❌ ${message}`, 'red');
const warning = (message) => log(`⚠️  ${message}`, 'yellow');
const info = (message) => log(`ℹ️  ${message}`, 'cyan');

// HTTP request helper
const makeRequest = (url, options = {}) => {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const timeout = options.timeout || CONFIG.TIMEOUT;
        
        const req = protocol.get(url, { timeout }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.on('error', reject);
    });
};

// Validation functions
const validateDockerServices = async () => {
    info('Validating Docker services...');
    
    try {
        const { stdout } = await execAsync('docker-compose ps --format json');
        const services = stdout.trim().split('\n').map(line => JSON.parse(line));
        
        const expectedServices = [
            'agentsalud-app',
            'redis',
            'nginx',
            'evolution-api'
        ];

        // Note: postgres removed as we're using external Supabase
        
        let allRunning = true;
        
        for (const serviceName of expectedServices) {
            const service = services.find(s => s.Service === serviceName);
            if (service && service.State === 'running') {
                success(`${serviceName} is running`);
            } else {
                error(`${serviceName} is not running or not found`);
                allRunning = false;
            }
        }
        
        return allRunning;
    } catch (err) {
        error(`Failed to check Docker services: ${err.message}`);
        return false;
    }
};

const validateSupabase = async () => {
    info('Validating Supabase connection...');

    try {
        // Check if Supabase environment variables are set
        const { stdout } = await execAsync('docker-compose exec -T agentsalud-app env | grep SUPABASE');

        if (stdout.includes('NEXT_PUBLIC_SUPABASE_URL') && stdout.includes('SUPABASE_SERVICE_ROLE_KEY')) {
            success('Supabase environment variables are configured');

            // Test Supabase connection via application health check
            const response = await makeRequest(`${CONFIG.LOCAL_APP_URL}/api/health`);
            if (response.statusCode === 200 && response.data.includes('database')) {
                success('Supabase connection is working');
                return true;
            } else {
                warning('Supabase connection may have issues');
                return false;
            }
        } else {
            error('Supabase environment variables are missing');
            return false;
        }
    } catch (err) {
        error(`Supabase validation failed: ${err.message}`);
        return false;
    }
};

const validateRedis = async () => {
    info('Validating Redis connection...');
    
    try {
        const { stdout } = await execAsync('docker-compose exec -T redis redis-cli ping');
        if (stdout.trim() === 'PONG') {
            success('Redis is responding');
            return true;
        } else {
            error('Redis is not responding');
            return false;
        }
    } catch (err) {
        error(`Redis validation failed: ${err.message}`);
        return false;
    }
};

const validateApplicationHealth = async () => {
    info('Validating application health...');
    
    try {
        const response = await makeRequest(`${CONFIG.LOCAL_APP_URL}/api/health`);
        
        if (response.statusCode === 200) {
            success('Application health check passed');
            return true;
        } else {
            error(`Application health check failed with status: ${response.statusCode}`);
            return false;
        }
    } catch (err) {
        error(`Application health check failed: ${err.message}`);
        return false;
    }
};

const validateEvolutionAPI = async () => {
    info('Validating Evolution API...');
    
    try {
        const response = await makeRequest(`${CONFIG.LOCAL_EVOLUTION_URL}/manager/status`);
        
        if (response.statusCode === 200) {
            success('Evolution API is responding');
            return true;
        } else {
            error(`Evolution API failed with status: ${response.statusCode}`);
            return false;
        }
    } catch (err) {
        error(`Evolution API validation failed: ${err.message}`);
        return false;
    }
};

const validateSSL = async () => {
    info('Validating SSL certificates...');
    
    try {
        // Check main domain
        const mainResponse = await makeRequest(CONFIG.APP_URL);
        if (mainResponse.statusCode < 400) {
            success('Main domain SSL is working');
        } else {
            warning('Main domain SSL may have issues');
        }
        
        // Check Evolution API domain
        const evolutionResponse = await makeRequest(CONFIG.EVOLUTION_URL);
        if (evolutionResponse.statusCode < 400) {
            success('Evolution API SSL is working');
        } else {
            warning('Evolution API SSL may have issues');
        }
        
        return true;
    } catch (err) {
        warning(`SSL validation failed: ${err.message}`);
        return false;
    }
};

const validateEnvironmentVariables = async () => {
    info('Validating environment variables...');
    
    const requiredVars = [
        'NODE_ENV',
        'NEXTAUTH_SECRET',
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'OPENAI_API_KEY',
        'EVOLUTION_API_KEY'
    ];
    
    try {
        const { stdout } = await execAsync('docker-compose exec -T agentsalud-app env');
        const envVars = stdout.split('\n').reduce((acc, line) => {
            const [key, value] = line.split('=');
            if (key && value) acc[key] = value;
            return acc;
        }, {});
        
        let allPresent = true;
        
        for (const varName of requiredVars) {
            if (envVars[varName]) {
                success(`${varName} is configured`);
            } else {
                error(`${varName} is missing`);
                allPresent = false;
            }
        }
        
        return allPresent;
    } catch (err) {
        error(`Environment validation failed: ${err.message}`);
        return false;
    }
};

const validatePerformance = async () => {
    info('Validating performance metrics...');
    
    try {
        const startTime = Date.now();
        const response = await makeRequest(`${CONFIG.LOCAL_APP_URL}/api/health`);
        const responseTime = Date.now() - startTime;
        
        if (responseTime < 1000) {
            success(`Response time: ${responseTime}ms (Good)`);
        } else if (responseTime < 3000) {
            warning(`Response time: ${responseTime}ms (Acceptable)`);
        } else {
            error(`Response time: ${responseTime}ms (Too slow)`);
        }
        
        return responseTime < 3000;
    } catch (err) {
        error(`Performance validation failed: ${err.message}`);
        return false;
    }
};

const validateBackupConfiguration = async () => {
    info('Validating backup configuration...');
    
    try {
        // Check if backup directory exists
        const { stdout } = await execAsync('ls -la backups/');
        success('Backup directory exists');
        
        // Check if backup script exists
        const { stdout: scriptCheck } = await execAsync('ls -la scripts/backup-*.sh');
        if (scriptCheck) {
            success('Backup scripts are present');
        } else {
            warning('Backup scripts not found');
        }
        
        return true;
    } catch (err) {
        warning(`Backup validation failed: ${err.message}`);
        return false;
    }
};

const validateSecurityHeaders = async () => {
    info('Validating security headers...');
    
    try {
        const response = await makeRequest(CONFIG.LOCAL_APP_URL);
        const headers = response.headers;
        
        const securityHeaders = [
            'x-frame-options',
            'x-content-type-options',
            'x-xss-protection',
            'strict-transport-security'
        ];
        
        let allPresent = true;
        
        for (const header of securityHeaders) {
            if (headers[header]) {
                success(`${header} header is present`);
            } else {
                warning(`${header} header is missing`);
                allPresent = false;
            }
        }
        
        return allPresent;
    } catch (err) {
        error(`Security headers validation failed: ${err.message}`);
        return false;
    }
};

// Main validation function
const runValidation = async () => {
    log('🚀 Starting Coolify deployment validation...', 'magenta');
    console.log('='.repeat(60));
    
    const validations = [
        { name: 'Docker Services', fn: validateDockerServices },
        { name: 'Supabase Connection', fn: validateSupabase },
        { name: 'Redis Connection', fn: validateRedis },
        { name: 'Application Health', fn: validateApplicationHealth },
        { name: 'Evolution API', fn: validateEvolutionAPI },
        { name: 'Environment Variables', fn: validateEnvironmentVariables },
        { name: 'Performance', fn: validatePerformance },
        { name: 'Security Headers', fn: validateSecurityHeaders },
        { name: 'SSL Certificates', fn: validateSSL },
        { name: 'Backup Configuration', fn: validateBackupConfiguration }
    ];
    
    const results = [];
    
    for (const validation of validations) {
        console.log('\n' + '-'.repeat(40));
        try {
            const result = await validation.fn();
            results.push({ name: validation.name, passed: result });
        } catch (err) {
            error(`${validation.name} validation threw an error: ${err.message}`);
            results.push({ name: validation.name, passed: false });
        }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    log('📊 VALIDATION SUMMARY', 'magenta');
    console.log('='.repeat(60));
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    results.forEach(result => {
        if (result.passed) {
            success(result.name);
        } else {
            error(result.name);
        }
    });
    
    console.log('\n' + '-'.repeat(40));
    
    if (passed === total) {
        success(`🎉 All validations passed! (${passed}/${total})`);
        success('✅ Coolify deployment is ready for production!');
    } else if (passed >= total * 0.8) {
        warning(`⚠️  Most validations passed (${passed}/${total})`);
        warning('🔧 Some issues need attention before production');
    } else {
        error(`❌ Multiple validations failed (${passed}/${total})`);
        error('🚨 Deployment needs significant fixes before production');
    }
    
    console.log('='.repeat(60));
    
    return passed === total;
};

// Run validation if called directly
if (require.main === module) {
    runValidation()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(err => {
            error(`Validation script failed: ${err.message}`);
            process.exit(1);
        });
}

module.exports = { runValidation };
