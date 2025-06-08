/**
 * WhatsApp Instance Status API
 * 
 * Endpoint para verificar el estado de conexión de una instancia WhatsApp
 * en tiempo real desde Evolution API.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSimpleWhatsAppService } from '@/lib/services/SimpleWhatsAppService';

/**
 * GET /api/whatsapp/simple/instances/[id]/status
 * Obtener estado actual de la instancia WhatsApp
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const instanceId = params.id;

    if (!instanceId) {
      return NextResponse.json({
        success: false,
        error: 'Instance ID is required'
      }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Obtener perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({
        success: false,
        error: 'User profile not found'
      }, { status: 403 });
    }

    // Verificar permisos
    if (!['admin', 'staff', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 });
    }

    // Obtener instancia
    const whatsappService = await createSimpleWhatsAppService();
    const instance = await whatsappService.getInstance(instanceId);

    if (!instance) {
      return NextResponse.json({
        success: false,
        error: 'Instance not found'
      }, { status: 404 });
    }

    // Verificar que la instancia pertenece a la organización del usuario
    if (instance.organization_id !== profile.organization_id) {
      return NextResponse.json({
        success: false,
        error: 'Access denied'
      }, { status: 403 });
    }

    // Verificar estado en Evolution API
    let evolutionStatus = null;
    let evolutionError = null;

    try {
      const evolutionConfig = {
        baseUrl: (process.env.EVOLUTION_API_BASE_URL || 'https://evo.torrecentral.com').replace(/\/$/, ''),
        apiKey: process.env.EVOLUTION_API_KEY || ''
      };

      const response = await fetch(`${evolutionConfig.baseUrl}/instance/connectionState/${instance.evolution_instance_name}`, {
        headers: {
          'apikey': evolutionConfig.apiKey
        }
      });

      if (response.ok) {
        evolutionStatus = await response.json();
      } else {
        evolutionError = `Evolution API error: ${response.status} ${response.statusText}`;
      }
    } catch (error) {
      evolutionError = `Evolution API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // Determinar estado final
    let finalStatus = instance.status;
    let statusMessage = 'Status from database';

    if (evolutionStatus) {
      // Si Evolution API responde, usar su estado
      finalStatus = evolutionStatus.state || evolutionStatus.status || instance.status;
      statusMessage = 'Status from Evolution API';

      // Actualizar base de datos si el estado cambió
      if (finalStatus !== instance.status) {
        try {
          await supabase
            .from('whatsapp_instances_simple')
            .update({
              status: finalStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', instanceId);

          console.log(`📱 Status updated: ${instance.status} → ${finalStatus} for instance ${instanceId}`);
        } catch (updateError) {
          console.warn('Failed to update instance status in database:', updateError);
        }
      }
    } else if (evolutionError) {
      statusMessage = `Evolution API unavailable: ${evolutionError}`;
    }

    return NextResponse.json({
      success: true,
      data: {
        instanceId: instance.id,
        instanceName: instance.instance_name,
        evolutionInstanceName: instance.evolution_instance_name,
        status: finalStatus,
        message: statusMessage,
        databaseStatus: instance.status,
        evolutionStatus: evolutionStatus,
        evolutionError: evolutionError,
        lastUpdated: instance.updated_at,
        timestamp: new Date().toISOString()
      },
      meta: {
        organizationId: profile.organization_id,
        checkedBy: user.id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error checking WhatsApp instance status:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
