import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'db.json');

async function ensureTables(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      firstName TEXT,
      lastName TEXT,
      email TEXT,
      password TEXT,
      grade TEXT,
      region TEXT,
      fromProvince TEXT,
      role TEXT
    );

    CREATE TABLE IF NOT EXISTS wishes (
      id TEXT PRIMARY KEY,
      userId TEXT,
      fromProvince TEXT,
      toProvince TEXT,
      createdAt TEXT,
      matchedTransferId TEXT
    );

    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY,
      type TEXT,
      status TEXT,
      createdAt TEXT,
      participants JSONB
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT,
      message TEXT,
      createdAt TEXT,
      read BOOLEAN
    );
  `);
}

async function migrate(databaseUrl: string) {
  if (!fs.existsSync(DB_PATH)) {
    console.error('No db.json found at', DB_PATH);
    process.exit(1);
  }
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  const db = JSON.parse(raw);

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await ensureTables(pool);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('TRUNCATE TABLE users, wishes, transfers, notifications RESTART IDENTITY;');

      for (const u of db.users || []) {
        await client.query(
          `INSERT INTO users(id, firstname, lastname, email, password, grade, region, fromprovince, role)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [u.id, u.firstName, u.lastName, u.email, u.password, u.grade, u.region, u.fromProvince, u.role]
        );
      }

      for (const w of db.wishes || []) {
        await client.query(
          `INSERT INTO wishes(id, userid, fromprovince, toprovince, createdat, matchedtransferid)
           VALUES($1,$2,$3,$4,$5,$6)`,
          [w.id, w.userId, w.fromProvince, w.toProvince, w.createdAt, w.matchedTransferId || null]
        );
      }

      for (const t of db.transfers || []) {
        await client.query(
          `INSERT INTO transfers(id, type, status, createdat, participants)
           VALUES($1,$2,$3,$4,$5)`,
          [t.id, t.type, t.status, t.createdAt, JSON.stringify(t.participants)]
        );
      }

      for (const n of db.notifications || []) {
        await client.query(
          `INSERT INTO notifications(id, userid, message, createdat, read)
           VALUES($1,$2,$3,$4,$5)`,
          [n.id, n.userId, n.message, n.createdAt, n.read]
        );
      }

      await client.query('COMMIT');
      console.log('Migration complete.');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

const dbUrl = process.env.DATABASE_URL || process.argv[2];
if (!dbUrl) {
  console.error('Usage: DATABASE_URL="postgres://..." node migrate-to-postgres.js');
  process.exit(1);
}

migrate(dbUrl).catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
