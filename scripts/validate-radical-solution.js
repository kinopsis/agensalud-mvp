/**
 * WhatsApp Radical Solution Validation Script
 * 
 * Validates that all components of the radical solution are properly
 * implemented and meet the acceptance criteria.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

const fs = require('fs');
const path = require('path');

// =====================================================
// VALIDATION CRITERIA
// =====================================================

const RADICAL_SOLUTION_CRITERIA = {
  // Core Components
  components: [
    'src/components/channels/QuickCreateWhatsAppButton.tsx',
    'src/components/channels/WhatsAppConnectView.tsx',
    'src/app/(dashboard)/admin/channels/whatsapp/[id]/connect/page.tsx'
  ],
  
  // API Endpoints
  endpoints: [
    'src/app/api/channels/whatsapp/instances/quick-create/route.ts'
  ],
  
  // Performance & Monitoring
  performance: [
    'src/lib/services/EvolutionAPIConnectionPool.ts',
    'src/lib/services/WhatsAppPerformanceMetrics.ts',
    'src/components/error-boundaries/WhatsAppErrorBoundary.tsx'
  ],
  
  // Tests
  tests: [
    'tests/components/QuickCreateWhatsAppButton.test.tsx',
    'tests/integration/whatsapp-radical-solution.test.tsx'
  ]
};

const ACCEPTANCE_CRITERIA = {
  singleClickCreation: {
    description: 'Single-click WhatsApp instance creation',
    files: ['QuickCreateWhatsAppButton.tsx', 'quick-create/route.ts'],
    keywords: ['auto-naming', 'single-click', 'quick-create']
  },
  
  qrGeneration: {
    description: 'QR code generation under 5 seconds',
    files: ['WhatsAppConnectView.tsx', 'UnifiedQRCodeDisplay.tsx'],
    keywords: ['5 seconds', 'timeout', 'qr-generation']
  },
  
  streamlinedUX: {
    description: 'Streamlined user experience',
    files: ['ChannelDashboard.tsx', 'WhatsAppConnectView.tsx'],
    keywords: ['streamlined', 'radical solution', 'navigation']
  },
  
  performanceOptimization: {
    description: 'Performance optimization with connection pooling',
    files: ['EvolutionAPIConnectionPool.ts', 'WhatsAppPerformanceMetrics.ts'],
    keywords: ['connection pooling', 'performance', 'metrics']
  },
  
  errorHandling: {
    description: 'Comprehensive error handling and fallbacks',
    files: ['WhatsAppErrorBoundary.tsx', 'WhatsAppMonitoringService.ts'],
    keywords: ['error boundary', 'fallback', 'circuit breaker']
  }
};

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

/**
 * Check if a file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

/**
 * Read file content
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

/**
 * Check if file contains specific keywords
 */
function containsKeywords(content, keywords) {
  if (!content) return false;
  
  return keywords.some(keyword => 
    content.toLowerCase().includes(keyword.toLowerCase())
  );
}

/**
 * Validate file structure and content
 */
function validateFiles(fileList, category) {
  console.log(`\n📁 Validating ${category}:`);
  
  const results = {
    total: fileList.length,
    existing: 0,
    missing: []
  };
  
  fileList.forEach(filePath => {
    const exists = fileExists(filePath);
    
    if (exists) {
      results.existing++;
      console.log(`  ✅ ${filePath}`);
    } else {
      results.missing.push(filePath);
      console.log(`  ❌ ${filePath} - MISSING`);
    }
  });
  
  return results;
}

/**
 * Validate acceptance criteria
 */
function validateAcceptanceCriteria() {
  console.log('\n🎯 Validating Acceptance Criteria:');
  
  const results = {};
  
  Object.entries(ACCEPTANCE_CRITERIA).forEach(([key, criteria]) => {
    console.log(`\n  📋 ${criteria.description}:`);
    
    const criteriaResults = {
      description: criteria.description,
      filesFound: 0,
      keywordsFound: 0,
      details: []
    };
    
    criteria.files.forEach(fileName => {
      // Find files that match the pattern
      const matchingFiles = [
        ...RADICAL_SOLUTION_CRITERIA.components,
        ...RADICAL_SOLUTION_CRITERIA.endpoints,
        ...RADICAL_SOLUTION_CRITERIA.performance,
        ...RADICAL_SOLUTION_CRITERIA.tests
      ].filter(filePath => filePath.includes(fileName));
      
      matchingFiles.forEach(filePath => {
        if (fileExists(filePath)) {
          criteriaResults.filesFound++;
          
          const content = readFile(filePath);
          const hasKeywords = containsKeywords(content, criteria.keywords);
          
          if (hasKeywords) {
            criteriaResults.keywordsFound++;
            console.log(`    ✅ ${fileName} - Keywords found`);
          } else {
            console.log(`    ⚠️  ${fileName} - Keywords missing`);
          }
          
          criteriaResults.details.push({
            file: fileName,
            exists: true,
            hasKeywords
          });
        } else {
          console.log(`    ❌ ${fileName} - File missing`);
          criteriaResults.details.push({
            file: fileName,
            exists: false,
            hasKeywords: false
          });
        }
      });
    });
    
    results[key] = criteriaResults;
  });
  
  return results;
}

