#!/usr/bin/env node
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import Stripe from 'stripe';

const args = process.argv.slice(2);
const configPath = args.find((arg) => !arg.startsWith('--')) ?? 'scripts/stripe-products.json';
const dryRun = args.includes('--dry-run');

const loadDotEnv = () => {
	const envPath = path.join(process.cwd(), '.env');
	try {
		if (!fs.existsSync(envPath)) return;
		const raw = fs.readFileSync(envPath, 'utf8');
		for (const line of raw.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;
			const sanitized = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
			const equalsIndex = sanitized.indexOf('=');
			if (equalsIndex === -1) continue;
			const key = sanitized.slice(0, equalsIndex).trim();
			if (!key || process.env[key] !== undefined) continue;
			let value = sanitized.slice(equalsIndex + 1).trim();
			const isDoubleQuoted = value.startsWith('"') && value.endsWith('"');
			const isSingleQuoted = value.startsWith("'") && value.endsWith("'");
			if (isDoubleQuoted || isSingleQuoted) {
				value = value.slice(1, -1);
				if (isDoubleQuoted) {
					value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
				}
			}
			process.env[key] = value;
		}
	} catch (error) {
		console.warn('WARN: Failed to read .env file:', error);
	}
};

loadDotEnv();

const stripeSecretKey = process.env.SECRET_STRIPE_KEY;

if (!stripeSecretKey) {
	console.error(
		'ERROR: Missing Stripe secret key. Set SECRET_STRIPE_KEY.'
	);
	process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
	apiVersion: '2025-11-17.clover'
});

const readConfig = async (filePath) => {
	const absolute = path.isAbsolute(filePath)
		? filePath
		: path.join(process.cwd(), filePath);
	const raw = await fsPromises.readFile(absolute, 'utf8');
	return JSON.parse(raw);
};

const normalizeLookup = (value) => (value ? String(value).trim() : undefined);

const findExistingProduct = async (product) => {
	if (product.id) {
		return stripe.products.retrieve(product.id);
	}

	const slug = normalizeLookup(product.metadata?.slug);
	const name = normalizeLookup(product.name);
	const list = await stripe.products.list({ limit: 100 });
	return list.data.find((existing) => {
		if (slug && existing.metadata?.slug === slug) return true;
		return Boolean(name && existing.name === name);
	});
};

const findExistingPrice = async (productId, price) => {
	if (price.id) {
		return stripe.prices.retrieve(price.id);
	}

	const lookupKey = normalizeLookup(price.lookup_key);
	if (lookupKey) {
		const list = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
		return list.data[0];
	}

	const list = await stripe.prices.list({ product: productId, limit: 100 });
	return list.data.find((existing) => {
		const sameAmount = existing.unit_amount === price.unit_amount;
		const sameCurrency = existing.currency === price.currency;
		const sameInterval =
			existing.recurring?.interval === price.recurring?.interval &&
			existing.recurring?.interval_count === price.recurring?.interval_count;
		return sameAmount && sameCurrency && sameInterval;
	});
};

const ensureProduct = async (product) => {
	const existing = await findExistingProduct(product);
	if (existing) {
		return { product: existing, created: false };
	}
	if (dryRun) {
		return { product: { id: 'dry_run_product', name: product.name }, created: false };
	}
	const created = await stripe.products.create({
		name: product.name,
		description: product.description,
		metadata: product.metadata
	});
	return { product: created, created: true };
};

const ensurePrice = async (productId, price) => {
	const existing = await findExistingPrice(productId, price);
	if (existing) {
		return { price: existing, created: false };
	}
	if (dryRun) {
		return { price: { id: 'dry_run_price', lookup_key: price.lookup_key }, created: false };
	}

	const created = await stripe.prices.create({
		product: productId,
		unit_amount: price.unit_amount,
		currency: price.currency,
		recurring: price.recurring,
		nickname: price.nickname,
		lookup_key: price.lookup_key,
		metadata: price.metadata
	});
	return { price: created, created: true };
};

const main = async () => {
	const config = await readConfig(configPath);
	if (!config?.products?.length) {
		console.error('ERROR: No products found in config:', configPath);
		process.exit(1);
	}

	const results = [];

	for (const product of config.products) {
		const { product: stripeProduct, created: productCreated } = await ensureProduct(product);
		const priceResults = [];

		for (const price of product.prices ?? []) {
			const { price: stripePrice, created: priceCreated } = await ensurePrice(
				stripeProduct.id,
				price
			);
			priceResults.push({
				id: stripePrice.id,
				lookup_key: stripePrice.lookup_key,
				created: priceCreated,
				unit_amount: stripePrice.unit_amount,
				currency: stripePrice.currency,
				recurring: stripePrice.recurring
			});
		}

		results.push({
			product: {
				id: stripeProduct.id,
				name: stripeProduct.name,
				created: productCreated
			},
			prices: priceResults
		});
	}

	console.log(JSON.stringify({ dryRun, results }, null, 2));
};

main().catch((error) => {
	console.error('Stripe product creation failed:', error);
	process.exit(1);
});
