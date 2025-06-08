/**
 * Enhanced WhatsApp Instance Creation Flow Tests
 * 
 * Tests for the complete two-step connection process including:
 * - Instance creation
 * - QR code display and connection
 * - Real-time status monitoring
 * - Final completion flow
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { SimplifiedWhatsAppInstanceModal } from '@/components/channels/SimplifiedWhatsAppInstanceModal';

// Mock the QRCodeDisplay component
jest.mock('@/components/channels/QRCodeDisplay', () => ({
  QRCodeDisplay: ({ instanceId, instanceName, status, onConnected, onError }: any) => (
    <div data-testid="qr-code-display">
      <div>QR Code Display for {instanceName}</div>
      <div>Instance ID: {instanceId}</div>
      <div>Status: {status}</div>
      <button
        type="button"
        data-testid="simulate-connection"
        onClick={() => onConnected?.()}
      >
        Simulate Connection
      </button>
      <button
        type="button"
        data-testid="simulate-error"
        onClick={() => onError?.('QR code error')}
      >
        Simulate Error
      </button>
    </div>
  )
}));

// Mock EventSource for SSE testing
const mockEventSource = {
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  onmessage: null,
  onerror: null,
  onopen: null,
  readyState: 1,
  url: '',
  withCredentials: false,
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2
};

global.EventSource = jest.fn(() => mockEventSource) as any;

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Enhanced WhatsApp Instance Creation Flow', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onInstanceCreated: jest.fn(),
    organizationId: 'org-1',
    userRole: 'admin' as const,
    organizationName: 'Test Organization'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          instance: {
            id: 'test-instance-id',
            instance_name: 'test-instance'
          }
        }
      })
    });
  });

  it('should complete the full enhanced flow: creation → QR connection → final success', async () => {
    render(<SimplifiedWhatsAppInstanceModal {...defaultProps} />);

    // Step 1: Form submission
    const createButton = screen.getByText('Crear Instancia');
    fireEvent.click(createButton);

    // Wait for creation to complete
    await waitFor(() => {
      expect(screen.getByText('¡Instancia Creada Exitosamente!')).toBeInTheDocument();
    });

    // Step 2: Transition to QR connection
    const connectButton = screen.getByText('Conectar WhatsApp');
    fireEvent.click(connectButton);

    // Verify QR connection step is shown
    await waitFor(() => {
      expect(screen.getByText('Conectar WhatsApp')).toBeInTheDocument();
      expect(screen.getByText('Escanea este código QR con WhatsApp para conectar tu instancia')).toBeInTheDocument();
    });

    // Verify EventSource was created for SSE
    expect(global.EventSource).toHaveBeenCalledWith('/api/channels/whatsapp/instances/test-instance-id/qrcode/stream');

    // Step 3: Simulate successful connection
    const simulateConnectionButton = screen.getByTestId('simulate-connection');
    fireEvent.click(simulateConnectionButton);

    // Step 4: Verify final success step
    await waitFor(() => {
      expect(screen.getByText('¡WhatsApp Conectado Exitosamente!')).toBeInTheDocument();
      expect(screen.getByText('Tu instancia de WhatsApp está ahora conectada y lista para usar.')).toBeInTheDocument();
    });

    // Step 5: Complete the flow
    const finalizeButton = screen.getByText('Finalizar');
    fireEvent.click(finalizeButton);

    // Verify callback was called
    expect(defaultProps.onInstanceCreated).toHaveBeenCalledWith('test-instance-id');
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should handle QR connection errors gracefully', async () => {
    render(<SimplifiedWhatsAppInstanceModal {...defaultProps} />);

    // Complete creation and go to QR step
    const createButton = screen.getByText('Crear Instancia');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Conectar WhatsApp')).toBeInTheDocument();
    });

    const connectButton = screen.getByText('Conectar WhatsApp');
    fireEvent.click(connectButton);

    // Simulate QR error
    const simulateErrorButton = screen.getByTestId('simulate-error');
    fireEvent.click(simulateErrorButton);

    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText('QR code error')).toBeInTheDocument();
      expect(screen.getByText('Reintentar')).toBeInTheDocument();
    });
  });

  it('should allow skipping QR connection', async () => {
    render(<SimplifiedWhatsAppInstanceModal {...defaultProps} />);

    // Complete creation and go to QR step
    const createButton = screen.getByText('Crear Instancia');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Conectar WhatsApp')).toBeInTheDocument();
    });

    const connectButton = screen.getByText('Conectar WhatsApp');
    fireEvent.click(connectButton);

    // Skip connection
    const skipButton = screen.getByText('Conectar más tarde');
    fireEvent.click(skipButton);

    // Verify callback was called without waiting for connection
    expect(defaultProps.onInstanceCreated).toHaveBeenCalledWith('test-instance-id');
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should clean up SSE connection on modal close', async () => {
    render(<SimplifiedWhatsAppInstanceModal {...defaultProps} />);

    // Complete creation and go to QR step
    const createButton = screen.getByText('Crear Instancia');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Conectar WhatsApp')).toBeInTheDocument();
    });

    const connectButton = screen.getByText('Conectar WhatsApp');
    fireEvent.click(connectButton);

    // Close modal
    const closeButton = screen.getByLabelText('Cerrar modal');
    fireEvent.click(closeButton);

    // Verify SSE connection was closed
    expect(mockEventSource.close).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should handle SSE connection events correctly', async () => {
    render(<SimplifiedWhatsAppInstanceModal {...defaultProps} />);

    // Complete creation and go to QR step
    const createButton = screen.getByText('Crear Instancia');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Conectar WhatsApp')).toBeInTheDocument();
    });

    const connectButton = screen.getByText('Conectar WhatsApp');
    fireEvent.click(connectButton);

    // Verify EventSource was created
    expect(global.EventSource).toHaveBeenCalled();

    // Simulate SSE message for QR code
    const qrCodeEvent = {
      data: JSON.stringify({
        type: 'qr_code',
        data: {
          qrCode: 'base64-qr-code-data',
          expiresAt: new Date(Date.now() + 30000).toISOString()
        }
      })
    };

    // Trigger onmessage handler
    if (mockEventSource.onmessage) {
      mockEventSource.onmessage(qrCodeEvent);
    }

    // Simulate connection status update
    const statusEvent = {
      data: JSON.stringify({
        type: 'status_update',
        data: {
          status: 'connected'
        }
      })
    };

    if (mockEventSource.onmessage) {
      mockEventSource.onmessage(statusEvent);
    }

    // Verify final success step is shown
    await waitFor(() => {
      expect(screen.getByText('¡WhatsApp Conectado Exitosamente!')).toBeInTheDocument();
    });
  });

  it('should show connection status indicators correctly', async () => {
    render(<SimplifiedWhatsAppInstanceModal {...defaultProps} />);

    // Complete creation and go to QR step
    const createButton = screen.getByText('Crear Instancia');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Conectar WhatsApp')).toBeInTheDocument();
    });

    const connectButton = screen.getByText('Conectar WhatsApp');
    fireEvent.click(connectButton);

    // Verify connecting status is shown
    await waitFor(() => {
      expect(screen.getByText('Conectando...')).toBeInTheDocument();
    });

    // Simulate connection
    const simulateConnectionButton = screen.getByTestId('simulate-connection');
    fireEvent.click(simulateConnectionButton);

    // Verify connected status
    await waitFor(() => {
      expect(screen.getByText('¡WhatsApp Conectado Exitosamente!')).toBeInTheDocument();
    });
  });

  it('should display QR connection instructions', async () => {
    render(<SimplifiedWhatsAppInstanceModal {...defaultProps} />);

    // Complete creation and go to QR step
    const createButton = screen.getByText('Crear Instancia');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Conectar WhatsApp')).toBeInTheDocument();
    });

    const connectButton = screen.getByText('Conectar WhatsApp');
    fireEvent.click(connectButton);

    // Verify instructions are displayed
    await waitFor(() => {
      expect(screen.getByText('Instrucciones:')).toBeInTheDocument();
      expect(screen.getByText('Abre WhatsApp en tu teléfono')).toBeInTheDocument();
      expect(screen.getByText('Ve a Configuración → Dispositivos vinculados')).toBeInTheDocument();
      expect(screen.getByText('Escanea este código QR con la cámara')).toBeInTheDocument();
    });
  });
});
