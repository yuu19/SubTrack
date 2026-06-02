import * as Sentry from '@sentry/sveltekit';
import { env as publicEnv } from '$env/dynamic/public';

const clientDsn = publicEnv.PUBLIC_SENTRY_DSN || undefined;

if (clientDsn) {
	Sentry.init({
		dsn: clientDsn,
		sendDefaultPii: false,
		tracesSampleRate: 0.1,
		integrations: [
			Sentry.feedbackIntegration({
				colorScheme: 'system',
				buttonLabel: '不具合を報告',
				formTitle: '不具合を報告',
				submitButtonLabel: '送信する',
				cancelButtonLabel: 'キャンセル',
				nameLabel: 'お名前',
				namePlaceholder: '例：山田 太郎',
				emailLabel: 'メールアドレス',
				emailPlaceholder: 'example@example.com',
				messageLabel: '詳細',
				messagePlaceholder: '発生した問題や再現手順、期待する動作を教えてください。',
				successMessageText: 'ご報告ありがとうございます。'
			})
		],
		enableLogs: false
	});
} else {
	console.warn('[Sentry] PUBLIC_SENTRY_DSN not set; client telemetry disabled.');
}

const myErrorHandler = ({ error, event }: { error: unknown; event: unknown }) => {
	console.error('An error occurred on the client side:', error, event);
};

export const handleError = Sentry.handleErrorWithSentry(myErrorHandler);
