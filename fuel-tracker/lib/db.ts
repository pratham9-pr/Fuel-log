import * as SQLite from 'expo-sqlite';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FuelEntry {
  id: number;
  /** ISO date string, e.g. "2024-09-21" */
  date: string;
  liters: number;
  price_per_liter: number;
  total_cost: number;
  vehicle: string | null;
  notes: string | null;
}

export type NewFuelEntry = Omit<FuelEntry, 'id'>;

// ─── Singleton DB handle ───────────────────────────────────────────────────────

const DB_NAME = 'fuel_tracker.db';

let _db: SQLite.SQLiteDatabase | null = null;

/** Returns the open database handle, opening it if needed. */
export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return _db;
}

// ─── Schema init ──────────────────────────────────────────────────────────────

/**
 * Opens the SQLite database and creates the `fuel_entries` table if it does
 * not already exist. Safe to call on every app launch.
 */
export async function initDB(): Promise<void> {
  const db = await getDB();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS fuel_entries (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      date            TEXT    NOT NULL,
      liters          REAL    NOT NULL,
      price_per_liter REAL    NOT NULL,
      total_cost      REAL    NOT NULL,
      vehicle         TEXT,
      notes           TEXT
    );
  `);
}

// ─── CRUD helpers ─────────────────────────────────────────────────────────────

/** Insert a new fuel entry and return its auto-assigned id. */
export async function insertFuelEntry(entry: NewFuelEntry): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    `INSERT INTO fuel_entries (date, liters, price_per_liter, total_cost, vehicle, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      entry.date,
      entry.liters,
      entry.price_per_liter,
      entry.total_cost,
      entry.vehicle ?? null,
      entry.notes ?? null,
    ]
  );
  return result.lastInsertRowId;
}

/** Fetch all fuel entries ordered by date descending. */
export async function getAllFuelEntries(): Promise<FuelEntry[]> {
  const db = await getDB();
  return db.getAllAsync<FuelEntry>(
    'SELECT * FROM fuel_entries ORDER BY date DESC, id DESC'
  );
}

/** Fetch a single entry by id, or null if not found. */
export async function getFuelEntryById(id: number): Promise<FuelEntry | null> {
  const db = await getDB();
  return db.getFirstAsync<FuelEntry>(
    'SELECT * FROM fuel_entries WHERE id = ?',
    [id]
  );
}

/** Delete a fuel entry by id. */
export async function deleteFuelEntry(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM fuel_entries WHERE id = ?', [id]);
}

/** Aggregate stats: total spend, total liters, entry count. */
export async function getFuelStats(): Promise<{
  totalEntries: number;
  totalLiters: number;
  totalSpend: number;
  avgPricePerLiter: number;
}> {
  const db = await getDB();
  const row = await db.getFirstAsync<{
    totalEntries: number;
    totalLiters: number;
    totalSpend: number;
    avgPricePerLiter: number;
  }>(
    `SELECT
       COUNT(*)            AS totalEntries,
       COALESCE(SUM(liters), 0)          AS totalLiters,
       COALESCE(SUM(total_cost), 0)      AS totalSpend,
       COALESCE(AVG(price_per_liter), 0) AS avgPricePerLiter
     FROM fuel_entries`
  );
  return row ?? { totalEntries: 0, totalLiters: 0, totalSpend: 0, avgPricePerLiter: 0 };
}
