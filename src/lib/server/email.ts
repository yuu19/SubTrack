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

export type SendTrialEndingInput = {
	user: { email: string; name?: string | null };
	endDate: string;
	manageUrl: string;
	planName?: string | null;
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

export async function sendTrialEndingEmail({
	user,
	endDate,
	manageUrl,
	planName
}: SendTrialEndingInput) {
	if (!resend) {
		console.warn('[email] RESEND_API_KEY is not set; skipping trial ending email');
		return;
	}

	const recipientName = user.name ?? user.email.split('@')[0];
	const serviceName = planName ?? 'ご利用中のプラン';
	const envelope = resolveEnvelope(user.email);

	await resend.emails.send({
		...envelope,
		subject: `【重要】${serviceName} 自動課金のご案内（3日後）`,
		html: `
			<p>${recipientName} 様</p>
			<p>${serviceName}をご利用いただきありがとうございます。</p>
			<p>${endDate} より、ご登録プランの自動課金が開始されます。</p>
			<p>課金を希望されない場合は、終了日までにプランの変更・解約をお願いいたします。</p>
			<p>▼ プラン管理</p>
			<p><a href="${manageUrl}">${manageUrl}</a></p>
			<p>※ 本メールと行き違いで手続き済みの場合はご了承ください。</p>
		`,
		text: `${recipientName} 様\n\n${serviceName}をご利用いただきありがとうございます。\n\n${endDate} より、\nご登録プランの自動課金が開始されます。\n\n課金を希望されない場合は、\n終了日までにプランの変更・解約をお願いいたします。\n\n▼ プラン管理\n${manageUrl}\n\n※ 本メールと行き違いで手続き済みの場合はご了承ください。`
	});
}
