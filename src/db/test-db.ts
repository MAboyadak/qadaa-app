// Test-only bridge: execute repository SQL against Node's real SQLite engine.
import { DatabaseSync } from 'node:sqlite';

import type { SQLiteDatabase } from 'expo-sqlite';

export function createTestDb() {
  const connection = new DatabaseSync(':memory:');
  const adapter = {
    async execAsync(sql: string) {
      connection.exec(sql);
    },
    async runAsync(sql: string, ...params: unknown[]) {
      const result = connection.prepare(sql).run(...params);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    async getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null> {
      return (connection.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
      return connection.prepare(sql).all(...params) as T[];
    },
    async withTransactionAsync(task: () => Promise<void>) {
      connection.exec('BEGIN');
      try {
        await task();
        connection.exec('COMMIT');
      } catch (error) {
        connection.exec('ROLLBACK');
        throw error;
      }
    },
    async withExclusiveTransactionAsync(task: (txn: SQLiteDatabase) => Promise<void>) {
      await adapter.withTransactionAsync(() => task(db));
    },
  };
  const db = adapter as unknown as SQLiteDatabase;
  return { db, close: () => connection.close() };
}
