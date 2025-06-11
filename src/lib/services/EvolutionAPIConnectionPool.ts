/**
 * Evolution API Connection Pool
 * 
 * Manages reusable HTTP connections to Evolution API to improve performance
 * and reduce latency for WhatsApp operations. Part of the radical solution
 * performance optimization.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { Agent } from 'https';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface ConnectionPoolConfig {
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

interface PooledConnection {
  agent: Agent;
  baseUrl: string;
  createdAt: Date;
  lastUsed: Date;
  requestCount: number;
  isActive: boolean;
}

interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
}

// =====================================================
// CONNECTION POOL CLASS
// =====================================================

/**
 * EvolutionAPIConnectionPool - Manages HTTP connections to Evolution API
 * 
 * @description Implements connection pooling, reuse, and cleanup for
 * improved performance and reduced latency in WhatsApp operations.
 */
export class EvolutionAPIConnectionPool {
  private connections = new Map<string, PooledConnection>();
  private config: ConnectionPoolConfig;
  private metrics: ConnectionMetrics;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    this.config = {
      maxConnections: config.maxConnections || 10,
      connectionTimeout: config.connectionTimeout || 5000,
      idleTimeout: config.idleTimeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000
    };

    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0
    };

    this.startCleanupProcess();
  }

  // =====================================================
  // CONNECTION MANAGEMENT
  // =====================================================

  /**
   * Get or create a pooled connection for the given base URL
   */
  async getConnection(baseUrl: string): Promise<PooledConnection> {
    const normalizedUrl = this.normalizeUrl(baseUrl);
    
    // Check if we have an existing connection
    let connection = this.connections.get(normalizedUrl);
    
    if (connection && this.isConnectionValid(connection)) {
      // Update last used timestamp
      connection.lastUsed = new Date();
      connection.requestCount++;
      this.updateMetrics();
      
      console.log(`🔄 Reusing connection for ${normalizedUrl} (requests: ${connection.requestCount})`);
      return connection;
    }

    // Create new connection if needed
    if (this.connections.size >= this.config.maxConnections) {
      await this.evictOldestConnection();
    }

    connection = await this.createConnection(normalizedUrl);
    this.connections.set(normalizedUrl, connection);
    this.updateMetrics();

    console.log(`🆕 Created new connection for ${normalizedUrl} (total: ${this.connections.size})`);
    return connection;
  }

  /**
   * Create a new pooled connection
   */
  private async createConnection(baseUrl: string): Promise<PooledConnection> {
    const agent = new Agent({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 5,
      maxFreeSockets: 2,
      timeout: this.config.connectionTimeout,
      scheduling: 'fifo'
    });

    const connection: PooledConnection = {
      agent,
      baseUrl,
      createdAt: new Date(),
      lastUsed: new Date(),
      requestCount: 0,
      isActive: true
    };

    this.metrics.totalConnections++;
    return connection;
  }

  /**
   * Check if a connection is still valid and usable
   */
  private isConnectionValid(connection: PooledConnection): boolean {
    const now = new Date();
    const idleTime = now.getTime() - connection.lastUsed.getTime();
    
    return (
      connection.isActive &&
      idleTime < this.config.idleTimeout
    );
  }

  /**
   * Evict the oldest connection to make room for a new one
   */
  private async evictOldestConnection(): Promise<void> {
    let oldestConnection: PooledConnection | null = null;
    let oldestKey: string | null = null;

    for (const [key, connection] of this.connections.entries()) {
      if (!oldestConnection || connection.createdAt < oldestConnection.createdAt) {
        oldestConnection = connection;
        oldestKey = key;
      }
    }

    if (oldestKey && oldestConnection) {
      await this.closeConnection(oldestConnection);
      this.connections.delete(oldestKey);
      console.log(`🗑️ Evicted oldest connection for ${oldestConnection.baseUrl}`);
    }
  }

  /**
   * Close a connection and clean up resources
   */
  private async closeConnection(connection: PooledConnection): Promise<void> {
    try {
      connection.isActive = false;
      connection.agent.destroy();
    } catch (error) {
      console.warn('⚠️ Error closing connection:', error);
    }
  }

  // =====================================================
  // HTTP REQUEST METHODS
  // =====================================================

  /**
   * Make an HTTP request using a pooled connection
   */
  async request(
    baseUrl: string,
    path: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      timeout?: number;
    } = {}
  ): Promise<Response> {
    const connection = await this.getConnection(baseUrl);
    const startTime = Date.now();

    try {
      const url = `${baseUrl}${path}`;
      const requestOptions = {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: options.body,
        // Use the pooled agent
        agent: connection.agent,
        timeout: options.timeout || this.config.connectionTimeout
      };

      console.log(`📡 Making request to ${url} via pooled connection`);
      
      const response = await fetch(url, requestOptions);
      
      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateResponseMetrics(responseTime, response.ok);
      
      this.metrics.totalRequests++;
      
      return response;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateResponseMetrics(responseTime, false);
      
      console.error(`❌ Request failed for ${baseUrl}${path}:`, error);
      throw error;
    }
  }

  // =====================================================
  // CLEANUP AND MAINTENANCE
  // =====================================================

  /**
   * Start the automatic cleanup process for idle connections
   */
  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 60000); // Run every minute
  }

  /**
   * Clean up idle and invalid connections
   */
  private cleanupIdleConnections(): void {
    const now = new Date();
    const connectionsToRemove: string[] = [];

    for (const [key, connection] of this.connections.entries()) {
      const idleTime = now.getTime() - connection.lastUsed.getTime();
      
      if (idleTime > this.config.idleTimeout || !connection.isActive) {
        connectionsToRemove.push(key);
      }
    }

    for (const key of connectionsToRemove) {
      const connection = this.connections.get(key);
      if (connection) {
        this.closeConnection(connection);
        this.connections.delete(key);
        console.log(`🧹 Cleaned up idle connection for ${connection.baseUrl}`);
      }
    }

    this.updateMetrics();
  }

  /**
   * Destroy all connections and stop cleanup process
   */
  async destroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    const closePromises = Array.from(this.connections.values()).map(
      connection => this.closeConnection(connection)
    );

    await Promise.all(closePromises);
    this.connections.clear();
    
    console.log('🔥 Connection pool destroyed');
  }

  // =====================================================
  // METRICS AND MONITORING
  // =====================================================

  /**
   * Update connection metrics
   */
  private updateMetrics(): void {
    this.metrics.activeConnections = Array.from(this.connections.values())
      .filter(conn => conn.isActive).length;
    
    this.metrics.idleConnections = this.connections.size - this.metrics.activeConnections;
  }

  /**
   * Update response time metrics
   */
  private updateResponseMetrics(responseTime: number, success: boolean): void {
    // Update average response time (simple moving average)
    const totalRequests = this.metrics.totalRequests;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * totalRequests + responseTime) / (totalRequests + 1);

    // Update error rate
    if (!success) {
      const totalErrors = this.metrics.errorRate * totalRequests;
      this.metrics.errorRate = (totalErrors + 1) / (totalRequests + 1);
    } else {
      const totalErrors = this.metrics.errorRate * totalRequests;
      this.metrics.errorRate = totalErrors / (totalRequests + 1);
    }
  }

  /**
   * Get current connection pool metrics
   */
  getMetrics(): ConnectionMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get detailed connection information
   */
  getConnectionInfo(): Array<{
    baseUrl: string;
    createdAt: Date;
    lastUsed: Date;
    requestCount: number;
    isActive: boolean;
    idleTime: number;
  }> {
    const now = new Date();
    
    return Array.from(this.connections.entries()).map(([baseUrl, connection]) => ({
      baseUrl,
      createdAt: connection.createdAt,
      lastUsed: connection.lastUsed,
      requestCount: connection.requestCount,
      isActive: connection.isActive,
      idleTime: now.getTime() - connection.lastUsed.getTime()
    }));
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Normalize URL for consistent connection pooling
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return url;
    }
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let globalConnectionPool: EvolutionAPIConnectionPool | null = null;

/**
 * Get the global connection pool instance
 */
export function getEvolutionAPIConnectionPool(): EvolutionAPIConnectionPool {
  if (!globalConnectionPool) {
    globalConnectionPool = new EvolutionAPIConnectionPool({
      maxConnections: parseInt(process.env.EVOLUTION_API_MAX_CONNECTIONS || '10'),
      connectionTimeout: parseInt(process.env.EVOLUTION_API_CONNECTION_TIMEOUT || '5000'),
      idleTimeout: parseInt(process.env.EVOLUTION_API_IDLE_TIMEOUT || '30000')
    });
  }
  
  return globalConnectionPool;
}

/**
 * Destroy the global connection pool
 */
export async function destroyEvolutionAPIConnectionPool(): Promise<void> {
  if (globalConnectionPool) {
    await globalConnectionPool.destroy();
    globalConnectionPool = null;
  }
}
