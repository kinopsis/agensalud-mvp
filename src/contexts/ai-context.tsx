'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AIMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  metadata?: {
    intent?: string;
    confidence?: number;
    entities?: Record<string, any>;
  };
}

interface AIConversation {
  id: string;
  messages: AIMessage[];
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'completed' | 'archived';
}

interface AIContextType {
  // Conversation management
  conversations: AIConversation[];
  currentConversation: AIConversation | null;
  createConversation: () => string;
  setCurrentConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Omit<AIMessage, 'id' | 'timestamp'>) => void;

  // AI settings
  isAIEnabled: boolean;
  setIsAIEnabled: (enabled: boolean) => void;

  // Chat state
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;

  // Preferences
  preferences: {
    language: 'es' | 'en';
    autoSuggestions: boolean;
    voiceEnabled: boolean;
  };
  updatePreferences: (prefs: Partial<AIContextType['preferences']>) => void;

  // Analytics
  analytics: {
    totalConversations: number;
    successfulBookings: number;
    averageConversationLength: number;
  };
}

const AIContext = createContext<AIContextType | undefined>(undefined);

interface AIProviderProps {
  children: ReactNode;
}

export function AIProvider({ children }: AIProviderProps) {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversation, setCurrentConversationState] = useState<AIConversation | null>(null);
  const [isAIEnabled, setIsAIEnabled] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [preferences, setPreferences] = useState<{
    language: 'es' | 'en';
    autoSuggestions: boolean;
    voiceEnabled: boolean;
  }>({
    language: 'es',
    autoSuggestions: true,
    voiceEnabled: false,
  });

  // Load conversations from localStorage on mount
  useEffect(() => {
    const savedConversations = localStorage.getItem('ai-conversations');
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations);
        setConversations(parsed.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        })));
      } catch (error) {
        console.error('Failed to load AI conversations:', error);
      }
    }

    const savedPreferences = localStorage.getItem('ai-preferences');
    if (savedPreferences) {
      try {
        setPreferences(JSON.parse(savedPreferences));
      } catch (error) {
        console.error('Failed to load AI preferences:', error);
      }
    }
  }, []);

  // Save conversations to localStorage when they change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('ai-conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('ai-preferences', JSON.stringify(preferences));
  }, [preferences]);

  const createConversation = (): string => {
    const newConversation: AIConversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    };

    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationState(newConversation);
    return newConversation.id;
  };

  const setCurrentConversation = (id: string) => {
    const conversation = conversations.find(conv => conv.id === id);
    if (conversation) {
      setCurrentConversationState(conversation);
    }
  };

  const addMessage = (conversationId: string, message: Omit<AIMessage, 'id' | 'timestamp'>) => {
    const newMessage: AIMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        const updatedConv = {
          ...conv,
          messages: [...conv.messages, newMessage],
          updatedAt: new Date()
        };

        // Update current conversation if it's the one being modified
        if (currentConversation?.id === conversationId) {
          setCurrentConversationState(updatedConv);
        }

        return updatedConv;
      }
      return conv;
    }));
  };

  const updatePreferences = (prefs: Partial<AIContextType['preferences']>) => {
    setPreferences(prev => ({ ...prev, ...prefs }));
  };

  // Calculate analytics
  const analytics = {
    totalConversations: conversations.length,
    successfulBookings: conversations.filter(conv =>
      conv.messages.some(msg =>
        msg.metadata?.intent === 'book' && msg.metadata?.confidence && msg.metadata.confidence > 0.8
      )
    ).length,
    averageConversationLength: conversations.length > 0
      ? conversations.reduce((sum, conv) => sum + conv.messages.length, 0) / conversations.length
      : 0
  };

  const value: AIContextType = {
    conversations,
    currentConversation,
    createConversation,
    setCurrentConversation,
    addMessage,
    isAIEnabled,
    setIsAIEnabled,
    isChatOpen,
    setIsChatOpen,
    preferences,
    updatePreferences,
    analytics
  };

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}

// Hook for AI-powered appointment booking
export function useAIAppointments() {
  const { addMessage, currentConversation, createConversation } = useAI();

  const processAppointmentRequest = async (message: string, organizationId?: string, userId?: string) => {
    try {
      // Ensure we have a current conversation
      let conversationId = currentConversation?.id;
      if (!conversationId) {
        conversationId = createConversation();
      }

      // Add user message
      addMessage(conversationId, {
        content: message,
        role: 'user'
      });

      // Call AI appointments API
      const response = await fetch('/api/ai/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          organizationId,
          userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process appointment request');
      }

      const result = await response.json();

      // Add AI response
      addMessage(conversationId, {
        content: result.response,
        role: 'assistant',
        metadata: {
          intent: result.intent?.intent,
          confidence: result.intent?.confidence,
          entities: result.intent
        }
      });

      return result;
    } catch (error) {
      console.error('Error processing appointment request:', error);
      throw error;
    }
  };

  return {
    processAppointmentRequest
  };
}
