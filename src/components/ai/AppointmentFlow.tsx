'use client';

/**
 * AppointmentFlow Component
 * Guided appointment booking flow with AI assistance
 * Now uses the UnifiedAppointmentFlow for consistency
 */

import React from 'react';
import UnifiedAppointmentFlow from '../appointments/UnifiedAppointmentFlow';

interface AppointmentFlowProps {
  organizationId: string;
  userId?: string;
  onAppointmentBooked?: (appointmentId: string) => void;
  onCancel?: () => void;
}



/**
 * AppointmentFlow Component (AI Mode)
 * Wrapper around UnifiedAppointmentFlow configured for AI mode
 */
export default function AppointmentFlow({
  organizationId,
  userId,
  onAppointmentBooked,
  onCancel
}: AppointmentFlowProps) {
  return (
    <UnifiedAppointmentFlow
      organizationId={organizationId}
      userId={userId}
      onAppointmentBooked={onAppointmentBooked}
      onCancel={onCancel}
      mode="ai"
    />
  );
}
