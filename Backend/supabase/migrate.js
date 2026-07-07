/**
 * YouCollab — Database Migration Runner
 * ========================================
 * Applies migrations/migration.sql — the single canonical schema file —
 * against the Supabase PostgreSQL database. The file is idempotent, so
 * re-running is always safe.
 *
 * Usage:
 *   node Backend/supabase/migrate.js   (or: npm run db:migrate)
 *
 * Environment:
 *   DATABASE_URL must be set in Backend/.env or the repo-root .env
 *   Format: postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
 */

const path = require('path');
// Backend/.env first, repo-root .env as fallback (dotenv never overwrites)
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { Client } = require('pg');
const fs = require('fs');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    '❌ DATABASE_URL is not set in your .env file.\n' +
    '   Format: postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres\n' +
    '   Find it in Supabase Dashboard → Settings → Database → Connection string'
  );
  process.exit(1);
}

const client = new Client({ connectionString });

async function executeSqlFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${label} not found, skipping.`);
    return;
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`\n📦 Applying ${label}...`);

  // Strip single-line SQL comments first
  const sqlWithoutComments = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  // Split statements respecting dollar-quoted $$ blocks (common in PL/pgSQL functions)
  const statements = [];
  let current = '';
  let inDollarQuote = false;

  for (let i = 0; i < sqlWithoutComments.length; i++) {
    const char = sqlWithoutComments[i];
    current += char;
    
    if (char === '$' && sqlWithoutComments[i + 1] === '$') {
      inDollarQuote = !inDollarQuote;
      current += '$';
      i++;
      continue;
    }
    
    if (char === ';' && !inDollarQuote) {
      const stmt = current.trim();
      if (stmt.length > 0) {
        statements.push(stmt);
      }
      current = '';
    }
  }
  if (current.trim().length > 0) {
    statements.push(current.trim());
  }

  let applied = 0;
  let skipped = 0;

  for (const statement of statements) {
    try {
      await client.query(statement + ';');
      applied++;
    } catch (err) {
      const msg = err.message.toLowerCase();
      // Skip known safe-to-ignore errors
      if (
        msg.includes('already exists') ||
        msg.includes('already member') ||
        msg.includes('duplicate key') ||
        (msg.includes('relation') && msg.includes('already')) ||
        (msg.includes('policy') && msg.includes('already')) ||
        (msg.includes('trigger') && msg.includes('already'))
      ) {
        skipped++;
      } else {
        console.warn(`⚠️  Statement warning: ${err.message.split('\n')[0]}`);
        skipped++;
      }
    }
  }

  console.log(`✅ ${label} completed! (${applied} applied, ${skipped} skipped/already-exists)`);
}

async function run() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL database.');

    // Single canonical schema — creates a fresh database and repairs
    // drifted ones (idempotent).
    const migrationPath = path.join(__dirname, 'migrations', 'migration.sql');
    await executeSqlFile(migrationPath, 'migration.sql (canonical schema)');

    console.log('\n🎉 Database migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
