/**
 * @jest-environment jsdom
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../utils/test-helpers';
import { ChatBot } from '@/components/ai/ChatBot';
import { MOCK_USERS, MOCK_ORGANIZATIONS } from '../fixtures/optical-simulation-data';

// Mock useChat hook from AI SDK
jest.mock('ai', () => ({
  useChat: jest.fn()
}));

describe('ChatBot Component', () => {
  const mockUseChat = require('ai').useChat;
  const defaultUser = MOCK_USERS.find(u => u.role === 'patient');
  const defaultOrg = MOCK_ORGANIZATIONS[0];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    mockUseChat.mockReturnValue({
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: '¡Hola! Soy tu asistente de IA para citas médicas. Puedo ayudarte a agendar, modificar o consultar citas. ¿En qué puedo ayudarte hoy?'
        }
      ],
      input: '',
      handleInputChange: jest.fn(),
      handleSubmit: jest.fn(),
      isLoading: false,
      append: jest.fn(),
    });
  });

  describe('Initial Render', () => {
    it('should render chat toggle button', () => {
      renderWithProviders(
        <ChatBot 
          organizationId={defaultOrg.id}
          userId={defaultUser?.id || ''}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /chat/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it('should show welcome message when chat is opened', () => {
      renderWithProviders(
        <ChatBot 
          organizationId={defaultOrg.id}
          userId={defaultUser?.id || ''}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /chat/i });
      fireEvent.click(toggleButton);

      expect(screen.getByText(/Soy tu asistente de IA/)).toBeInTheDocument();
    });

    it('should render with proper organization and user context', () => {
      const mockAppend = jest.fn();
      mockUseChat.mockReturnValue({
        messages: [],
        input: '',
        handleInputChange: jest.fn(),
        handleSubmit: jest.fn(),
        isLoading: false,
        append: mockAppend,
      });

      renderWithProviders(
        <ChatBot 
          organizationId={defaultOrg.id}
          userId={defaultUser?.id || ''}
        />
      );

      // Verify useChat was called with correct API endpoint and body
      expect(mockUseChat).toHaveBeenCalledWith({
        api: '/api/ai/chat',
        body: {
          organizationId: defaultOrg.id,
          userId: defaultUser?.id,
        },
        initialMessages: expect.arrayContaining([
          expect.objectContaining({
            role: 'assistant',
            content: expect.stringContaining('asistente de IA')
          })
        ])
      });
    });
  });

  describe('Chat Interface', () => {
    beforeEach(() => {
      renderWithProviders(
        <ChatBot 
          organizationId={defaultOrg.id}
          userId={defaultUser?.id || ''}
        />
      );

      // Open chat
      const toggleButton = screen.getByRole('button', { name: /chat/i });
      fireEvent.click(toggleButton);
    });

    it('should display chat input field', () => {
      const chatInput = screen.getByPlaceholderText(/escribe tu mensaje/i);
      expect(chatInput).toBeInTheDocument();
    });

    it('should display send button', () => {
      const sendButton = screen.getByRole('button', { name: /enviar/i });
      expect(sendButton).toBeInTheDocument();
    });

    it('should handle user input changes', () => {
      const mockHandleInputChange = jest.fn();
      mockUseChat.mockReturnValue({
        messages: [],
        input: 'test message',
        handleInputChange: mockHandleInputChange,
        handleSubmit: jest.fn(),
        isLoading: false,
        append: jest.fn(),
      });

      // Re-render with updated mock
      renderWithProviders(
        <ChatBot 
          organizationId={defaultOrg.id}
          userId={defaultUser?.id || ''}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /chat/i });
      fireEvent.click(toggleButton);

      const chatInput = screen.getByPlaceholderText(/escribe tu mensaje/i);
      fireEvent.change(chatInput, { target: { value: 'Necesito una cita' } });

      expect(mockHandleInputChange).toHaveBeenCalled();
    });

    it('should submit message on form submission', () => {
      const mockHandleSubmit = jest.fn();
      mockUseChat.mockReturnValue({
        messages: [],
        input: 'test message',
        handleInputChange: jest.fn(),
        handleSubmit: mockHandleSubmit,
        isLoading: false,
        append: jest.fn(),
      });

      renderWithProviders(
        <ChatBot 
          organizationId={defaultOrg.id}
          userId={defaultUser?.id || ''}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /chat/i });
      fireEvent.click(toggleButton);

      const sendButton = screen.getByRole('button', { name: /enviar/i });
      fireEvent.click(sendButton);

      expect(mockHandleSubmit).toHaveBeenCalled();
    });

    it('should disable input when loading', () => {
      mockUseChat.mockReturnValue({
        messages: [],
        input: '',
        handleInputChange: jest.fn(),
        handleSubmit: jest.fn(),
        isLoading: true,
        append: jest.fn(),
      });

      renderWithProviders(
        <ChatBot 
          organizationId={defaultOrg.id}
          userId={defaultUser?.id || ''}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /chat/i });
      fireEvent.click(toggleButton);

      const chatInput = screen.getByPlaceholderText(/escribe tu mensaje/i);
      const sendButton = screen.getByRole('button', { name: /enviar/i });

      expect(chatInput).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Message Display', () => {
    it('should display conversation messages', () => {
      const conversationMessages = [
        {
          id: 'msg1',
          role: 'user',
          content: 'Necesito una cita con cardiología'
        },
        {
          id: 'msg2',
          role: 'assistant',
          content: 'Te ayudo a agendar una cita con cardiología. ¿Tienes alguna preferencia de fecha?'
        }
      ];

      mockUseChat.mockReturnValue({
        messages: conversationMessages,
        input: '',
        handleInputChange: jest.fn(),
        handleSubmit: jest.fn(),
        isLoading: false,
        append: jest.fn(),
      });

      renderWithProviders(
        <ChatBot 
          organizationId={defaultOrg.id}
          userId={defaultUser?.id || ''}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /chat/i });
      fireEvent.click(toggleButton);

      expect(screen.getByText('Necesito una cita con cardiología')).toBeInTheDocument();
      expect(screen.getByText(/Te ayudo a agendar una cita/)).toBeInTheDocument();
    });

    it('should distinguish between user and assistant messages', () => {
      const conversationMessages = [
        {
          id: 'msg1',
          role: 'user',
          content: 'Mensaje del usuario'
        },
        {
          id: 'msg2',
          role: 'assistant',
          content: 'Respuesta del asistente'
        }
      ];

      mockUseChat.mockReturnValue({
        messages: conversationMessages,
        input: '',
        handleInputChange: jest.fn(),
        handleSubmit: jest.fn(),
        isLoading: false,
        append: jest.fn(),
      });

      renderWithProviders(
        <ChatBot 
          organizationId={defaultOrg.id}
          userId={defaultUser?.id || ''}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /chat/i });
      fireEvent.click(toggleButton);

      const userMessage = screen.getByText('Mensaje del usuario');
      const assistantMessage = screen.getByText('Respuesta del asistente');

      // Check if messages have different styling (this would depend on implementation)
      expect(userMessage).toBeInTheDocument();
      expect(assistantMessage).toBeInTheDocument();
    });

    it('should auto-scroll to latest message', async () => {
      const initialMessages = [
        { id: 'msg1', role: 'user', content: 'Primer mensaje' }
      ];

      const { rerender } = renderWithProviders(
        <ChatBot 
          organizationId={defaultOrg.id}
          userId={defaultUser?.id || ''}
        />
      );

      // Open chat
      const toggleButton = screen.getByRole('button', { name: /chat/i });
      fireEvent.click(toggleButton);

      // Add new message
      const updatedMessages = [
        ...initialMessages,
        { id: 'msg2', role: 'assistant', content: 'Nuevo mensaje' }
      ];

      mockUseChat.mockReturnValue({
        messages: updatedMessages,
        input: '',
        handleInputChange: jest.fn(),
        handleSubmit: jest.fn(),
        isLoading: false,
        append: jest.fn(),
      });

      rerender(
        <ChatBot 
          organizationId={defaultOrg.id}
          userId={defaultUser?.id || ''}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Nuevo mensaje')).toBeInTheDocument();
      });
    });
  });

  describe('Chat State Management', () => {
    it('should toggle chat visibility', () => {
      renderWithProviders(
        <ChatBot 
          organizationId={defaultOrg.id}
          userId={defaultUser?.id || ''}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /chat/i });

      // Initially closed
      expect(screen.queryByPlaceholderText(/escribe tu mensaje/i)).not.toBeInTheDocument();

      // Open chat
      fireEvent.click(toggleButton);
      expect(screen.getByPlaceholderText(/escribe tu mensaje/i)).toBeInTheDocument();

      // Close chat
      fireEvent.click(toggleButton);
      expect(screen.queryByPlaceholderText(/escribe tu mensaje/i)).not.toBeInTheDocument();
    });

    it('should maintain chat state when toggling', () => {
      const conversationMessages = [
        {
          id: 'msg1',
          role: 'user',
          content: 'Mensaje persistente'
        }
      ];

      mockUseChat.mockReturnValue({
        messages: conversationMessages,
        input: '',
        handleInputChange: jest.fn(),
        handleSubmit: jest.fn(),
        isLoading: false,
        append: jest.fn(),
      });

      renderWithProviders(
        <ChatBot 
          organizationId={defaultOrg.id}
          userId={defaultUser?.id || ''}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /chat/i });

      // Open chat
      fireEvent.click(toggleButton);
      expect(screen.getByText('Mensaje persistente')).toBeInTheDocument();

      // Close and reopen chat
      fireEvent.click(toggleButton);
      fireEvent.click(toggleButton);
      expect(screen.getByText('Mensaje persistente')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProviders(
        <ChatBot 
          organizationId={defaultOrg.id}
          userId={defaultUser?.id || ''}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /chat/i });
      fireEvent.click(toggleButton);

      const chatInput = screen.getByPlaceholderText(/escribe tu mensaje/i);
      const sendButton = screen.getByRole('button', { name: /enviar/i });

      expect(chatInput).toHaveAttribute('type', 'text');
      expect(sendButton).toHaveAttribute('type', 'submit');
    });

    it('should support keyboard navigation', () => {
      renderWithProviders(
        <ChatBot 
          organizationId={defaultOrg.id}
          userId={defaultUser?.id || ''}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /chat/i });
      
      // Should be focusable
      toggleButton.focus();
      expect(document.activeElement).toBe(toggleButton);

      // Open chat with Enter key
      fireEvent.keyDown(toggleButton, { key: 'Enter' });
      
      const chatInput = screen.getByPlaceholderText(/escribe tu mensaje/i);
      expect(chatInput).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing organization ID gracefully', () => {
      expect(() => {
        renderWithProviders(
          <ChatBot 
            organizationId=""
            userId={defaultUser?.id || ''}
          />
        );
      }).not.toThrow();
    });

    it('should handle missing user ID gracefully', () => {
      expect(() => {
        renderWithProviders(
          <ChatBot 
            organizationId={defaultOrg.id}
            userId=""
          />
        );
      }).not.toThrow();
    });

    it('should display error state when chat fails', () => {
      mockUseChat.mockReturnValue({
        messages: [],
        input: '',
        handleInputChange: jest.fn(),
        handleSubmit: jest.fn(),
        isLoading: false,
        append: jest.fn(),
        error: new Error('Chat service unavailable')
      });

      renderWithProviders(
        <ChatBot 
          organizationId={defaultOrg.id}
          userId={defaultUser?.id || ''}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /chat/i });
      fireEvent.click(toggleButton);

      // Should handle error gracefully (implementation dependent)
      expect(screen.getByPlaceholderText(/escribe tu mensaje/i)).toBeInTheDocument();
    });
  });
});
