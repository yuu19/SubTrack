import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CANCELLATION_METHODS, SUPPORTED_CURRENCIES } from '$lib/constant';
import { serviceTemplates } from './service-templates';

const supportedTemplatePriceRegions = ['JP', 'US', 'DE', 'GB'];

describe('serviceTemplates', () => {
	it('contains the initial MVP templates with unique ids', () => {
		expect(serviceTemplates).toHaveLength(10);
		expect(new Set(serviceTemplates.map((template) => template.id)).size).toBe(
			serviceTemplates.length
		);
	});

	it('keeps template data safe for form autofill', () => {
		for (const template of serviceTemplates) {
			expect(template.name.trim()).not.toBe('');
			expect(new URL(template.sourceUrl).protocol).toBe('https:');
			expect(template.tags.ja.length).toBeGreaterThan(0);
			expect(template.tags.en.length).toBeGreaterThan(0);
			expect(CANCELLATION_METHODS).toContain(template.cancellation.method);

			if (template.cancellation.url) {
				expect(new URL(template.cancellation.url).protocol).toBe('https:');
			}

			for (const plan of template.plans) {
				expect(plan.name.ja.trim()).not.toBe('');
				expect(plan.name.en.trim()).not.toBe('');
				expect(Array.isArray(plan.prices)).toBe(true);

				for (const price of plan.prices) {
					expect(price.amount).toBeGreaterThanOrEqual(0);
					expect(SUPPORTED_CURRENCIES).toContain(price.currency);
					expect(supportedTemplatePriceRegions).toContain(price.region);
					expect(new URL(price.sourceUrl).protocol).toBe('https:');
					expect(price.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
				}

				const priceKeys = plan.prices.map((price) => `${price.currency}:${price.region}`);
				expect(new Set(priceKeys).size).toBe(priceKeys.length);
			}
		}
	});

	it('includes verified JPY prices where existing templates stored a price', () => {
		const spotify = serviceTemplates.find((template) => template.id === 'spotify');
		const icloud = serviceTemplates.find((template) => template.id === 'icloud-plus');

		expect(
			spotify?.plans
				.find((plan) => plan.id === 'standard')
				?.prices.find((price) => price.currency === 'JPY')?.amount
		).toBe(1080);
		expect(
			icloud?.plans
				.find((plan) => plan.id === '50gb')
				?.prices.find((price) => price.currency === 'JPY')?.amount
		).toBe(150);
		expect(
			spotify?.plans
				.find((plan) => plan.id === 'standard')
				?.prices.find((price) => price.currency === 'USD')?.amount
		).toBe(12.99);
		expect(serviceTemplates.find((template) => template.id === 'chatgpt')?.plans[0].prices).toEqual(
			[]
		);
	});

	it('has a checked-in template icon asset for each service template', () => {
		for (const template of serviceTemplates) {
			expect(
				existsSync(join(process.cwd(), 'static', 'template-icons', `${template.id}.png`))
			).toBe(true);
		}
	});
});
