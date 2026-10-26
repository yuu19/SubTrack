import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// Runs before Vite: Playwright globalSetup starts after webServer readiness.
{
	const dbPath = resolve('.tmp/e2e/subtrack-reviews.sqlite');
	if (process.env.E2E_DB_PATH !== '.tmp/e2e/subtrack-reviews.sqlite') {
		throw new Error('Review tests must use their disposable SQLite file');
	}
	mkdirSync(dirname(dbPath), { recursive: true });
	for (const suffix of ['', '-shm', '-wal']) rmSync(`${dbPath}${suffix}`, { force: true });
	rmSync('e2e/.auth/review-user.json', { force: true });
	execFileSync(process.execPath, ['node_modules/drizzle-kit/bin.cjs', 'push', '--force'], {
		stdio: 'inherit',
		env: { ...process.env, NODE_ENV: 'test', E2E_DB_PATH: dbPath }
	});
}
