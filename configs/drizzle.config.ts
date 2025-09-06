
import type { Config } from 'drizzle-kit';
import { getDatabaseUrl } from './server/database-config-override';

export default {
  schema: './server/complete-db-schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: getDatabaseUrl(),
  },
  verbose: true,
  strict: true,
} satisfies Config;
