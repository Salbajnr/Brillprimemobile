import { db } from '../db';
import { sql } from 'drizzle-orm';

// Define the interface for connection pool statistics
interface ConnectionPoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  activeCount: number;
}

class QueryOptimizer {
  private queryStats: Map<string, { count: number; totalTime: number; avgTime: number }> = new Map();

  // Query performance monitoring
  async monitorQuery<T>(queryName: string, queryFn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;

      this.updateQueryStats(queryName, duration);

      // Log slow queries
      if (duration > 1000) {
        console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
      }

      return result;
    } catch (error) {
      console.error(`Query failed: ${queryName}`, error);
      throw error;
    }
  }

  private updateQueryStats(queryName: string, duration: number) {
    const stats = this.queryStats.get(queryName) || { count: 0, totalTime: 0, avgTime: 0 };
    stats.count += 1;
    stats.totalTime += duration;
    stats.avgTime = stats.totalTime / stats.count;
    this.queryStats.set(queryName, stats);
  }

  // Get query performance statistics
  getQueryStats() {
    const stats = Array.from(this.queryStats.entries()).map(([name, stat]) => ({
      queryName: name,
      ...stat
    }));

    return stats.sort((a, b) => b.avgTime - a.avgTime);
  }

  // Database maintenance operations
  async analyzeDatabase() {
    console.log('Running database analysis...');

    try {
      // Analyze all tables for query planning
      const tables = ['users', 'orders', 'transactions', 'products', 'notifications'];

      for (const table of tables) {
        await db.execute(sql`ANALYZE ${sql.raw(table)}`);
      }

      console.log('Database analysis completed');
    } catch (error) {
      console.error('Database analysis failed:', error);
    }
  }

  async vacuumDatabase() {
    console.log('Running database vacuum...');

    try {
      await db.execute(sql`VACUUM ANALYZE`);
      console.log('Database vacuum completed');
    } catch (error) {
      console.error('Database vacuum failed:', error);
    }
  }

  // Connection pool monitoring
  async getConnectionPoolStats(): Promise<ConnectionPoolStats> {
    try {
      // Skip if no database configured
      if (!process.env.DATABASE_URL) {
        return {
          totalCount: 0,
          idleCount: 0,
          waitingCount: 0,
          activeCount: 0
        };
      }

      // This is a simplified implementation
      // In a real application, you'd get these stats from your connection pool
      return {
        totalCount: 10,
        idleCount: 5,
        waitingCount: 0,
        activeCount: 5
      };
    } catch (error) {
      console.error('Failed to get connection pool stats:', error);
      return {
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0,
        activeCount: 0
      };
    }
  }

  // Query plan analysis
  async explainQuery(query: string) {
    try {
      const result = await db.execute(sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql.raw(query)}`);
      return result[0];
    } catch (error) {
      console.error('Query explanation failed:', error);
      return null;
    }
  }

  // Index usage statistics
  async getIndexUsageStats() {
    try {
      const result = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch,
          idx_scan
        FROM pg_stat_user_indexes
        ORDER BY idx_scan DESC
      `);

      return result;
    } catch (error) {
      console.error('Failed to get index usage stats:', error);
      return [];
    }
  }

  // Slow query identification
  async getSlowQueries() {
    try {
      const result = await db.execute(sql`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements
        WHERE mean_time > 100
        ORDER BY mean_time DESC
        LIMIT 20
      `);

      return result;
    } catch (error) {
      console.error('Failed to get slow queries:', error);
      return [];
    }
  }

  // Query result caching
  private queryCache: Map<string, { result: any; timestamp: number; ttl: number }> = new Map();

  private getCachedResult(cacheKey: string): any | null {
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.result;
    }
    if (cached) {
      this.queryCache.delete(cacheKey);
    }
    return null;
  }

  private setCachedResult(cacheKey: string, result: any, ttlSeconds: number = 300) {
    this.queryCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });
  }

  // Enhanced query monitoring with caching
  async monitorQueryWithCache<T>(
    queryName: string, 
    queryFn: () => Promise<T>, 
    cacheKey?: string,
    cacheTtl: number = 300
  ): Promise<T> {
    // Check cache first if cacheKey provided
    if (cacheKey) {
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        console.log(`Cache hit for query: ${queryName}`);
        return cached;
      }
    }

    const startTime = Date.now();

    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;

      this.updateQueryStats(queryName, duration);

      // Cache successful results
      if (cacheKey) {
        this.setCachedResult(cacheKey, result, cacheTtl);
      }

      // Log slow queries
      if (duration > 1000) {
        console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
      }

      return result;
    } catch (error) {
      console.error(`Query failed: ${queryName}`, error);
      throw error;
    }
  }

  // Connection pool optimization
  async optimizeConnectionPool(): Promise<void> {
    try {
      // Skip optimization if no database URL is configured
      if (!process.env.DATABASE_URL) {
        console.log('Database URL not configured - skipping connection pool optimization');
        return;
      }

      // Get pool stats
      const poolStats = await this.getConnectionPoolStats();
      console.log('Current connection pool stats:', poolStats);

      // Adjust pool size based on usage
      if (poolStats.waitingCount > 5) {
        console.log('High connection waiting - consider increasing pool size');
      }

      if (poolStats.idleCount > poolStats.totalCount * 0.7) {
        console.log('Many idle connections - consider reducing pool size');
      }

    } catch (error) {
      console.error('Connection pool optimization failed:', error);
      // Don't throw error - just log it to prevent server crash
      console.log('Continuing without connection pool optimization');
    }
  }

  // Clear expired cache entries
  private cleanupQueryStats() {
    const now = Date.now();
    // Example: Remove stats older than 24 hours
    for (const [key, value] of this.queryStats.entries()) {
      // This logic needs to be defined based on what "cleanupQueryStats" should do.
      // For demonstration, let's assume we want to remove stats older than 24 hours.
      // A more robust solution might involve storing timestamps with each stat entry.
      // For now, this is a placeholder.
    }
  }

  // Start periodic maintenance
  startMaintenance(): void {
    try {
      // Run maintenance every 5 minutes
      setInterval(async () => {
        try {
          await this.optimizeConnectionPool();
          this.cleanupQueryStats();
        } catch (error) {
          console.warn('Query optimizer maintenance cycle failed:', error.message);
        }
      }, 5 * 60 * 1000);

      console.log('Query optimizer maintenance started');
    } catch (error) {
      console.warn('Failed to start query optimizer maintenance:', error.message);
      throw error;
    }
  }
}

export const queryOptimizer = new QueryOptimizer();