import { describe, expect, it } from 'vitest';
import { subscriptionEmailCopy, subscriptionNotificationCopy } from './i18n-copy';

describe('subscription reminder relative dates', () => {
	it('describes a late reminder without claiming payment is still due today', () => {
		expect(subscriptionEmailCopy.ja.reminderWhen(-1)).toBe('支払日は1日前でした。');
		expect(subscriptionNotificationCopy.ja.when(-1)).toBe('支払日は1日前でした。');
		expect(subscriptionEmailCopy.ja.reminderSubject('Test', -1)).toContain('支払日は1日前でした');
		expect(subscriptionEmailCopy.en.reminderWhen(-1)).toBe('Your payment date was 1 day ago.');
		expect(subscriptionNotificationCopy.en.when(-1)).toBe('Your payment date was 1 day ago.');
		expect(subscriptionEmailCopy.en.reminderSubject('Test', -1)).toContain(
			'payment date was 1 day ago'
		);
	});

	it('preserves same-day and future reminder wording', () => {
		expect(subscriptionEmailCopy.ja.reminderWhen(0)).toBe('本日が支払い日です。');
		expect(subscriptionNotificationCopy.ja.when(3)).toBe('支払いまであと3日です。');
		expect(subscriptionEmailCopy.en.reminderWhen(0)).toBe('Your payment is due today.');
		expect(subscriptionNotificationCopy.en.when(1)).toBe('Your payment is due in 1 day.');
		expect(subscriptionEmailCopy.en.reminderSubject('Test', 3)).toBe(
			'[Payment reminder] Test payment due in 3 days'
		);
	});
});
