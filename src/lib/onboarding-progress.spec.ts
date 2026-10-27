import { describe, expect, it } from 'vitest';
import {
	checklistProgress,
	emptyChecklistPreferences,
	parseChecklistPreferences
} from './onboarding-progress';

const subscription = { id: 1, serviceName: 'Video', nextBillingAt: '2026-12-01', status: 'active' };

describe('first-value checklist', () => {
	it('does not count pending or canceled subscriptions as saved contracts', () => {
		const result = checklistProgress(
			[
				subscription,
				{ ...subscription, id: 2, _pending: true },
				{ ...subscription, id: 3, status: 'canceled' }
			],
			emptyChecklistPreferences(),
			'email'
		);
		expect(result.count).toBe(1);
		expect(result.steps).toEqual([true, false, false, false]);
	});

	it('selects the nearest saved billing date, without mutating the list', () => {
		const earlier = { ...subscription, id: 2, nextBillingAt: '2026-11-01' };
		const subscriptions = [subscription, earlier];
		expect(checklistProgress(subscriptions, emptyChecklistPreferences(), 'email').next).toEqual(
			earlier
		);
		expect(subscriptions[0]).toBe(subscription);
	});

	it('requires renewed confirmation when the reviewed contract or notification method changes', () => {
		const preferences = {
			...emptyChecklistPreferences(),
			reviewedSubscriptionId: '1',
			reviewedBillingDate: '2026-12-01',
			reviewedNotificationMethod: 'email'
		};
		expect(checklistProgress([subscription], preferences, 'email').steps).toEqual([
			true,
			true,
			false,
			true
		]);
		expect(
			checklistProgress([{ ...subscription, nextBillingAt: '2027-01-01' }], preferences, 'both')
				.steps
		).toEqual([true, false, false, false]);
		expect(checklistProgress([], preferences, 'email').steps[1]).toBe(false);
	});

	it('counts three distinct saved contracts while leaving acknowledgement steps explicit', () => {
		const result = checklistProgress(
			[subscription, { ...subscription, id: 2 }, { ...subscription, id: 3 }],
			emptyChecklistPreferences(),
			'both'
		);
		expect(result.steps).toEqual([true, false, true, false]);
	});

	it('recovers from unavailable, malformed, or unexpected stored state', () => {
		for (const value of [
			null,
			'{invalid',
			'null',
			'[]',
			'42',
			'{"collapsed":"false","reviewedSubscriptionId":42}'
		]) {
			expect(parseChecklistPreferences(value)).toEqual(emptyChecklistPreferences());
		}
		expect(parseChecklistPreferences('{"collapsed":true}').collapsed).toBe(true);
	});
});
