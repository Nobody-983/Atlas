import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export function getSslConfig(connectionString: string): boolean | { rejectUnauthorized: boolean } | undefined {
  // Respect explicit SSL disable parameters
  if (
    connectionString.includes('sslmode=disable') ||
    connectionString.includes('ssl=false') ||
    process.env.PGSSLMODE === 'disable'
  ) {
    return false;
  }

  // Detect local Unix sockets and localhost
  const isUnixSocket = connectionString.includes('host=/') || connectionString.startsWith('/');
  const isLocalHost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  // Local development / tests on local socket or localhost should not use SSL unless explicitly requested
  if ((isUnixSocket || isLocalHost) && !connectionString.includes('sslmode=require') && !connectionString.includes('ssl=true')) {
    return undefined;
  }

  // Cloud/Render production or remote databases require SSL (Render PostgreSQL uses self-signed / internal CAs)
  const isProduction = config.nodeEnv === 'production' || Boolean(process.env.RENDER);
  if (isProduction || connectionString.includes('sslmode=require') || connectionString.includes('ssl=true')) {
    return { rejectUnauthorized: false };
  }

  return undefined;
}

function resolveDatabaseConfig(): { connectionString: string; ssl: boolean | { rejectUnauthorized: boolean } | undefined } {
  const isTest = config.nodeEnv === 'test';
  const connectionString = isTest ? config.testDatabaseUrl : config.databaseUrl;

  if (!connectionString || connectionString.trim() === '') {
    throw new Error(
      '[Fatal Database Error] DATABASE_URL environment variable is missing or empty. ' +
      'In production environments (such as Render), configure the DATABASE_URL environment variable ' +
      'with your PostgreSQL connection string (e.g., from Render Managed PostgreSQL).'
    );
  }

  const isProduction = config.nodeEnv === 'production' || Boolean(process.env.RENDER);
  if (isProduction && (connectionString.includes('/var/run/postgresql') || connectionString.includes('host=/'))) {
    throw new Error(
      '[Fatal Database Error] DATABASE_URL points to a local Unix domain socket (/var/run/postgresql), ' +
      'which is not available in cloud/container environments like Render. ' +
      'Please update DATABASE_URL in your Render Environment settings to a valid remote PostgreSQL connection string.'
    );
  }

  const ssl = getSslConfig(connectionString);
  return { connectionString, ssl };
}

let _poolInstance: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!_poolInstance) {
    const { connectionString, ssl } = resolveDatabaseConfig();
    _poolInstance = new Pool({
      connectionString,
      ssl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    _poolInstance.on('error', (err) => {
      console.error('[Database Pool Error]:', err);
    });
  }
  return _poolInstance;
}

export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop, receiver) {
    const instance = getPool();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

export async function query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const currentPool = getPool();
  const res = await currentPool.query<T>(text, params);
  const duration = Date.now() - start;
  if (config.nodeEnv === 'development' && duration > 100) {
    console.warn(`[Slow Query] ${duration}ms: ${text.slice(0, 100)}...`);
  }
  return res;
}

export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const currentPool = getPool();
  const client = await currentPool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function checkDatabaseHealth(): Promise<{ status: string; latencyMs: number }> {
  const start = Date.now();
  const currentPool = getPool();
  await currentPool.query('SELECT 1');
  return {
    status: 'connected',
    latencyMs: Date.now() - start,
  };
}
