<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { authClient } from '$lib/auth-client';
	import { localizeInternalHref } from '$lib/locale-routing';
	import { getLocale } from '$lib/paraglide/runtime';
	import { resolveLocale } from '$lib/locale';
	import { CheckCircle2, Copy, KeyRound, ShieldCheck } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let { data } = $props();

	let password = $state('');
	let newPassword = $state('');
	let totpCode = $state('');
	let totpUri = $state('');
	let backupCodes = $state<string[]>([]);
	let isSubmitting = $state(false);

	const currentLocale = $derived(resolveLocale(getLocale()));
	const adminHref = $derived(localizeInternalHref(resolve('/admin'), currentLocale));

	const setPassword = async () => {
		if (newPassword.length < 8) {
			toast.error('Password must be at least 8 characters.');
			return;
		}

		isSubmitting = true;
		try {
			const response = await fetch('/api/auth/set-password', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({ newPassword })
			});

			if (!response.ok) {
				toast.error('Failed to set password.');
				return;
			}

			password = newPassword;
			newPassword = '';
			toast.success('Password was set.');
			await invalidateAll();
		} finally {
			isSubmitting = false;
		}
	};

	const enableTwoFactor = async () => {
		if (!password) {
			toast.error('Enter your password.');
			return;
		}

		isSubmitting = true;
		try {
			const { data: result, error } = await authClient.twoFactor.enable({
				password,
				issuer: 'SubTrack'
			});

			if (error || !result) {
				toast.error(error?.message ?? 'Failed to start two-factor setup.');
				return;
			}

			totpUri = result.totpURI;
			backupCodes = result.backupCodes;
			toast.success('Add this key to your authenticator app.');
		} finally {
			isSubmitting = false;
		}
	};

	const verifyAdminTotp = async () => {
		if (!/^\d{6}$/.test(totpCode)) {
			toast.error('Enter the 6-digit code.');
			return;
		}

		isSubmitting = true;
		try {
			if (!data.twoFactorEnabled && totpUri) {
				const { error } = await authClient.twoFactor.verifyTotp({
					code: totpCode
				});

				if (error) {
					toast.error(error.message ?? 'The authentication code is invalid.');
					return;
				}
			}

			const response = await fetch('/api/admin/security/verify-totp', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({ code: totpCode })
			});
			const result = (await response.json().catch(() => null)) as { error?: string } | null;

			if (!response.ok) {
				toast.error(result?.error ?? 'The authentication code is invalid.');
				return;
			}

			toast.success('Admin verification complete.');
			await invalidateAll();
			await goto(adminHref);
		} finally {
			isSubmitting = false;
		}
	};

	const copyTotpUri = async () => {
		if (!totpUri) return;
		await navigator.clipboard.writeText(totpUri);
		toast.success('Setup key copied.');
	};
</script>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
	<div class="space-y-2">
		<div class="flex items-center gap-2">
			<ShieldCheck class="size-6" />
			<h1 class="text-2xl font-semibold">Admin security</h1>
		</div>
		<p class="text-muted-foreground text-sm">
			Two-factor verification is required before accessing administrator tools.
		</p>
	</div>

	{#if data.twoFactorEnabled && data.adminMfaVerified}
		<section class="rounded-lg border p-5">
			<div class="flex items-start gap-3">
				<CheckCircle2 class="text-primary mt-0.5 size-5" />
				<div class="space-y-2">
					<h2 class="font-medium">Admin verification is active</h2>
					<p class="text-muted-foreground text-sm">
						This browser has completed administrator two-factor verification.
					</p>
					<Button href={adminHref}>Open admin dashboard</Button>
				</div>
			</div>
		</section>
	{:else if data.twoFactorEnabled}
		<section class="space-y-4 rounded-lg border p-5">
			<div class="space-y-1">
				<h2 class="font-medium">Verify administrator access</h2>
				<p class="text-muted-foreground text-sm">
					Enter the 6-digit code from your authenticator app.
				</p>
			</div>
			<div class="flex flex-col gap-3 sm:flex-row">
				<Input
					bind:value={totpCode}
					inputmode="numeric"
					autocomplete="one-time-code"
					placeholder="123456"
					maxlength={6}
				/>
				<Button onclick={verifyAdminTotp} disabled={isSubmitting}>Verify</Button>
			</div>
		</section>
	{:else}
		{#if !data.hasPassword}
			<section class="space-y-4 rounded-lg border p-5">
				<div class="flex items-start gap-3">
					<KeyRound class="mt-0.5 size-5" />
					<div class="space-y-1">
						<h2 class="font-medium">Set an account password</h2>
						<p class="text-muted-foreground text-sm">
							Two-factor setup requires a password even when you usually sign in with Google.
						</p>
					</div>
				</div>
				<div class="flex flex-col gap-3 sm:flex-row">
					<Input
						bind:value={newPassword}
						type="password"
						autocomplete="new-password"
						placeholder="New password"
					/>
					<Button onclick={setPassword} disabled={isSubmitting}>Set password</Button>
				</div>
			</section>
		{/if}

		<section class="space-y-4 rounded-lg border p-5">
			<div class="space-y-1">
				<h2 class="font-medium">Enable two-factor authentication</h2>
				<p class="text-muted-foreground text-sm">
					Use an authenticator app and keep the backup codes in a secure location.
				</p>
			</div>

			{#if !totpUri}
				<div class="flex flex-col gap-3 sm:flex-row">
					<Input
						bind:value={password}
						type="password"
						autocomplete="current-password"
						placeholder="Current password"
						disabled={!data.hasPassword && !password}
					/>
					<Button
						onclick={enableTwoFactor}
						disabled={isSubmitting || (!data.hasPassword && !password)}
					>
						Start setup
					</Button>
				</div>
			{:else}
				<div class="space-y-3">
					<div class="space-y-2">
						<div class="flex items-center justify-between gap-3">
							<p class="text-sm font-medium">Authenticator setup key</p>
							<Button type="button" variant="outline" size="sm" onclick={copyTotpUri}>
								<Copy class="size-4" />
								Copy
							</Button>
						</div>
						<textarea
							class="border-input bg-background min-h-24 w-full resize-y rounded-md border px-3 py-2 text-xs"
							readonly
							value={totpUri}
						></textarea>
					</div>

					<div class="space-y-2">
						<p class="text-sm font-medium">Backup codes</p>
						<div class="grid gap-2 sm:grid-cols-2">
							{#each backupCodes as code (code)}
								<code class="bg-muted rounded px-2 py-1 text-sm">{code}</code>
							{/each}
						</div>
					</div>

					<div class="flex flex-col gap-3 sm:flex-row">
						<Input
							bind:value={totpCode}
							inputmode="numeric"
							autocomplete="one-time-code"
							placeholder="123456"
							maxlength={6}
						/>
						<Button onclick={verifyAdminTotp} disabled={isSubmitting}>Verify and enter admin</Button
						>
					</div>
				</div>
			{/if}
		</section>
	{/if}
</main>
