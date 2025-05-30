/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AIProvider, useAI, useAIAppointments } from '@/contexts/ai-context';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock fetch for AI appointments
global.fetch = jest.fn();

// Test component to access AI context
function TestComponent() {
  const {
    conversations,
    currentConversation,
    createConversation,
    addMessage,
    isAIEnabled,
    setIsAIEnabled,
    preferences,
    updatePreferences,
    analytics
  } = useAI();

  // Add null checks to prevent undefined errors
  const conversationsCount = conversations ? conversations.length : 0;
  const totalConversations = analytics ? analytics.totalConversations : 0;
  const language = preferences ? preferences.language : 'es';

  return (
    <div>
      <div data-testid="conversations-count">{conversationsCount}</div>
      <div data-testid="current-conversation">
        {currentConversation ? currentConversation.id : 'none'}
      </div>
      <div data-testid="ai-enabled">{isAIEnabled ? 'enabled' : 'disabled'}</div>
      <div data-testid="language">{language}</div>
      <div data-testid="total-conversations">{totalConversations}</div>
      
      <button
        data-testid="create-conversation"
        onClick={() => createConversation()}
      >
        Create Conversation
      </button>
      
      <button
        data-testid="add-message"
        onClick={() => {
          if (currentConversation) {
            addMessage(currentConversation.id, {
              content: 'Test message',
              role: 'user'
            });
          }
        }}
      >
        Add Message
      </button>
      
      <button
        data-testid="toggle-ai"
        onClick={() => setIsAIEnabled(!isAIEnabled)}
      >
        Toggle AI
      </button>
      
      <button
        data-testid="change-language"
        onClick={() => updatePreferences({ language: 'en' })}
      >
        Change Language
      </button>
    </div>
  );
}

// Test component for AI appointments hook
function TestAIAppointmentsComponent() {
  const { processAppointmentRequest } = useAIAppointments();
  const [result, setResult] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleProcessRequest = async () => {
    try {
      const response = await processAppointmentRequest(
        'Necesito una cita con cardiología',
        'test-org',
        'test-user'
      );
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div>
      <button data-testid="process-request" onClick={handleProcessRequest}>
        Process Request
      </button>
      {result && <div data-testid="result">{JSON.stringify(result)}</div>}
      {error && <div data-testid="error">{error}</div>}
    </div>
  );
}

describe('AI Context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should provide initial AI context values', () => {
    render(
      <AIProvider>
        <TestComponent />
      </AIProvider>
    );

    expect(screen.getByTestId('conversations-count')).toHaveTextContent('0');
    expect(screen.getByTestId('current-conversation')).toHaveTextContent('none');
    expect(screen.getByTestId('ai-enabled')).toHaveTextContent('enabled');
    expect(screen.getByTestId('language')).toHaveTextContent('es');
    expect(screen.getByTestId('total-conversations')).toHaveTextContent('0');
  });

  it('should create a new conversation', async () => {
    render(
      <AIProvider>
        <TestComponent />
      </AIProvider>
    );

    const createButton = screen.getByTestId('create-conversation');
    
    await act(async () => {
      createButton.click();
    });

    expect(screen.getByTestId('conversations-count')).toHaveTextContent('1');
    expect(screen.getByTestId('current-conversation')).not.toHaveTextContent('none');
    expect(screen.getByTestId('total-conversations')).toHaveTextContent('1');
  });

  it('should add messages to conversation', async () => {
    render(
      <AIProvider>
        <TestComponent />
      </AIProvider>
    );

    const createButton = screen.getByTestId('create-conversation');
    const addMessageButton = screen.getByTestId('add-message');
    
    await act(async () => {
      createButton.click();
    });

    await act(async () => {
      addMessageButton.click();
    });

    // Verify that localStorage was called to save conversations
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ai-conversations',
        expect.any(String)
      );
    });
  });

  it('should toggle AI enabled state', async () => {
    render(
      <AIProvider>
        <TestComponent />
      </AIProvider>
    );

    const toggleButton = screen.getByTestId('toggle-ai');
    
    expect(screen.getByTestId('ai-enabled')).toHaveTextContent('enabled');
    
    await act(async () => {
      toggleButton.click();
    });

    expect(screen.getByTestId('ai-enabled')).toHaveTextContent('disabled');
  });

  it('should update preferences', async () => {
    render(
      <AIProvider>
        <TestComponent />
      </AIProvider>
    );

    const changeLanguageButton = screen.getByTestId('change-language');
    
    expect(screen.getByTestId('language')).toHaveTextContent('es');
    
    await act(async () => {
      changeLanguageButton.click();
    });

    expect(screen.getByTestId('language')).toHaveTextContent('en');
    
    // Verify that preferences were saved to localStorage
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ai-preferences',
        expect.stringContaining('"language":"en"')
      );
    });
  });

  it('should load conversations from localStorage', () => {
    const mockConversations = [
      {
        id: 'conv_1',
        messages: [
          {
            id: 'msg_1',
            content: 'Hello',
            role: 'user',
            timestamp: '2024-01-01T00:00:00.000Z'
          }
        ],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        status: 'active'
      }
    ];

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'ai-conversations') {
        return JSON.stringify(mockConversations);
      }
      return null;
    });

    render(
      <AIProvider>
        <TestComponent />
      </AIProvider>
    );

    expect(screen.getByTestId('conversations-count')).toHaveTextContent('1');
    expect(screen.getByTestId('total-conversations')).toHaveTextContent('1');
  });

  it('should handle localStorage errors gracefully', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    // Should not throw an error
    expect(() => {
      render(
        <AIProvider>
          <TestComponent />
        </AIProvider>
      );
    }).not.toThrow();

    // Should still show default values
    expect(screen.getByTestId('conversations-count')).toHaveTextContent('0');
    expect(screen.getByTestId('ai-enabled')).toHaveTextContent('enabled');
  });
});

describe('useAIAppointments Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should process appointment request successfully', async () => {
    const mockResponse = {
      success: true,
      intent: {
        intent: 'book',
        specialty: 'cardiología',
        confidence: 0.9
      },
      response: 'Te ayudo a agendar una cita con cardiología.'
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(
      <AIProvider>
        <TestAIAppointmentsComponent />
      </AIProvider>
    );

    const processButton = screen.getByTestId('process-request');
    
    await act(async () => {
      processButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('result')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/ai/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Necesito una cita con cardiología',
        organizationId: 'test-org',
        userId: 'test-user'
      })
    });
  });

  it('should handle API errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    render(
      <AIProvider>
        <TestAIAppointmentsComponent />
      </AIProvider>
    );

    const processButton = screen.getByTestId('process-request');
    
    await act(async () => {
      processButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Failed to process appointment request');
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(
      <AIProvider>
        <TestAIAppointmentsComponent />
      </AIProvider>
    );

    const processButton = screen.getByTestId('process-request');
    
    await act(async () => {
      processButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Network error');
  });
});
