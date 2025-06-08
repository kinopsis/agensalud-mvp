/**
 * Debug script to test QR code generation
 * This will help us understand what's happening with the QR code API
 */

async function testQRCodeGeneration() {
  try {
    console.log('🔍 Testing QR code generation...');

    // Test the working instance from the logs
    const instanceId = 'c4165106-2fb3-49e8-adc2-275fda3ae34c';

    console.log('📡 Making request to QR endpoint...');
    const response = await fetch(`http://localhost:3000/api/channels/whatsapp/instances/${instanceId}/qr`);
    const result = await response.json();

    console.log('📱 QR API Response:', {
      status: response.status,
      success: result.success,
      hasQRCode: !!result.data?.qrCode,
      qrCodeLength: result.data?.qrCode?.length || 0,
      instanceStatus: result.data?.status,
      error: result.error,
      developmentNote: result.data?.developmentNote
    });

    if (result.data?.qrCode) {
      console.log('✅ QR Code available!');
      console.log('🔗 QR Code preview:', result.data.qrCode.substring(0, 100) + '...');

      // Test if it's a valid data URL
      if (result.data.qrCode.startsWith('data:image/')) {
        console.log('✅ Valid image data URL format');
      } else {
        console.log('⚠️ QR code is not in data URL format');
      }
    } else {
      console.log('❌ No QR Code available');
      console.log('📋 Full response:', JSON.stringify(result, null, 2));
    }

    // Test the development endpoint that bypasses authentication
    console.log('\n🔧 Testing development QR endpoint...');
    const devResponse = await fetch(`http://localhost:3000/api/dev/qr-test`);
    const devResult = await devResponse.json();

    console.log('🔧 Development Response:', {
      status: devResponse.status,
      success: devResult.success,
      hasQRCode: !!devResult.data?.qrCode,
      developmentNote: devResult.data?.developmentNote,
      message: devResult.message
    });

    if (devResult.data?.qrCode) {
      console.log('✅ Development QR Code available!');
      console.log('🔗 QR Code preview:', devResult.data.qrCode.substring(0, 100) + '...');
    }

  } catch (error) {
    console.error('❌ Error testing QR code:', error);
  }
}

// Run the test
testQRCodeGeneration();
