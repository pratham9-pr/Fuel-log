/**
 * Shared domain types for the Fuel Tracker app.
 * Import from this module across all screens and repository layers.
 */

// ─── Core entity ──────────────────────────────────────────────────────────────

/** A single fuel fill-up record as stored in (and retrieved from) SQLite. */
export interface FuelEntry {
  /** Auto-assigned primary key. */
  id: number;
  /** ISO 8601 date string: "YYYY-MM-DD". */
  date: string;
  /** Volume of fuel added, in litres. */
  liters: number;
  /** Cost per litre at time of fill-up. */
  price_per_liter: number;
  /** Pre-computed total_cost = liters × price_per_liter. */
  total_cost: number;
  /** Optional vehicle identifier (e.g. "Honda City"). Null when omitted. */
  vehicle: string | null;
  /** Optional free-text notes. Null when omitted. */
  notes: string | null;
}

// ─── Repository input ─────────────────────────────────────────────────────────

/** Shape of the data the caller passes to addFuelEntry(). */
export interface NewFuelEntryInput {
  /** ISO 8601 date string: "YYYY-MM-DD". */
  date: string;
  /** Volume of fuel added, in litres. */
  liters: number;
  /** Cost per litre at time of fill-up. */
  pricePerLiter: number;
  /** Optional vehicle identifier. */
  vehicle?: string;
  /** Optional free-text notes. */
  notes?: string;
}

// ─── Stats shapes ─────────────────────────────────────────────────────────────

export interface MonthlyBreakdown {
  /** Full month label, e.g. "2024-09". */
  month: string;
  totalSpent: number;
  totalLiters: number;
}

export interface YearlyStats {
  totalSpent: number;
  entryCount: number;
  avgCostPerFillup: number;
  /** The calendar month that had the highest spend, or null if no data. */
  costliestMonth: { month: string; amount: number } | null;
  /** One row per month that has at least one entry, ascending by month. */
  monthlyBreakdown: MonthlyBreakdown[];
}
