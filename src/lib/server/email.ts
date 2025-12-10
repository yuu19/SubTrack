import { Resend } from 'resend';
import { dev } from '$app/environment';

const resendApiKey = process.env.RESEND_API_KEY;
const defaultFrom = process.env.RESEND_FROM ?? 'no-reply@example.com';
// Use Resend's sandbox addresses during development to avoid sending real mail.
const SANDBOX_FROM = 'Acme <onboarding@resend.dev>';
const SANDBOX_TO = ['delivered@resend.dev'];

const resend = resendApiKey ? new Resend(resendApiKey) : null;
const useSandboxEnvelope = dev;

function resolveEnvelope(recipient: string | string[]) {
	if (useSandboxEnvelope) {
		return { from: SANDBOX_FROM, to: SANDBOX_TO };
	}

	return { from: defaultFrom, to: recipient };
}

export type SendVerificationInput = {
	user: { email: string; name?: string | null };
	url: string;
	token: string;
};

export type SendMagicLinkInput = {
	email: string;
	url: string;
	token?: string;
};

export type SendChangeEmailInput = {
	user: { email: string; name?: string | null };
	newEmail: string;
	url: string;
	token: string;
};

export async function sendVerificationEmail({ user, url }: SendVerificationInput) {
	if (!resend) {
		console.warn('[email] RESEND_API_KEY is not set; skipping verification email');
		return;
	}

	const recipientName = user.name ?? user.email.split('@')[0];
	const envelope = resolveEnvelope(user.email);

	await resend.emails.send({
		...envelope,
		subject: 'Verify your email',
		html: `
			<p>Hi ${recipientName},</p>
			<p>Thanks for signing up. Please confirm your email by clicking the link below:</p>
			<p><a href="${url}">${url}</a></p>
			<p>If you didn't request this, you can ignore this email.</p>
		`,
		text: `Hi ${recipientName},\nVerify your email by visiting: ${url}\nIf you didn't request this, you can ignore this email.`
	});
}

export async function sendMagicLinkEmail({ email, url }: SendMagicLinkInput) {
	if (!resend) {
		console.warn('[email] RESEND_API_KEY is not set; skipping magic link email');
		return;
	}

	const recipientName = email.split('@')[0];
	const envelope = resolveEnvelope(email);

	await resend.emails.send({
		...envelope,
		subject: 'Your magic sign-in link',
		html: `
			<p>Hi ${recipientName},</p>
			<p>Use the link below to sign in:</p>
			<p><a href="${url}">${url}</a></p>
			<p>This link will expire soon. If you didn't request it, you can ignore this email.</p>
		`,
		text: `Hi ${recipientName},\nUse this link to sign in: ${url}\nIt expires soon. If you didn't request it, ignore this email.`
	});
}

export async function sendChangeEmailConfirmation({ user, newEmail, url }: SendChangeEmailInput) {
	if (!resend) {
		console.warn('[email] RESEND_API_KEY is not set; skipping change-email confirmation email');
		return;
	}

	const recipientName = user.name ?? user.email.split('@')[0];
	const envelope = resolveEnvelope(newEmail);

	await resend.emails.send({
		...envelope,
		subject: 'Confirm your new email address',
		html: `
			<p>Hi ${recipientName},</p>
			<p>You requested to change the email on your account to <strong>${newEmail}</strong>.</p>
			<p>Please confirm the change by clicking the link below:</p>
			<p><a href="${url}">${url}</a></p>
			<p>If you didn't request this, you can ignore this email and keep your current address.</p>
		`,
		text: `Hi ${recipientName},\nConfirm your new email (${newEmail}) by visiting: ${url}\nIf you didn't request this, ignore this email.`
	});
}
