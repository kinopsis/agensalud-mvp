/**
 * Simple WhatsApp Instances API
 * 
 * Endpoints simplificados para gestión de instancias WhatsApp MVP.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSimpleWhatsAppService } from '@/lib/services/SimpleWhatsAppService';
import { z } from 'zod';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const CreateInstanceSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(100, 'Display name too long')
});

// =====================================================
// API HANDLERS
// =====================================================

/**
 * GET /api/whatsapp/simple/instances
 * Listar instancias WhatsApp de la organización
 */
export async function GET(request: NextRequest) {
  try {
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

    // Obtener instancias
    const whatsappService = await createSimpleWhatsAppService();
    const instances = await whatsappService.listInstances(profile.organization_id);

    return NextResponse.json({
      success: true,
      data: instances,
      meta: {
        count: instances.length,
        organizationId: profile.organization_id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error listing WhatsApp instances:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/simple/instances
 * Crear nueva instancia WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
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
    if (!['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 });
    }

    // Validar datos de entrada
    const body = await request.json();
    const validation = CreateInstanceSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      }, { status: 400 });
    }

    // Verificar límite de instancias (1 por organización para MVP)
    const whatsappService = await createSimpleWhatsAppService();
    const existingInstances = await whatsappService.listInstances(profile.organization_id);
    
    if (existingInstances.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Organization already has a WhatsApp instance',
        details: 'MVP allows only one WhatsApp instance per organization'
      }, { status: 409 });
    }

    // Crear instancia
    const instance = await whatsappService.createInstance({
      displayName: validation.data.displayName,
      organizationId: profile.organization_id
    });

    console.log('✅ WhatsApp instance created successfully:', instance.id);

    return NextResponse.json({
      success: true,
      data: instance,
      meta: {
        createdBy: user.id,
        organizationId: profile.organization_id,
        timestamp: new Date().toISOString()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating WhatsApp instance:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create WhatsApp instance',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/whatsapp/simple/instances
 * Eliminar todas las instancias WhatsApp de la organización (para testing)
 */
export async function DELETE(request: NextRequest) {
  try {
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
    if (!['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 });
    }

    // Eliminar todas las instancias de la organización
    const whatsappService = await createSimpleWhatsAppService();
    const instances = await whatsappService.listInstances(profile.organization_id);

    let deletedCount = 0;
    for (const instance of instances) {
      try {
        await whatsappService.deleteInstance(instance.id);
        deletedCount++;
      } catch (error) {
        console.warn(`Failed to delete instance ${instance.id}:`, error);
      }
    }

    console.log(`✅ Deleted ${deletedCount} WhatsApp instances for organization ${profile.organization_id}`);

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} WhatsApp instances`,
      meta: {
        deletedCount,
        organizationId: profile.organization_id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error deleting WhatsApp instances:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete WhatsApp instances',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
