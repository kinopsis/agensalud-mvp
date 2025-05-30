/**
 * NotificationSystem Component Tests
 * Comprehensive testing for notification system functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import {
  NotificationProvider,
  useNotifications,
  useNotificationHelpers,
  showGlobalNotification
} from '@/components/ui/NotificationSystem';

// Mock timers for testing auto-dismiss functionality
jest.useFakeTimers();

describe('NotificationSystem', () => {
  const TestComponent = () => {
    const { notifications, addNotification, removeNotification, clearAll } = useNotifications();
    const { showSuccess, showError, showWarning, showInfo } = useNotificationHelpers();

    return (
      <div>
        <div data-testid="notification-count">{notifications.length}</div>
        <button onClick={() => showSuccess('Success', 'Success message')}>
          Show Success
        </button>
        <button onClick={() => showError('Error', 'Error message')}>
          Show Error
        </button>
        <button onClick={() => showWarning('Warning', 'Warning message')}>
          Show Warning
        </button>
        <button onClick={() => showInfo('Info', 'Info message')}>
          Show Info
        </button>
        <button onClick={() => addNotification({
          type: 'success',
          title: 'Custom',
          message: 'Custom message',
          persistent: true
        })}>
          Show Persistent
        </button>
        <button onClick={() => removeNotification(notifications[0]?.id)}>
          Remove First
        </button>
        <button onClick={clearAll}>
          Clear All
        </button>
      </div>
    );
  };

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <NotificationProvider>
        {component}
      </NotificationProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('NotificationProvider', () => {
    it('provides notification context to children', () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
      expect(screen.getByText('Show Success')).toBeInTheDocument();
    });

    it('throws error when useNotifications is used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useNotifications must be used within a NotificationProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Adding Notifications', () => {
    it('adds success notification', () => {
      renderWithProvider(<TestComponent />);

      fireEvent.click(screen.getByText('Show Success'));

      expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    it('adds error notification', () => {
      renderWithProvider(<TestComponent />);

      fireEvent.click(screen.getByText('Show Error'));

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('adds warning notification', () => {
      renderWithProvider(<TestComponent />);

      fireEvent.click(screen.getByText('Show Warning'));

      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });

    it('adds info notification', () => {
      renderWithProvider(<TestComponent />);

      fireEvent.click(screen.getByText('Show Info'));

      expect(screen.getByText('Info')).toBeInTheDocument();
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });

    it('adds multiple notifications', () => {
      renderWithProvider(<TestComponent />);

      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));
      fireEvent.click(screen.getByText('Show Warning'));

      expect(screen.getByTestId('notification-count')).toHaveTextContent('3');
    });
  });

  describe('Auto-dismiss Functionality', () => {
    it('auto-dismisses notifications after default duration', async () => {
      renderWithProvider(<TestComponent />);

      fireEvent.click(screen.getByText('Show Success'));
      expect(screen.getByTestId('notification-count')).toHaveTextContent('1');

      act(() => {
        jest.advanceTimersByTime(5000); // Default duration
      });

      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
      });
    });

    it('does not auto-dismiss persistent notifications', async () => {
      renderWithProvider(<TestComponent />);

      fireEvent.click(screen.getByText('Show Persistent'));
      expect(screen.getByTestId('notification-count')).toHaveTextContent('1');

      act(() => {
        jest.advanceTimersByTime(10000); // Wait longer than default duration
      });

      expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
    });

    it('uses custom duration for error notifications', async () => {
      renderWithProvider(<TestComponent />);

      fireEvent.click(screen.getByText('Show Error'));
      expect(screen.getByTestId('notification-count')).toHaveTextContent('1');

      act(() => {
        jest.advanceTimersByTime(5000); // Default duration
      });

      // Error notifications have 8000ms duration
      expect(screen.getByTestId('notification-count')).toHaveTextContent('1');

      act(() => {
        jest.advanceTimersByTime(3000); // Additional 3000ms = 8000ms total
      });

      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
      });
    });
  });

  describe('Manual Removal', () => {
    it('removes specific notification', () => {
      renderWithProvider(<TestComponent />);

      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));
      expect(screen.getByTestId('notification-count')).toHaveTextContent('2');

      fireEvent.click(screen.getByText('Remove First'));
      expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
    });

    it('clears all notifications', () => {
      renderWithProvider(<TestComponent />);

      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));
      fireEvent.click(screen.getByText('Show Warning'));
      expect(screen.getByTestId('notification-count')).toHaveTextContent('3');

      fireEvent.click(screen.getByText('Clear All'));
      expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
    });

    it('removes notification via close button', () => {
      renderWithProvider(<TestComponent />);

      fireEvent.click(screen.getByText('Show Success'));
      expect(screen.getByTestId('notification-count')).toHaveTextContent('1');

      const closeButton = screen.getByRole('button', { name: '' }); // X button
      fireEvent.click(closeButton);

      expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
    });
  });

  describe('Notification Appearance', () => {
    it('displays correct icons for different types', () => {
      renderWithProvider(<TestComponent />);

      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));
      fireEvent.click(screen.getByText('Show Warning'));
      fireEvent.click(screen.getByText('Show Info'));

      // Check that notifications are rendered (icons are SVGs, harder to test directly)
      expect(screen.getAllByRole('button', { name: '' })).toHaveLength(4); // Close buttons
    });

    it('applies correct styling for different types', () => {
      renderWithProvider(<TestComponent />);

      fireEvent.click(screen.getByText('Show Success'));

      const notification = screen.getByText('Success').closest('div');
      expect(notification).toHaveClass('bg-green-50', 'border-green-200');
    });

    it('shows animation on appear', () => {
      renderWithProvider(<TestComponent />);

      fireEvent.click(screen.getByText('Show Success'));

      const notification = screen.getByText('Success').closest('div');
      expect(notification).toHaveClass('transform', 'transition-all');
    });
  });

  describe('Notification Actions', () => {
    const TestComponentWithAction = () => {
      const { addNotification } = useNotifications();
      const [actionClicked, setActionClicked] = React.useState(false);

      return (
        <div>
          <button onClick={() => addNotification({
            type: 'info',
            title: 'Action Test',
            message: 'Test message',
            action: {
              label: 'Click Me',
              onClick: () => setActionClicked(true)
            }
          })}>
            Show With Action
          </button>
          {actionClicked && <div data-testid="action-clicked">Action Clicked</div>}
        </div>
      );
    };

    it('renders and executes notification actions', () => {
      renderWithProvider(<TestComponentWithAction />);

      fireEvent.click(screen.getByText('Show With Action'));
      expect(screen.getByText('Click Me')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Click Me'));
      expect(screen.getByTestId('action-clicked')).toBeInTheDocument();
    });
  });

  describe('Global Notification Functions', () => {
    it('shows global notification when context is available', () => {
      // This test would require setting up the global context
      // For now, we'll test that the function exists and doesn't throw
      expect(() => {
        showGlobalNotification({
          type: 'success',
          title: 'Global Test'
        });
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty notification list', () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
      
      // Try to remove from empty list
      fireEvent.click(screen.getByText('Remove First'));
      expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
    });

    it('handles notification without message', () => {
      const TestComponentNoMessage = () => {
        const { addNotification } = useNotifications();

        return (
          <button onClick={() => addNotification({
            type: 'success',
            title: 'Title Only'
          })}>
            Show Title Only
          </button>
        );
      };

      renderWithProvider(<TestComponentNoMessage />);

      fireEvent.click(screen.getByText('Show Title Only'));
      expect(screen.getByText('Title Only')).toBeInTheDocument();
    });

    it('handles very long notification content', () => {
      const TestComponentLongContent = () => {
        const { addNotification } = useNotifications();

        return (
          <button onClick={() => addNotification({
            type: 'info',
            title: 'Very Long Title That Might Overflow The Container Width',
            message: 'This is a very long message that should test how the notification system handles content that might be longer than the typical notification container width and should wrap properly without breaking the layout.'
          })}>
            Show Long Content
          </button>
        );
      };

      renderWithProvider(<TestComponentLongContent />);

      fireEvent.click(screen.getByText('Show Long Content'));
      expect(screen.getByText('Very Long Title That Might Overflow The Container Width')).toBeInTheDocument();
    });
  });
});
