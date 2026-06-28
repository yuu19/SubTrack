import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';

const e2eDbPath = resolve(process.env.E2E_DB_PATH ?? '.tmp/e2e/subtrack-e2e.sqlite');

export default function globalSetup() {
	mkdirSync(dirname(e2eDbPath), { recursive: true });

	for (const suffix of ['', '-shm', '-wal']) {
		rmSync(`${e2eDbPath}${suffix}`, { force: true });
	}

	rmSync(resolve('e2e/.auth'), { recursive: true, force: true });

	execFileSync('pnpm', ['exec', 'drizzle-kit', 'push', '--force'], {
		stdio: 'inherit',
		env: {
			...process.env,
			E2E_DB_PATH: e2eDbPath
		}
	});
}
