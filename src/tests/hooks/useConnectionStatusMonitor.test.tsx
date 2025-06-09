/**
 * Tests for useConnectionStatusMonitor Hook
 * 
 * @description Tests the React hook initialization and dependency order
 * to ensure no ReferenceError occurs when accessing functions before initialization.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useConnectionStatusMonitor } from '@/hooks/useConnectionStatusMonitor';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('useConnectionStatusMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          status: 'connected',
          lastSeen: new Date().toISOString(),
          isHealthy: true
        }
      })
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  /**
   * Test 1: Hook Initialization Without Errors
   * 
   * @description Verifies that the hook initializes properly without
   * any ReferenceError about accessing functions before initialization.
   */
  test('should initialize without ReferenceError', () => {
    const { result } = renderHook(() =>
      useConnectionStatusMonitor({
        instanceId: 'test-instance-123',
        enabled: true,
        checkInterval: 30
      })
    );

    // Should not throw any errors during initialization
    expect(result.current).toBeDefined();
    expect(result.current.connectionStatus).toBeDefined();
    expect(result.current.startMonitoring).toBeDefined();
    expect(result.current.stopMonitoring).toBeDefined();
    expect(result.current.refreshStatus).toBeDefined();
    expect(result.current.attemptReconnection).toBeDefined();
  });

  /**
   * Test 2: Function Dependencies Order
   * 
   * @description Verifies that all functions are properly defined
   * and can be called without dependency order issues.
   */
  test('should have all functions properly defined', () => {
    const { result } = renderHook(() =>
      useConnectionStatusMonitor({
        instanceId: 'test-instance-456',
        enabled: true
      })
    );

    // All functions should be callable
    expect(typeof result.current.startMonitoring).toBe('function');
    expect(typeof result.current.stopMonitoring).toBe('function');
    expect(typeof result.current.refreshStatus).toBe('function');
    expect(typeof result.current.attemptReconnection).toBe('function');

    // Should be able to call stopMonitoring without errors
    expect(() => {
      act(() => {
        result.current.stopMonitoring();
      });
    }).not.toThrow();
  });

  /**
   * Test 3: Hook Cleanup on Unmount
   * 
   * @description Verifies that the hook properly cleans up
   * when the component unmounts, calling stopMonitoring.
   */
  test('should cleanup properly on unmount', () => {
    const { result, unmount } = renderHook(() =>
      useConnectionStatusMonitor({
        instanceId: 'test-instance-789',
        enabled: true
      })
    );

    // Start monitoring
    act(() => {
      result.current.startMonitoring();
    });

    // Should be monitoring
    expect(result.current.isMonitoring).toBe(true);

    // Unmount should not throw errors
    expect(() => {
      unmount();
    }).not.toThrow();
  });

  /**
   * Test 4: Disabled Hook Behavior
   *
   * @description Verifies that when enabled=false, the hook
   * still initializes properly without errors.
   */
  test('should handle disabled state without errors', () => {
    const { result } = renderHook(() =>
      useConnectionStatusMonitor({
        instanceId: 'test-instance-disabled',
        enabled: false
      })
    );

    expect(result.current.connectionStatus.status).toBe('unknown');
    expect(result.current.isMonitoring).toBe(false);

    // Functions should still be defined and callable
    expect(typeof result.current.stopMonitoring).toBe('function');
    expect(typeof result.current.startMonitoring).toBe('function');
  });

  /**
   * Test 5: Fast Refresh Compatibility
   *
   * @description Verifies that the hook works correctly during Fast Refresh
   * scenarios without throwing ReferenceError about stopMonitoring initialization.
   */
  test('should handle Fast Refresh without ReferenceError', () => {
    const { result, rerender } = renderHook(() =>
      useConnectionStatusMonitor({
        instanceId: 'test-instance-fast-refresh',
        enabled: true
      })
    );

    // Initial render should work
    expect(result.current.stopMonitoring).toBeDefined();

    // Multiple re-renders (simulating Fast Refresh)
    expect(() => {
      rerender();
      rerender();
      rerender();
    }).not.toThrow();

    // Functions should still be accessible after re-renders
    expect(typeof result.current.stopMonitoring).toBe('function');
    expect(() => {
      act(() => {
        result.current.stopMonitoring();
      });
    }).not.toThrow();
  });

  /**
   * Test 6: Function Dependency Order Validation
   *
   * @description Specifically tests that stopMonitoring is accessible
   * in useEffect dependencies without causing initialization errors.
   */
  test('should have stopMonitoring available in dependency arrays', () => {
    // This test ensures the fix for the dependency order issue
    const { result } = renderHook(() =>
      useConnectionStatusMonitor({
        instanceId: 'test-dependency-order',
        enabled: true
      })
    );

    // If there was a dependency order issue, the hook would throw during render
    expect(result.current).toBeDefined();
    expect(result.current.stopMonitoring).toBeDefined();

    // Should be able to call immediately without initialization errors
    expect(() => {
      act(() => {
        result.current.stopMonitoring();
      });
    }).not.toThrow();
  });

  /**
   * Test 7: Instance ID Changes Without Errors
   *
   * @description Verifies that changing instanceId doesn't cause
   * ReferenceError during useEffect re-execution.
   */
  test('should handle instanceId changes without ReferenceError', () => {
    const { result, rerender } = renderHook(
      ({ instanceId }) =>
        useConnectionStatusMonitor({
          instanceId,
          enabled: true
        }),
      {
        initialProps: { instanceId: 'instance-1' }
      }
    );

    // Start monitoring
    act(() => {
      result.current.startMonitoring();
    });

    expect(result.current.isMonitoring).toBe(true);

    // Change instance ID - this should trigger useEffect cleanup and restart
    // If there was a dependency order issue, this would throw ReferenceError
    expect(() => {
      rerender({ instanceId: 'instance-2' });
    }).not.toThrow();

    // Functions should still be accessible
    expect(typeof result.current.stopMonitoring).toBe('function');
  });

  /**
   * Test 6: Callback Functions Execution
   * 
   * @description Verifies that callback functions can be executed
   * without dependency order issues.
   */
  test('should execute callback functions without errors', async () => {
    const onStatusChange = jest.fn();
    const onError = jest.fn();
    const onReconnected = jest.fn();

    const { result } = renderHook(() =>
      useConnectionStatusMonitor({
        instanceId: 'test-callbacks',
        enabled: true,
        onStatusChange,
        onError,
        onReconnected
      })
    );

    // Should be able to call refresh without errors
    await act(async () => {
      await result.current.refreshStatus();
    });

    // Should not throw any errors
    expect(result.current).toBeDefined();
  });
});
