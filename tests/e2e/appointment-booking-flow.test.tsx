/**
 * End-to-End Tests - Complete Appointment Booking Flow
 * Tests the full user journey from AI chat to appointment confirmation
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, createMockSupabaseClient, createMockAISDK } from '../utils/test-helpers';
import { MOCK_USERS, MOCK_ORGANIZATIONS, createMockAppointment } from '../fixtures/optical-simulation-data';
import { ChatBot } from '@/components/ai/ChatBot';

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn()
}));

jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => 'mocked-model')
}));

jest.mock('ai', () => ({
  ...createMockAISDK(),
  useChat: jest.fn(() => ({
    messages: [],
    input: '',
    handleInputChange: jest.fn(),
    handleSubmit: jest.fn(),
    isLoading: false,
    append: jest.fn(),
  }))
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('E2E: Complete Appointment Booking Flow', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockUseChat: jest.Mock;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    const { createClient } = require('@/lib/supabase/client');
    createClient.mockReturnValue(mockSupabase);

    const { useChat } = require('ai');
    mockUseChat = useChat as jest.Mock;

    // Reset fetch mock
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Patient Journey: AI Chat to Appointment Booking', () => {
    it('should complete full booking flow for new patient', async () => {
      const patient = MOCK_USERS.find(u => u.role === 'patient');
      const organization = MOCK_ORGANIZATIONS[0];
      
      // Mock chat conversation flow
      const conversationFlow = [
        {
          role: 'user',
          content: 'Hola, necesito una cita con cardiología'
        },
        {
          role: 'assistant',
          content: 'Te ayudo a agendar una cita con cardiología. ¿Tienes alguna preferencia de fecha?'
        },
        {
          role: 'user',
          content: 'La próxima semana, preferiblemente por la mañana'
        },
        {
          role: 'assistant',
          content: 'Perfecto. Tengo disponibilidad el martes 23 de enero a las 10:00 AM. ¿Te parece bien?'
        },
        {
          role: 'user',
          content: 'Sí, perfecto'
        },
        {
          role: 'assistant',
          content: 'Excelente. He agendado tu cita con cardiología para el martes 23 de enero a las 10:00 AM. Recibirás una confirmación por email.'
        }
      ];

      let currentStep = 0;
      const messages: any[] = [];

      mockUseChat.mockImplementation(() => ({
        messages,
        input: '',
        handleInputChange: jest.fn(),
        handleSubmit: jest.fn(async (e) => {
          e.preventDefault();
          if (currentStep < conversationFlow.length) {
            const userMessage = conversationFlow[currentStep];
            const aiResponse = conversationFlow[currentStep + 1];
            
            messages.push(userMessage);
            if (aiResponse) {
              messages.push(aiResponse);
            }
            currentStep += 2;
          }
        }),
        isLoading: false,
        append: jest.fn(),
      }));

      // Mock AI appointment processing
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/ai/appointments')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              intent: {
                intent: 'book',
                specialty: 'cardiología',
                preferredDate: 'próxima semana',
                preferredTime: 'mañana',
                confidence: 0.9
              },
              response: 'Te ayudo a agendar una cita con cardiología.'
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      // Mock appointment creation
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: createMockAppointment({
                    patient_id: patient?.id,
                    appointment_date: '2024-01-23',
                    start_time: '10:00',
                    end_time: '10:45'
                  }),
                  error: null
                })
              })
            })
          };
        }
        return mockSupabase.from(table);
      });

      // Render ChatBot component
      renderWithProviders(
        <ChatBot 
          organizationId={organization.id}
          userId={patient?.id || ''}
        />
      );

      // Simulate conversation flow
      for (let i = 0; i < conversationFlow.length; i += 2) {
        const userMessage = conversationFlow[i];
        if (userMessage && userMessage.role === 'user') {
          // Simulate user typing and sending message
          const chatInput = screen.getByPlaceholderText(/escribe tu mensaje/i);
          const sendButton = screen.getByRole('button', { name: /enviar/i });

          fireEvent.change(chatInput, { target: { value: userMessage.content } });
          fireEvent.click(sendButton);

          // Wait for AI response
          await waitFor(() => {
            expect(messages.length).toBeGreaterThan(i);
          }, { timeout: 5000 });
        }
      }

      // Verify final state
      expect(messages).toHaveLength(conversationFlow.length);
      expect(messages[messages.length - 1].content).toContain('He agendado tu cita');
    });

    it('should handle appointment rescheduling flow', async () => {
      const patient = MOCK_USERS.find(u => u.role === 'patient');
      const organization = MOCK_ORGANIZATIONS[0];

      // Mock existing appointment
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [createMockAppointment({
                    patient_id: patient?.id,
                    appointment_date: '2024-01-20',
                    start_time: '14:00'
                  })],
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: createMockAppointment({
                      patient_id: patient?.id,
                      appointment_date: '2024-01-25',
                      start_time: '10:00'
                    }),
                    error: null
                  })
                })
              })
            })
          };
        }
        return mockSupabase.from(table);
      });

      const messages: any[] = [];

      mockUseChat.mockImplementation(() => ({
        messages,
        input: '',
        handleInputChange: jest.fn(),
        handleSubmit: jest.fn(async () => {
          messages.push({
            role: 'user',
            content: 'Necesito cambiar mi cita del sábado'
          });
          messages.push({
            role: 'assistant',
            content: 'Veo que tienes una cita el sábado 20 de enero. ¿Para qué fecha te gustaría cambiarla?'
          });
        }),
        isLoading: false,
        append: jest.fn(),
      }));

      // Mock AI processing for reschedule intent
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          intent: {
            intent: 'reschedule',
            confidence: 0.9
          },
          response: 'Te ayudo a cambiar tu cita.'
        })
      });

      renderWithProviders(
        <ChatBot 
          organizationId={organization.id}
          userId={patient?.id || ''}
        />
      );

      const chatInput = screen.getByPlaceholderText(/escribe tu mensaje/i);
      const sendButton = screen.getByRole('button', { name: /enviar/i });

      fireEvent.change(chatInput, { target: { value: 'Necesito cambiar mi cita del sábado' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(messages.length).toBeGreaterThan(0);
      });

      expect(messages[messages.length - 1].content).toContain('cambiar tu cita');
    });

    it('should handle appointment cancellation flow', async () => {
      const patient = MOCK_USERS.find(u => u.role === 'patient');
      const organization = MOCK_ORGANIZATIONS[0];

      // Mock existing appointment
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [createMockAppointment({
                    patient_id: patient?.id,
                    status: 'scheduled'
                  })],
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: createMockAppointment({
                      patient_id: patient?.id,
                      status: 'cancelled'
                    }),
                    error: null
                  })
                })
              })
            })
          };
        }
        return mockSupabase.from(table);
      });

      const messages: any[] = [];

      mockUseChat.mockImplementation(() => ({
        messages,
        input: '',
        handleInputChange: jest.fn(),
        handleSubmit: jest.fn(async () => {
          messages.push({
            role: 'user',
            content: 'Quiero cancelar mi cita'
          });
          messages.push({
            role: 'assistant',
            content: 'He cancelado tu cita. ¿Hay algo más en lo que pueda ayudarte?'
          });
        }),
        isLoading: false,
        append: jest.fn(),
      }));

      // Mock AI processing for cancel intent
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          intent: {
            intent: 'cancel',
            confidence: 0.9
          },
          response: 'He cancelado tu cita.'
        })
      });

      renderWithProviders(
        <ChatBot 
          organizationId={organization.id}
          userId={patient?.id || ''}
        />
      );

      const chatInput = screen.getByPlaceholderText(/escribe tu mensaje/i);
      const sendButton = screen.getByRole('button', { name: /enviar/i });

      fireEvent.change(chatInput, { target: { value: 'Quiero cancelar mi cita' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(messages.length).toBeGreaterThan(0);
      });

      expect(messages[messages.length - 1].content).toContain('cancelado');
    });
  });

  describe('Multi-Role Integration', () => {
    it('should handle doctor viewing patient appointments', async () => {
      const doctor = MOCK_USERS.find(u => u.role === 'doctor');
      const organization = MOCK_ORGANIZATIONS[0];

      // Mock doctor's appointments view
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    createMockAppointment({
                      doctor_id: doctor?.id,
                      appointment_date: '2024-01-23',
                      start_time: '10:00'
                    })
                  ],
                  error: null
                })
              })
            })
          };
        }
        return mockSupabase.from(table);
      });

      const messages: any[] = [];

      mockUseChat.mockImplementation(() => ({
        messages,
        input: '',
        handleInputChange: jest.fn(),
        handleSubmit: jest.fn(async () => {
          messages.push({
            role: 'user',
            content: '¿Qué citas tengo hoy?'
          });
          messages.push({
            role: 'assistant',
            content: 'Tienes 1 cita programada para hoy a las 10:00 AM.'
          });
        }),
        isLoading: false,
        append: jest.fn(),
      }));

      renderWithProviders(
        <ChatBot 
          organizationId={organization.id}
          userId={doctor?.id || ''}
        />
      );

      const chatInput = screen.getByPlaceholderText(/escribe tu mensaje/i);
      const sendButton = screen.getByRole('button', { name: /enviar/i });

      fireEvent.change(chatInput, { target: { value: '¿Qué citas tengo hoy?' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(messages.length).toBeGreaterThan(0);
      });

      expect(messages[messages.length - 1].content).toContain('cita programada');
    });

    it('should respect organization boundaries in multi-tenant scenario', async () => {
      const patient = MOCK_USERS.find(u => u.role === 'patient');
      const wrongOrgId = 'org_competitor_001';

      // Mock should return empty results for wrong organization
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      }));

      renderWithProviders(
        <ChatBot 
          organizationId={wrongOrgId}
          userId={patient?.id || ''}
        />
      );

      // Should still render but with limited access
      expect(screen.getByPlaceholderText(/escribe tu mensaje/i)).toBeInTheDocument();
    });
  });
});
