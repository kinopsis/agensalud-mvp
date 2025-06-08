/**
 * QRCodeDisplay Component
 * 
 * A robust QR code display component that handles both development and production modes.
 * Uses react-qr-code library for reliable QR code generation and display.
 * 
 * Features:
 * - Real QR code generation for development mode
 * - Base64 image display for production mode
 * - Comprehensive error handling and fallbacks
 * - Debug logging for troubleshooting
 * - Responsive design with proper styling
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { QrCode, AlertCircle, RefreshCw } from 'lucide-react';

// =====================================================
// INTERFACES
// =====================================================

interface QRCodeDisplayProps {
  /** QR code data object */
  qrData: {
    code?: string;
    base64?: string;
    expiresAt: Date;
    isRealQR?: boolean;
    source?: 'evolution_api' | 'database' | 'mock';
  } | null;
  /** Whether we're in development mode */
  isDevelopment?: boolean;
  /** Size of the QR code in pixels */
  size?: number;
  /** Additional CSS classes */
  className?: string;
  /** Callback when QR code needs refresh */
  onRefresh?: () => void;
  /** Show refresh button */
  showRefreshButton?: boolean;
}

// =====================================================
// COMPONENT
// =====================================================

/**
 * QRCodeDisplay Component
 * 
 * Displays QR codes with robust error handling and development mode support.
 */
