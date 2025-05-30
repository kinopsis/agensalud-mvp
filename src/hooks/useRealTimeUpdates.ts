/**
 * Real-time Updates Hook
 * Provides real-time data synchronization using Supabase Realtime
 * Optimized for dashboard components and live data updates
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';

interface RealtimeConfig {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
}

interface RealtimeHookOptions {
  enabled?: boolean;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onError?: (error: any) => void;
}

// Main real-time hook
export function useRealTimeUpdates<T>(
  config: RealtimeConfig,
  options: RealtimeHookOptions = {}
) {
  const { profile } = useAuth();
  const { organization } = useTenant();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const supabase = createClient();
  const channelRef = useRef<any>(null);

  const {
    enabled = true,
    onInsert,
    onUpdate,
    onDelete,
    onError
  } = options;

  // Initial data load
  const loadInitialData = useCallback(async () => {
    if (!enabled || !profile) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from(config.table)
        .select('*');

      // Apply organization filter for multi-tenant data
      if (organization?.id && config.table !== 'organizations') {
        query = query.eq('organization_id', organization.id);
      }

      // Apply custom filter if provided
      if (config.filter) {
        // Parse and apply filter (simplified implementation)
        const [column, operator, value] = config.filter.split('.');
        if (column && operator && value) {
          query = query.eq(column, value);
        }
      }

      const { data: initialData, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setData(initialData || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar datos';
      setError(errorMessage);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [config, enabled, profile, organization, supabase, onError]);

  // Set up real-time subscription
  useEffect(() => {
    if (!enabled || !profile) return;

    const setupRealtimeSubscription = async () => {
      try {
        // Create channel for real-time updates
        const channel = supabase
          .channel(`realtime-${config.table}`)
          .on(
            'postgres_changes' as any,
            {
              event: config.event || '*',
              schema: config.schema || 'public',
              table: config.table,
              filter: config.filter
            },
            (payload: any) => {
              handleRealtimeEvent(payload);
            }
          )
          .subscribe((status) => {
            setConnected(status === 'SUBSCRIBED');
            if (status === 'CHANNEL_ERROR') {
              setError('Error en la conexión en tiempo real');
            }
          });

        channelRef.current = channel;

        // Load initial data
        await loadInitialData();

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al configurar actualizaciones en tiempo real';
        setError(errorMessage);
        onError?.(err);
      }
    };

    setupRealtimeSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [config, enabled, profile, organization]);

  // Handle real-time events
  const handleRealtimeEvent = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT':
        setData(prev => {
          // Check if record already exists to avoid duplicates
          const exists = prev.some((item: any) => item.id === newRecord.id);
          if (exists) return prev;

          return [...prev, newRecord];
        });
        onInsert?.(payload);
        break;

      case 'UPDATE':
        setData(prev => prev.map((item: any) =>
          item.id === newRecord.id ? { ...item, ...newRecord } : item
        ));
        onUpdate?.(payload);
        break;

      case 'DELETE':
        setData(prev => prev.filter((item: any) => item.id !== oldRecord.id));
        onDelete?.(payload);
        break;

      default:
        console.warn('Unknown realtime event type:', eventType);
    }
  }, [onInsert, onUpdate, onDelete]);

  // Manual refresh function
  const refresh = useCallback(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Add new item optimistically
  const addOptimistic = useCallback((item: T) => {
    setData(prev => [...prev, item]);
  }, []);

  // Update item optimistically
  const updateOptimistic = useCallback((id: string, updates: Partial<T>) => {
    setData(prev => prev.map((item: any) =>
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  // Remove item optimistically
  const removeOptimistic = useCallback((id: string) => {
    setData(prev => prev.filter((item: any) => item.id !== id));
  }, []);

  return {
    data,
    loading,
    error,
    connected,
    refresh,
    addOptimistic,
    updateOptimistic,
    removeOptimistic
  };
}

// Specialized hook for appointments
export function useRealTimeAppointments(options: RealtimeHookOptions = {}) {
  return useRealTimeUpdates({
    table: 'appointments',
    event: '*'
  }, options);
}

// Specialized hook for users
export function useRealTimeUsers(options: RealtimeHookOptions = {}) {
  return useRealTimeUpdates({
    table: 'profiles',
    event: '*'
  }, options);
}

// Specialized hook for organizations (SuperAdmin only)
export function useRealTimeOrganizations(options: RealtimeHookOptions = {}) {
  const { profile } = useAuth();

  return useRealTimeUpdates({
    table: 'organizations',
    event: '*'
  }, {
    enabled: profile?.role === 'superadmin',
    ...options
  });
}

// Hook for system notifications
export function useRealTimeNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`
        },
        (payload: any) => {
          const newNotification = payload.new;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    // Load initial notifications
    const loadNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read_at).length);
      }
    };

    loadNotifications();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, supabase]);

  const markAsRead = useCallback(async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId
          ? { ...n, read_at: new Date().toISOString() }
          : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, [supabase]);

  const markAllAsRead = useCallback(async () => {
    if (!profile) return;

    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', profile.id)
      .is('read_at', null);

    setNotifications(prev =>
      prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
    setUnreadCount(0);
  }, [profile, supabase]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  };
}

// Connection status hook
export function useRealtimeStatus() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('status-check')
      .subscribe((status) => {
        switch (status) {
          case 'SUBSCRIBED':
            setStatus('connected');
            break;
          case 'CHANNEL_ERROR':
          case 'TIMED_OUT':
          case 'CLOSED':
            setStatus('disconnected');
            break;
          default:
            setStatus('connecting');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return status;
}
