/**
 * Database Connection and Initialization
 * 
 * This module manages the SQLite database connection using better-sqlite3.
 * It handles:
 * - Database creation and initialization
 * - Schema setup
 * - Initial data seeding
 * - Connection management
 * 
 * @module db
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { SCHEMA_SQL, SEED_METHODOLOGY_SQL, SEED_MODELS_SQL } from './schema';
import { DEFAULT_DB_PATH, DEFAULT_BACKUP_PATH } from '../constants';

// Database file path from environment or default
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), DEFAULT_DB_PATH);
const BACKUP_PATH = process.env.BACKUP_PATH || path.join(process.cwd(), DEFAULT_BACKUP_PATH);

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_PATH)) {
  fs.mkdirSync(BACKUP_PATH, { recursive: true });
}

/**
 * Database instance
 * 
 * Created once and reused throughout the application.
 * better-sqlite3 is synchronous for better performance.
 */
let db: Database.Database | null = null;

/**
 * Get the database connection
 * 
 * Creates the connection if it doesn't exist.
 * Initializes schema on first run.
 * 
 * @returns Database connection instance
 */
export function getDb(): Database.Database {
  if (db) {
    return db;
  }

  console.log('[DB] Connecting to database:', DB_PATH);
  
  // Create database connection
  db = new Database(DB_PATH);
  
  // Enable foreign keys (disabled by default in SQLite)
  db.pragma('foreign_keys = ON');
  
  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL');
  
  // Initialize schema if needed
  initializeSchema(db);
  
  console.log('[DB] Database connection established');
  
  return db;
}

/**
 * Initialize database schema
 * 
 * Creates all tables if they don't exist.
 * Seeds initial data.
 * 
 * @param database - Database connection
 */
function initializeSchema(database: Database.Database): void {
  console.log('[DB] Initializing database schema...');
  
  // Create all tables and indexes
  database.exec(SCHEMA_SQL);
  
  // Seed methodology version
  database.exec(SEED_METHODOLOGY_SQL);
  
  // Seed models
  database.exec(SEED_MODELS_SQL);
  
  console.log('[DB] Database schema initialized');
}

/**
 * Close database connection
 * 
 * Should be called when shutting down the application.
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    console.log('[DB] Database connection closed');
  }
}

/**
 * Generate a unique ID
 * 
 * Format: timestamp-random (e.g., "1699123456789-abc123def")
 * 
 * @returns Unique identifier string
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a database backup
 * 
 * Copies the database file to the backup directory with timestamp.
 * 
 * @returns Path to backup file
 */
export function createBackup(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `forecaster-${timestamp}.db`;
  const backupPath = path.join(BACKUP_PATH, backupFilename);
  
  // Use SQLite's backup API for consistency
  const database = getDb();
  database.backup(backupPath);
  
  console.log(`[DB] Backup created: ${backupPath}`);
  
  return backupPath;
}

/**
 * Get database statistics
 * 
 * Returns counts for all major tables.
 * Useful for admin dashboard.
 * 
 * @returns Object with table counts
 */
export function getDbStats(): Record<string, number> {
  const database = getDb();
  
  const tables = [
    'cohorts',
    'models',
    'agents',
    'markets',
    'positions',
    'trades',
    'decisions',
    'portfolio_snapshots',
    'brier_scores',
    'api_costs',
    'system_logs'
  ];
  
  const stats: Record<string, number> = {};
  
  for (const table of tables) {
    const result = database.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
    stats[table] = result.count;
  }
  
  return stats;
}

/**
 * Log a system event
 * 
 * @param eventType - Type of event
 * @param eventData - Optional JSON data
 * @param severity - 'info' | 'warning' | 'error'
 */
export function logSystemEvent(
  eventType: string,
  eventData?: Record<string, unknown>,
  severity: 'info' | 'warning' | 'error' = 'info'
): void {
  const database = getDb();
  
  database.prepare(`
    INSERT INTO system_logs (id, event_type, event_data, severity)
    VALUES (?, ?, ?, ?)
  `).run(
    generateId(),
    eventType,
    eventData ? JSON.stringify(eventData) : null,
    severity
  );
}

// Export default database getter
export default getDb;
