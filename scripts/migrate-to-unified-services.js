#!/usr/bin/env node

/**
 * Migration Script: Unified WhatsApp Services
 * 
 * Migrates existing components to use the new unified services
 * and ensures backward compatibility during the transition.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

const fs = require('fs');
const path = require('path');

// =====================================================
// CONFIGURATION
// =====================================================

const MIGRATION_CONFIG = {
  srcDir: path.join(process.cwd(), 'src'),
  backupDir: path.join(process.cwd(), 'backup-before-migration'),
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose')
};

// Files to migrate
const MIGRATION_TARGETS = [
  {
    file: 'src/components/channels/QRCodeDisplay.tsx',
    action: 'replace_with_unified',
    backup: true
  },
  {
    file: 'src/hooks/useQRCodeAutoRefresh.ts',
    action: 'deprecate_and_redirect',
    backup: true
  },
  {
    file: 'src/components/channels/ChannelInstanceCard.tsx',
    action: 'update_imports',
    backup: true
  },
  {
    file: 'src/components/channels/SimplifiedWhatsAppCreationModal.tsx',
    action: 'update_imports',
    backup: true
  }
];

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Log with timestamp and level
 */
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = {
    'INFO': '📋',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARNING': '⚠️',
    'MIGRATE': '🔄'
  }[level] || '📋';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

/**
 * Create backup directory if it doesn't exist
 */
function ensureBackupDir() {
  if (!fs.existsSync(MIGRATION_CONFIG.backupDir)) {
    fs.mkdirSync(MIGRATION_CONFIG.backupDir, { recursive: true });
    log(`Created backup directory: ${MIGRATION_CONFIG.backupDir}`, 'INFO');
  }
}

/**
 * Backup a file before migration
 */
function backupFile(filePath) {
  if (!fs.existsSync(filePath)) {
    log(`File not found for backup: ${filePath}`, 'WARNING');
    return false;
  }

  const relativePath = path.relative(process.cwd(), filePath);
  const backupPath = path.join(MIGRATION_CONFIG.backupDir, relativePath);
  const backupDir = path.dirname(backupPath);

  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Copy file to backup
  fs.copyFileSync(filePath, backupPath);
  log(`Backed up: ${relativePath} → ${path.relative(process.cwd(), backupPath)}`, 'INFO');
  return true;
}

/**
 * Read file content safely
 */
function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    log(`Failed to read file ${filePath}: ${error.message}`, 'ERROR');
    return null;
  }
}

/**
 * Write file content safely
 */
function writeFileContent(filePath, content) {
  try {
    if (MIGRATION_CONFIG.dryRun) {
      log(`[DRY RUN] Would write to: ${filePath}`, 'INFO');
      return true;
    }

    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    log(`Failed to write file ${filePath}: ${error.message}`, 'ERROR');
    return false;
  }
}

// =====================================================
// MIGRATION ACTIONS
// =====================================================

/**
 * Replace QRCodeDisplay with UnifiedQRCodeDisplay
 */
function replaceWithUnified(filePath) {
  log(`Replacing with unified component: ${filePath}`, 'MIGRATE');

  const content = readFileContent(filePath);
  if (!content) return false;

  // Create a compatibility wrapper that uses the new unified component
  const unifiedWrapper = `/**
 * QRCodeDisplay - Compatibility Wrapper
 * 
 * This is a compatibility wrapper that uses the new UnifiedQRCodeDisplay
 * component while maintaining the same API for existing code.
 * 
 * @deprecated Use UnifiedQRCodeDisplay directly for new code
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React from 'react';
import { UnifiedQRCodeDisplay } from './UnifiedQRCodeDisplay';

// =====================================================
// COMPATIBILITY WRAPPER
// =====================================================

interface QRCodeDisplayProps {
  instanceId: string;
  instanceName: string;
  status?: string;
  refreshInterval?: number;
  onConnected?: () => void;
  onError?: (error: string) => void;
  isSimpleInstance?: boolean;
  size?: number;
  className?: string;
}

/**
 * @deprecated Use UnifiedQRCodeDisplay directly
 */
export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  instanceId,
  instanceName,
  status,
  refreshInterval = 30,
  onConnected,
  onError,
  isSimpleInstance = false,
  size = 256,
  className = ''
}) => {
  // Log deprecation warning in development
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '⚠️ QRCodeDisplay is deprecated. Use UnifiedQRCodeDisplay directly for better performance and features.'
    );
  }

  return (
    <UnifiedQRCodeDisplay
      instanceId={instanceId}
      instanceName={instanceName}
      size={size}
      className={className}
      showRefreshButton={true}
      showStatusIndicator={true}
      showTimestamp={false}
      onConnected={onConnected}
      onError={onError}
      autoStart={true}
    />
  );
};

export default QRCodeDisplay;
`;

  return writeFileContent(filePath, unifiedWrapper);
}

/**
 * Deprecate and redirect hook to new unified hook
 */
