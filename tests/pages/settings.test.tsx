/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from '@/app/(dashboard)/settings/page';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';

// Mock dependencies
jest.mock('@/contexts/auth-context', () => ({
  useAuth: jest.fn()
}));

jest.mock('@/contexts/tenant-context', () => ({
  useTenant: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn();

const mockProfile = {
  id: 'user-1',
  email: 'user@test.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'admin',
  organization_id: 'org-1',
  phone: '+1234567890'
};

const mockOrganization = {
  id: 'org-1',
  name: 'Test Organization',
  slug: 'test-org'
};

const mockUpdateProfile = jest.fn();

const mockSettings = {
  notifications: {
    email: true,
    sms: false,
    push: true,
    appointment_reminders: true,
    system_updates: false
  },
  preferences: {
    language: 'es',
    timezone: 'America/Bogota',
    theme: 'light',
    date_format: 'DD/MM/YYYY',
    time_format: '24h'
  },
  privacy: {
    profile_visibility: 'organization',
    data_sharing: false,
    analytics: true
  }
};

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ 
      profile: mockProfile,
      updateProfile: mockUpdateProfile
    });
    (useTenant as jest.Mock).mockReturnValue({ organization: mockOrganization });
    
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockSettings })
    });
  });

  describe('Page Rendering', () => {
    it('renders settings page with user info', async () => {
      render(<SettingsPage />);
      
      expect(screen.getByText('Configuración')).toBeInTheDocument();
      expect(screen.getByText('John Doe • Test Organization')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Perfil')).toBeInTheDocument();
        expect(screen.getByText('Notificaciones')).toBeInTheDocument();
        expect(screen.getByText('Preferencias')).toBeInTheDocument();
        expect(screen.getByText('Privacidad')).toBeInTheDocument();
      });
    });

    it('shows professional tab for doctors', () => {
      const doctorProfile = { ...mockProfile, role: 'doctor' };
      (useAuth as jest.Mock).mockReturnValue({ 
        profile: doctorProfile,
        updateProfile: mockUpdateProfile
      });
      
      render(<SettingsPage />);
      
      expect(screen.getByText('Profesional')).toBeInTheDocument();
    });

    it('shows organization tab for admins', () => {
      render(<SettingsPage />);
      
      expect(screen.getByText('Organización')).toBeInTheDocument();
    });
  });

  describe('Profile Tab', () => {
    it('displays user profile information', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('user@test.com')).toBeInTheDocument();
        expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument();
      });
    });

    it('allows editing profile fields', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        const firstNameInput = screen.getByDisplayValue('John');
        fireEvent.change(firstNameInput, { target: { value: 'Johnny' } });
        
        expect(mockUpdateProfile).toHaveBeenCalledWith({ first_name: 'Johnny' });
      });
    });

    it('shows disabled email field', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        const emailInput = screen.getByDisplayValue('user@test.com');
        expect(emailInput).toBeDisabled();
        expect(screen.getByText('El email no se puede cambiar')).toBeInTheDocument();
      });
    });

    it('handles password change', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockSettings })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });
      
      render(<SettingsPage />);
      
      await waitFor(() => {
        const currentPasswordInput = screen.getByLabelText('Contraseña Actual');
        const newPasswordInput = screen.getByLabelText('Nueva Contraseña');
        const confirmPasswordInput = screen.getByLabelText('Confirmar Contraseña');
        
        fireEvent.change(currentPasswordInput, { target: { value: 'oldpass123' } });
        fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'newpass123' } });
        
        const changePasswordButton = screen.getByText('Cambiar Contraseña');
        fireEvent.click(changePasswordButton);
      });
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/auth/change-password',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentPassword: 'oldpass123',
              newPassword: 'newpass123'
            })
          })
        );
      });
    });

    it('shows password visibility toggle', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i });
        const passwordInput = screen.getByLabelText('Contraseña Actual');
        
        expect(passwordInput).toHaveAttribute('type', 'password');
        
        fireEvent.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'text');
      });
    });
  });

  describe('Notifications Tab', () => {
    it('displays notification preferences', async () => {
      render(<SettingsPage />);
      
      fireEvent.click(screen.getByText('Notificaciones'));
      
      await waitFor(() => {
        expect(screen.getByText('Notificaciones por Email')).toBeInTheDocument();
        expect(screen.getByText('Notificaciones SMS')).toBeInTheDocument();
        expect(screen.getByText('Recordatorios de Citas')).toBeInTheDocument();
      });
    });

    it('allows toggling notification settings', async () => {
      render(<SettingsPage />);
      
      fireEvent.click(screen.getByText('Notificaciones'));
      
      await waitFor(() => {
        const emailCheckbox = screen.getByRole('checkbox', { name: /email/i });
        expect(emailCheckbox).toBeChecked();
        
        fireEvent.click(emailCheckbox);
        expect(emailCheckbox).not.toBeChecked();
      });
    });
  });

  describe('Preferences Tab', () => {
    it('displays preference options', async () => {
      render(<SettingsPage />);
      
      fireEvent.click(screen.getByText('Preferencias'));
      
      await waitFor(() => {
        expect(screen.getByText('Idioma')).toBeInTheDocument();
        expect(screen.getByText('Zona Horaria')).toBeInTheDocument();
        expect(screen.getByText('Tema')).toBeInTheDocument();
        expect(screen.getByText('Formato de Hora')).toBeInTheDocument();
      });
    });

    it('allows changing language preference', async () => {
      render(<SettingsPage />);
      
      fireEvent.click(screen.getByText('Preferencias'));
      
      await waitFor(() => {
        const languageSelect = screen.getByDisplayValue('es');
        fireEvent.change(languageSelect, { target: { value: 'en' } });
        
        expect(languageSelect.value).toBe('en');
      });
    });

    it('allows changing theme preference', async () => {
      render(<SettingsPage />);
      
      fireEvent.click(screen.getByText('Preferencias'));
      
      await waitFor(() => {
        const themeSelect = screen.getByDisplayValue('light');
        fireEvent.change(themeSelect, { target: { value: 'dark' } });
        
        expect(themeSelect.value).toBe('dark');
      });
    });
  });

  describe('Privacy Tab', () => {
    it('displays privacy settings', async () => {
      render(<SettingsPage />);
      
      fireEvent.click(screen.getByText('Privacidad'));
      
      await waitFor(() => {
        expect(screen.getByText('Visibilidad del Perfil')).toBeInTheDocument();
        expect(screen.getByText('Compartir datos para mejoras')).toBeInTheDocument();
      });
    });

    it('allows changing profile visibility', async () => {
      render(<SettingsPage />);
      
      fireEvent.click(screen.getByText('Privacidad'));
      
      await waitFor(() => {
        const visibilitySelect = screen.getByDisplayValue('organization');
        fireEvent.change(visibilitySelect, { target: { value: 'private' } });
        
        expect(visibilitySelect.value).toBe('private');
      });
    });
  });

  describe('Save Functionality', () => {
    it('saves settings when save button is clicked', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockSettings })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });
      
      render(<SettingsPage />);
      
      await waitFor(() => {
        const saveButton = screen.getByText('Guardar Cambios');
        fireEvent.click(saveButton);
      });
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          `/api/users/${mockProfile.id}/settings`,
          expect.objectContaining({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
          })
        );
      });
    });

    it('shows success message after saving', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockSettings })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });
      
      render(<SettingsPage />);
      
      await waitFor(() => {
        const saveButton = screen.getByText('Guardar Cambios');
        fireEvent.click(saveButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Configuración guardada exitosamente')).toBeInTheDocument();
      });
    });

    it('shows loading state while saving', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockSettings })
        })
        .mockReturnValueOnce(new Promise(() => {})); // Pending promise
      
      render(<SettingsPage />);
      
      await waitFor(() => {
        const saveButton = screen.getByText('Guardar Cambios');
        fireEvent.click(saveButton);
        
        expect(screen.getByText('Guardando...')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when save fails', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockSettings })
        })
        .mockRejectedValueOnce(new Error('Network error'));
      
      render(<SettingsPage />);
      
      await waitFor(() => {
        const saveButton = screen.getByText('Guardar Cambios');
        fireEvent.click(saveButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Error al guardar la configuración. Por favor intenta de nuevo.')).toBeInTheDocument();
      });
    });

    it('displays error message when password change fails', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockSettings })
        })
        .mockRejectedValueOnce(new Error('Password error'));
      
      render(<SettingsPage />);
      
      await waitFor(() => {
        const currentPasswordInput = screen.getByLabelText('Contraseña Actual');
        const newPasswordInput = screen.getByLabelText('Nueva Contraseña');
        const confirmPasswordInput = screen.getByLabelText('Confirmar Contraseña');
        
        fireEvent.change(currentPasswordInput, { target: { value: 'oldpass123' } });
        fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'newpass123' } });
        
        const changePasswordButton = screen.getByText('Cambiar Contraseña');
        fireEvent.click(changePasswordButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Error al cambiar la contraseña. Verifica tu contraseña actual.')).toBeInTheDocument();
      });
    });

    it('shows error when passwords do not match', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        const currentPasswordInput = screen.getByLabelText('Contraseña Actual');
        const newPasswordInput = screen.getByLabelText('Nueva Contraseña');
        const confirmPasswordInput = screen.getByLabelText('Confirmar Contraseña');
        
        fireEvent.change(currentPasswordInput, { target: { value: 'oldpass123' } });
        fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'differentpass' } });
        
        const changePasswordButton = screen.getByText('Cambiar Contraseña');
        fireEvent.click(changePasswordButton);
        
        expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
      });
    });
  });
});
