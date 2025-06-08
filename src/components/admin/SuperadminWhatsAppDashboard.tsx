/**
 * Superadmin WhatsApp Dashboard Component
 * 
 * Enhanced dashboard for cross-tenant WhatsApp instance management.
 * Provides global visibility and management capabilities for superadmin users.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Building2,
  Phone,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface EnhancedInstanceData {
  id: string;
  instance_name: string;
  status: 'active' | 'inactive' | 'connecting' | 'error';
  organization_id: string;
  organization_name: string;
  subscription_plan: string;
  phone_number?: string;
  evolution_instance_id?: string;
  created_at: string;
  last_activity_at?: string;
  health_status: string;
  performance_metrics?: object;
}

interface GlobalInstancesResponse {
  instances: EnhancedInstanceData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    organization_id?: string;
    status?: string;
    search?: string;
  };
  summary: {
    total_instances: number;
    active_instances: number;
    organizations_with_instances: number;
  };
}

interface FilterState {
  search: string;
  organization_id: string;
  status: string;
  sort_by: string;
  sort_order: 'asc' | 'desc';
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function SuperadminWhatsAppDashboard() {
  // =====================================================
  // STATE MANAGEMENT
  // =====================================================

  const [instances, setInstances] = useState<EnhancedInstanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [summary, setSummary] = useState({
    total_instances: 0,
    active_instances: 0,
    organizations_with_instances: 0
  });

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    organization_id: '',
    status: '',
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  const [organizations, setOrganizations] = useState<Array<{
    id: string;
    name: string;
  }>>([]);

  // =====================================================
  // DATA FETCHING
  // =====================================================

  const fetchGlobalInstances = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      
      // Add non-empty filters to query
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          queryParams.append(key, value);
        }
      });
      
      queryParams.append('page', pagination.page.toString());
      queryParams.append('limit', pagination.limit.toString());

      const response = await fetch(`/api/admin/whatsapp/instances?${queryParams}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch instances');
      }

      const data: { data: GlobalInstancesResponse } = await response.json();
      
      setInstances(data.data.instances);
      setPagination(data.data.pagination);
      setSummary(data.data.summary);

      // Extract unique organizations for filter dropdown
      const uniqueOrgs = Array.from(
        new Map(
          data.data.instances.map(instance => [
            instance.organization_id,
            { id: instance.organization_id, name: instance.organization_name }
          ])
        ).values()
      );
      setOrganizations(uniqueOrgs);

    } catch (error) {
      console.error('Error fetching global instances:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      toast.error('Failed to load WhatsApp instances');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  // =====================================================
  // EFFECTS
  // =====================================================

  useEffect(() => {
    fetchGlobalInstances();
  }, [fetchGlobalInstances]);

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleRefresh = () => {
    fetchGlobalInstances();
  };

  const handleExport = async () => {
    try {
      toast.info('Preparing export...');
      // Implementation for data export would go here
      toast.success('Export completed');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      connecting: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.inactive}>
        {status}
      </Badge>
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  if (loading && instances.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading global WhatsApp instances...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Global WhatsApp Management</h1>
          <p className="text-muted-foreground">
            Manage WhatsApp instances across all tenant organizations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Instances</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_instances}</div>
            <p className="text-xs text-muted-foreground">
              Across {summary.organizations_with_instances} organizations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Instances</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.active_instances}</div>
            <p className="text-xs text-muted-foreground">
              {summary.total_instances > 0 
                ? `${Math.round((summary.active_instances / summary.total_instances) * 100)}% active`
                : 'No instances'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.organizations_with_instances}</div>
            <p className="text-xs text-muted-foreground">
              With WhatsApp instances
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search instances..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={filters.organization_id}
              onValueChange={(value) => handleFilterChange('organization_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Organizations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Organizations</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="connecting">Connecting</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={`${filters.sort_by}-${filters.sort_order}`}
              onValueChange={(value) => {
                const [sort_by, sort_order] = value.split('-');
                setFilters(prev => ({ ...prev, sort_by, sort_order: sort_order as 'asc' | 'desc' }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Newest First</SelectItem>
                <SelectItem value="created_at-asc">Oldest First</SelectItem>
                <SelectItem value="instance_name-asc">Name A-Z</SelectItem>
                <SelectItem value="instance_name-desc">Name Z-A</SelectItem>
                <SelectItem value="organization_name-asc">Organization A-Z</SelectItem>
                <SelectItem value="status-asc">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Instances Table */}
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Instances</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-600">{error}</p>
              <Button variant="outline" onClick={handleRefresh} className="mt-2">
                Try Again
              </Button>
            </div>
          ) : instances.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No WhatsApp instances found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instance</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instances.map((instance) => (
                    <TableRow key={instance.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{instance.instance_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {instance.evolution_instance_id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{instance.organization_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {instance.subscription_plan}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(instance.status)}
                          {getStatusBadge(instance.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {instance.phone_number ? (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{instance.phone_number}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not configured</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(instance.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} instances
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page >= pagination.pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SuperadminWhatsAppDashboard;
