#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const printUsage = () => {
	console.log(`\nUsage:\n  node scripts/gh-actions-secrets-sync.mjs [options]\n\nOptions:\n  --env-file <path>     Path to .env file (default: ./.env)\n  --repo <owner/repo>   Target repository (default: infer from git origin)\n  --include <keys>      Comma-separated list of keys to include\n  --exclude <keys>      Comma-separated list of keys to exclude\n  --dry-run             Show which secrets would be set\n  -h, --help            Show this help\n`);
};

const args = {
	envFile: '.env',
	repo: undefined,
	include: undefined,
	exclude: undefined,
	dryRun: false
};

const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
	const arg = argv[i];
	if (arg === '--env-file') {
		args.envFile = argv[++i];
	} else if (arg === '--repo') {
		args.repo = argv[++i];
	} else if (arg === '--include') {
		args.include = argv[++i];
	} else if (arg === '--exclude') {
		args.exclude = argv[++i];
	} else if (arg === '--dry-run') {
		args.dryRun = true;
	} else if (arg === '-h' || arg === '--help') {
		printUsage();
		process.exit(0);
	} else {
		console.error(`Unknown argument: ${arg}`);
		printUsage();
		process.exit(1);
	}
}

const run = (cmd, cmdArgs, { capture } = {}) => {
	const result = spawnSync(cmd, cmdArgs, {
		encoding: 'utf8',
		stdio: capture ? 'pipe' : 'inherit'
	});

	if (result.error) throw result.error;
	if (result.status !== 0) throw new Error(`${cmd} exited with code ${result.status}`);
	return capture ? result.stdout : '';
};

const inferRepo = () => {
	try {
		const url = run('git', ['remote', 'get-url', 'origin'], { capture: true }).trim();
		if (!url) return undefined;
		if (url.startsWith('git@')) {
			const match = url.match(/git@github\.com:([^/]+)\/(.+?)(\.git)?$/);
			return match ? `${match[1]}/${match[2]}` : undefined;
		}
		if (url.startsWith('https://')) {
			const match = url.match(/https:\/\/github\.com\/([^/]+)\/(.+?)(\.git)?$/);
			return match ? `${match[1]}/${match[2]}` : undefined;
		}
	} catch {
		return undefined;
	}

	return undefined;
};

const repo = args.repo ?? inferRepo();
if (!repo) {
	console.error('Repository not specified. Use --repo owner/repo.');
	printUsage();
	process.exit(1);
}

const envPath = resolve(process.cwd(), args.envFile);
if (!existsSync(envPath)) {
	console.error(`Env file not found: ${envPath}`);
	process.exit(1);
}

const parseEnv = (contents) => {
	const result = {};
	const lines = contents.split(/\r?\n/);
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
		if (!match) continue;
		const key = match[1];
		let value = match[2] ?? '';
		if (value.startsWith('"') || value.startsWith("'")) {
			const quote = value[0];
			if (value.endsWith(quote)) {
				value = value.slice(1, -1);
			} else {
				value = value.slice(1);
			}
			if (quote === '"') {
				value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
			}
		} else {
			const hashIndex = value.indexOf(' #');
			if (hashIndex !== -1) {
				value = value.slice(0, hashIndex);
			}
			value = value.trim();
		}

		result[key] = value;
	}
	return result;
};

const envValues = parseEnv(readFileSync(envPath, 'utf8'));
const includeList = args.include ? new Set(args.include.split(',').map((v) => v.trim()).filter(Boolean)) : null;
const excludeList = args.exclude ? new Set(args.exclude.split(',').map((v) => v.trim()).filter(Boolean)) : new Set();

const shouldIncludeKey = (key) => {
	if (includeList) return includeList.has(key);
	if (excludeList.has(key)) return false;
	return true;
};

const keys = Object.keys(envValues)
	.filter((key) => shouldIncludeKey(key))
	.filter((key) => envValues[key] !== undefined && envValues[key] !== '');

if (keys.length === 0) {
	console.log('No secrets to sync (after filtering / empty values).');
	process.exit(0);
}

if (args.dryRun) {
	console.log(`[dry-run] would set ${keys.length} secrets to ${repo}`);
	for (const key of keys) {
		console.log(`[dry-run] set ${key}`);
	}
	process.exit(0);
}

for (const key of keys) {
	const value = envValues[key];
	run('gh', ['secret', 'set', key, '--app', 'actions', '--body', value, '--repo', repo]);
}

console.log(`Synced ${keys.length} secrets to ${repo}.`);
