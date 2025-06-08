import { NextRequest, NextResponse } from 'next/server';
import { createEvolutionAPIService } from '@/lib/services/EvolutionAPIService';

/**
 * Development-only QR code test endpoint
 * This bypasses all authentication and provides mock QR codes for testing
 */
export async function GET(request: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({
      success: false,
      error: 'This endpoint is only available in development mode'
    }, { status: 403 });
  }

  try {
    console.log('🔧 Development QR test endpoint called');

    // Try to generate real QR code from Evolution API
    try {
      const evolutionAPI = createEvolutionAPIService();
      const testInstanceName = `dev-test-${Date.now()}`;

      console.log(`🔄 Attempting to create test instance: ${testInstanceName}`);

      // Create a test instance for QR generation
      const createResult = await evolutionAPI.createInstance({
        instanceName: testInstanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      });

      console.log('✅ Test instance created, getting QR code...');

      // Get QR code from the instance
      const qrResult = await evolutionAPI.getQRCode(testInstanceName);

      if (qrResult.qrcode || qrResult.base64) {
        const realQRCode = qrResult.base64 || qrResult.qrcode;

        console.log(`🎉 Real QR code generated! Length: ${realQRCode.length} chars`);

        return NextResponse.json({
          success: true,
          status: 'available',
          message: 'Real QR code from Evolution API',
          data: {
            instanceId: 'dev-test-instance',
            instanceName: testInstanceName,
            status: 'available',
            qrCode: realQRCode,
            expiresAt: new Date(Date.now() + 45000).toISOString(),
            lastUpdated: new Date().toISOString(),
            developmentNote: `Real QR code from Evolution API - Instance: ${testInstanceName}`
          }
        });
      }

    } catch (evolutionError) {
      console.warn('⚠️ Evolution API failed, falling back to mock QR:', evolutionError.message);
    }

    // Fallback to mock QR code if Evolution API fails
    const mockQRCode = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    return NextResponse.json({
      success: true,
      status: 'available',
      message: 'Development mode QR code (Evolution API unavailable)',
      data: {
        instanceId: 'dev-test-instance',
        instanceName: 'development-test-fallback',
        status: 'available',
        qrCode: mockQRCode,
        expiresAt: new Date(Date.now() + 45000).toISOString(),
        lastUpdated: new Date().toISOString(),
        developmentNote: 'Mock QR code fallback - Evolution API unavailable'
      }
    });

  } catch (error) {
    console.error('❌ Error in development QR test:', error);

    return NextResponse.json({
      success: false,
      error: 'Development QR test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}