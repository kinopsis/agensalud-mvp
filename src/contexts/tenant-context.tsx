'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './auth-context';
import type { Database } from '@/types/database';

type Organization = Database['public']['Tables']['organizations']['Row'];

interface TenantContextType {
  organization: Organization | null;
  loading: boolean;
  switchOrganization: (organizationId: string) => Promise<void>;
  refreshOrganization: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile, user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (profile?.organization_id) {
      fetchOrganization(profile.organization_id);
    } else {
      setLoading(false);
    }
  }, [profile]);

  const fetchOrganization = async (organizationId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (error) {
        console.error('Error fetching organization:', error);
        setOrganization(null);
        return;
      }

      setOrganization(data);
    } catch (error) {
      console.error('Error fetching organization:', error);
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = async (organizationId: string) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      // Update user's organization
      const { error } = await supabase
        .from('profiles')
        .update({ organization_id: organizationId })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      // Fetch new organization
      await fetchOrganization(organizationId);
    } catch (error) {
      console.error('Error switching organization:', error);
      throw error;
    }
  };

  const refreshOrganization = async () => {
    if (profile?.organization_id) {
      await fetchOrganization(profile.organization_id);
    }
  };

  const value = {
    organization,
    loading,
    switchOrganization,
    refreshOrganization,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
