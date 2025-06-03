/**
 * WhatsApp Instance Creation Page
 * 
 * Page component for creating new WhatsApp channel instances with form validation
 * and integration with the unified channel architecture.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import React from 'react';
import { Metadata } from 'next';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { CreateInstanceForm } from '@/components/channels/CreateInstanceForm';

// =====================================================
// METADATA
// =====================================================

export const metadata: Metadata = {
  title: 'Nueva Instancia WhatsApp - AgentSalud',
  description: 'Crear nueva instancia de WhatsApp para comunicación con pacientes',
};

// =====================================================
// PAGE COMPONENT
// =====================================================

/**
 * WhatsApp Instance Creation Page
 * 
 * @description Provides a dedicated page for creating new WhatsApp instances
 * with proper layout and navigation integration.
 * 
 * @returns JSX element
 */
export default function CreateWhatsAppInstancePage() {
  return (
    <DashboardLayout
      title="Canales de Comunicación"
      subtitle="Crear nueva instancia de WhatsApp"
    >
      <div className="space-y-6">
        {/* Creation Form */}
        <CreateInstanceForm channelType="whatsapp" />
      </div>
    </DashboardLayout>
  );
}
