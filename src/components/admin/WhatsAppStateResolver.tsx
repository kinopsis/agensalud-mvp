/**
 * WhatsApp State Resolver Component
 * 
 * Admin interface for diagnosing and resolving WhatsApp state inconsistencies
 * between Evolution API and local database.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { useState, useCallback } from 'react';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface OrphanedInstance {
  type: 'channel_instances' | 'whatsapp_instances';
  id: string;
  instanceName: string;
  status: string;
  organizationId: string;
  createdAt: string;
  evolutionError?: string;
}

interface ResolutionResult {
  success: boolean;
  diagnosed: number;
  orphanedInstances: OrphanedInstance[];
  cleanedUp: number;
  errors: string[];
  message: string;
}

interface ResolverState {
  isLoading: boolean;
  lastDiagnosis: ResolutionResult | null;
  error: string | null;
  showConfirmDialog: boolean;
}

// =====================================================
// WHATSAPP STATE RESOLVER COMPONENT
// =====================================================

export const WhatsAppStateResolver: React.FC = () => {
  const [state, setState] = useState<ResolverState>({
    isLoading: false,
    lastDiagnosis: null,
    error: null,
    showConfirmDialog: false
  });

  // =====================================================
  // API FUNCTIONS
  // =====================================================

  /**
   * Diagnose state inconsistencies
   */
  const diagnoseInconsistencies = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/admin/whatsapp/resolve-state-inconsistency', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ResolutionResult = await response.json();

      setState(prev => ({
        ...prev,
        lastDiagnosis: result,
        isLoading: false,
        error: result.success ? null : result.message
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
    }
  }, []);

  /**
   * Resolve inconsistencies (cleanup orphaned instances)
   */
  const resolveInconsistencies = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null, showConfirmDialog: false }));

    try {
      const response = await fetch('/api/admin/whatsapp/resolve-state-inconsistency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cleanup',
          forceCleanup: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ResolutionResult = await response.json();

      setState(prev => ({
        ...prev,
        lastDiagnosis: result,
        isLoading: false,
        error: result.success ? null : result.message
      }));

      // Auto-diagnose after cleanup to refresh state
      if (result.success && result.cleanedUp > 0) {
        setTimeout(() => {
          diagnoseInconsistencies();
        }, 2000);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
    }
  }, [diagnoseInconsistencies]);

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  const handleDiagnose = useCallback(() => {
    diagnoseInconsistencies();
  }, [diagnoseInconsistencies]);

  const handleResolve = useCallback(() => {
    setState(prev => ({ ...prev, showConfirmDialog: true }));
  }, []);

  const handleConfirmResolve = useCallback(() => {
    resolveInconsistencies();
  }, [resolveInconsistencies]);

  const handleCancelResolve = useCallback(() => {
    setState(prev => ({ ...prev, showConfirmDialog: false }));
  }, []);

  // =====================================================
  // RENDER HELPERS
  // =====================================================

  /**
   * Render diagnosis results
   */
  const renderDiagnosisResults = () => {
    if (!state.lastDiagnosis) return null;

    const { diagnosed, orphanedInstances, cleanedUp, errors, message } = state.lastDiagnosis;

    return (
      <div className="mt-6 space-y-4">
        {/* Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">📊 Diagnosis Results</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Total Instances:</span>
              <div className="text-xl font-bold text-blue-600">{diagnosed}</div>
            </div>
            <div>
              <span className="font-medium text-gray-600">Orphaned:</span>
              <div className={`text-xl font-bold ${orphanedInstances.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {orphanedInstances.length}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-600">Cleaned Up:</span>
              <div className="text-xl font-bold text-green-600">{cleanedUp}</div>
            </div>
            <div>
              <span className="font-medium text-gray-600">Errors:</span>
              <div className={`text-xl font-bold ${errors.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {errors.length}
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-700">{message}</p>
        </div>

        {/* Orphaned Instances */}
        {orphanedInstances.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-red-800 mb-3">🚨 Orphaned Instances</h3>
            <div className="space-y-3">
              {orphanedInstances.map((instance, index) => (
                <div key={instance.id} className="bg-white border border-red-200 rounded p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{instance.instanceName}</h4>
                      <p className="text-sm text-gray-600">ID: {instance.id}</p>
                      <p className="text-sm text-gray-600">Type: {instance.type}</p>
                      <p className="text-sm text-gray-600">Status: {instance.status}</p>
                      <p className="text-sm text-gray-600">Created: {new Date(instance.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                        Not in Evolution API
                      </span>
                      {instance.evolutionError && (
                        <p className="text-xs text-red-600 mt-1 max-w-xs">
                          {instance.evolutionError}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-800 mb-3">⚠️ Errors</h3>
            <ul className="space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-sm text-yellow-700">
                  • {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Success Message */}
        {cleanedUp > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-800 mb-2">✅ Cleanup Successful</h3>
            <p className="text-sm text-green-700">
              Successfully cleaned up {cleanedUp} orphaned instance{cleanedUp !== 1 ? 's' : ''}.
              The frontend should now reflect the correct state.
            </p>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render confirmation dialog
   */
  const renderConfirmDialog = () => {
    if (!state.showConfirmDialog || !state.lastDiagnosis) return null;

    const orphanedCount = state.lastDiagnosis.orphanedInstances.length;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🚨 Confirm State Resolution
          </h3>
          <p className="text-gray-700 mb-4">
            This will permanently delete {orphanedCount} orphaned instance{orphanedCount !== 1 ? 's' : ''} 
            from the database. This action cannot be undone.
          </p>
          <p className="text-sm text-gray-600 mb-6">
            The instances will be removed from the local database since they no longer exist 
            in Evolution API. This will resolve the state inconsistency.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleCancelResolve}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmResolve}
              className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700"
            >
              Delete {orphanedCount} Instance{orphanedCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          🔧 WhatsApp State Resolver
        </h1>
        <p className="text-gray-600">
          Diagnose and resolve inconsistencies between Evolution API and local database.
        </p>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-2">❌ Error</h3>
          <p className="text-red-700">{state.error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={handleDiagnose}
          disabled={state.isLoading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {state.isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Diagnosing...
            </>
          ) : (
            <>
              🔍 Diagnose State
            </>
          )}
        </button>

        {state.lastDiagnosis && state.lastDiagnosis.orphanedInstances.length > 0 && (
          <button
            onClick={handleResolve}
            disabled={state.isLoading}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔧 Resolve Inconsistencies
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">📋 Instructions</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          <li>Click "Diagnose State" to check for inconsistencies between Evolution API and database</li>
          <li>Review any orphaned instances that exist in database but not in Evolution API</li>
          <li>Click "Resolve Inconsistencies" to clean up orphaned instances</li>
          <li>Refresh your browser to see the updated state in the frontend</li>
        </ol>
      </div>

      {/* Results */}
      {renderDiagnosisResults()}

      {/* Confirmation Dialog */}
      {renderConfirmDialog()}
    </div>
  );
};

export default WhatsAppStateResolver;
