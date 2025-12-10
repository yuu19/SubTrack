import * as Sentry from '@sentry/sveltekit';
import { env as publicEnv } from '$env/dynamic/public';

const clientDsn = publicEnv.PUBLIC_SENTRY_DSN || undefined;

if (clientDsn) {
	Sentry.init({
		dsn: clientDsn,
		sendDefaultPii: true,
		tracesSampleRate: 1.0,
		integrations: [
			Sentry.replayIntegration(),
			Sentry.feedbackIntegration({
				colorScheme: 'system'
			})
		],
		replaysSessionSampleRate: 0.1,
		replaysOnErrorSampleRate: 1.0,
		enableLogs: true
	});
} else {
	console.warn('[Sentry] PUBLIC_SENTRY_DSN not set; client telemetry disabled.');
}

const myErrorHandler = ({ error, event }: { error: unknown; event: unknown }) => {
	console.error('An error occurred on the client side:', error, event);
};

export const handleError = Sentry.handleErrorWithSentry(myErrorHandler);
