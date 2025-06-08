/**
 * WhatsApp QR Code Real-time Streaming Endpoint
 * 
 * Provides Server-Sent Events (SSE) for real-time QR code updates
 * from Evolution API webhooks.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createEvolutionAPIService } from '@/lib/services/EvolutionAPIService';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface QRCodeStreamEvent {
  type: 'qr_code' | 'status_update' | 'error' | 'heartbeat';
  data: {
    instanceId: string;
    qrCode?: string;
    status?: string;
    message?: string;
    timestamp: string;
    expiresAt?: string;
    isRealQR?: boolean;
    source?: 'evolution_api' | 'database' | 'mock';
  };
}

// =====================================================
// SSE STREAMING ENDPOINT
// =====================================================

/**
 * Stream QR code updates via Server-Sent Events
 * 
 * @description Provides real-time QR code updates for WhatsApp instance
 * connection. Clients can listen to this stream to receive QR codes
 * as soon as they're available from Evolution API webhooks.
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing instance ID
 * @returns SSE stream with QR code updates
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const instanceId = params.id;
  
  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      let isActive = true;
      let heartbeatInterval: NodeJS.Timeout;
      let pollInterval: NodeJS.Timeout;

      // SSE helper function
      const sendEvent = (event: QRCodeStreamEvent) => {
        if (!isActive) return;

        try {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));

          // Enhanced logging for QR code events
          if (event.type === 'qr_code') {
            console.log('📱 QR Code event sent:', {
              instanceId: event.data.instanceId,
              hasQRCode: !!event.data.qrCode,
              qrCodeLength: event.data.qrCode?.length || 0,
              source: event.data.source,
              isRealQR: event.data.isRealQR,
              expiresAt: event.data.expiresAt
            });
          }
        } catch (error) {
          console.error('❌ Error sending SSE event:', error);
          isActive = false;
        }
      };

      // Function to get real QR code from Evolution API
      const getRealQRCode = async (instanceName: string): Promise<{ qrCode: string; source: string } | null> => {
        try {
          console.log('🔍 Attempting to get real QR code from Evolution API for instance:', instanceName);

          const evolutionAPI = createEvolutionAPIService();
          const qrResponse = await evolutionAPI.getQRCode(instanceName);

          if (qrResponse?.base64) {
            const validation = validateQRCode(qrResponse.base64);
            if (validation.isValid) {
              console.log('✅ Successfully obtained QR code from Evolution API:', {
                isRealQR: validation.isRealQR,
                length: qrResponse.base64.length,
                reason: validation.reason
              });
              return {
                qrCode: qrResponse.base64,
                source: 'evolution_api',
                isRealQR: validation.isRealQR,
                validationPassed: true
              };
            } else {
              console.warn('⚠️ Evolution API returned invalid QR code:', validation.reason);
              return null;
            }
          } else {
            console.warn('⚠️ Evolution API returned empty QR code');
            return null;
          }
        } catch (error) {
          console.error('❌ Error getting real QR code from Evolution API:', error);
          return null;
        }
      };

      // Function to validate QR code base64 - IMPROVED VERSION
      const validateQRCode = (base64: string): { isValid: boolean; isRealQR: boolean; reason?: string } => {
        try {
          // Check if it's a valid base64 string
          if (!base64 || typeof base64 !== 'string') {
            return { isValid: false, isRealQR: false, reason: 'Empty or invalid base64 string' };
          }

          // Remove data URL prefix if present
          let cleanBase64 = base64;
          if (base64.startsWith('data:image/')) {
            const commaIndex = base64.indexOf(',');
            if (commaIndex !== -1) {
              cleanBase64 = base64.substring(commaIndex + 1);
            }
          }

          // Check minimum length for real QR codes (WhatsApp QR codes are typically 10KB+)
          if (cleanBase64.length < 1000) {
            console.warn('⚠️ QR code too short for real WhatsApp QR, likely mock:', cleanBase64.length);
            return { isValid: true, isRealQR: false, reason: 'QR code too short, likely mock' };
          }

          // Try to decode base64 to verify it's valid
          try {
            const decoded = atob(cleanBase64);
            if (decoded.length < 500) {
              console.warn('⚠️ Decoded QR code too small for real WhatsApp QR');
              return { isValid: true, isRealQR: false, reason: 'Decoded QR too small' };
            }

            // Check for PNG header (real WhatsApp QR codes are PNG)
            const isPNG = decoded.startsWith('\x89PNG\r\n\x1a\n');
            if (!isPNG) {
              console.warn('⚠️ QR code is not PNG format');
              return { isValid: true, isRealQR: false, reason: 'Not PNG format' };
            }

            console.log('✅ QR code validation passed - appears to be real WhatsApp QR');
            return { isValid: true, isRealQR: true };
          } catch (decodeError) {
            console.error('❌ Failed to decode base64:', decodeError);
            return { isValid: false, isRealQR: false, reason: 'Invalid base64 encoding' };
          }

        } catch (error) {
          console.error('❌ QR code validation error:', error);
          return { isValid: false, isRealQR: false, reason: 'Validation error' };
        }
      };

      // Function to generate a mock QR code for development fallback
      const generateMockQRCode = (): string => {
        // Generate a realistic-looking QR code base64 for development
        // This is a 200x200 pixel QR code with WhatsApp-like data
        const mockQRData = `2@${Math.random().toString(36).substring(2, 15)}@${Date.now()}@WhatsApp`;

        // Create a simple QR code pattern (this would normally be generated by a QR library)
        // For development purposes, we'll create a base64 that represents a valid PNG
        const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;

        if (canvas) {
          canvas.width = 200;
          canvas.height = 200;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Create a simple pattern that looks like a QR code
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 200, 200);
            ctx.fillStyle = '#FFFFFF';

            // Create QR-like pattern
            for (let i = 0; i < 200; i += 10) {
              for (let j = 0; j < 200; j += 10) {
                if ((i + j) % 20 === 0) {
                  ctx.fillRect(i, j, 8, 8);
                }
              }
            }

            return canvas.toDataURL('image/png').split(',')[1];
          }
        }

        // Fallback: Return a base64 string that represents a simple black square PNG
        // This is a minimal valid PNG file encoded in base64
        return 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVBiVY/z//z8DJQAggBhJVQcQQIykqgMIIEZS1QEEECO56gACiJFcdQABxEiuOoAAYiRXHUAAMZKrDiCAGMlVBxBAjOSqAwggRnLVAQQQI7nqAAKIkVx1AAHESKo6gABiJFUdQAAxkqoOIIAYSVUHEECMpKoDCCBGUtUBBBAjqeoAAoiRVHUAAcRIqjqAAGIkVR1AADGSLA4ggBhJVQcQQIykqgMIIEZS1QEEECO56gACiJFcdQABxEiuOoAAYiRXHUAAMZKrDiCAGMlVBxBAjOSqAwggRnLVAQQQI7nqAAKIkVx1AAHESKo6gABiJFUdQAAxkqoOIIAYSVUHEECMpKoDCCBGUtUBBBAjqeoAAoiRVHUAAcRIqjqAAGIkVR1AADGSLA4ggBhJVQcQQIykqgMIIEZS1QEEECO56gACiJFcdQABxEiuOoAAYiRXHUAAMZKrDiCAGAEAF2Af8ANd6m4AAAAASUVORK5CYII='.repeat(20);
      };

      // Initialize connection
      const initializeStream = async () => {
        try {
          console.log(`🔗 Initializing QR code stream for instance: ${instanceId}`);
          console.log(`📊 Stream initialization debug:`, {
            instanceId,
            timestamp: new Date().toISOString(),
            userAgent: request.headers.get('user-agent')?.substring(0, 50)
          });

          const supabase = await createClient();

          // Authenticate user
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (authError || !user) {
            sendEvent({
              type: 'error',
              data: {
                instanceId,
                message: 'Authentication required',
                timestamp: new Date().toISOString()
              }
            });
            controller.close();
            return;
          }

          // Enhanced development mode with real QR codes
          const isDevelopment = process.env.NODE_ENV === 'development';
          if (isDevelopment) {
            console.log('🔧 Development mode: Creating real Evolution API instance for QR code');

            // Send initial status
            sendEvent({
              type: 'status_update',
              data: {
                instanceId,
                status: 'connecting',
                message: 'Connected to QR code stream (development mode)',
                timestamp: new Date().toISOString()
              }
            });

            // Check if this is a real database instance or development-only instance
            let shouldCreateEvolutionInstance = false;
            let evolutionInstanceName = '';

            try {
              // First, check if this instance exists in the database
              const { data: dbInstance } = await supabase
                .from('channel_instances')
                .select('instance_name, config')
                .eq('id', instanceId)
                .single();

              if (dbInstance) {
                // Real database instance - use its Evolution API configuration
                evolutionInstanceName = dbInstance.config?.whatsapp?.evolution_api?.instance_name || `agentsalud-${instanceId}`;
                console.log(`🔗 Using existing database instance Evolution API name: ${evolutionInstanceName}`);
              } else {
                // Development-only instance - create temporary Evolution API instance
                shouldCreateEvolutionInstance = true;
                evolutionInstanceName = `agentsalud-dev-${instanceId.replace('dev-instance-', '')}`;
                console.log(`🔧 Development mode: Will create temporary Evolution API instance: ${evolutionInstanceName}`);
              }

              // Store the mapping globally for status polling
              (global as any).devInstanceMapping = (global as any).devInstanceMapping || {};
              (global as any).devInstanceMapping[instanceId] = evolutionInstanceName;

              // Create Evolution API instance only if needed (development mode)
              let instanceResponse;
              if (shouldCreateEvolutionInstance) {
                const evolutionAPI = createEvolutionAPIService();
                console.log(`🔧 Creating temporary Evolution API instance: ${evolutionInstanceName}`);

                instanceResponse = await evolutionAPI.createInstance({
                  instanceName: evolutionInstanceName,
                  integration: 'WHATSAPP-BAILEYS'
                });

                if (instanceResponse?.instance?.instanceId) {
                  console.log('✅ Temporary development instance created successfully');
                } else {
                  throw new Error('Failed to create temporary development instance');
                }
              } else {
                console.log('✅ Using existing database instance configuration');
                // For existing instances, we don't need to create a new Evolution API instance
                // The instance should already exist from the main creation flow
              }

              // Check if QR code is available immediately (only for newly created instances)
              if (shouldCreateEvolutionInstance && instanceResponse?.qrCodeFromCreation?.base64) {
                console.log('🎯 QR code available immediately from creation response!');
                sendEvent({
                  type: 'qr_code',
                  data: {
                    instanceId,
                    qrCode: instanceResponse.qrCodeFromCreation.base64,
                    expiresAt: new Date(Date.now() + 45000).toISOString(),
                    timestamp: new Date().toISOString(),
                    isRealQR: true,
                    source: 'creation_response',
                    pairingCode: instanceResponse.qrCodeFromCreation.pairingCode,
                    count: instanceResponse.qrCodeFromCreation.count
                  }
                });

                // Store the instance name for potential future operations
                (global as any).devInstanceName = evolutionInstanceName;
                return; // QR code sent, no need for polling
              }

              // Initialize connection for newly created instances
              if (shouldCreateEvolutionInstance) {
                // Fallback: Wait a moment for instance to initialize
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Connect the instance to start WhatsApp connection process
                console.log('🔗 Connecting instance to start WhatsApp connection...');
                try {
                  const evolutionAPI = createEvolutionAPIService();
                  await evolutionAPI.connectInstance(evolutionInstanceName);
                  console.log('✅ Instance connection initiated successfully');

                  // Send status that we're generating QR
                  sendEvent({
                    type: 'status_update',
                    data: {
                      instanceId,
                      status: 'qr_generating',
                      message: 'Conectando a WhatsApp y generando código QR...',
                      timestamp: new Date().toISOString()
                    }
                  });

                } catch (connectError) {
                  console.error('❌ Failed to connect instance:', connectError);
                  sendEvent({
                    type: 'status_update',
                    data: {
                      instanceId,
                      status: 'connection_error',
                      message: 'Error al conectar la instancia. Reintentando...',
                      timestamp: new Date().toISOString()
                    }
                  });
                }
              }

              // Configure webhook for connection status updates (only for new instances)
              if (shouldCreateEvolutionInstance) {
                try {
                  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/evolution`;
                  const evolutionAPI = createEvolutionAPIService();
                  await evolutionAPI.configureWebhook(evolutionInstanceName, {
                    url: webhookUrl,
                    webhook_by_events: true,
                    webhook_base64: false,
                    events: ['CONNECTION_UPDATE', 'STATUS_INSTANCE', 'QRCODE_UPDATED']
                  });
                  console.log('✅ Webhook configured for connection status updates:', webhookUrl);
                } catch (webhookError) {
                  console.warn('⚠️ Failed to configure webhook (continuing without):', webhookError);
                }
              }

              // Store instance mapping without global contamination
              const devInstanceMapping = (global as any).devInstanceMapping || {};
              devInstanceMapping[instanceId] = evolutionInstanceName;
              (global as any).devInstanceMapping = devInstanceMapping;

              console.log(`📝 Stored instance mapping: ${instanceId} → ${evolutionInstanceName}`);

            } catch (devError) {
              console.error('❌ Development mode: Failed to create real instance:', devError);

              // Fallback to mock QR code for development
              const mockQRCode = generateMockQRCode();
              sendEvent({
                type: 'qr_code',
                data: {
                  instanceId,
                  qrCode: mockQRCode,
                  expiresAt: new Date(Date.now() + 45000).toISOString(),
                  timestamp: new Date().toISOString(),
                  isRealQR: false,
                  source: 'mock'
                }
              });
            }

            // Continue with normal flow for testing but don't fail on missing instance
          }

          // Get user profile and verify access
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();

          if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
            if (!isDevelopment) {
              sendEvent({
                type: 'error',
                data: {
                  instanceId,
                  message: 'Admin access required',
                  timestamp: new Date().toISOString()
                }
              });
              controller.close();
              return;
            } else {
              console.log('🔧 Development mode: Continuing despite missing admin role');
            }
          }

          // Verify instance access
          const { data: instance } = await supabase
            .from('channel_instances')
            .select('*')
            .eq('id', instanceId)
            .eq('organization_id', profile?.organization_id || 'dev-org')
            .single();

          if (!instance) {
            if (!isDevelopment) {
              sendEvent({
                type: 'error',
                data: {
                  instanceId,
                  message: 'Instance not found or access denied',
                  timestamp: new Date().toISOString()
                }
              });
              controller.close();
              return;
            } else {
              console.log('🔧 Development mode: Continuing despite missing instance');
              // In development mode, continue with mock data but skip real instance operations
              // Don't return early - we still need to set up polling and heartbeat for the stream
            }
          }

          // Send initial status (only for production with real instance)
          if (!isDevelopment && instance) {
            sendEvent({
              type: 'status_update',
              data: {
                instanceId,
                status: instance.status,
                message: 'Connected to QR code stream',
                timestamp: new Date().toISOString()
              }
            });

            // Check for existing QR code with validation
            const currentQR = instance.config?.whatsapp?.qr_code?.current_qr;
            const expiresAt = instance.config?.whatsapp?.qr_code?.expires_at;

            if (currentQR && expiresAt && new Date(expiresAt) > new Date()) {
              if (validateQRCode(currentQR)) {
                console.log('✅ Found valid existing QR code in database');
                sendEvent({
                  type: 'qr_code',
                  data: {
                    instanceId,
                    qrCode: currentQR,
                    expiresAt,
                    timestamp: new Date().toISOString(),
                    isRealQR: true,
                    source: 'database'
                  }
                });
              } else {
                console.warn('⚠️ Existing QR code in database is invalid, will request new one');
              }
            }
          }

          // Set up polling for QR code updates
          if (!isDevelopment) {
            // Production polling - check database for updates
            pollInterval = setInterval(async () => {
              if (!isActive) {
                clearInterval(pollInterval);
                return;
              }

              try {
                const { data: updatedInstance } = await supabase
                  .from('channel_instances')
                  .select('config, status')
                  .eq('id', instanceId)
                  .single();

                if (updatedInstance) {
                  const qrCode = updatedInstance.config?.whatsapp?.qr_code?.current_qr;
                  const qrExpiresAt = updatedInstance.config?.whatsapp?.qr_code?.expires_at;
                  const lastUpdated = updatedInstance.config?.whatsapp?.qr_code?.last_updated;

                  // Check if QR code is new or updated with validation
                  if (qrCode && qrExpiresAt && new Date(qrExpiresAt) > new Date()) {
                    if (validateQRCode(qrCode)) {
                      console.log('✅ Found valid updated QR code in database');
                      sendEvent({
                        type: 'qr_code',
                        data: {
                          instanceId,
                          qrCode,
                          expiresAt: qrExpiresAt,
                          timestamp: lastUpdated || new Date().toISOString(),
                          isRealQR: true,
                          source: 'database'
                        }
                      });
                    } else {
                      console.warn('⚠️ Updated QR code in database is invalid');
                      sendEvent({
                        type: 'error',
                        data: {
                          instanceId,
                          message: 'QR code inválido detectado, solicitando nuevo código',
                          timestamp: new Date().toISOString()
                        }
                      });
                    }
                  }

                  // Send status updates and check for connection
                  if (instance && updatedInstance.status !== instance.status) {
                    sendEvent({
                      type: 'status_update',
                      data: {
                        instanceId,
                        status: updatedInstance.status,
                        timestamp: new Date().toISOString()
                      }
                    });

                    // Stop polling if connected
                    if (updatedInstance.status === 'connected') {
                      console.log('🧹 Production mode: Stopping polling - instance connected');
                      isActive = false;
                      clearInterval(pollInterval);
                      return;
                    }
                  }
                }
              } catch (pollError) {
                console.error('❌ Error polling for QR code updates:', pollError);
              }
            }, 2000); // Poll every 2 seconds
          } else {
            // Development polling - retry getting real QR codes
            console.log('🔧 Development mode: Setting up QR code retry polling');
            let retryCount = 0;
            const maxRetries = 6; // Increased retries for better success rate

            pollInterval = setInterval(async () => {
              if (!isActive || retryCount >= maxRetries) {
                if (retryCount >= maxRetries) {
                  console.log('🔧 Development mode: Max retries reached, using mock QR code');
                  const mockQRCode = generateMockQRCode();
                  sendEvent({
                    type: 'qr_code',
                    data: {
                      instanceId,
                      qrCode: mockQRCode,
                      expiresAt: new Date(Date.now() + 45000).toISOString(),
                      timestamp: new Date().toISOString(),
                      isRealQR: false,
                      validationPassed: true, // Mock QR codes are valid for display
                      source: 'mock'
                    }
                  });
                }
                clearInterval(pollInterval);
                return;
              }

              retryCount++;
              console.log(`🔧 Development mode: QR retry attempt ${retryCount}/${maxRetries}`);

              try {
                // Use the mapped instance name for consistent status polling
                const devInstanceMapping = (global as any).devInstanceMapping || {};
                const devInstanceName = devInstanceMapping[instanceId] || `agentsalud-dev-${instanceId.substring(0, 8)}`;

                console.log(`🔍 Development mode: Checking status for Evolution API instance "${devInstanceName}" (attempt ${retryCount})`);

                // Check connection status first
                try {
                  const evolutionAPI = createEvolutionAPIService();
                  const statusResponse = await evolutionAPI.getInstanceStatus(devInstanceName);

                  console.log(`📊 Status check result for "${devInstanceName}":`, {
                    state: statusResponse.state,
                    status: statusResponse.status
                  });

                  if (statusResponse.state === 'open') {
                    console.log('✅ Development mode: WhatsApp connected!');
                    sendEvent({
                      type: 'status_update',
                      data: {
                        instanceId,
                        status: 'connected',
                        message: '¡WhatsApp conectado exitosamente!',
                        timestamp: new Date().toISOString()
                      }
                    });

                    // Stop polling and cleanup
                    isActive = false;
                    clearInterval(pollInterval);
                    console.log('🧹 Stopping polling - WhatsApp connection established');
                    return;
                  }
                } catch (statusError) {
                  console.log(`⚠️ Development mode: Status check failed (attempt ${retryCount}):`, statusError.message);
                }

                const realQR = await getRealQRCode(devInstanceName);

                if (realQR) {
                  const validation = validateQRCode(realQR.qrCode);
                  if (validation.isValid) {
                    console.log('✅ Development mode: Got QR code on retry:', {
                      isRealQR: validation.isRealQR,
                      validationPassed: validation.isValid,
                      source: realQR.source
                    });
                    sendEvent({
                      type: 'qr_code',
                      data: {
                        instanceId,
                        qrCode: realQR.qrCode,
                        expiresAt: new Date(Date.now() + 45000).toISOString(),
                        timestamp: new Date().toISOString(),
                        isRealQR: validation.isRealQR,
                        validationPassed: validation.isValid,
                        source: realQR.source
                      }
                    });
                    // Don't clear interval - keep checking for connection status
                  } else {
                    console.log(`⚠️ Development mode: QR validation failed (attempt ${retryCount}):`, validation.reason);
                  }
                } else {
                  console.log(`⚠️ Development mode: QR not ready yet (attempt ${retryCount}/${maxRetries})`);
                }
              } catch (retryError) {
                console.log(`⚠️ Development mode: Retry ${retryCount} failed:`, retryError.message);
              }
            }, 3000); // Retry every 3 seconds
          }

          // Set up heartbeat
          heartbeatInterval = setInterval(() => {
            if (!isActive) {
              clearInterval(heartbeatInterval);
              return;
            }
            
            sendEvent({
              type: 'heartbeat',
              data: {
                instanceId,
                timestamp: new Date().toISOString()
              }
            });
          }, 30000); // Heartbeat every 30 seconds

        } catch (error) {
          console.error('❌ Error initializing QR code stream:', error);
          sendEvent({
            type: 'error',
            data: {
              instanceId,
              message: 'Failed to initialize stream',
              timestamp: new Date().toISOString()
            }
          });
          controller.close();
        }
      };

      // Handle stream cancellation
      const cleanup = () => {
        console.log('🧹 Cleaning up QR code stream for instance:', instanceId);
        isActive = false;
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = undefined;
        }
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = undefined;
        }

        // Clean up instance mapping
        const devInstanceMapping = (global as any).devInstanceMapping || {};
        if (devInstanceMapping[instanceId]) {
          console.log(`🧹 Cleaning up instance mapping for "${instanceId}"`);
          delete devInstanceMapping[instanceId];
        }

        try {
          controller.close();
        } catch (error) {
          // Controller might already be closed
          console.log('ℹ️ Stream controller already closed');
        }
      };

      // Initialize the stream
      initializeStream();

      // Return cleanup function
      return cleanup;
    },

    cancel() {
      console.log('🔌 QR code stream cancelled for instance:', instanceId);
    }
  });

  // Return SSE response
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}
