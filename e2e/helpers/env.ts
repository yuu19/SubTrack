import { existsSync, readFileSync } from 'node:fs';

const parseEnvLine = (line: string) => {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith('#')) return null;

	const separator = trimmed.indexOf('=');
	if (separator === -1) return null;

	const key = trimmed.slice(0, separator).trim();
	let value = trimmed.slice(separator + 1).trim();

	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		value = value.slice(1, -1);
	}

	return key ? { key, value } : null;
};

export function loadE2EEnvFiles(files = ['.env', '.env.dev']) {
	for (const file of files) {
		if (!existsSync(file)) continue;

		for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
			const parsed = parseEnvLine(line);
			if (!parsed || process.env[parsed.key] !== undefined) continue;
			process.env[parsed.key] = parsed.value;
		}
	}
}

export function hasStripeTestSecret() {
	return process.env.SECRET_STRIPE_KEY?.startsWith('sk_test_') ?? false;
}
