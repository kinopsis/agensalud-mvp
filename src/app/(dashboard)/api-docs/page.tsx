'use client';

/**
 * API Documentation Dashboard
 * Comprehensive documentation system for all AgentSalud API endpoints
 * Provides interactive documentation with examples and testing capabilities
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  Book,
  Code,
  Play,
  Copy,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  ExternalLink,
  Globe,
  Lock,
  Users,
  Calendar,
  FileText,
  Settings,
  Zap
} from 'lucide-react';

interface APIEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  title: string;
  description: string;
  category: string;
  roles: string[];
  parameters?: Parameter[];
  requestBody?: RequestBodySchema;
  responses: ResponseSchema[];
  examples: Example[];
  rateLimit?: string;
  authentication: boolean;
}

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: string;
  enum?: string[];
}

interface RequestBodySchema {
  type: string;
  properties: Record<string, any>;
  required: string[];
  example: any;
}

interface ResponseSchema {
  status: number;
  description: string;
  schema: any;
  example: any;
}

interface Example {
  title: string;
  description: string;
  request: any;
  response: any;
}

export default function APIDocsPage() {
  const { profile } = useAuth();
  const { organization } = useTenant();
  const router = useRouter();
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Check permissions - API docs available to all authenticated users
  useEffect(() => {
    if (profile && !['admin', 'doctor', 'staff', 'patient', 'superadmin'].includes(profile.role)) {
      router.push('/dashboard');
      return;
    }
  }, [profile, router]);

  useEffect(() => {
    if (profile && organization) {
      fetchAPIDocumentation();
    }
  }, [profile, organization]);

  const fetchAPIDocumentation = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch API documentation metadata
      const response = await fetch('/api/docs/endpoints');
      if (!response.ok) {
        throw new Error('Failed to fetch API documentation');
      }

      const result = await response.json();
      setEndpoints(result.endpoints || []);
    } catch (err) {
      setError('Error al cargar documentación de API. Por favor intenta de nuevo.');
      console.error('Error fetching API docs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-green-100 text-green-800';
      case 'POST':
        return 'bg-blue-100 text-blue-800';
      case 'PUT':
        return 'bg-yellow-100 text-yellow-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'PATCH':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'authentication':
        return <Lock className="h-4 w-4" />;
      case 'users':
        return <Users className="h-4 w-4" />;
      case 'appointments':
        return <Calendar className="h-4 w-4" />;
      case 'services':
        return <FileText className="h-4 w-4" />;
      case 'admin':
        return <Settings className="h-4 w-4" />;
      case 'superadmin':
        return <Zap className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const generateCurlExample = (endpoint: APIEndpoint) => {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://api.agentsalud.com'
      : 'http://localhost:3000';

    let curl = `curl -X ${endpoint.method} ${baseUrl}${endpoint.path}`;

    if (endpoint.authentication) {
      curl += ` \\\n  -H "Authorization: Bearer <your_token>"`;
    }

    if (endpoint.method !== 'GET') {
      curl += ` \\\n  -H "Content-Type: application/json"`;
    }

    if (endpoint.requestBody && endpoint.examples.length > 0) {
      curl += ` \\\n  -d '${JSON.stringify(endpoint.examples[0].request, null, 2)}'`;
    }

    return curl;
  };

  const filteredEndpoints = endpoints.filter(endpoint => {
    // Filter by user role
    if (!endpoint.roles.includes(profile?.role || '')) {
      return false;
    }

    // Filter by category
    if (selectedCategory !== 'all' && endpoint.category !== selectedCategory) {
      return false;
    }

    // Filter by method
    if (selectedMethod !== 'all' && endpoint.method !== selectedMethod) {
      return false;
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        endpoint.title.toLowerCase().includes(searchLower) ||
        endpoint.description.toLowerCase().includes(searchLower) ||
        endpoint.path.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  const categories = Array.from(new Set(endpoints.map(e => e.category)));
  const methods = Array.from(new Set(endpoints.map(e => e.method)));

  const actions = (
    <>
      <button
        type="button"
        onClick={() => setShowFilters(!showFilters)}
        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <Filter className="h-4 w-4 mr-2" />
        Filtros
      </button>
      <button
        type="button"
        onClick={() => window.open('/api/docs/openapi.json', '_blank')}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <Download className="h-4 w-4 mr-2" />
        OpenAPI Spec
      </button>
    </>
  );

  if (!profile) {
    return (
      <DashboardLayout title="Acceso Denegado">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Acceso Denegado</h3>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Documentación de API"
      subtitle={`AgentSalud API • ${filteredEndpoints.length} endpoints disponibles`}
      actions={actions}
    >
      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
              <div className="relative">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar endpoints..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                title="Filtrar por categoría"
              >
                <option value="all">Todas las categorías</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Método HTTP</label>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                title="Filtrar por método HTTP"
              >
                <option value="all">Todos los métodos</option>
                {methods.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* API Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Book className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Endpoints</dt>
                  <dd className="text-lg font-medium text-gray-900">{endpoints.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Disponibles</dt>
                  <dd className="text-lg font-medium text-gray-900">{filteredEndpoints.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Lock className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Autenticados</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {endpoints.filter(e => e.authentication).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Globe className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Categorías</dt>
                  <dd className="text-lg font-medium text-gray-900">{categories.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Endpoints List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Endpoints de API ({filteredEndpoints.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredEndpoints.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredEndpoints.map((endpoint) => (
              <div key={endpoint.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full mr-3 ${getMethodColor(endpoint.method)}`}>
                        {endpoint.method}
                      </span>
                      <div className="flex items-center text-gray-500 mr-3">
                        {getCategoryIcon(endpoint.category)}
                        <span className="ml-1 text-sm">{endpoint.category}</span>
                      </div>
                      {endpoint.authentication && (
                        <Lock className="h-4 w-4 text-purple-500" title="Requiere autenticación" />
                      )}
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-1">{endpoint.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{endpoint.description}</p>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                      {endpoint.path}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEndpoint(endpoint)}
                    className="ml-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver Detalles
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Book className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay endpoints disponibles</h3>
            <p className="text-gray-600">
              {searchTerm || selectedCategory !== 'all' || selectedMethod !== 'all'
                ? 'No se encontraron endpoints que coincidan con los filtros aplicados.'
                : 'No hay endpoints de API disponibles para tu rol.'}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
