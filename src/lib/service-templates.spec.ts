import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CANCELLATION_METHODS, SUPPORTED_CURRENCIES } from '$lib/constant';
import { serviceTemplates } from './service-templates';

const supportedTemplatePriceRegions = ['JP', 'US', 'DE', 'GB'];
const supportedTemplateCategories = [
	'video',
	'music',
	'ai',
	'tools',
	'storage',
	'development',
	'design',
	'business',
	'card',
	'shopping',
	'other'
];

describe('serviceTemplates', () => {
	it('contains the expanded service catalog with unique ids', () => {
		expect(serviceTemplates).toHaveLength(26);
		expect(new Set(serviceTemplates.map((template) => template.id)).size).toBe(
			serviceTemplates.length
		);
	});

	it('keeps template data safe for form autofill', () => {
		for (const template of serviceTemplates) {
			expect(template.name.trim()).not.toBe('');
			expect(supportedTemplateCategories).toContain(template.category);
			expect(new URL(template.sourceUrl).protocol).toBe('https:');
			expect(CANCELLATION_METHODS).toContain(template.cancellation.method);

			if (template.cancellation.url) {
				expect(new URL(template.cancellation.url).protocol).toBe('https:');
			}

			expect(template.plans.length).toBeGreaterThan(0);
			expect(new Set(template.plans.map((plan) => plan.id)).size).toBe(template.plans.length);

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
		).toBe(180);
		expect(
			spotify?.plans
				.find((plan) => plan.id === 'standard')
				?.prices.find((price) => price.currency === 'USD')?.amount
		).toBe(12.99);
		expect(
			serviceTemplates
				.find((template) => template.id === 'notion')
				?.plans.find((plan) => plan.id === 'plus-1-member-monthly')
				?.prices.find((price) => price.currency === 'JPY')?.amount
		).toBe(2000);
		expect(
			serviceTemplates
				.find((template) => template.id === 'google-one')
				?.plans.find((plan) => plan.id === 'basic-100gb-monthly')
				?.prices.find((price) => price.currency === 'JPY')?.amount
		).toBe(290);
		expect(
			serviceTemplates
				.find((template) => template.id === 'google-one')
				?.plans.find((plan) => plan.id === 'basic-100gb-yearly')
				?.prices.find((price) => price.currency === 'JPY')?.amount
		).toBe(2900);
		expect(
			serviceTemplates
				.find((template) => template.id === 'google-workspace')
				?.plans.find((plan) => plan.id === 'business-plus-1-user-monthly')
				?.prices.find((price) => price.currency === 'JPY')?.amount
		).toBe(2500);
		expect(
			serviceTemplates
				.find((template) => template.id === 'github')
				?.plans.find((plan) => plan.id === 'team-1-user-monthly')
				?.prices.find((price) => price.currency === 'USD')?.amount
		).toBe(4);
		expect(
			serviceTemplates
				.find((template) => template.id === 'chatgpt')
				?.plans.find((plan) => plan.id === 'plus')
				?.prices.find((price) => price.currency === 'USD')?.amount
		).toBe(20);
		expect(
			serviceTemplates
				.find((template) => template.id === 'chatgpt')
				?.plans.find((plan) => plan.id === 'pro')
				?.prices.find((price) => price.currency === 'USD')?.amount
		).toBe(200);
		expect(
			serviceTemplates
				.find((template) => template.id === 'chatgpt')
				?.plans.find((plan) => plan.id === 'plus')?.prices[0].verifiedAt
		).toBe('2026-07-05');
	});

	it.each([
		['youtube-premium', 'individual-yearly', 'JPY', 12800],
		['amazon-prime', 'yearly', 'JPY', 5900],
		['amazon-prime', 'student-yearly', 'JPY', 2950],
		['claude', 'pro-yearly', 'USD', 200]
	])('keeps the full annual charge for %s / %s', (serviceId, planId, currency, annualAmount) => {
		const plan = serviceTemplates
			.find((template) => template.id === serviceId)
			?.plans.find((plan) => plan.id === planId);
		expect(plan?.cycle).toBe('yearly');
		expect(plan?.prices.find((price) => price.currency === currency)?.amount).toBe(annualAmount);
	});

	it.each([
		['hulu', 'monthly-web', 1320, 'monthly-partner', 1026],
		['dmm-tv', 'premium-web', 550, 'premium-app', 650],
		['u-next', 'monthly-web', 2189, 'monthly-app', 2400]
	])(
		'keeps billing-provider prices separate for %s',
		(serviceId, firstPlanId, firstPrice, secondPlanId, secondPrice) => {
			const template = serviceTemplates.find((template) => template.id === serviceId);
			const getJpyPrice = (id: string | number) =>
				template?.plans
					.find((plan) => plan.id === id)
					?.prices.find((price) => price.currency === 'JPY');
			expect(getJpyPrice(firstPlanId)?.amount).toBe(firstPrice);
			expect(getJpyPrice(secondPlanId)?.amount).toBe(secondPrice);
			expect(getJpyPrice(firstPlanId)?.verifiedAt).toBe('2026-10-27');
		}
	);

	it('keeps USD-only AI plans in USD without invented JPY conversions', () => {
		for (const id of ['claude', 'github-copilot']) {
			const template = serviceTemplates.find((template) => template.id === id);
			expect(template).toBeDefined();
			for (const plan of template!.plans.filter((plan) => plan.id !== 'custom')) {
				expect(plan.prices).toHaveLength(1);
				expect(plan.prices[0]).toMatchObject({
					currency: 'USD',
					region: 'US',
					verifiedAt: '2026-10-27'
				});
			}
		}
	});

	it('has a checked-in template icon asset for each service template', () => {
		for (const template of serviceTemplates) {
			expect(
				existsSync(join(process.cwd(), 'static', 'template-icons', `${template.id}.png`))
			).toBe(true);
		}
	});
});
