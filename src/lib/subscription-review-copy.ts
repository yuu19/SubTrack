import type { AppLocale } from '$lib/constant';

/** Display copy follows the current URL locale, not the account notification language. */
export const subscriptionReviewCopy = {
	ja: {
		title: '請求前の見直し',
		description: '今日から7日後までに請求予定で、まだ判断していないサブスクです。',
		emptySeven: '7日以内の請求について、未判断のサブスクはありません。',
		showThirty: '次の30日間を確認する',
		hideThirty: '30日間の予定を閉じる',
		thirtyTitle: '今日から30日後までの未判断の請求',
		emptyThirty: '30日以内の請求にも、未判断のサブスクはありません。',
		payment: '今回の対象請求日',
		unreviewed: '未判断',
		keep: '継続する',
		review: '見直す',
		kept: '継続する予定',
		reviewing: '見直す予定',
		undo: '判断を取り消す',
		saving: '保存中…',
		waiting: '別の判断を保存中です。少しお待ちください。',
		refreshing: '更新中…',
		refresh: '最新の状態を確認する',
		cancellation: '解約リンク・メモを確認する',
		disclaimer:
			'これはSubTrack内の判断メモです。サービス元の契約の継続・解約は行いません。解約する場合はサービス元で手続きしてください。',
		cycleNote:
			'判断はこの請求回のみ有効です。次回の請求や料金・請求周期の変更後は、あらためて判断できます。',
		offline:
			'判断の保存はオンライン専用です。接続してから操作してください。オフラインの判断は送信待ちに保存されません。',
		unavailableState: 'この請求回の判断を読み込めません。最新の状態を確認してください。',
		unavailableList:
			'一部のサブスクの判断を確認できません。最新の状態を読み込むか、登録した請求日・周期を確認してください。',
		messages: {
			saved: 'この請求回の判断を保存しました。',
			undone: 'この請求回の判断を取り消しました。',
			invalid: 'この操作を保存できません。最新の状態を確認してください。',
			unauthorized: 'ログイン状態を確認できません。ページを再読み込みしてログインしてください。',
			not_found: 'このサブスクを確認できません。最新の状態を確認してください。',
			stale:
				'請求内容または判断が変更されています。最新の状態を確認してから、もう一度選んでください。',
			unavailable:
				'保存を確認できませんでした。接続を確認して最新の状態を読み込むか、同じ選択をもう一度お試しください。',
			refreshed: '最新の判断を読み込みました。',
			refreshFailed: '最新の状態を読み込めませんでした。接続を確認してもう一度お試しください。'
		}
	},
	en: {
		title: 'Before your next payment',
		description: 'Payments due from today through 7 days from now that still need a decision.',
		emptySeven: 'No unreviewed payments in the next 7 days.',
		showThirty: 'View the next 30 days',
		hideThirty: 'Hide the 30-day view',
		thirtyTitle: 'Unreviewed payments from today through the next 30 days',
		emptyThirty: 'No unreviewed payments in the next 30 days either.',
		payment: 'Payment being reviewed',
		unreviewed: 'Not reviewed',
		keep: 'Keep',
		review: 'Review',
		kept: 'Planning to keep',
		reviewing: 'Planning to review',
		undo: 'Undo decision',
		saving: 'Saving…',
		waiting: 'Another decision is being saved. Please wait.',
		refreshing: 'Refreshing…',
		refresh: 'Refresh current status',
		cancellation: 'View cancellation links and notes',
		disclaimer:
			'This is a decision recorded in SubTrack, not a renewal or cancellation with the provider. To cancel, complete the provider’s cancellation process.',
		cycleNote:
			'Your decision applies only to this payment. Review again for the next payment or after a price or billing schedule change.',
		offline: 'Review decisions are online-only. Connect to save; no decision is queued.',
		unavailableState: 'This payment’s review is unavailable. Refresh the current status.',
		unavailableList:
			'Some subscription reviews are unavailable. Refresh, or check their saved payment dates and billing schedules.',
		messages: {
			saved: 'Saved for this payment.',
			undone: 'Decision removed for this payment.',
			invalid: 'This action could not be saved. Refresh the current status.',
			unauthorized: 'Your login could not be verified. Reload the page and sign in.',
			not_found: 'This subscription is unavailable. Refresh the current status.',
			stale:
				'The payment details or decision have changed. Refresh the current status, then choose again.',
			unavailable:
				'The save could not be confirmed. Check your connection and refresh, or retry the same choice.',
			refreshed: 'The latest decision has been loaded.',
			refreshFailed: 'The current status could not be loaded. Check your connection and try again.'
		}
	}
} satisfies Record<AppLocale, unknown>;

export type ReviewMessage = keyof typeof subscriptionReviewCopy.en.messages;
export type ReviewFeedback = { message: ReviewMessage; error: boolean };
