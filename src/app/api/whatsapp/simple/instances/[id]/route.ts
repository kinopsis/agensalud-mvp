/**
 * Simple WhatsApp Instance Management API
 * 
 * Individual instance operations for simple WhatsApp system.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSimpleWhatsAppService } from '@/lib/services/SimpleWhatsAppService';

// =====================================================
// API HANDLERS
// =====================================================

/**
 * GET /api/whatsapp/simple/instances/[id]
 * Obtener detalles de una instancia específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const instanceId = params.id;
    
    console.log('📋 Getting simple WhatsApp instance:', instanceId);

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
    if (instance.organization_id !== profile.organization_id && profile.role !== 'superadmin') {
      return NextResponse.json({
        success: false,
        error: 'Access denied'
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: instance,
      meta: {
        timestamp: new Date().toISOString(),
        organizationId: profile.organization_id
      }
    });

  } catch (error) {
    console.error('❌ Error getting WhatsApp instance:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/whatsapp/simple/instances/[id]
 * Eliminar una instancia específica
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const instanceId = params.id;
    
    console.log('🗑️ Deleting simple WhatsApp instance:', instanceId);

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
    if (!['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 });
    }

    // Verificar que la instancia existe y pertenece a la organización
    const whatsappService = await createSimpleWhatsAppService();
    const instance = await whatsappService.getInstance(instanceId);

    if (!instance) {
      return NextResponse.json({
        success: false,
        error: 'Instance not found'
      }, { status: 404 });
    }

    if (instance.organization_id !== profile.organization_id && profile.role !== 'superadmin') {
      return NextResponse.json({
        success: false,
        error: 'Access denied'
      }, { status: 403 });
    }

    // Eliminar instancia
    await whatsappService.deleteInstance(instanceId);

    console.log(`✅ WhatsApp instance deleted successfully: ${instanceId}`);

    return NextResponse.json({
      success: true,
      message: 'Instance deleted successfully',
      meta: {
        instanceId,
        deletedBy: user.id,
        organizationId: profile.organization_id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error deleting WhatsApp instance:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete WhatsApp instance',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/whatsapp/simple/instances/[id]
 * Actualizar una instancia específica
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const instanceId = params.id;
    
    console.log('✏️ Updating simple WhatsApp instance:', instanceId);

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
    if (!['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 });
    }

    // Obtener datos de actualización
    const body = await request.json();
    const { display_name } = body;

    if (!display_name || typeof display_name !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid display_name'
      }, { status: 400 });
    }

    // Verificar que la instancia existe y pertenece a la organización
    const whatsappService = await createSimpleWhatsAppService();
    const instance = await whatsappService.getInstance(instanceId);

    if (!instance) {
      return NextResponse.json({
        success: false,
        error: 'Instance not found'
      }, { status: 404 });
    }

    if (instance.organization_id !== profile.organization_id && profile.role !== 'superadmin') {
      return NextResponse.json({
        success: false,
        error: 'Access denied'
      }, { status: 403 });
    }

    // Actualizar instancia
    const { error: updateError } = await supabase
      .from('whatsapp_instances_simple')
      .update({
        display_name: display_name.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', instanceId);

    if (updateError) {
      throw new Error(`Database error: ${updateError.message}`);
    }

    // Obtener instancia actualizada
    const updatedInstance = await whatsappService.getInstance(instanceId);

    console.log(`✅ WhatsApp instance updated successfully: ${instanceId}`);

    return NextResponse.json({
      success: true,
      data: updatedInstance,
      meta: {
        updatedBy: user.id,
        organizationId: profile.organization_id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error updating WhatsApp instance:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update WhatsApp instance',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
