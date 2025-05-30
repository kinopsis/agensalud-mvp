'use client';

/**
 * APITester Component - FASE 3 MVP Enhancement
 * Interactive API testing tool within documentation
 * Allows users to test API endpoints directly from the docs
 */

import React, { useState } from 'react';
import { Play, Copy, Download, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useNotifications } from '@/components/ui/NotificationSystem';

interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  parameters?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
    example?: any;
  }[];
  body?: {
    type: string;
    properties: Record<string, any>;
    example?: any;
  };
  responses: {
    status: number;
    description: string;
    example?: any;
  }[];
}

interface APITesterProps {
  endpoint: APIEndpoint;
  baseUrl?: string;
  authToken?: string;
}

/**
 * Interactive API testing component
 */
export default function APITester({ endpoint, baseUrl = '/api', authToken }: APITesterProps) {
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [requestBody, setRequestBody] = useState<string>('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useNotifications();

  /**
   * Initialize default values
   */
  React.useEffect(() => {
    // Set default parameter values
    const defaultParams: Record<string, any> = {};
    endpoint.parameters?.forEach(param => {
      if (param.example !== undefined) {
        defaultParams[param.name] = param.example;
      }
    });
    setParameters(defaultParams);

    // Set default request body
    if (endpoint.body?.example) {
      setRequestBody(JSON.stringify(endpoint.body.example, null, 2));
    }
  }, [endpoint]);

  /**
   * Execute API request
   */
  const executeRequest = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Build URL with parameters
      let url = `${baseUrl}${endpoint.path}`;
      
      // Replace path parameters
      Object.entries(parameters).forEach(([key, value]) => {
        url = url.replace(`{${key}}`, encodeURIComponent(value));
      });

      // Add query parameters for GET requests
      if (endpoint.method === 'GET' && Object.keys(parameters).length > 0) {
        const queryParams = new URLSearchParams();
        Object.entries(parameters).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            queryParams.append(key, value);
          }
        });
        if (queryParams.toString()) {
          url += `?${queryParams.toString()}`;
        }
      }

      // Prepare request options
      const options: RequestInit = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        }
      };

      // Add body for non-GET requests
      if (endpoint.method !== 'GET' && requestBody.trim()) {
        try {
          options.body = JSON.stringify(JSON.parse(requestBody));
        } catch (e) {
          throw new Error('Invalid JSON in request body');
        }
      }

      // Execute request
      const startTime = Date.now();
      const res = await fetch(url, options);
      const endTime = Date.now();
      
      const responseData = await res.json().catch(() => ({}));
      
      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        data: responseData,
        responseTime: endTime - startTime,
        url: url
      });

      if (res.ok) {
        showSuccess('Solicitud exitosa', `${endpoint.method} ${endpoint.path} - ${res.status}`);
      } else {
        showError('Error en solicitud', `${res.status} ${res.statusText}`);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      showError('Error de conexión', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Copy response to clipboard
   */
  const copyResponse = async () => {
    if (response) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
        showSuccess('Copiado', 'Respuesta copiada al portapapeles');
      } catch (err) {
        showError('Error', 'No se pudo copiar al portapapeles');
      }
    }
  };

  /**
   * Download response as JSON
   */
  const downloadResponse = () => {
    if (response) {
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `api-response-${endpoint.method}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600 bg-green-50';
    if (status >= 400 && status < 500) return 'text-yellow-600 bg-yellow-50';
    if (status >= 500) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Probar API</h3>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs font-medium rounded ${
            endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800' :
            endpoint.method === 'POST' ? 'bg-green-100 text-green-800' :
            endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
            endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {endpoint.method}
          </span>
          <code className="text-sm text-gray-600">{endpoint.path}</code>
        </div>
      </div>

      {/* Parameters */}
      {endpoint.parameters && endpoint.parameters.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Parámetros</h4>
          <div className="space-y-3">
            {endpoint.parameters.map((param) => (
              <div key={param.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {param.name}
                  {param.required && <span className="text-red-500 ml-1">*</span>}
                  <span className="text-xs text-gray-500 ml-2">({param.type})</span>
                </label>
                <input
                  type="text"
                  value={parameters[param.name] || ''}
                  onChange={(e) => setParameters(prev => ({
                    ...prev,
                    [param.name]: e.target.value
                  }))}
                  placeholder={param.description}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Body */}
      {endpoint.method !== 'GET' && endpoint.body && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Cuerpo de la Solicitud</h4>
          <textarea
            value={requestBody}
            onChange={(e) => setRequestBody(e.target.value)}
            placeholder="JSON request body"
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Execute Button */}
      <div className="flex justify-center">
        <button
          onClick={executeRequest}
          disabled={loading}
          className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          {loading ? 'Ejecutando...' : 'Ejecutar Solicitud'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
          <div>
            <h4 className="text-sm font-medium text-red-800">Error</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Response Display */}
      {response && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">Respuesta</h4>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(response.status)}`}>
                {response.status} {response.statusText}
              </span>
              <span className="text-xs text-gray-500">
                {response.responseTime}ms
              </span>
              <button
                onClick={copyResponse}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Copiar respuesta"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={downloadResponse}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Descargar respuesta"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-md p-4">
            <pre className="text-sm text-gray-800 overflow-x-auto">
              {JSON.stringify(response.data, null, 2)}
            </pre>
          </div>

          {/* Response Headers */}
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
              Headers de Respuesta
            </summary>
            <div className="mt-2 bg-gray-50 rounded-md p-3">
              <pre className="text-xs text-gray-600">
                {JSON.stringify(response.headers, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
