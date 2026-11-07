import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

// Load .env if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const { Client } = pg;

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[Migration Error]: DATABASE_URL environment variable is required.');
    process.exit(1);
  }

  const isLocal = connectionString.includes('/var/run/postgresql') || connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const isExplicitSslDisable = connectionString.includes('sslmode=disable') || process.env.PGSSLMODE === 'disable';
  const ssl = (isLocal || isExplicitSslDisable) ? undefined : { rejectUnauthorized: false };

  console.log('[Migration] Connecting to database...');
  const client = new Client({ connectionString, ssl });
  await client.connect();
  console.log('[Migration] Database connected successfully.');

  const migrationsDir = path.resolve(process.cwd(), 'database/migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error(`[Migration Error]: Migrations directory not found at ${migrationsDir}`);
    await client.end();
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`[Migration] Found ${files.length} migration file(s).`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    console.log(`[Migration] Applying ${file}...`);
    const sql = fs.readFileSync(filePath, 'utf-8');
    try {
      await client.query(sql);
      console.log(`[Migration] ✓ Applied ${file}`);
    } catch (err) {
      console.error(`[Migration Error] Failed applying ${file}:`, err);
      await client.end();
      process.exit(1);
    }
  }

  console.log('[Migration] All migrations completed successfully.');
  await client.end();
}

runMigrations().catch(err => {
  console.error('[Migration Fatal Error]:', err);
  process.exit(1);
});

