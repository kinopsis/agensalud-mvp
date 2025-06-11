/**
 * WhatsApp Instance Page
 * 
 * Main page for WhatsApp instance management.
 * Redirects to the connect page as part of the radical solution workflow.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { redirect } from 'next/navigation';

// =====================================================
// TYPES
// =====================================================

interface PageProps {
  params: {
    id: string;
  };
}

// =====================================================
// SERVER COMPONENT
// =====================================================

/**
 * WhatsApp Instance Page Component
 * 
 * @description Redirects to the connect page for seamless user experience.
 * This ensures that accessing /admin/channels/whatsapp/[id] automatically
 * takes users to the connection interface.
 */
export default async function WhatsAppInstancePage({ params }: PageProps) {
  const { id: instanceId } = params;
  
  // Redirect to connect page for streamlined UX
  redirect(`/admin/channels/whatsapp/${instanceId}/connect`);
}
