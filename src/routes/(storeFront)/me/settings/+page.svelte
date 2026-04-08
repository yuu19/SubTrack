<script lang="ts">
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import DefaultNotifyModal from '$lib/components/modals/DefaultNotifyModal.svelte';
	import NotificationMethodModal from '$lib/components/modals/NotificationMethodModal.svelte';
	import UpdateNameModal from '$lib/components/modals/UpdateNameModal.svelte';
	import ThemeSelectModal from '$lib/components/modals/ThemeSelectModal.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		formatCurrencyYen,
		formatLongDate,
		getSubscriptionStatusLabel,
		resolveLocale
	} from '$lib/locale';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime';
	import Check from 'lucide-svelte/icons/check';
	import X from 'lucide-svelte/icons/x';
	import { Loader2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';

	let { user, subscription, currentPlan } = $derived(page.data);
	const currentLocale = $derived.by(() => {
		page.url;
		return resolveLocale(getLocale());
	});

	const isPremium = $derived(currentPlan?.isPremium ?? false);
	const isPendingCancel = $derived(currentPlan?.isPendingCancel ?? false);
	const planLabel = $derived(isPremium ? m.plan_premium() : m.plan_free());
	const statusLabel = $derived(
		isPendingCancel && isPremium
			? getSubscriptionStatusLabel('pending_cancel', currentLocale)
			: getSubscriptionStatusLabel(subscription?.status, currentLocale)
	);
	const periodEndLabel = $derived(formatDate(subscription?.periodEnd ?? subscription?.trialEnd));
	const nextBillingLabel = $derived(formatDate(subscription?.periodEnd ?? subscription?.trialEnd));
	const hasBillingDate = $derived(Boolean(subscription?.periodEnd ?? subscription?.trialEnd));
	const billingAmountLabel = $derived(isPremium ? formatCurrencyYen(5000, currentLocale) : '—');
	const premiumPlanName = 'Premium';
	const premiumFeatures = $derived([
		{ label: m.premium_feature_subscription_limit(), free: '5', premium: '∞' },
		{ label: m.premium_feature_category_limit(), free: '3', premium: '∞' },
		{ label: m.premium_feature_payment_method_limit(), free: '3', premium: '∞' },
		{ label: m.premium_feature_hide_ads(), free: false, premium: true },
		{ label: m.premium_feature_image_upload(), free: false, premium: true },
		{ label: m.premium_feature_custom_notification(), free: false, premium: true },
		{ label: m.premium_feature_csv_export(), free: false, premium: true }
	]);

	let isPremiumModalOpen = $state(false);
	let isUpgrading = $state(false);
	let isRestoringCancel = $state(false);

	onMount(() => {
		if (!isPremium) {
			isPremiumModalOpen = true;
		}
	});

	async function handleUpgrade() {
		if (isUpgrading) return;
		isUpgrading = true;
		try {
			const { error } = await authClient.subscription.upgrade({
				plan: premiumPlanName,
				successUrl: page.url.pathname,
				cancelUrl: page.url.pathname,
				returnUrl: page.url.pathname
			});
			if (error) {
				toast.error(error.message ?? error.statusText);
			}
		} finally {
			isUpgrading = false;
		}
	}

	async function handleManagePlan() {
		if (isUpgrading) return;
		isUpgrading = true;
		try {
			const { data, error } = await authClient.subscription.billingPortal({
				returnUrl: page.url.pathname
			});

			if (error) {
				toast.error(error.message ?? error.statusText);
				return;
			}

			if (data?.url) {
				window.location.href = data.url;
				return;
			}

			toast.error(m.settings_billing_portal_error());
		} finally {
			isUpgrading = false;
		}
	}

	async function handleRestoreCancel() {
		if (isRestoringCancel) return;
		isRestoringCancel = true;
		try {
			const payload: { subscriptionId?: string; referenceId?: string } = {};
			if (subscription?.stripeSubscriptionId) {
				payload.subscriptionId = subscription.stripeSubscriptionId;
			}
			if (user?.id) {
				payload.referenceId = user.id;
			}

			const { error } = await authClient.subscription.restore(payload);
			if (error) {
				toast.error(error.message ?? error.statusText);
				return;
			}

			toast.success(m.settings_restore_cancel_success());
			await invalidateAll();
		} finally {
			isRestoringCancel = false;
		}
	}

	function getUserInitial(name: string) {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('');
	}

	function formatDate(value: number | Date | null | undefined) {
		return value ? formatLongDate(value, currentLocale) : m.common_not_set();
	}
</script>

<div class="space-y-16">
	<section class="space-y-6">
		<h2 class="text-base font-semibold md:text-lg">{m.nav_profile()}</h2>
		<div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
			<div class="flex flex-col items-center gap-3">
				<div
					class="h-[3.75rem] w-[3.75rem] rounded-full bg-white p-1 shadow-lg md:h-[6.25rem] md:w-[6.25rem]"
				>
					<div
						class="relative flex h-full w-full items-center justify-center rounded-full bg-[#FAE9C7]"
					>
						<p class="text-2xl font-medium text-[#b6b5b1] capitalize lg:text-4xl">
							{getUserInitial(user?.name ?? '')}
						</p>
					</div>
				</div>
			</div>
			<div class="flex flex-col gap-3">
				<h1 class="font-display text-lg font-semibold capitalize md:text-2xl">
					{user?.name}
				</h1>
				<div class="flex flex-col">
					<h2 class="text-sm font-semibold md:text-base">{m.profile_email_label()}</h2>
					<p class="text-sm font-normal md:text-base">{user?.email}</p>
				</div>
			</div>
		</div>
	</section>

	<section id="plan-info" class="bg-card rounded-2xl border p-6 shadow-sm">
		<div class="flex flex-col gap-1">
			<h2 class="text-base font-semibold md:text-lg">{m.settings_plan_info_title()}</h2>
			<p class="text-muted-foreground text-sm">
				{#if isPremium}
					{m.settings_plan_info_desc_premium()}
				{:else}
					{m.settings_plan_info_desc_free()}
				{/if}
			</p>
		</div>

		{#if isPremium}
			{#if isPendingCancel}
				<div
					class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
				>
					<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<p class="font-medium">{m.settings_plan_pending_cancel_title()}</p>
						<Button
							variant="outline"
							size="sm"
							class="border-amber-200 bg-white text-amber-900 hover:bg-amber-100"
							onclick={handleRestoreCancel}
							disabled={isRestoringCancel}
						>
							{#if isRestoringCancel}
								<Loader2 class="size-4 animate-spin" />
							{/if}
							{m.settings_plan_pending_cancel_button()}
						</Button>
					</div>
					{#if hasBillingDate}
						<p class="mt-1 text-amber-800">
							{m.settings_plan_pending_cancel_until({ date: nextBillingLabel })}
						</p>
					{/if}
				</div>
			{/if}
			<div class="mt-5 divide-y rounded-lg border text-sm">
				<div class="flex items-center justify-between px-4 py-3">
					<span class="text-muted-foreground">{m.settings_plan_current_label()}</span>
					<span class="font-medium">{planLabel}</span>
				</div>
				<div class="flex items-center justify-between px-4 py-3">
					<span class="text-muted-foreground">{m.settings_plan_status_label()}</span>
					<span class="font-medium">{statusLabel}</span>
				</div>
				<div class="flex items-center justify-between px-4 py-3">
					<span class="text-muted-foreground">{m.settings_plan_expiry_label()}</span>
					<span class="font-medium">{periodEndLabel}</span>
				</div>
				<div class="flex items-center justify-between px-4 py-3">
					<span class="text-muted-foreground">
						{isPendingCancel
							? m.settings_plan_end_date_label()
							: m.settings_plan_next_billing_label()}
					</span>
					<span class="font-medium">{nextBillingLabel}</span>
				</div>
				<div class="flex items-center justify-between px-4 py-3">
					<span class="text-muted-foreground">{m.settings_plan_billing_amount_label()}</span>
					<span class="font-medium">{billingAmountLabel}</span>
				</div>
			</div>
			<div class="mt-6 flex flex-col items-center gap-3">
				<Button class="w-full sm:w-auto" onclick={handleManagePlan} disabled={isUpgrading}>
					{#if isUpgrading}
						<Loader2 class="size-4 animate-spin" />
					{/if}
					{m.settings_plan_manage_button()}
				</Button>
				<span class="text-muted-foreground text-xs">{m.settings_plan_refund_policy()}</span>
			</div>
		{/if}
	</section>

	<section class="bg-card rounded-2xl border p-6 shadow-sm">
		<div class="flex items-center justify-between">
			<h2 class="text-base font-semibold md:text-lg">{m.nav_settings()}</h2>
		</div>
		<div class="mt-4 divide-y">
			<div class="flex w-full justify-between gap-5 py-3">
				<p class="text-base font-semibold md:text-lg">{m.settings_language_label()}</p>
				<LanguageSwitcher />
			</div>

			<div class="flex w-full justify-between gap-5 py-3">
				<p class="text-base font-semibold md:text-lg">{m.settings_name()}</p>
				<UpdateNameModal />
			</div>

			<div class="flex w-full justify-between gap-5 py-3">
				<p class="text-base font-semibold md:text-lg">{m.settings_theme_label()}</p>
				<ThemeSelectModal />
			</div>

			<div class="flex w-full justify-between gap-5 py-3">
				<p class="text-base font-semibold md:text-lg">{m.settings_default_notify_label()}</p>
				<DefaultNotifyModal />
			</div>

			<div class="flex w-full justify-between gap-5 py-3">
				<p class="text-base font-semibold md:text-lg">{m.settings_notification_method_label()}</p>
				<NotificationMethodModal />
			</div>

			<div class="flex w-full justify-between gap-5 py-3">
				<p class="text-base font-semibold md:text-lg">{m.settings_premium_status_label()}</p>
				<Button variant="link" href="#plan-info">{m.settings_premium_status_action()}</Button>
			</div>

			<div class="flex w-full justify-between gap-5 py-3">
				<p class="text-base font-semibold md:text-lg">{m.settings_logout_label()}</p>
				<Button
					variant="link"
					onclick={() => {
						authClient.signOut();
						invalidateAll();
					}}>{m.settings_logout_button()}</Button
				>
			</div>
		</div>
	</section>

	{#if !isPremium}
		<Dialog.Root bind:open={isPremiumModalOpen}>
			<Dialog.Content class="w-full max-w-[420px] p-6 sm:p-7">
				<div class="flex flex-col items-center gap-4 text-center">
					<span class="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600">
						{m.premium_modal_badge()}
					</span>
					<h3 class="text-xl font-semibold">{m.premium_modal_title()}</h3>
					<div class="bg-muted flex h-32 w-32 items-center justify-center rounded-full">
						<span class="text-4xl">¥</span>
					</div>
					<p class="text-muted-foreground text-sm">
						{m.premium_modal_description()}
					</p>
				</div>

				<div class="bg-muted/30 mt-6 rounded-xl border p-4 text-sm">
					<div
						class="text-muted-foreground flex items-center justify-between pb-3 text-xs font-semibold"
					>
						<span>{m.premium_modal_feature_label()}</span>
						<div class="flex items-center gap-4">
							<span class="bg-muted rounded-full px-2 py-0.5">{m.plan_free()}</span>
							<span class="bg-primary text-primary-foreground rounded-full px-2 py-0.5">
								{m.plan_premium()}
							</span>
						</div>
					</div>
					<div class="divide-y">
						{#each premiumFeatures as feature (feature.label)}
							<div class="flex items-center justify-between py-2">
								<span class="text-foreground">{feature.label}</span>
								<div class="flex items-center gap-6">
									<span class="text-muted-foreground flex w-12 items-center justify-center">
										{#if typeof feature.free === 'boolean'}
											{#if feature.free}
												<Check class="h-4 w-4 text-emerald-500" />
											{:else}
												<X class="text-muted-foreground h-4 w-4" />
											{/if}
										{:else}
											{feature.free}
										{/if}
									</span>
									<span class="flex w-12 items-center justify-center">
										{#if typeof feature.premium === 'boolean'}
											{#if feature.premium}
												<Check class="h-4 w-4 text-emerald-500" />
											{:else}
												<X class="text-muted-foreground h-4 w-4" />
											{/if}
										{:else}
											{feature.premium}
										{/if}
									</span>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<div class="mt-6 flex flex-col gap-3">
					<Button class="w-full" onclick={handleUpgrade} disabled={isUpgrading}>
						{#if isUpgrading}
							<Loader2 class="size-4 animate-spin" />
						{/if}
						{m.premium_modal_cta()}
					</Button>
					<div class="text-muted-foreground flex items-center justify-center gap-6 text-xs">
						<a class="underline-offset-4 hover:underline" href={resolve('/commercial-transactions')}>
							特定商取引法に基づく表記
						</a>
						<a class="underline-offset-4 hover:underline" href={resolve('/terms')}>
							{m.legal_terms()}
						</a>
						<a class="underline-offset-4 hover:underline" href={resolve('/privacy')}>
							{m.legal_privacy()}
						</a>
					</div>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	{/if}
</div>
