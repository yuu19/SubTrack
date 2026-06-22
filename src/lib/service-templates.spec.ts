import { describe, expect, it } from 'vitest';
import { CANCELLATION_METHODS } from '$lib/constant';
import { serviceTemplates } from './service-templates';

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
				expect(plan.price === null || plan.price >= 0).toBe(true);
			}
		}
	});

	it('includes verified JPY prices only where the template stores a price', () => {
		const spotify = serviceTemplates.find((template) => template.id === 'spotify');
		const icloud = serviceTemplates.find((template) => template.id === 'icloud-plus');

		expect(spotify?.plans.find((plan) => plan.id === 'standard')?.price).toBe(1080);
		expect(icloud?.plans.find((plan) => plan.id === '50gb')?.price).toBe(150);
		expect(
			serviceTemplates.find((template) => template.id === 'chatgpt')?.plans[0].price
		).toBeNull();
	});
});
