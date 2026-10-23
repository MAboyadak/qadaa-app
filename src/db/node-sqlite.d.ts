// Minimal types for Node's built-in SQLite, used only by Jest tests to run the real
// schema and SQL. Avoids adding @types/node, whose globals would leak into app code.
declare module 'node:sqlite' {
  interface StatementSync {
    run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  }
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
