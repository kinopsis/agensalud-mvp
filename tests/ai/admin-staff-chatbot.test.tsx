/**
 * AdminStaffChatBot Component Tests - FASE 2 MVP
 * Tests for AI chatbot functionality for Admin and Staff roles
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminStaffChatBot from '@/components/ai/AdminStaffChatBot';

// Mock the useChat hook
jest.mock('ai/react', () => ({
  useChat: jest.fn(() => ({
    messages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: '¡Hola! Soy tu asistente administrativo de IA.'
      }
    ],
    input: '',
    handleInputChange: jest.fn(),
    handleSubmit: jest.fn(),
    isLoading: false,
    setMessages: jest.fn()
  }))
}));

// Mock auth and tenant contexts
jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    profile: { id: 'user-1', first_name: 'Test User' }
  })
}));

jest.mock('@/contexts/tenant-context', () => ({
  useTenant: () => ({
    organization: { id: 'org-1', name: 'Test Org' }
  })
}));

describe('AdminStaffChatBot', () => {
  const defaultProps = {
    organizationId: 'org-1',
    userId: 'user-1',
    userRole: 'admin' as const,
    onClose: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders admin chatbot correctly', () => {
      render(<AdminStaffChatBot {...defaultProps} />);
      
      expect(screen.getByText('Asistente Administrativo')).toBeInTheDocument();
      expect(screen.getByText('¡Hola! Soy tu asistente administrativo de IA.')).toBeInTheDocument();
    });

    test('renders staff chatbot correctly', () => {
      render(<AdminStaffChatBot {...defaultProps} userRole="staff" />);
      
      expect(screen.getByText('Asistente Operativo')).toBeInTheDocument();
    });

    test('renders minimized state', () => {
      render(<AdminStaffChatBot {...defaultProps} />);

      // Find and click minimize button (first button in header)
      const headerButtons = screen.getAllByRole('button');
      const minimizeButton = headerButtons.find(btn => btn.querySelector('svg'));
      fireEvent.click(minimizeButton!);

      // Should show floating button
      expect(screen.getByRole('button')).toHaveClass('bg-blue-600');
    });
  });

  describe('Quick Actions', () => {
    test('shows admin quick actions', () => {
      render(<AdminStaffChatBot {...defaultProps} userRole="admin" />);
      
      expect(screen.getByText('Ver reportes')).toBeInTheDocument();
      expect(screen.getByText('Gestionar doctores')).toBeInTheDocument();
      expect(screen.getByText('Configuración')).toBeInTheDocument();
    });

    test('shows staff quick actions', () => {
      render(<AdminStaffChatBot {...defaultProps} userRole="staff" />);
      
      expect(screen.getByText('Nueva cita')).toBeInTheDocument();
      expect(screen.getByText('Citas pendientes')).toBeInTheDocument();
      expect(screen.getByText('Buscar paciente')).toBeInTheDocument();
    });

    test('quick actions trigger navigation', () => {
      // Mock window.location.href
      delete (window as any).location;
      window.location = { href: '' } as any;

      render(<AdminStaffChatBot {...defaultProps} userRole="admin" />);
      
      const reportButton = screen.getByText('Ver reportes');
      fireEvent.click(reportButton);
      
      expect(window.location.href).toBe('/admin/reports');
    });
  });

  describe('Chat Functionality', () => {
    test('displays welcome message based on role', () => {
      render(<AdminStaffChatBot {...defaultProps} userRole="admin" />);

      expect(screen.getByText(/asistente administrativo de IA/)).toBeInTheDocument();
    });

    test('has proper input placeholder for admin', () => {
      render(<AdminStaffChatBot {...defaultProps} userRole="admin" />);
      
      const input = screen.getByPlaceholderText(/Pregunta algo al asistente administrativo/);
      expect(input).toBeInTheDocument();
    });

    test('has proper input placeholder for staff', () => {
      render(<AdminStaffChatBot {...defaultProps} userRole="staff" />);
      
      const input = screen.getByPlaceholderText(/Pregunta algo al asistente operativo/);
      expect(input).toBeInTheDocument();
    });

    test('submit button is disabled when input is empty', () => {
      render(<AdminStaffChatBot {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /send/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(<AdminStaffChatBot {...defaultProps} />);
      
      const chatContainer = screen.getByRole('dialog', { hidden: true });
      expect(chatContainer).toBeInTheDocument();
    });

    test('supports keyboard navigation', () => {
      render(<AdminStaffChatBot {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter' });
      
      // Should not crash and should handle keyboard events
      expect(input).toBeInTheDocument();
    });

    test('close button works', () => {
      const onClose = jest.fn();
      render(<AdminStaffChatBot {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    test('shows loading indicator when isLoading is true', () => {
      const { useChat } = require('ai/react');
      useChat.mockReturnValue({
        messages: [],
        input: '',
        handleInputChange: jest.fn(),
        handleSubmit: jest.fn(),
        isLoading: true,
        setMessages: jest.fn()
      });

      render(<AdminStaffChatBot {...defaultProps} />);
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test('disables input when loading', () => {
      const { useChat } = require('ai/react');
      useChat.mockReturnValue({
        messages: [],
        input: '',
        handleInputChange: jest.fn(),
        handleSubmit: jest.fn(),
        isLoading: true,
        setMessages: jest.fn()
      });

      render(<AdminStaffChatBot {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });
  });

  describe('Role-specific Features', () => {
    test('admin role shows administrative capabilities', () => {
      render(<AdminStaffChatBot {...defaultProps} userRole="admin" />);
      
      expect(screen.getByText(/Gestión de Personal/)).toBeInTheDocument();
      expect(screen.getByText(/Configuración del Sistema/)).toBeInTheDocument();
    });

    test('staff role shows operational capabilities', () => {
      render(<AdminStaffChatBot {...defaultProps} userRole="staff" />);
      
      expect(screen.getByText(/Agendamiento de Citas/)).toBeInTheDocument();
      expect(screen.getByText(/Atención al Paciente/)).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    test('passes correct props to useChat hook', () => {
      const { useChat } = require('ai/react');
      
      render(<AdminStaffChatBot {...defaultProps} />);
      
      expect(useChat).toHaveBeenCalledWith({
        api: '/api/ai/admin-staff-chat',
        body: {
          organizationId: 'org-1',
          userId: 'user-1',
          userRole: 'admin'
        },
        initialMessages: expect.arrayContaining([
          expect.objectContaining({
            role: 'assistant',
            content: expect.stringContaining('asistente administrativo')
          })
        ]),
        onFinish: expect.any(Function)
      });
    });

    test('handles message processing correctly', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<AdminStaffChatBot {...defaultProps} />);
      
      // Simulate message processing
      const { useChat } = require('ai/react');
      const onFinish = useChat.mock.calls[0][0].onFinish;
      
      await onFinish({ content: 'agendar una cita' });
      
      expect(consoleSpy).toHaveBeenCalledWith('Appointment booking intent detected');
      
      consoleSpy.mockRestore();
    });
  });
});
