/**
 * db.ts — low-level database layer.
 *
 * Responsibilities:
 *  - Open and cache the SQLite connection (singleton).
 *  - Run schema migrations / table initialisation on app startup.
 *
 * All higher-level CRUD operations live in fuelRepository.ts.
 * All shared types live in types.ts.
 */

import * as SQLite from 'expo-sqlite';

// Re-export the shared types so existing imports from '~/lib/db' keep working.
export type { FuelEntry, NewFuelEntryInput, YearlyStats, MonthlyBreakdown } from './types';

// ─── Singleton DB handle ───────────────────────────────────────────────────────

const DB_NAME = 'fuel_tracker.db';

let _db: SQLite.SQLiteDatabase | null = null;

/**
 * Returns the open database handle, lazily opening it on first call.
 * Exported so fuelRepository.ts can share the same connection.
 */
export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return _db;
}

// ─── Schema init ──────────────────────────────────────────────────────────────

/**
 * Creates the `fuel_entries` table if it does not already exist and enables
 * WAL journal mode for better concurrent read performance.
 *
 * Safe to call on every app launch — uses `CREATE TABLE IF NOT EXISTS`.
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
