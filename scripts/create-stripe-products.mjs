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
	console.error('ERROR: Missing Stripe secret key. Set SECRET_STRIPE_KEY.');
	process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
	apiVersion: '2025-11-17.clover'
});

const readConfig = async (filePath) => {
	const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
	const raw = await fsPromises.readFile(absolute, 'utf8');
	return JSON.parse(raw);
};

const normalizeLookup = (value) => (value ? String(value).trim() : undefined);

const normalizeRecurring = (recurring) =>
	recurring
		? {
				interval: recurring.interval,
				interval_count: recurring.interval_count ?? 1
			}
		: null;

const formatRecurring = (recurring) => {
	const normalized = normalizeRecurring(recurring);
	if (!normalized) return 'one_time';
	return `${normalized.interval}:${normalized.interval_count}`;
};

const normalizeCurrencyOptions = (currencyOptions) => {
	const normalized = {};
	for (const [currency, option] of Object.entries(currencyOptions ?? {})) {
		normalized[currency.toLowerCase()] = {
			...option,
			unit_amount: option.unit_amount
		};
	}
	return normalized;
};

const buildCurrencyOptionsUpdate = (currencyOptions) => {
	const normalized = normalizeCurrencyOptions(currencyOptions);
	if (Object.keys(normalized).length === 0) return undefined;
	return normalized;
};

const getBasePriceConfigMismatches = (existing, desired) => {
	const errors = [];
	const desiredLookupKey = normalizeLookup(desired.lookup_key);
	const existingLookupKey = normalizeLookup(existing.lookup_key);

	if (existing.active === false) {
		errors.push('existing price is inactive');
	}
	if (desiredLookupKey && existingLookupKey !== desiredLookupKey) {
		errors.push(`lookup_key=${existingLookupKey ?? 'none'}`);
	}
	if (existing.unit_amount !== desired.unit_amount) {
		errors.push(`unit_amount=${existing.unit_amount ?? 'null'}`);
	}
	if (existing.currency !== desired.currency) {
		errors.push(`currency=${existing.currency}`);
	}
	if (formatRecurring(existing.recurring) !== formatRecurring(desired.recurring)) {
		errors.push(`recurring=${formatRecurring(existing.recurring)}`);
	}

	return errors;
};

const getCurrencyOptionMismatches = (existing, desired) => {
	const errors = [];
	const desiredCurrencyOptions = normalizeCurrencyOptions(desired.currency_options);
	const existingCurrencyOptions = existing.currency_options ?? {};

	for (const [currency, desiredOption] of Object.entries(desiredCurrencyOptions)) {
		const existingOption = existingCurrencyOptions[currency];
		if (!existingOption) {
			errors.push(`currency_options.${currency}=missing`);
			continue;
		}
		if (existingOption.unit_amount !== desiredOption.unit_amount) {
			errors.push(
				`currency_options.${currency}.unit_amount=${existingOption.unit_amount ?? 'null'}`
			);
		}
	}

	return errors;
};

const assertPriceMatchesConfig = (existing, desired) => {
	const errors = [
		...getBasePriceConfigMismatches(existing, desired),
		...getCurrencyOptionMismatches(existing, desired)
	];
	if (errors.length === 0) return;

	const desiredLookupKey = normalizeLookup(desired.lookup_key);
	const label = desiredLookupKey ? `lookup_key "${desiredLookupKey}"` : `price "${existing.id}"`;
	throw new Error(
		`Existing Stripe price for ${label} does not match scripts/stripe-products.json: ${errors.join(
			', '
		)}`
	);
};

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
		return stripe.prices.retrieve(price.id, { expand: ['currency_options'] });
	}

	const lookupKey = normalizeLookup(price.lookup_key);
	if (lookupKey) {
		const list = await stripe.prices.list({
			lookup_keys: [lookupKey],
			limit: 1,
			expand: ['data.currency_options']
		});
		return list.data[0];
	}

	const list = await stripe.prices.list({
		product: productId,
		limit: 100,
		expand: ['data.currency_options']
	});
	return list.data.find((existing) => {
		const sameAmount = existing.unit_amount === price.unit_amount;
		const sameCurrency = existing.currency === price.currency;
		const existingRecurring = existing.recurring ?? null;
		const desiredRecurring = price.recurring ?? null;
		const sameInterval =
			(existingRecurring === null && desiredRecurring === null) ||
			(existingRecurring?.interval === desiredRecurring?.interval &&
				existingRecurring?.interval_count === desiredRecurring?.interval_count);
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
		const baseMismatches = getBasePriceConfigMismatches(existing, price);
		if (baseMismatches.length > 0) {
			const desiredLookupKey = normalizeLookup(price.lookup_key);
			const label = desiredLookupKey
				? `lookup_key "${desiredLookupKey}"`
				: `price "${existing.id}"`;
			throw new Error(
				`Existing Stripe price for ${label} does not match scripts/stripe-products.json: ${baseMismatches.join(
					', '
				)}`
			);
		}

		const currencyOptionMismatches = getCurrencyOptionMismatches(existing, price);
		if (currencyOptionMismatches.length > 0 && !dryRun) {
			const updated = await stripe.prices.update(existing.id, {
				currency_options: buildCurrencyOptionsUpdate(price.currency_options),
				expand: ['currency_options']
			});
			assertPriceMatchesConfig(updated, price);
			return { price: updated, created: false, updated: true };
		}

		assertPriceMatchesConfig(existing, price);
		return { price: existing, created: false, updated: false };
	}
	if (dryRun) {
		return { price: { id: 'dry_run_price', lookup_key: price.lookup_key }, created: false };
	}

	const created = await stripe.prices.create({
		product: productId,
		unit_amount: price.unit_amount,
		currency: price.currency,
		currency_options: buildCurrencyOptionsUpdate(price.currency_options),
		recurring: price.recurring,
		nickname: price.nickname,
		lookup_key: price.lookup_key,
		metadata: price.metadata,
		expand: ['currency_options']
	});
	return { price: created, created: true, updated: false };
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
			const {
				price: stripePrice,
				created: priceCreated,
				updated: priceUpdated
			} = await ensurePrice(stripeProduct.id, price);
			priceResults.push({
				id: stripePrice.id,
				lookup_key: stripePrice.lookup_key,
				created: priceCreated,
				updated: priceUpdated,
				unit_amount: stripePrice.unit_amount,
				currency: stripePrice.currency,
				currency_options: stripePrice.currency_options,
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
