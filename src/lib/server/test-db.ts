import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import * as schema from './db/schema';

// Generate DDL from the app schema, never connect to D1 or read .env files.
// The legacy migration journal does not include all manually applied migrations.
let statements: Promise<string[]> | undefined;

export async function createTestDb() {
	statements ??= Promise.all([
		generateSQLiteDrizzleJson({}),
		generateSQLiteDrizzleJson(schema)
	]).then(([empty, current]) => generateSQLiteMigration(empty, current));
	const sqlite = new Database(':memory:');
	try {
		for (const statement of await statements) sqlite.exec(statement);
		sqlite.pragma('foreign_keys = ON');
		return { db: drizzle(sqlite, { schema }), sqlite };
	} catch (error) {
		sqlite.close();
		throw error;
	}
}
