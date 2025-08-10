
import { db } from '../db';
import { sql } from 'drizzle-orm';

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
  async getConnectionPoolStats() {
    try {
      const result = await db.execute(sql`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);
      
      return result[0];
    } catch (error) {
      console.error('Failed to get connection pool stats:', error);
      return null;
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

  // Start periodic maintenance
  startMaintenance() {
    // Run ANALYZE every 4 hours
    setInterval(() => {
      this.analyzeDatabase();
    }, 4 * 60 * 60 * 1000);

    // Run VACUUM every 24 hours
    setInterval(() => {
      this.vacuumDatabase();
    }, 24 * 60 * 60 * 1000);

    // Log performance stats every hour
    setInterval(() => {
      const stats = this.getQueryStats();
      console.log('Top 10 slowest queries:', stats.slice(0, 10));
    }, 60 * 60 * 1000);
  }
}

export const queryOptimizer = new QueryOptimizer();
