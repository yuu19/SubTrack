import { describe, expect, it } from 'vitest';
import { subscriptionReviewCopy } from './subscription-review-copy';

describe('review copy', () => {
	it('provides the same controls and failure/retry messages in Japanese and English', () => {
		expect(Object.keys(subscriptionReviewCopy.ja).sort()).toEqual(
			Object.keys(subscriptionReviewCopy.en).sort()
		);
		expect(Object.keys(subscriptionReviewCopy.ja.messages).sort()).toEqual(
			Object.keys(subscriptionReviewCopy.en.messages).sort()
		);
	});

	it('explicitly distinguishes app decisions from provider cancellation and offline queues', () => {
		expect(subscriptionReviewCopy.ja.disclaimer).toContain('サービス元');
		expect(subscriptionReviewCopy.en.disclaimer).toContain('not a renewal or cancellation');
		expect(subscriptionReviewCopy.ja.offline).toContain('送信待ちに保存されません');
		expect(subscriptionReviewCopy.en.offline).toContain('no decision is queued');
	});
});
