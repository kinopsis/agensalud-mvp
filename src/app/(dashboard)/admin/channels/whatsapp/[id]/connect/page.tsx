/**
 * WhatsApp Connect Page
 * 
 * Dedicated page for connecting WhatsApp instances via QR code.
 * Part of the radical solution implementation with streamlined UX.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { WhatsAppConnectView } from '@/components/channels/WhatsAppConnectView';
import { createClient } from '@/lib/supabase/server';

// =====================================================
// TYPES
// =====================================================

interface PageProps {
  params: {
    id: string;
  };
}

// =====================================================
// METADATA
// =====================================================

export const metadata: Metadata = {
  title: 'Conectar WhatsApp - AgentSalud',
  description: 'Conecta tu instancia de WhatsApp escaneando el código QR',
};

// =====================================================
// SERVER COMPONENT
// =====================================================

/**
 * WhatsApp Connect Page Component
 * 
 * @description Server component that validates the instance and renders
 * the connection interface for WhatsApp instances.
 */
export default async function WhatsAppConnectPage({ params }: PageProps) {
  const { id: instanceId } = params;

  // =====================================================
  // SERVER-SIDE VALIDATION
  // =====================================================

  const supabase = await createClient();

  // Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    notFound();
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, organization_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  // Get instance details
  const { data: instance, error: instanceError } = await supabase
    .from('whatsapp_instances')
    .select(`
      id,
      instance_name,
      status,
      organization_id,
      created_at,
      updated_at
    `)
    .eq('id', instanceId)
    .single();

  if (instanceError || !instance) {
    console.error('Instance not found:', instanceError);
    notFound();
  }

  // =====================================================
  // RBAC VALIDATION
  // =====================================================

  // Superadmin can access any instance
  const isSuperAdmin = profile.role === 'superadmin';
  
  // Regular admin can only access instances from their organization
  const isOrgAdmin = profile.role === 'admin' && instance.organization_id === profile.organization_id;

  if (!isSuperAdmin && !isOrgAdmin) {
    console.warn(`Access denied for user ${user.id} to instance ${instanceId}`);
    notFound();
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <DashboardLayout title="Conectar WhatsApp">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Conectar WhatsApp
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Instancia: <span className="font-medium">{instance.instance_name}</span>
              </p>
            </div>
            
            {/* Status Badge */}
            <div className="flex items-center space-x-2">
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                instance.status === 'connected' 
                  ? 'bg-green-100 text-green-800'
                  : instance.status === 'connecting'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {instance.status === 'connected' && '🟢'}
                {instance.status === 'connecting' && '🟡'}
                {instance.status === 'disconnected' && '⚪'}
                {' '}
                {instance.status.charAt(0).toUpperCase() + instance.status.slice(1)}
              </div>
            </div>
          </div>
        </div>

        {/* Connection Interface */}
        <div className="max-w-4xl mx-auto">
          <WhatsAppConnectView
            instanceId={instance.id}
            instanceName={instance.instance_name}
            initialStatus={instance.status}
            organizationId={instance.organization_id}
            userRole={profile.role as 'admin' | 'superadmin'}
          />
        </div>

        {/* Help Section */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-4">
              💡 ¿Necesitas ayuda?
            </h3>
            <div className="space-y-3 text-sm text-blue-800">
              <div className="flex items-start space-x-2">
                <span className="font-medium">1.</span>
                <span>Asegúrate de tener WhatsApp Business instalado en tu teléfono</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-medium">2.</span>
                <span>Ve a Configuración → Dispositivos Vinculados en WhatsApp</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-medium">3.</span>
                <span>Toca "Vincular un dispositivo" y escanea el código QR</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-medium">4.</span>
                <span>El código se actualiza automáticamente cada 30 segundos</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
