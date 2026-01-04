import { appendFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const jobPath = new URL('./job.js', import.meta.url);
const workerPath = resolve(process.cwd(), '.svelte-kit/cloudflare/_worker.js');

const job = await readFile(jobPath, 'utf8');
await appendFile(workerPath, job, 'utf8');