export default function QRCodeDisplay({
  qrData,
  isDevelopment = process.env.NODE_ENV === 'development',
  size = 192, // 48 * 4 = 192px (w-48 h-48)
  className = '',
  onRefresh,
  showRefreshButton = true
}: QRCodeDisplayProps) {
  const [imageError, setImageError] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Enhanced debug logging
  useEffect(() => {
    if (isDevelopment && qrData) {
      const debug = {
        hasCode: !!qrData.code,
        hasBase64: !!qrData.base64,
        codeLength: qrData.code?.length || 0,
        base64Length: qrData.base64?.length || 0,
        expiresAt: qrData.expiresAt,
        isExpired: qrData.expiresAt < new Date(),
        isRealQR: qrData.isRealQR,
        source: qrData.source,
        isDevelopmentMode: isDevelopment,
        timestamp: new Date().toISOString(),
        isValidBase64: qrData.base64 ? qrData.base64.length > 100 : false
      };

      setDebugInfo(debug);
      console.log('🔍 QRCodeDisplay Debug Info:', debug);

      // Additional validation logging
      if (qrData.base64 && qrData.base64.length < 100) {
        console.warn('⚠️ QR Code base64 seems too short, might be invalid:', qrData.base64.length);
      }

      if (qrData.isRealQR === false) {
        console.warn('⚠️ QR Code marked as not real, source:', qrData.source);
      }
    }
  }, [qrData, isDevelopment]);

  // Reset image error when qrData changes
  useEffect(() => {
    setImageError(false);
  }, [qrData]);

  /**
   * Handle image load error
   */
  const handleImageError = () => {
    console.error('❌ QR Code image failed to load:', {
      base64Length: qrData?.base64?.length,
      base64Preview: qrData?.base64?.substring(0, 50) + '...'
    });
    setImageError(true);
  };

  /**
   * Validate QR code base64 data
   */
  const validateQRCodeBase64 = (base64: string): boolean => {
    try {
      if (!base64 || typeof base64 !== 'string') return false;

      // Check minimum length (real QR codes are much longer than mock data)
      if (base64.length < 100) {
        console.warn('⚠️ QR code base64 too short, likely invalid:', base64.length);
        return false;
      }

      // Extract pure base64 data (remove data URL prefix if present)
      let pureBase64 = base64;
      if (base64.startsWith('data:image/')) {
        const commaIndex = base64.indexOf(',');
        if (commaIndex !== -1) {
          pureBase64 = base64.substring(commaIndex + 1);
        }
      }

      // Try to decode base64 to verify it's valid
      const decoded = atob(pureBase64);
      if (decoded.length < 50) {
        console.warn('⚠️ Decoded QR code too small, likely invalid');
        return false;
      }

      console.log('✅ QR code base64 validation passed:', {
        originalLength: base64.length,
        pureBase64Length: pureBase64.length,
        decodedLength: decoded.length,
        hasDataPrefix: base64.startsWith('data:image/')
      });

      return true;
    } catch (error) {
      console.error('❌ Invalid base64 QR code:', error);
      return false;
    }
  };

  /**
   * Render loading state
   */
  const renderLoading = () => (
    <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`} 
         style={{ width: size, height: size }}>
      <div className="text-center">
        <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-spin" />
        <p className="text-sm text-gray-500">Generando QR...</p>
      </div>
    </div>
  );

  /**
   * Render error state
   */
  const renderError = () => (
    <div className={`bg-red-50 border-2 border-red-200 rounded-lg flex items-center justify-center ${className}`} 
         style={{ width: size, height: size }}>
      <div className="text-center p-4">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-600 mb-2">Error al cargar QR</p>
        {showRefreshButton && onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  );

  /**
   * Render development status message
   */
  const renderDevelopmentStatus = () => {
    return (
      <div className={`bg-blue-50 border-2 border-blue-200 rounded-lg flex items-center justify-center ${className}`}
           style={{ width: size, height: size }}>
        <div className="text-center p-4">
          <QrCode className="h-8 w-8 text-blue-500 mx-auto mb-2" />
          <p className="text-sm text-blue-600 mb-2">Modo Desarrollo</p>
          <p className="text-xs text-gray-600 mb-2">
            Esperando QR code real de Evolution API
          </p>
          {showRefreshButton && onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
            >
              Reintentar Conexión
            </button>
          )}
          <div className="mt-2">
            <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-bl-lg">
              DEV
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render production QR code from base64 with validation
   */
  const renderProductionQR = () => {
    if (!qrData?.base64) {
      console.warn('⚠️ No base64 data available for QR code');
      return renderError();
    }

    // Validate QR code before rendering
    if (!validateQRCodeBase64(qrData.base64)) {
      console.error('❌ Invalid QR code base64 data');
      return renderError();
    }

    if (imageError) {
      return renderError();
    }

    // Determine border color based on QR source and validity
    const borderColor = qrData.isRealQR ? 'border-green-200' : 'border-blue-200';
    const textColor = qrData.isRealQR ? 'text-green-600' : 'text-blue-600';

    // Prepare image source - handle both raw base64 and data URL formats
    const imageSrc = qrData.base64.startsWith('data:image/')
      ? qrData.base64
      : `data:image/png;base64,${qrData.base64}`;

    return (
      <div className={`bg-white p-4 rounded-lg border-2 ${borderColor} ${className}`}>
        <img
          src={imageSrc}
          alt="WhatsApp QR Code"
          style={{ width: size - 32, height: size - 32 }}
          className="mx-auto"
          onError={handleImageError}
          onLoad={() => console.log('✅ QR Code image loaded successfully:', {
            srcLength: imageSrc.length,
            hasDataPrefix: imageSrc.startsWith('data:image/'),
            isRealQR: qrData.isRealQR,
            source: qrData.source
          })}
        />
        <div className="mt-2 text-center">
          <p className={`text-xs ${textColor} font-medium`}>
            {qrData.isRealQR ? 'Código QR Real' : 'Código QR Activo'}
          </p>
          <p className="text-xs text-gray-500">
            Expira: {qrData.expiresAt.toLocaleTimeString()}
          </p>
          {qrData.source && isDevelopment && (
            <p className="text-xs text-gray-400">
              Fuente: {qrData.source}
            </p>
          )}
        </div>
      </div>
    );
  };

  /**
   * Render QR code with text fallback
   */
  const renderQRWithTextFallback = () => {
    if (!qrData?.code) {
      return renderError();
    }

    return (
      <div className={`bg-white p-4 rounded-lg border-2 border-purple-200 ${className}`}>
        <QRCode
          value={qrData.code}
          size={size - 32}
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          viewBox={`0 0 256 256`}
        />
        <div className="mt-2 text-center">
          <p className="text-xs text-purple-600 font-medium">QR Generado</p>
          <p className="text-xs text-gray-500">Desde código de texto</p>
        </div>
      </div>
    );
  };

  // =====================================================
  // RENDER LOGIC
  // =====================================================

  // No QR data available
  if (!qrData) {
    return renderLoading();
  }

  // Check if QR code is expired
  if (qrData.expiresAt < new Date()) {
    return (
      <div className={`bg-yellow-50 border-2 border-yellow-200 rounded-lg flex items-center justify-center ${className}`} 
           style={{ width: size, height: size }}>
        <div className="text-center p-4">
          <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-sm text-yellow-600 mb-2">QR Expirado</p>
          {showRefreshButton && onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-2 py-1 rounded"
            >
              Generar Nuevo
            </button>
          )}
        </div>
      </div>
    );
  }

  // Priority 1: Real QR code from base64 (both development and production)
  if (qrData.base64 && !imageError && validateQRCodeBase64(qrData.base64)) {
    console.log('✅ Rendering real QR code from base64:', {
      isRealQR: qrData.isRealQR,
      source: qrData.source,
      base64Length: qrData.base64.length,
      hasDataPrefix: qrData.base64.startsWith('data:image/')
    });
    return renderProductionQR();
  }

  // Priority 2: Development mode without real QR - show status (but only for non-real QR codes)
  if (isDevelopment && (!qrData.base64 || !validateQRCodeBase64(qrData.base64)) && !qrData.isRealQR) {
    console.log('🔧 Development mode: No valid QR code available, showing status:', {
      hasBase64: !!qrData.base64,
      base64Length: qrData.base64?.length || 0,
      validationPassed: qrData.base64 ? validateQRCodeBase64(qrData.base64) : false,
      isRealQR: qrData.isRealQR,
      source: qrData.source
    });
    return renderDevelopmentStatus();
  }

  // Priority 3: Force render real QR codes even if validation fails (for Evolution API compatibility)
  if (qrData.isRealQR && qrData.base64 && qrData.base64.length > 1000) {
    console.warn('⚠️ Force rendering real QR code despite validation failure:', {
      base64Length: qrData.base64.length,
      source: qrData.source,
      hasDataPrefix: qrData.base64.startsWith('data:image/')
    });
    return renderProductionQR();
  }

  // Priority 4: Fallback to generating QR from text code (legacy support)
  if (qrData.code && qrData.code.length > 10) {
    console.log('⚠️ Fallback: Generating QR from text code');
    return renderQRWithTextFallback();
  }

  // Final fallback
  console.error('❌ No valid QR code data available:', {
    hasBase64: !!qrData.base64,
    hasCode: !!qrData.code,
    isRealQR: qrData.isRealQR,
    source: qrData.source,
    base64Length: qrData.base64?.length || 0
  });
  return renderError();
}

// =====================================================
// DEBUG COMPONENT (Development only)
// =====================================================

/**
 * QRCodeDebugInfo - Shows debug information in development mode
 */
export function QRCodeDebugInfo({ qrData }: { qrData: any }) {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="mt-4 p-3 bg-gray-100 rounded-lg text-xs">
      <h4 className="font-medium text-gray-700 mb-2">Debug Info:</h4>
      <pre className="text-gray-600 overflow-auto">
        {JSON.stringify(qrData, null, 2)}
      </pre>
    </div>
  );
}
