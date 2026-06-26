import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { templateIconSources } from './template-icon-sources.mjs';

const outputDir = path.join(process.cwd(), 'static', 'template-icons');
const size = 64;

const buildFaviconUrl = (sourceUrl) =>
	`https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(sourceUrl)}`;

const fetchWithTimeout = async (url) => {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 15_000);
	try {
		const response = await fetch(url, {
			headers: {
				'user-agent': 'SubTrack template icon fetcher (+https://subtracknotify.com)'
			},
			signal: controller.signal
		});
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}
		return Buffer.from(await response.arrayBuffer());
	} finally {
		clearTimeout(timeout);
	}
};

await mkdir(outputDir, { recursive: true });

for (const source of templateIconSources) {
	const faviconUrl = buildFaviconUrl(source.sourceUrl);
	const input = await fetchWithTimeout(faviconUrl);
	const png = await sharp(input)
		.resize(size, size, {
			fit: 'contain',
			background: { r: 0, g: 0, b: 0, alpha: 0 }
		})
		.png()
		.toBuffer();
	const filePath = path.join(outputDir, `${source.id}.png`);
	await writeFile(filePath, png);
	console.log(`wrote ${path.relative(process.cwd(), filePath)}`);
}
