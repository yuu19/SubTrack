import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const configSource = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(configSource, {
	compilerOptions: { module: ts.ModuleKind.CommonJS }
});

// Evaluate the real config with inert plugins so these checks cannot send telemetry or uploads.
function sentryOptions(env) {
	let options;
	runInNewContext(outputText, {
		exports: {},
		process: { env },
		require(name) {
			if (name === '@sentry/sveltekit') {
				return { sentrySvelteKit: (value) => (options = value) };
			}
			return {
				default: () => ({}),
				defineConfig: (value) => value,
				sveltekit: () => ({}),
				paraglideVitePlugin: () => ({}),
				playwright: () => ({})
			};
		}
	});
	return options;
}

for (const [name, env, uploads] of [
	['production', { NODE_ENV: 'production' }, true],
	['development', { NODE_ENV: 'development' }, true],
	['Vitest', { VITEST: 'true' }, false],
	['local build', { NODE_ENV: 'production', SUBTRACK_LOCAL_CHECK: 'true' }, false],
	['local Vitest', { VITEST: 'true', SUBTRACK_LOCAL_CHECK: 'true' }, false],
	['explicitly non-local build', { SUBTRACK_LOCAL_CHECK: 'false' }, true]
]) {
	test(`Sentry settings: ${name}`, () => {
		const options = sentryOptions(env);
		assert.equal(options.telemetry, false);
		assert.equal(options.autoUploadSourceMaps, uploads);
	});
}

test('Inlang telemetry is disabled with exactly one definition', () => {
	const source = readFileSync(new URL('../project.inlang/settings.json', import.meta.url), 'utf8');
	assert.equal(JSON.parse(source).telemetry, 'off');
	assert.equal([...source.matchAll(/"telemetry"\s*:/g)].length, 1);
});
