import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const required = [
	'CLOUDFLARE_API_TOKEN',
	'CLOUDFLARE_ACCOUNT_ID',
	'PUBLIC_STRIPE_KEY',
	'SECRET_STRIPE_KEY',
	'STRIPE_WEBHOOK_SECRET',
	'RESEND_API_KEY',
	'BETTER_AUTH_SECRET',
	'ADMIN_USER_IDS',
	'ADMIN_BASIC_AUTH_USER',
	'ADMIN_BASIC_AUTH_PASSWORD',
	'GOOGLE_CLIENT_ID',
	'GOOGLE_CLIENT_SECRET',
	'VAPID_PUBLIC_KEY',
	'VAPID_PRIVATE_KEY',
	'PUSH_CRON_SECRET',
	'PUSH_CRON_URL'
];
const configured = Object.fromEntries(required.map((key) => [key, 'private-test-value']));

test('preflight rejects missing credentials without printing their values', () => {
	const env = { PATH: process.env.PATH, ...configured, ADMIN_BASIC_AUTH_PASSWORD: '' };
	const result = spawnSync('bash', ['scripts/deploy-preflight.sh'], { env, encoding: 'utf8' });
	assert.equal(result.status, 1);
	assert.match(result.stdout, /ADMIN_BASIC_AUTH_PASSWORD/);
	assert.doesNotMatch(result.stdout + result.stderr, /private-test-value/);
});

test('preflight accepts complete credentials', () => {
	const result = spawnSync('bash', ['scripts/deploy-preflight.sh'], {
		env: { PATH: process.env.PATH, ...configured },
		encoding: 'utf8'
	});
	assert.equal(result.status, 0);
	assert.equal(result.stdout, '');
});

function smoke(env) {
	const dir = mkdtempSync(join(tmpdir(), 'subtrack-smoke-test-'));
	try {
		writeFileSync(
			join(dir, 'curl'),
			`#!/usr/bin/env node
const args = process.argv.slice(2);
const target = args[args.indexOf('-o') + 1];
if (args.includes('-o')) {
  require('node:fs').writeFileSync(target, JSON.stringify({
    status: process.env.HEALTH_STATUS || 'ok', commit: process.env.HEALTH_SHA
  }));
} else {
  process.stdout.write(process.env.PAGE_STATUS || '200');
}
`
		);
		writeFileSync(join(dir, 'sleep'), '#!/bin/sh\nexit 0\n');
		chmodSync(join(dir, 'curl'), 0o755);
		chmodSync(join(dir, 'sleep'), 0o755);
		return spawnSync('bash', ['scripts/deploy-smoke.sh', 'expected-sha'], {
			env: { ...process.env, PATH: dir + ':' + process.env.PATH, ...env },
			encoding: 'utf8'
		});
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

test('smoke accepts a healthy deployment with matching commit and public pages', () => {
	const result = smoke({ HEALTH_SHA: 'expected-sha' });
	assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('smoke rejects the previous deployment even when it is healthy', () => {
	const result = smoke({ HEALTH_SHA: 'previous-sha' });
	assert.equal(result.status, 1);
	assert.match(result.stdout, /commit verification failed/);
});

test('smoke rejects an unhealthy database and unexpected public responses', () => {
	assert.equal(smoke({ HEALTH_SHA: 'expected-sha', HEALTH_STATUS: 'unavailable' }).status, 1);
	assert.equal(smoke({ HEALTH_SHA: 'expected-sha', PAGE_STATUS: '503' }).status, 1);
});