function deprecateAndRedirect(filePath) {
  log(`Deprecating and redirecting hook: ${filePath}`, 'MIGRATE');

  const deprecatedHook = `/**
 * useQRCodeAutoRefresh - Deprecated Hook
 * 
 * This hook is deprecated. Use useUnifiedQRCodeStream instead.
 * 
 * @deprecated Use useUnifiedQRCodeStream for better performance and features
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { useUnifiedQRCodeStream } from './useUnifiedQRCodeStream';

/**
 * @deprecated Use useUnifiedQRCodeStream instead
 */
export function useQRCodeAutoRefresh(
  instanceId: string,
  instanceName: string,
  options: any = {}
) {
  // Log deprecation warning in development
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '⚠️ useQRCodeAutoRefresh is deprecated. Use useUnifiedQRCodeStream for better performance and features.'
    );
  }

  // Redirect to new unified hook with compatibility mapping
  const {
    qrData,
    connectionStatus,
    isLoading,
    error,
    isConnected,
    refreshQRCode
  } = useUnifiedQRCodeStream(instanceId, instanceName, {
    autoStart: options.autoRefresh !== false,
    enableStateSync: true,
    onConnected: options.onConnected,
    onError: options.onError,
    onQRUpdate: options.onQRUpdate
  });

  // Return data in the old format for compatibility
  return {
    qrData: qrData ? {
      qrCode: qrData.qrCode,
      expiresAt: qrData.expiresAt,
      timestamp: qrData.timestamp,
      status: isConnected ? 'connected' : 'available'
    } : null,
    isLoading,
    error,
    isConnected,
    refreshQRCode,
    // Legacy properties for backward compatibility
    retryCount: 0,
    lastRefresh: qrData?.timestamp ? new Date(qrData.timestamp).getTime() : 0
  };
}

export default useQRCodeAutoRefresh;
`;

  return writeFileContent(filePath, deprecatedHook);
}

/**
 * Update imports in existing components
 */
function updateImports(filePath) {
  log(`Updating imports in: ${filePath}`, 'MIGRATE');

  const content = readFileContent(filePath);
  if (!content) return false;

  let updatedContent = content;

  // Update QRCodeDisplay import to use compatibility wrapper
  updatedContent = updatedContent.replace(
    /import\s+{\s*QRCodeDisplay\s*}\s+from\s+['"][^'"]*QRCodeDisplay['"];?/g,
    "import { QRCodeDisplay } from './QRCodeDisplay'; // Using compatibility wrapper"
  );

  // Update useQRCodeAutoRefresh import
  updatedContent = updatedContent.replace(
    /import\s+{\s*useQRCodeAutoRefresh\s*}\s+from\s+['"][^'"]*useQRCodeAutoRefresh['"];?/g,
    "import { useQRCodeAutoRefresh } from '../hooks/useQRCodeAutoRefresh'; // Using compatibility wrapper"
  );

  // Add comment about migration
  if (updatedContent !== content) {
    const migrationComment = `/**
 * MIGRATION NOTE: This file has been updated to use compatibility wrappers
 * for the new unified WhatsApp services. Consider migrating to the new APIs:
 * - QRCodeDisplay → UnifiedQRCodeDisplay
 * - useQRCodeAutoRefresh → useUnifiedQRCodeStream
 */

`;
    updatedContent = migrationComment + updatedContent;
  }

  return writeFileContent(filePath, updatedContent);
}

// =====================================================
// MIGRATION EXECUTION
// =====================================================

/**
 * Execute migration for a single target
 */
function migrateTarget(target) {
  const filePath = path.join(process.cwd(), target.file);
  
  log(`Processing: ${target.file}`, 'MIGRATE');

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    log(`File not found: ${target.file}`, 'WARNING');
    return false;
  }

  // Backup if requested
  if (target.backup && !MIGRATION_CONFIG.dryRun) {
    if (!backupFile(filePath)) {
      log(`Failed to backup ${target.file}, skipping migration`, 'ERROR');
      return false;
    }
  }

  // Execute migration action
  let success = false;
  switch (target.action) {
    case 'replace_with_unified':
      success = replaceWithUnified(filePath);
      break;
    case 'deprecate_and_redirect':
      success = deprecateAndRedirect(filePath);
      break;
    case 'update_imports':
      success = updateImports(filePath);
      break;
    default:
      log(`Unknown migration action: ${target.action}`, 'ERROR');
      return false;
  }

  if (success) {
    log(`Successfully migrated: ${target.file}`, 'SUCCESS');
  } else {
    log(`Failed to migrate: ${target.file}`, 'ERROR');
  }

  return success;
}

/**
 * Run the complete migration
 */
function runMigration() {
  log('🚀 Starting WhatsApp Services Migration', 'INFO');
  
  if (MIGRATION_CONFIG.dryRun) {
    log('Running in DRY RUN mode - no files will be modified', 'WARNING');
  }

  // Ensure backup directory exists
  if (!MIGRATION_CONFIG.dryRun) {
    ensureBackupDir();
  }

  let successCount = 0;
  let totalCount = MIGRATION_TARGETS.length;

  // Process each migration target
  for (const target of MIGRATION_TARGETS) {
    if (migrateTarget(target)) {
      successCount++;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Files: ${totalCount}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${totalCount - successCount}`);
  
  if (MIGRATION_CONFIG.dryRun) {
    console.log('\n⚠️ This was a DRY RUN - no files were actually modified');
    console.log('Run without --dry-run to perform the actual migration');
  } else {
    console.log(`\n📁 Backups stored in: ${MIGRATION_CONFIG.backupDir}`);
  }
  
  console.log('='.repeat(60));

  // Exit with appropriate code
  process.exit(successCount === totalCount ? 0 : 1);
}

// =====================================================
// SCRIPT EXECUTION
// =====================================================

if (require.main === module) {
  runMigration();
}

module.exports = {
  runMigration,
  migrateTarget,
  MIGRATION_TARGETS
};