/**
 * Generate validation report
 */
function generateReport(componentResults, endpointResults, performanceResults, testResults, criteriaResults) {
  console.log('\n📊 VALIDATION REPORT:');
  console.log('='.repeat(50));
  
  // File existence summary
  const totalFiles = componentResults.total + endpointResults.total + performanceResults.total + testResults.total;
  const existingFiles = componentResults.existing + endpointResults.existing + performanceResults.existing + testResults.existing;
  const completionRate = ((existingFiles / totalFiles) * 100).toFixed(1);
  
  console.log(`\n📈 File Implementation Status:`);
  console.log(`  Total Files: ${totalFiles}`);
  console.log(`  Implemented: ${existingFiles}`);
  console.log(`  Completion Rate: ${completionRate}%`);
  
  // Acceptance criteria summary
  console.log(`\n🎯 Acceptance Criteria Status:`);
  Object.entries(criteriaResults).forEach(([key, result]) => {
    const status = result.keywordsFound > 0 ? '✅' : '❌';
    console.log(`  ${status} ${result.description}`);
    console.log(`     Files: ${result.filesFound}, Keywords: ${result.keywordsFound}`);
  });
  
  // Overall assessment
  console.log(`\n🏆 OVERALL ASSESSMENT:`);
  
  if (completionRate >= 90) {
    console.log('  🟢 EXCELLENT - Radical solution is well implemented');
  } else if (completionRate >= 75) {
    console.log('  🟡 GOOD - Most components implemented, minor gaps');
  } else if (completionRate >= 50) {
    console.log('  🟠 PARTIAL - Significant implementation needed');
  } else {
    console.log('  🔴 INCOMPLETE - Major implementation gaps');
  }
  
  // Recommendations
  console.log(`\n💡 RECOMMENDATIONS:`);
  
  if (componentResults.missing.length > 0) {
    console.log(`  • Complete missing components: ${componentResults.missing.length} files`);
  }
  
  if (testResults.missing.length > 0) {
    console.log(`  • Implement missing tests: ${testResults.missing.length} files`);
  }
  
  const criteriaWithIssues = Object.values(criteriaResults).filter(r => r.keywordsFound === 0);
  if (criteriaWithIssues.length > 0) {
    console.log(`  • Address acceptance criteria gaps: ${criteriaWithIssues.length} criteria`);
  }
  
  console.log(`\n✨ Radical Solution Validation Complete!`);
  
  return {
    completionRate: parseFloat(completionRate),
    totalFiles,
    existingFiles,
    criteriaResults,
    recommendations: {
      missingComponents: componentResults.missing,
      missingTests: testResults.missing,
      criteriaGaps: criteriaWithIssues.map(r => r.description)
    }
  };
}

// =====================================================
// MAIN VALIDATION
// =====================================================

function main() {
  console.log('🚀 WhatsApp Radical Solution Validation');
  console.log('='.repeat(50));
  
  // Validate file categories
  const componentResults = validateFiles(RADICAL_SOLUTION_CRITERIA.components, 'Core Components');
  const endpointResults = validateFiles(RADICAL_SOLUTION_CRITERIA.endpoints, 'API Endpoints');
  const performanceResults = validateFiles(RADICAL_SOLUTION_CRITERIA.performance, 'Performance & Monitoring');
  const testResults = validateFiles(RADICAL_SOLUTION_CRITERIA.tests, 'Tests');
  
  // Validate acceptance criteria
  const criteriaResults = validateAcceptanceCriteria();
  
  // Generate final report
  const report = generateReport(
    componentResults,
    endpointResults,
    performanceResults,
    testResults,
    criteriaResults
  );
  
  // Exit with appropriate code
  process.exit(report.completionRate >= 80 ? 0 : 1);
}

// Run validation
if (require.main === module) {
  main();
}

module.exports = {
  validateFiles,
  validateAcceptanceCriteria,
  generateReport,
  RADICAL_SOLUTION_CRITERIA,
  ACCEPTANCE_CRITERIA
};
