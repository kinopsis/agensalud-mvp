#!/usr/bin/env node

/**
 * Test the corrected fix script on a single route to verify proper placement
 */

const fs = require('fs');

// Test on a single route first
const testRoute = 'src/app/api/dashboard/admin/activity/route.ts';

console.log('🧪 Testing corrected fix script on single route...');

function addDynamicConfig(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if dynamic config already exists
    if (content.includes('export const dynamic')) {
      console.log(`✅ Already configured: ${filePath}`);
      return true;
    }

    const lines = content.split('\n');
    let insertIndex = -1;
    let lastImportIndex = -1;
    
    // Find the last import statement
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('import ')) {
        lastImportIndex = i;
      }
    }
    
    // If we found imports, insert after the last import
    if (lastImportIndex !== -1) {
      insertIndex = lastImportIndex + 1;
    } else {
      // If no imports, find the first non-comment, non-empty line
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines and comments at the top
        if (line === '' || 
            line.startsWith('//') || 
            line.startsWith('/*') || 
            line.startsWith('*') || 
            line.startsWith('*/') ||
            line.startsWith('/**')) {
          continue;
        }
        
        // Insert before the first actual code
        insertIndex = i;
        break;
      }
    }
    
    // Fallback: insert at the beginning if we couldn't find a good spot
    if (insertIndex === -1) {
      insertIndex = 0;
    }

    // Insert the dynamic configuration with proper spacing
    const dynamicConfig = [
      '',
      '// Force dynamic rendering to prevent static generation errors',
      "export const dynamic = 'force-dynamic';",
      'export const revalidate = 0;',
      ''
    ];

    console.log(`📍 Will insert at line ${insertIndex + 1} (after line: "${lines[insertIndex - 1]?.trim() || 'start of file'}")`);
    console.log(`📍 Before line: "${lines[insertIndex]?.trim() || 'end of file'}"`);

    // Insert the lines
    lines.splice(insertIndex, 0, ...dynamicConfig);
    const newContent = lines.join('\n');
    
    // Create backup
    const backupPath = filePath + '.backup-test';
    fs.writeFileSync(backupPath, content);
    
    // Write the updated content
    fs.writeFileSync(filePath, newContent);
    
    console.log(`✅ Fixed: ${filePath} (inserted at line ${insertIndex + 1})`);
    
    // Show the result around the insertion point
    console.log('\n📋 Result preview:');
    const resultLines = newContent.split('\n');
    const start = Math.max(0, insertIndex - 2);
    const end = Math.min(resultLines.length, insertIndex + 8);
    
    for (let i = start; i < end; i++) {
      const marker = (i >= insertIndex && i < insertIndex + 5) ? '>>> ' : '    ';
      console.log(`${marker}${i + 1}: ${resultLines[i]}`);
    }
    
    return true;
    
  } catch (error) {
    console.log(`❌ Error fixing ${filePath}: ${error.message}`);
    return false;
  }
}

// Test the function
if (addDynamicConfig(testRoute)) {
  console.log('\n🎉 Test successful! The fix script works correctly.');
  console.log('💡 You can now run the full fix script on all routes.');
} else {
  console.log('\n❌ Test failed! Please check the fix script logic.');
}
