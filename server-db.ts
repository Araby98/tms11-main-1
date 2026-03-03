import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = path.join(__dirname, "db.json");

// Types
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  grade: string;
  region: string;
  fromProvince: string;
  role: string;
}

export interface TransferWish {
  id: string;
  userId: string;
  fromProvince: string;
  toProvince: string;
  createdAt: string;
  matchedTransferId?: string;
}

export interface TransferRequest {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  participants: { userId: string; fromProvince: string; toProvince: string }[];
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface DB {
  users: User[];
  wishes: TransferWish[];
  transfers: TransferRequest[];
  notifications: Notification[];
}

let pgPool: Pool | null = null;

const getPool = () => {
  if (!pgPool) {
    const dbUrl = process.env.DATABASE_URL as string | undefined;
    if (!dbUrl) throw new Error("DATABASE_URL is not defined");
    pgPool = new Pool({ connectionString: dbUrl });
  }
  return pgPool;
};

const ensureTables = async () => {
  const pool = getPool();
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
};

export const loadDB = async (): Promise<DB> => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    // File-based
    if (!fs.existsSync(DB_PATH)) {
      const empty: DB = { users: [], wishes: [], transfers: [], notifications: [] };
      fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2));
      return empty;
    }
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  }

  // Postgres-backed
  const pool = getPool();
  await ensureTables();

  const usersRes = await pool.query("SELECT * FROM users");
  const wishesRes = await pool.query("SELECT * FROM wishes");
  const transfersRes = await pool.query("SELECT * FROM transfers");
  const notificationsRes = await pool.query("SELECT * FROM notifications");

  const db: DB = {
    users: usersRes.rows as User[],
    wishes: wishesRes.rows.map((r: any) => ({ ...r })) as TransferWish[],
    transfers: transfersRes.rows.map((r: any) => ({ ...r, participants: r.participants })) as TransferRequest[],
    notifications: notificationsRes.rows as Notification[],
  };

  return db;
};

export const saveDB = async (db: DB): Promise<void> => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    return;
  }

  const pool = getPool();
  await ensureTables();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Truncate tables
    await client.query("TRUNCATE TABLE users, wishes, transfers, notifications RESTART IDENTITY;");

    // Insert users
    for (const u of db.users) {
      await client.query(
        `INSERT INTO users(id, firstname, lastname, email, password, grade, region, fromprovince, role)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [u.id, u.firstName, u.lastName, u.email, u.password, u.grade, u.region, u.fromProvince, u.role]
      );
    }

    // Insert wishes
    for (const w of db.wishes) {
      await client.query(
        `INSERT INTO wishes(id, userid, fromprovince, toprovince, createdat, matchedtransferid)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [w.id, w.userId, w.fromProvince, w.toProvince, w.createdAt, w.matchedTransferId || null]
      );
    }

    // Insert transfers (participants as JSONB)
    for (const t of db.transfers) {
      await client.query(
        `INSERT INTO transfers(id, type, status, createdat, participants)
         VALUES($1,$2,$3,$4,$5)`,
        [t.id, t.type, t.status, t.createdAt, JSON.stringify(t.participants)]
      );
    }

    // Insert notifications
    for (const n of db.notifications) {
      await client.query(
        `INSERT INTO notifications(id, userid, message, createdat, read)
         VALUES($1,$2,$3,$4,$5)`,
        [n.id, n.userId, n.message, n.createdAt, n.read]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
