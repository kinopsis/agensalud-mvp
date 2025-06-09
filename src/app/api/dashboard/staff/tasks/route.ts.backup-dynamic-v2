import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/dashboard/staff/tasks
 * Fetch pending tasks for staff dashboard
 * Includes confirmations, reminders, follow-ups, and reschedules
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user and verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has staff access to this organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile ||
        (profile.organization_id !== organizationId && profile.role !== 'superadmin') ||
        !['staff', 'admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const tasks = [];
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // 1. Pending confirmations (appointments that need confirmation)
    const { data: pendingConfirmations, error: confirmError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        start_time,
        patient:profiles!appointments_patient_id_fkey(first_name, last_name)
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .gte('appointment_date', today)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(limit);

    if (confirmError) {
      console.error('Error fetching pending confirmations:', confirmError);
    } else if (pendingConfirmations) {
      for (const appointment of pendingConfirmations) {
        const patient = appointment.patient && Array.isArray(appointment.patient) && appointment.patient.length > 0
          ? appointment.patient[0]
          : null;
        const patientName = patient
          ? `${patient.first_name} ${patient.last_name}`
          : 'Paciente desconocido';

        const isUrgent = appointment.appointment_date === today || appointment.appointment_date === tomorrowStr;

        tasks.push({
          id: `confirmation_${appointment.id}`,
          type: 'confirmation',
          description: `Confirmar cita del ${appointment.appointment_date} a las ${appointment.start_time}`,
          patient_name: patientName,
          appointment_id: appointment.id,
          priority: isUrgent ? 'high' : 'medium',
          due_time: appointment.start_time
        });
      }
    }

    // 2. Reminder calls (appointments tomorrow that need reminders)
    const { data: reminderAppointments, error: reminderError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        start_time,
        patient:profiles!appointments_patient_id_fkey(first_name, last_name, phone)
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'confirmed')
      .eq('appointment_date', tomorrowStr)
      .order('start_time', { ascending: true })
      .limit(limit);

    if (reminderError) {
      console.error('Error fetching reminder appointments:', reminderError);
    } else if (reminderAppointments) {
      for (const appointment of reminderAppointments) {
        const patient = appointment.patient && Array.isArray(appointment.patient) && appointment.patient.length > 0
          ? appointment.patient[0]
          : null;
        const patientName = patient
          ? `${patient.first_name} ${patient.last_name}`
          : 'Paciente desconocido';

        tasks.push({
          id: `reminder_${appointment.id}`,
          type: 'reminder',
          description: `Recordatorio de cita para mañana a las ${appointment.start_time}`,
          patient_name: patientName,
          appointment_id: appointment.id,
          priority: 'medium',
          due_time: '17:00' // End of business day
        });
      }
    }

    // 3. Follow-up calls (completed appointments from last week that need follow-up)
    const lastWeek = new Date(now);
    lastWeek.setDate(now.getDate() - 7);
    const lastWeekStr = lastWeek.toISOString().split('T')[0];

    const { data: followUpAppointments, error: followUpError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        patient:profiles!appointments_patient_id_fkey(first_name, last_name),
        service:services(name)
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .gte('appointment_date', lastWeekStr)
      .lte('appointment_date', today)
      .order('appointment_date', { ascending: false })
      .limit(Math.floor(limit / 2));

    if (followUpError) {
      console.error('Error fetching follow-up appointments:', followUpError);
    } else if (followUpAppointments) {
      for (const appointment of followUpAppointments) {
        const patient = appointment.patient && Array.isArray(appointment.patient) && appointment.patient.length > 0
          ? appointment.patient[0]
          : null;
        const patientName = patient
          ? `${patient.first_name} ${patient.last_name}`
          : 'Paciente desconocido';

        const service = appointment.service && Array.isArray(appointment.service) && appointment.service.length > 0
          ? appointment.service[0]
          : null;
        const serviceName = service?.name || 'Servicio';

        tasks.push({
          id: `followup_${appointment.id}`,
          type: 'follow_up',
          description: `Seguimiento post-${serviceName} del ${appointment.appointment_date}`,
          patient_name: patientName,
          appointment_id: appointment.id,
          priority: 'low'
        });
      }
    }

    // 4. Reschedule requests (cancelled appointments that might need rescheduling)
    const { data: cancelledAppointments, error: cancelledError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        updated_at,
        patient:profiles!appointments_patient_id_fkey(first_name, last_name)
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'cancelled')
      .gte('updated_at', lastWeekStr)
      .order('updated_at', { ascending: false })
      .limit(Math.floor(limit / 3));

    if (cancelledError) {
      console.error('Error fetching cancelled appointments:', cancelledError);
    } else if (cancelledAppointments) {
      for (const appointment of cancelledAppointments) {
        const patient = appointment.patient && Array.isArray(appointment.patient) && appointment.patient.length > 0
          ? appointment.patient[0]
          : null;
        const patientName = patient
          ? `${patient.first_name} ${patient.last_name}`
          : 'Paciente desconocido';

        tasks.push({
          id: `reschedule_${appointment.id}`,
          type: 'reschedule',
          description: `Reagendar cita cancelada del ${appointment.appointment_date}`,
          patient_name: patientName,
          appointment_id: appointment.id,
          priority: 'medium'
        });
      }
    }

    // Sort tasks by priority and due time
    const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
    tasks.sort((a, b) => {
      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (priorityDiff !== 0) return priorityDiff;

      // If same priority, sort by due time
      if (a.due_time && b.due_time) {
        return a.due_time.localeCompare(b.due_time);
      }

      return 0;
    });

    // Limit to requested number
    const limitedTasks = tasks.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: limitedTasks
    });

  } catch (error) {
    console.error('Error in staff tasks API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
