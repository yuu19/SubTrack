import * as Sentry from '@sentry/sveltekit';
import { env as publicEnv } from '$env/dynamic/public';
import { resolveUserFacingLocale, sentryFeedbackCopy } from '$lib/i18n-copy';

const clientDsn = publicEnv.PUBLIC_SENTRY_DSN || undefined;
const currentPathname = window.location.pathname.replace(/^\/(?:ja|en)(?=\/|$)/, '') || '/';
const normalizedPathname =
	currentPathname.length > 1 ? currentPathname.replace(/\/+$/, '') : currentPathname;
const isPublicDemo = normalizedPathname === '/demo';
const cookieLocale = document.cookie
	.split(';')
	.map((part) => part.trim())
	.find((part) => part.startsWith('subtrack_locale='))
	?.split('=')[1];
const feedbackCopy =
	sentryFeedbackCopy[
		resolveUserFacingLocale({
			cookieLocale,
			acceptLanguage: navigator.language
		})
	];

if (clientDsn && !isPublicDemo) {
	Sentry.init({
		dsn: clientDsn,
		sendDefaultPii: false,
		tracesSampleRate: 0.1,
		integrations: [
			Sentry.feedbackIntegration({
				colorScheme: 'system',
				buttonLabel: feedbackCopy.buttonLabel,
				formTitle: feedbackCopy.formTitle,
				submitButtonLabel: feedbackCopy.submitButtonLabel,
				cancelButtonLabel: feedbackCopy.cancelButtonLabel,
				nameLabel: feedbackCopy.nameLabel,
				namePlaceholder: feedbackCopy.namePlaceholder,
				emailLabel: feedbackCopy.emailLabel,
				emailPlaceholder: 'example@example.com',
				messageLabel: feedbackCopy.messageLabel,
				messagePlaceholder: feedbackCopy.messagePlaceholder,
				successMessageText: feedbackCopy.successMessageText
			})
		],
		enableLogs: false
	});
} else if (!clientDsn) {
	console.warn('[Sentry] PUBLIC_SENTRY_DSN not set; client telemetry disabled.');
}

const myErrorHandler = ({ error, event }: { error: unknown; event: unknown }) => {
	console.error('An error occurred on the client side:', error, event);
};

export const handleError = Sentry.handleErrorWithSentry(myErrorHandler);
