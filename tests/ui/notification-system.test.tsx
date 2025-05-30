/**
 * NotificationSystem Tests
 * Comprehensive testing for unified feedback system
 * Tests accessibility, UX, and functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import { 
  NotificationProvider, 
  useNotifications, 
  useNotificationHelpers 
} from '@/components/ui/NotificationSystem';

// Test component to interact with notifications
function TestNotificationComponent() {
  const { addNotification, removeNotification, clearAll } = useNotifications();
  const { showSuccess, showError, showWarning, showInfo } = useNotificationHelpers();

  return (
    <div>
      <button 
        onClick={() => showSuccess('Test Success', 'Success message')}
        data-testid="success-btn"
      >
        Show Success
      </button>
      <button 
        onClick={() => showError('Test Error', 'Error message')}
        data-testid="error-btn"
      >
        Show Error
      </button>
      <button 
        onClick={() => showWarning('Test Warning', 'Warning message')}
        data-testid="warning-btn"
      >
        Show Warning
      </button>
      <button 
        onClick={() => showInfo('Test Info', 'Info message')}
        data-testid="info-btn"
      >
        Show Info
      </button>
      <button 
        onClick={() => addNotification({
          type: 'success',
          title: 'Persistent',
          message: 'This notification persists',
          persistent: true,
          action: {
            label: 'Action',
            onClick: () => console.log('Action clicked')
          }
        })}
        data-testid="persistent-btn"
      >
        Show Persistent
      </button>
      <button 
        onClick={clearAll}
        data-testid="clear-btn"
      >
        Clear All
      </button>
    </div>
  );
}

function renderWithProvider(component: React.ReactElement) {
  return render(
    <NotificationProvider>
      {component}
    </NotificationProvider>
  );
}

describe('NotificationSystem', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Basic Functionality', () => {
    test('renders success notification with correct content', async () => {
      renderWithProvider(<TestNotificationComponent />);
      
      const successBtn = screen.getByTestId('success-btn');
      fireEvent.click(successBtn);

      expect(screen.getByText('Test Success')).toBeInTheDocument();
      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    test('renders error notification with correct styling', async () => {
      renderWithProvider(<TestNotificationComponent />);
      
      const errorBtn = screen.getByTestId('error-btn');
      fireEvent.click(errorBtn);

      const notification = screen.getByRole('alert');
      expect(notification).toHaveClass('bg-red-50', 'border-red-200', 'text-red-800');
    });

    test('renders warning notification', async () => {
      renderWithProvider(<TestNotificationComponent />);
      
      const warningBtn = screen.getByTestId('warning-btn');
      fireEvent.click(warningBtn);

      expect(screen.getByText('Test Warning')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-yellow-50');
    });

    test('renders info notification', async () => {
      renderWithProvider(<TestNotificationComponent />);
      
      const infoBtn = screen.getByTestId('info-btn');
      fireEvent.click(infoBtn);

      expect(screen.getByText('Test Info')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-blue-50');
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA attributes', async () => {
      renderWithProvider(<TestNotificationComponent />);
      
      const successBtn = screen.getByTestId('success-btn');
      fireEvent.click(successBtn);

      const notification = screen.getByRole('alert');
      expect(notification).toHaveAttribute('aria-labelledby');
      expect(notification).toHaveAttribute('aria-describedby');
      
      const closeButton = screen.getByLabelText(/cerrar notificación/i);
      expect(closeButton).toBeInTheDocument();
    });

    test('supports keyboard navigation', async () => {
      renderWithProvider(<TestNotificationComponent />);

      const successBtn = screen.getByTestId('success-btn');
      fireEvent.click(successBtn);

      const notification = screen.getByRole('alert');

      // Test Escape key
      fireEvent.keyDown(notification, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText('Test Success')).not.toBeInTheDocument();
      });
    });

    test('has proper focus management', async () => {
      renderWithProvider(<TestNotificationComponent />);
      
      const successBtn = screen.getByTestId('success-btn');
      fireEvent.click(successBtn);

      const closeButton = screen.getByLabelText(/cerrar notificación/i);
      expect(closeButton).toHaveAttribute('aria-label');
    });
  });

  describe('Auto-dismiss Functionality', () => {
    test('auto-dismisses non-persistent notifications', async () => {
      renderWithProvider(<TestNotificationComponent />);
      
      const successBtn = screen.getByTestId('success-btn');
      fireEvent.click(successBtn);

      expect(screen.getByText('Test Success')).toBeInTheDocument();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Test Success')).not.toBeInTheDocument();
      });
    });

    test('does not auto-dismiss persistent notifications', async () => {
      renderWithProvider(<TestNotificationComponent />);
      
      const persistentBtn = screen.getByTestId('persistent-btn');
      fireEvent.click(persistentBtn);

      expect(screen.getByText('Persistent')).toBeInTheDocument();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should still be there
      expect(screen.getByText('Persistent')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    test('renders action button when provided', async () => {
      renderWithProvider(<TestNotificationComponent />);
      
      const persistentBtn = screen.getByTestId('persistent-btn');
      fireEvent.click(persistentBtn);

      const actionButton = screen.getByText('Action');
      expect(actionButton).toBeInTheDocument();
      expect(actionButton).toHaveAttribute('type', 'button');
    });

    test('action button has proper accessibility', async () => {
      renderWithProvider(<TestNotificationComponent />);
      
      const persistentBtn = screen.getByTestId('persistent-btn');
      fireEvent.click(persistentBtn);

      const actionButton = screen.getByText('Action');
      expect(actionButton).toHaveClass('focus:outline-none', 'focus:ring-2');
    });
  });

  describe('Multiple Notifications', () => {
    test('can display multiple notifications', async () => {
      renderWithProvider(<TestNotificationComponent />);
      
      fireEvent.click(screen.getByTestId('success-btn'));
      fireEvent.click(screen.getByTestId('error-btn'));
      fireEvent.click(screen.getByTestId('warning-btn'));

      expect(screen.getByText('Test Success')).toBeInTheDocument();
      expect(screen.getByText('Test Error')).toBeInTheDocument();
      expect(screen.getByText('Test Warning')).toBeInTheDocument();
    });

    test('can clear all notifications', async () => {
      renderWithProvider(<TestNotificationComponent />);
      
      fireEvent.click(screen.getByTestId('success-btn'));
      fireEvent.click(screen.getByTestId('error-btn'));
      
      expect(screen.getByText('Test Success')).toBeInTheDocument();
      expect(screen.getByText('Test Error')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('clear-btn'));

      await waitFor(() => {
        expect(screen.queryByText('Test Success')).not.toBeInTheDocument();
        expect(screen.queryByText('Test Error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    test('has responsive container classes', async () => {
      renderWithProvider(<TestNotificationComponent />);
      
      const successBtn = screen.getByTestId('success-btn');
      fireEvent.click(successBtn);

      const container = screen.getByRole('region');
      expect(container).toHaveClass('sm:max-w-md', 'md:max-w-lg', 'lg:max-w-sm');
    });

    test('notification content handles long text properly', async () => {
      function TestLongNotification() {
        const { addNotification } = useNotifications();

        React.useEffect(() => {
          addNotification({
            type: 'info',
            title: 'Very Long Title That Should Be Truncated Properly',
            message: 'This is a very long message that should wrap properly and not break the layout of the notification component'
          });
        }, [addNotification]);

        return <div>Test</div>;
      }

      renderWithProvider(<TestLongNotification />);

      const notification = screen.getByRole('alert');
      expect(notification.querySelector('.break-words')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestNotificationComponent />);
      }).toThrow('useNotifications must be used within a NotificationProvider');
      
      consoleSpy.mockRestore();
    });
  });
});
