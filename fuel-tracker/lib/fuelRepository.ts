/**
 * fuelRepository.ts
 *
 * All database operations for the `fuel_entries` table.
 * Every SQL statement uses parameterized queries — no string interpolation.
 */

import { getDB } from './db';
import type {
  FuelEntry,
  MonthlyBreakdown,
  NewFuelEntryInput,
  YearlyStats,
} from './types';

// ─── Internal row type returned by the monthly GROUP BY query ─────────────────

interface MonthlyRow {
  month: string;
  totalSpent: number;
  totalLiters: number;
}

// ─── 1. addFuelEntry ──────────────────────────────────────────────────────────

/**
 * Computes `total_cost = liters × pricePerLiter` and inserts a new row.
 *
 * @param entry - Caller-supplied fill-up data (camelCase, no id/total_cost).
 */
export async function addFuelEntry(entry: NewFuelEntryInput): Promise<void> {
  const db = await getDB();
  const total_cost = entry.liters * entry.pricePerLiter;

  await db.runAsync(
    `INSERT INTO fuel_entries
       (date, liters, price_per_liter, total_cost, vehicle, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      entry.date,
      entry.liters,
      entry.pricePerLiter,
      total_cost,
      entry.vehicle ?? null,
      entry.notes ?? null,
    ]
  );
}

// ─── 2. getEntryForDate ───────────────────────────────────────────────────────

/**
 * Returns the most-recent entry for a given ISO date, or `null` if none exists.
 *
 * @param date - ISO date string "YYYY-MM-DD".
 */
export async function getEntryForDate(date: string): Promise<FuelEntry | null> {
  const db = await getDB();
  return db.getFirstAsync<FuelEntry>(
    `SELECT * FROM fuel_entries
      WHERE date = ?
      ORDER BY id DESC
      LIMIT 1`,
    [date]
  );
}

// ─── 3. getAllEntries ─────────────────────────────────────────────────────────

/**
 * Returns every fuel entry ordered by date descending (newest first).
 * Within the same date, higher ids (later inserts) come first.
 */
export async function getAllEntries(): Promise<FuelEntry[]> {
  const db = await getDB();
  return db.getAllAsync<FuelEntry>(
    `SELECT * FROM fuel_entries
      ORDER BY date DESC, id DESC`
  );
}

// ─── 4. deleteEntry ───────────────────────────────────────────────────────────

/**
 * Permanently removes the entry with the given primary key.
 * No-ops silently if the id does not exist.
 *
 * @param id - Primary key of the row to delete.
 */
export async function deleteEntry(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `DELETE FROM fuel_entries WHERE id = ?`,
    [id]
  );
}

// ─── 5. getYearlyStats ────────────────────────────────────────────────────────

/**
 * Computes aggregated statistics for a calendar year.
 *
 * Uses a single parameterized GROUP BY query to produce per-month breakdowns,
 * then derives the yearly totals and costliest month in TypeScript so that
 * no runtime SQL string-building is needed.
 *
 * @param year - Four-digit calendar year, e.g. 2024.
 */
export async function getYearlyStats(year: number): Promise<YearlyStats> {
  const db = await getDB();

  // strftime('%Y', date) lets SQLite extract the year from our "YYYY-MM-DD"
  // text column without any string interpolation in the WHERE clause.
  const rows = await db.getAllAsync<MonthlyRow>(
    `SELECT
       strftime('%Y-%m', date)  AS month,
       SUM(total_cost)          AS totalSpent,
       SUM(liters)              AS totalLiters
     FROM fuel_entries
     WHERE strftime('%Y', date) = ?
     GROUP BY month
     ORDER BY month ASC`,
    // Bind the year as a zero-padded 4-digit string to match strftime output.
    [String(year).padStart(4, '0')]
  );

  // ── Derive yearly aggregates from the monthly rows ────────────────────────

  const monthlyBreakdown: MonthlyBreakdown[] = rows.map((r) => ({
    month: r.month,
    totalSpent: r.totalSpent,
    totalLiters: r.totalLiters,
  }));

  const totalSpent = monthlyBreakdown.reduce((sum, r) => sum + r.totalSpent, 0);

  // Entry count is cheaper to fetch with a separate parameterized query than
  // to carry through the GROUP BY (which would require a subquery or window fn).
  const countRow = await db.getFirstAsync<{ entryCount: number }>(
    `SELECT COUNT(*) AS entryCount
     FROM fuel_entries
     WHERE strftime('%Y', date) = ?`,
    [String(year).padStart(4, '0')]
  );
  const entryCount = countRow?.entryCount ?? 0;

  const avgCostPerFillup = entryCount > 0 ? totalSpent / entryCount : 0;

  // Costliest month — find the row with the highest totalSpent.
  let costliestMonth: YearlyStats['costliestMonth'] = null;
  for (const row of monthlyBreakdown) {
    if (costliestMonth === null || row.totalSpent > costliestMonth.amount) {
      costliestMonth = { month: row.month, amount: row.totalSpent };
    }
  }

  return {
    totalSpent,
    entryCount,
    avgCostPerFillup,
    costliestMonth,
    monthlyBreakdown,
  };
}

// ─── 6. getMonthSpend ─────────────────────────────────────────────────────────

/**
 * Returns total expenditure and litres for a specific calendar month.
 *
 * @param month - Format "YYYY-MM" (e.g. "2026-09").
 */
export async function getMonthSpend(
  month: string
): Promise<{ totalSpent: number; totalLiters: number; count: number }> {
  const db = await getDB();
  const row = await db.getFirstAsync<{
    totalSpent: number | null;
    totalLiters: number | null;
    count: number;
  }>(
    `SELECT
       COALESCE(SUM(total_cost), 0) AS totalSpent,
       COALESCE(SUM(liters), 0)     AS totalLiters,
       COUNT(*)                     AS count
     FROM fuel_entries
     WHERE strftime('%Y-%m', date) = ?`,
    [month]
  );

  return {
    totalSpent: row?.totalSpent ?? 0,
    totalLiters: row?.totalLiters ?? 0,
    count: row?.count ?? 0,
  };
}
