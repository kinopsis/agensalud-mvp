/**
 * WhatsApp State Resolver Admin Page
 * 
 * Admin page for diagnosing and resolving WhatsApp state inconsistencies.
 * Only accessible to admin and superadmin users.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import WhatsAppStateResolver from '@/components/admin/WhatsAppStateResolver';

// =====================================================
// METADATA
// =====================================================

export const metadata: Metadata = {
  title: 'WhatsApp State Resolver | AgentSalud Admin',
  description: 'Diagnose and resolve WhatsApp state inconsistencies between Evolution API and database',
};

// =====================================================
// PAGE COMPONENT
// =====================================================

export default async function WhatsAppStateResolverPage() {
  // =====================================================
  // AUTHENTICATION & AUTHORIZATION
  // =====================================================

  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/auth/login?redirect=/admin/whatsapp-state-resolver');
  }

  // Get user profile and verify admin access
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, first_name, last_name, organization_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    redirect('/auth/login?redirect=/admin/whatsapp-state-resolver');
  }

  // Verify admin or superadmin role
  if (!['admin', 'superadmin'].includes(profile.role)) {
    redirect('/dashboard?error=access_denied');
  }

  // =====================================================
  // RENDER PAGE
  // =====================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🔧 WhatsApp State Resolver
              </h1>
              <p className="text-sm text-gray-600">
                Admin Tools • Resolve state inconsistencies
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                Logged in as: <span className="font-medium">{profile.first_name} {profile.last_name}</span>
              </p>
              <p className="text-xs text-gray-500">
                Role: {profile.role} • Organization: {profile.organization_id}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Warning Banner */}
        <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-yellow-800">
                Admin Tool - Use with Caution
              </h3>
              <p className="text-yellow-700 mt-1">
                This tool resolves state inconsistencies by permanently deleting orphaned instances 
                from the database. Only use this when instances have been manually deleted from 
                Evolution API but still appear in the frontend.
              </p>
              <div className="mt-3">
                <h4 className="font-medium text-yellow-800">When to use this tool:</h4>
                <ul className="list-disc list-inside text-sm text-yellow-700 mt-1 space-y-1">
                  <li>WhatsApp instances appear in frontend but don't exist in Evolution API</li>
                  <li>Cannot delete instances through normal UI (shows "instance not found" errors)</li>
                  <li>After manual deletion of instances from Evolution API backend</li>
                  <li>State synchronization issues between frontend and backend</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* State Resolver Component */}
        <WhatsAppStateResolver />

        {/* Additional Information */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Troubleshooting Guide */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🔍 Troubleshooting Guide
            </h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <h4 className="font-medium text-gray-900">Problem: Instance shows in frontend but can't be deleted</h4>
                <p>Solution: Use this tool to diagnose and clean up orphaned database records.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Problem: "Instance not found" errors</h4>
                <p>Solution: The instance exists in database but not in Evolution API. Clean up needed.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Problem: State sync issues</h4>
                <p>Solution: Run diagnosis to identify and resolve state inconsistencies.</p>
              </div>
            </div>
          </div>

          {/* Best Practices */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ✅ Best Practices
            </h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <h4 className="font-medium text-gray-900">Before using this tool:</h4>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Try deleting the instance through normal UI first</li>
                  <li>Verify the instance doesn't exist in Evolution API</li>
                  <li>Check if other admins are working on the same instance</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">After cleanup:</h4>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Refresh your browser to see updated state</li>
                  <li>Verify the instance no longer appears in frontend</li>
                  <li>Test creating new instances to ensure functionality</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Support Information */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">
            📞 Need Help?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-blue-900">Technical Support</h4>
              <p className="text-blue-700">
                If you encounter issues or need assistance, contact the development team.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-blue-900">Documentation</h4>
              <p className="text-blue-700">
                Refer to the WhatsApp integration documentation for detailed procedures.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-blue-900">Emergency</h4>
              <p className="text-blue-700">
                For critical issues affecting multiple organizations, escalate immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
