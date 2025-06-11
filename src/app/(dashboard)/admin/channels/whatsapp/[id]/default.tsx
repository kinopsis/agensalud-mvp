/**
 * WhatsApp Instance Default Component
 * 
 * Default component for the WhatsApp instance dynamic route.
 * This resolves the Next.js "No default component was found for a parallel route" warning
 * that occurs when navigating to nested routes within the [id] directory.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import React from 'react';

/**
 * Default Component for WhatsApp Instance Routes
 * 
 * @description This component serves as a fallback for the dynamic [id] route
 * when no specific page matches. In practice, users should always navigate
 * to specific sub-routes like /connect, but this prevents Next.js routing warnings.
 */
export default function WhatsAppInstanceDefault() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando instancia de WhatsApp...</p>
      </div>
    </div>
  );
}
