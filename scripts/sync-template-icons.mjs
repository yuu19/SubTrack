import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const iconsDir = path.join(process.cwd(), 'static', 'template-icons');
const cacheControl = 'public, max-age=31536000, immutable';

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const readOption = (name, fallback) => {
	const index = args.indexOf(name);
	return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const bucket = readOption(
	'--bucket',
	process.env.SUBTRACK_TEMPLATE_ICON_BUCKET ?? 'dishpage-bucket'
);
const modeArgs = [];
if (hasFlag('--local')) modeArgs.push('--local');
if (hasFlag('--remote')) modeArgs.push('--remote');
const persistTo = readOption('--persist-to', '');
if (persistTo) modeArgs.push('--persist-to', persistTo);
const dryRun = hasFlag('--dry-run');

const entries = await readdir(iconsDir);
const files = [];
for (const entry of entries) {
	if (!entry.endsWith('.png')) continue;
	const filePath = path.join(iconsDir, entry);
	const fileStat = await stat(filePath);
	if (fileStat.isFile()) files.push(filePath);
}

files.sort();

if (files.length === 0) {
	throw new Error(`No template icon PNG files found in ${path.relative(process.cwd(), iconsDir)}`);
}

for (const filePath of files) {
	const fileName = path.basename(filePath);
	const objectPath = `${bucket}/template-icons/${fileName}`;
	const wranglerArgs = [
		'exec',
		'wrangler',
		'r2',
		'object',
		'put',
		objectPath,
		'--file',
		filePath,
		'--content-type',
		'image/png',
		'--cache-control',
		cacheControl,
		...modeArgs
	];

	if (dryRun) {
		console.log(`pnpm ${wranglerArgs.join(' ')}`);
		continue;
	}

	const { stdout, stderr } = await execFileAsync('pnpm', wranglerArgs, {
		env: process.env,
		maxBuffer: 1024 * 1024
	});
	if (stdout.trim()) console.log(stdout.trim());
	if (stderr.trim()) console.error(stderr.trim());
	console.log(`synced ${path.relative(process.cwd(), filePath)} -> ${objectPath}`);
}
