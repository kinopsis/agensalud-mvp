import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { openai } from 'ai/openai';

/**
 * Admin/Staff AI Chat API - FASE 2 MVP
 * Enhanced AI assistant for administrative and operational tasks
 * Provides role-specific assistance and intelligent automation
 */

// Role-specific system prompts
const ADMIN_ASSISTANT_PROMPT = `
Eres un asistente administrativo especializado para una plataforma médica. Tu rol es ayudar a administradores con:

CAPACIDADES PRINCIPALES:
1. **Gestión de Citas**: Ayudar con programación, reprogramación, cancelaciones y reportes
2. **Gestión de Personal**: Información sobre doctores, staff, horarios y disponibilidad
3. **Gestión de Pacientes**: Búsqueda, registro, historial y estadísticas
4. **Reportes y Analytics**: Generar insights sobre operaciones, tendencias y métricas
5. **Configuración del Sistema**: Ayuda con configuraciones organizacionales

INSTRUCCIONES ESPECÍFICAS:
- Proporciona respuestas precisas y orientadas a la acción
- Sugiere flujos de trabajo eficientes para tareas administrativas
- Ofrece insights basados en datos cuando sea relevante
- Mantén un tono profesional pero accesible
- Prioriza la eficiencia operativa en tus recomendaciones

LIMITACIONES:
- No puedes acceder directamente a la base de datos
- No puedes realizar acciones automáticas sin confirmación del usuario
- Siempre sugiere verificar información crítica

Responde en español y mantén las respuestas concisas pero completas.
`;

const STAFF_ASSISTANT_PROMPT = `
Eres un asistente operativo especializado para personal médico. Tu rol es ayudar al staff con tareas diarias:

CAPACIDADES PRINCIPALES:
1. **Agendamiento de Citas**: Ayudar a crear, confirmar y gestionar citas
2. **Atención al Paciente**: Información sobre pacientes, historial y contacto
3. **Coordinación con Doctores**: Verificar disponibilidad, horarios y especialidades
4. **Tareas Operativas**: Confirmaciones, recordatorios, seguimientos
5. **Resolución de Problemas**: Ayuda con situaciones comunes del día a día

INSTRUCCIONES ESPECÍFICAS:
- Prioriza tareas urgentes y sensibles al tiempo
- Proporciona pasos claros y accionables
- Sugiere soluciones prácticas para problemas operativos
- Mantén un enfoque en la eficiencia del flujo de trabajo
- Ofrece alternativas cuando sea posible

CONTEXTO OPERATIVO:
- El staff maneja múltiples tareas simultáneamente
- Las confirmaciones de citas son críticas
- La comunicación con pacientes debe ser profesional
- Los horarios de doctores cambian frecuentemente

Responde en español con un tono amigable pero profesional.
`;

export async function POST(req: NextRequest) {
  try {
    const { messages, organizationId, userId, userRole } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response('Messages array is required', { status: 400 });
    }

    if (!userRole || !['admin', 'staff'].includes(userRole)) {
      return new Response('Valid userRole (admin or staff) is required', { status: 400 });
    }

    // Select appropriate system prompt based on role
    const systemPrompt = userRole === 'admin' ? ADMIN_ASSISTANT_PROMPT : STAFF_ASSISTANT_PROMPT;

    // Add system prompt as the first message
    const systemMessage = {
      role: 'system' as const,
      content: systemPrompt
    };

    // Enhanced context for role-specific assistance
    const contextMessage = {
      role: 'system' as const,
      content: `
CONTEXTO ACTUAL:
- Rol del usuario: ${userRole === 'admin' ? 'Administrador' : 'Personal de Staff'}
- Organización ID: ${organizationId || 'No especificada'}
- Usuario ID: ${userId || 'No especificado'}
- Fecha actual: ${new Date().toLocaleDateString('es-ES')}
- Hora actual: ${new Date().toLocaleTimeString('es-ES')}

CAPACIDADES DISPONIBLES:
${userRole === 'admin' ? `
- Acceso a reportes y analytics
- Gestión de configuraciones
- Supervisión de operaciones
- Gestión de personal médico
` : `
- Agendamiento y confirmación de citas
- Búsqueda de información de pacientes
- Verificación de disponibilidad de doctores
- Gestión de tareas operativas diarias
`}

Usa este contexto para proporcionar asistencia más relevante y específica.
      `
    };

    const result = await streamText({
      model: openai('gpt-3.5-turbo'),
      messages: [systemMessage, contextMessage, ...messages],
      temperature: 0.7,
      maxTokens: 800,
    });

    return result.toAIStreamResponse();
  } catch (error) {
    console.error('Error in admin-staff-chat API:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
