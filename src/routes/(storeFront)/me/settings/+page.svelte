<script lang="ts">
	import { resolve } from '$app/paths';
	import { browser } from '$app/environment';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';
	import { startLifetimeCheckout } from '$lib/client/lifetime-checkout';
	import DefaultNotifyModal from '$lib/components/modals/DefaultNotifyModal.svelte';
	import NotifyTimeModal from '$lib/components/modals/NotifyTimeModal.svelte';
	import NotificationMethodModal from '$lib/components/modals/NotificationMethodModal.svelte';
	import TimeZoneModal from '$lib/components/modals/TimeZoneModal.svelte';
	import UpdateNameModal from '$lib/components/modals/UpdateNameModal.svelte';
	import ThemeSelectModal from '$lib/components/modals/ThemeSelectModal.svelte';
	import PushNotificationControl from '$lib/components/push/PushNotificationControl.svelte';
	import SubscriptionManagementItems from '$lib/components/subscriptions/SubscriptionManagementItems.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		formatCurrencyYen,
		formatLongDate,
		getSubscriptionStatusLabel,
		resolveLocale
	} from '$lib/locale';
	import { settingsBillingCopy, settingsPlanBillingCopy } from '$lib/i18n-copy';
	import { localizeInternalHref } from '$lib/locale-routing';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime';
	import type {
		subscriptionCategoryTable,
		subscriptionPaymentMethodTable
	} from '$lib/server/db/schema';
	import Check from 'lucide-svelte/icons/check';
	import { Loader2 } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	type Category = typeof subscriptionCategoryTable.$inferSelect;
	type PaymentMethod = typeof subscriptionPaymentMethodTable.$inferSelect;

	let { user, subscription, currentPlan, vapidPublicKey, hasPushSubscription } = $derived(
		page.data
	);
	let categories = $state<Category[]>(page.data.categories ?? []);
	let paymentMethods = $state<PaymentMethod[]>(page.data.paymentMethods ?? []);
	const currentLocale = $derived.by(() => {
		page.url;
		return resolveLocale(getLocale());
	});
	const settingsCopy = $derived(settingsBillingCopy[currentLocale]);
	let pushSetupPromptKey = $state(0);
	let pushSubscribedOverride = $state<boolean | null>(null);
	const pushGuideHref = $derived(localizeInternalHref(resolve('/push'), currentLocale));
	const isPremium = $derived(currentPlan?.isPremium ?? false);
	const hasSubscriptionAccess = $derived(currentPlan?.hasSubscriptionAccess ?? false);
	const hasLifetimeEntitlement = $derived(currentPlan?.hasLifetimeEntitlement ?? false);
	const isPendingCancel = $derived(currentPlan?.isPendingCancel ?? false);
	const planLabel = $derived(
		currentPlan?.planName ?? (isPremium ? m.plan_premium() : m.plan_free())
	);
	const statusLabel = $derived(
		hasLifetimeEntitlement && !hasSubscriptionAccess
			? m.settings_plan_status_lifetime()
			: isPendingCancel && isPremium
				? getSubscriptionStatusLabel('pending_cancel', currentLocale)
				: getSubscriptionStatusLabel(subscription?.status, currentLocale)
	);
	const periodEndLabel = $derived(formatDate(subscription?.periodEnd ?? subscription?.trialEnd));
	const nextBillingLabel = $derived(formatDate(subscription?.periodEnd ?? subscription?.trialEnd));
	const hasBillingDate = $derived(
		hasSubscriptionAccess && Boolean(subscription?.periodEnd ?? subscription?.trialEnd)
	);
	const billingAmountLabel = $derived.by(() => {
		if (!hasSubscriptionAccess) return '—';
		if (subscription?.billingInterval === 'year') {
			return formatCurrencyYen(3000, currentLocale);
		}
		return formatCurrencyYen(300, currentLocale);
	});
	const pushSubscribedForSettings = $derived(
		pushSubscribedOverride ?? Boolean(hasPushSubscription)
	);
	const notificationMethodDescription = $derived(
		pushSubscribedForSettings
			? m.settings_notification_method_description_enabled()
			: m.settings_notification_method_description()
	);
	const premiumPlanName = 'Premium';
	const sectionGridClass = 'grid gap-4 lg:grid-cols-[minmax(0,12rem)_1fr] lg:gap-8';
	const sectionHeaderClass = 'space-y-1.5';
	const sectionDividerClass = 'border-b pb-6 sm:pb-8';
	const settingsCardClass = 'bg-background overflow-hidden rounded-lg border';
	const settingRowClass =
		'flex flex-col gap-3 px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between';
	const settingRowWithBorderClass = `${settingRowClass} border-t`;
	const settingTextClass = 'min-w-0 space-y-1';
	const settingActionClass = 'self-start md:self-center';
	const planDetailRowClass =
		'flex flex-col gap-1 px-4 py-3 sm:px-5 md:flex-row md:items-center md:justify-between md:gap-4';
	const planDetailValueClass = 'break-words font-medium md:text-right';
	const responsiveButtonClass = 'h-auto min-h-9 whitespace-normal py-2 text-center leading-snug';
	const billingCopy = $derived(settingsPlanBillingCopy[currentLocale]);

	let isPremiumModalOpen = $state(false);
	let isUpgrading = $state(false);
	let isCreatingLifetimeCheckout = $state(false);
	let isRestoringCancel = $state(false);
	let isOnline = $state(true);

	$effect(() => {
		categories = page.data.categories ?? [];
		paymentMethods = page.data.paymentMethods ?? [];
	});

	const managementTitle = $derived(settingsCopy.managementTitle);
	const managementDescription = $derived(settingsCopy.managementDescription);

	const handleManagementItemsChange = (items: {
		categories: Category[];
		paymentMethods: PaymentMethod[];
	}) => {
		categories = items.categories;
		paymentMethods = items.paymentMethods;
	};

	onMount(() => {
		if (!browser) return;
		isOnline = navigator.onLine;
		const checkoutResult = new URL(window.location.href).searchParams.get('checkout');
		if (checkoutResult === 'success' || checkoutResult === 'cancel') {
			if (checkoutResult === 'success') {
				toast.success(billingCopy.successToast);
				void invalidateAll();
			} else {
				toast.message(billingCopy.cancelToast);
			}
			const cleanUrl = new URL(window.location.href);
			cleanUrl.searchParams.delete('checkout');
			window.history.replaceState(
				null,
				'',
				`${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`
			);
		}
		const handleOnline = () => (isOnline = true);
		const handleOffline = () => (isOnline = false);
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);
		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	});

	function requestPushSetup() {
		pushSetupPromptKey += 1;
	}

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
				returnUrl: page.url.pathname,
				disableRedirect: true
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

	async function handleLifetimeCheckout() {
		if (isCreatingLifetimeCheckout) return;
		isCreatingLifetimeCheckout = true;
		try {
			await startLifetimeCheckout({
				returnPath: page.url.pathname,
				errorMessage: m.settings_lifetime_checkout_error(),
				purchasedMessage: m.settings_plan_lifetime_purchased()
			});
		} catch (error) {
			console.error('Failed to create lifetime checkout', error);
			toast.error(m.settings_lifetime_checkout_error());
		} finally {
			isCreatingLifetimeCheckout = false;
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

<div class="space-y-7 sm:space-y-9">
	<section class={sectionDividerClass}>
		<div class={sectionGridClass}>
			<div class={sectionHeaderClass}>
				<h2 class="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
					{m.settings_account_title()}
				</h2>
				<p class="text-muted-foreground text-sm">{m.settings_account_description()}</p>
			</div>
			<div class={settingsCardClass}>
				<div class={settingRowClass}>
					<div class="flex min-w-0 items-center gap-3 sm:gap-4">
						<div
							class="bg-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14"
						>
							<p class="text-muted-foreground text-xl font-semibold capitalize">
								{getUserInitial(user?.name ?? '')}
							</p>
						</div>
						<div class="min-w-0 space-y-1">
							<p class="truncate text-base font-semibold">{user?.name}</p>
							<p class="text-muted-foreground truncate text-sm">{user?.email}</p>
						</div>
					</div>
					<div class={settingActionClass}>
						<UpdateNameModal />
					</div>
				</div>
				<div class={settingRowWithBorderClass}>
					<div class={settingTextClass}>
						<p class="text-sm font-medium">{m.profile_email_label()}</p>
						<p class="text-muted-foreground text-sm break-all">{user?.email}</p>
					</div>
					<p class="text-muted-foreground text-sm">{m.settings_readonly_label()}</p>
				</div>
			</div>
		</div>
	</section>

	<section id="plan-info" class={sectionDividerClass}>
		<div class={sectionGridClass}>
			<div class={sectionHeaderClass}>
				<h2 class="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
					{m.settings_plan_info_title()}
				</h2>
				<p class="text-muted-foreground text-sm">
					{#if hasLifetimeEntitlement && !hasSubscriptionAccess}
						{m.settings_plan_info_desc_lifetime()}
					{:else if isPremium}
						{m.settings_plan_info_desc_premium()}
					{:else}
						{m.settings_plan_info_desc_free()}
					{/if}
				</p>
			</div>

			<div class={settingsCardClass}>
				{#if isPremium && isPendingCancel}
					<div
						class="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-5"
					>
						<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<p class="font-medium">{m.settings_plan_pending_cancel_title()}</p>
							<Button
								variant="outline"
								size="sm"
								class={`${responsiveButtonClass} w-full border-amber-200 bg-white text-amber-900 hover:bg-amber-100 sm:w-auto`}
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

				<div class="divide-y text-sm">
					<div class={planDetailRowClass}>
						<span class="text-muted-foreground">{m.settings_plan_current_label()}</span>
						<span class={planDetailValueClass}>{planLabel}</span>
					</div>
					{#if isPremium}
						<div class={planDetailRowClass}>
							<span class="text-muted-foreground">{m.settings_plan_status_label()}</span>
							<span class={planDetailValueClass}>{statusLabel}</span>
						</div>
					{/if}
					{#if hasSubscriptionAccess}
						<div class={planDetailRowClass}>
							<span class="text-muted-foreground">{m.settings_plan_expiry_label()}</span>
							<span class={planDetailValueClass}>{periodEndLabel}</span>
						</div>
						<div class={planDetailRowClass}>
							<span class="text-muted-foreground">
								{isPendingCancel
									? m.settings_plan_end_date_label()
									: m.settings_plan_next_billing_label()}
							</span>
							<span class={planDetailValueClass}>{nextBillingLabel}</span>
						</div>
						<div class={planDetailRowClass}>
							<span class="text-muted-foreground">{m.settings_plan_billing_amount_label()}</span>
							<span class={planDetailValueClass}>{billingAmountLabel}</span>
						</div>
					{/if}
				</div>

				<div class="border-t px-4 py-4 sm:px-5">
					{#if isPremium}
						<div class="flex flex-col items-start gap-3">
							{#if hasSubscriptionAccess && hasLifetimeEntitlement}
								<div
									class="w-full rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950"
								>
									<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
										<div class="space-y-1">
											<p class="text-sm font-semibold">
												{billingCopy.lifetimeWithMonthlyTitle}
											</p>
											<p class="text-sm leading-6 text-amber-900">
												{billingCopy.lifetimeWithMonthlyDescription}
											</p>
										</div>
										<Button
											variant="outline"
											class={`${responsiveButtonClass} w-full border-amber-200 bg-white text-amber-950 hover:bg-amber-100 md:w-auto`}
											onclick={handleManagePlan}
											disabled={isUpgrading}
										>
											{#if isUpgrading}
												<Loader2 class="size-4 animate-spin" />
											{/if}
											{billingCopy.manageMonthlyCta}
										</Button>
									</div>
								</div>
							{:else if hasSubscriptionAccess}
								<Button
									class={`${responsiveButtonClass} w-full md:w-auto`}
									onclick={handleManagePlan}
									disabled={isUpgrading}
								>
									{#if isUpgrading}
										<Loader2 class="size-4 animate-spin" />
									{/if}
									{m.settings_plan_manage_button()}
								</Button>
							{:else if hasLifetimeEntitlement}
								<div class="rounded-full border px-4 py-2 text-sm font-medium">
									{m.settings_plan_lifetime_purchased()}
								</div>
							{/if}
							{#if hasSubscriptionAccess && !hasLifetimeEntitlement}
								<div class="bg-muted/30 w-full rounded-lg border p-4">
									<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
										<div class="space-y-1">
											<p class="text-sm font-semibold">{billingCopy.monthlyToLifetimeTitle}</p>
											<p class="text-muted-foreground text-sm leading-6">
												{isPendingCancel
													? billingCopy.monthlyToLifetimePendingDescription
													: billingCopy.monthlyToLifetimeDescription}
											</p>
										</div>
										<Button
											class={`${responsiveButtonClass} w-full md:w-auto`}
											onclick={handleLifetimeCheckout}
											disabled={isCreatingLifetimeCheckout}
										>
											{#if isCreatingLifetimeCheckout}
												<Loader2 class="size-4 animate-spin" />
											{/if}
											{billingCopy.lifetimeCta}
										</Button>
									</div>
								</div>
							{/if}
							<span class="text-muted-foreground text-xs">{m.settings_plan_refund_policy()}</span>
						</div>
					{:else}
						<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
							<p class="text-muted-foreground text-sm">{m.settings_plan_info_desc_free()}</p>
							<Button
								class={`${responsiveButtonClass} w-full md:w-auto`}
								onclick={() => (isPremiumModalOpen = true)}
							>
								{m.settings_plan_upgrade_button()}
							</Button>
						</div>
						<p class="text-muted-foreground mt-3 text-xs">{m.settings_plan_refund_policy()}</p>
					{/if}
				</div>
			</div>
		</div>
	</section>

	<section class={sectionDividerClass}>
		<div class={sectionGridClass}>
			<div class={sectionHeaderClass}>
				<h2 class="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
					{managementTitle}
				</h2>
				<p class="text-muted-foreground text-sm">{managementDescription}</p>
			</div>
			<div class={settingsCardClass}>
				<div class="p-4 sm:p-5">
					<SubscriptionManagementItems
						{categories}
						{paymentMethods}
						{isPremium}
						{isOnline}
						onItemsChange={handleManagementItemsChange}
					/>
				</div>
			</div>
		</div>
	</section>

	<section class={sectionDividerClass}>
		<div class={sectionGridClass}>
			<div class={sectionHeaderClass}>
				<h2 class="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
					{m.settings_notifications_title()}
				</h2>
				<p class="text-muted-foreground text-sm">{m.settings_notifications_description()}</p>
			</div>
			<div class={settingsCardClass}>
				<div class={settingRowClass}>
					<div class={settingTextClass}>
						<p class="text-sm font-medium">{m.settings_default_notify_label()}</p>
						<p class="text-muted-foreground text-sm">{m.settings_default_notify_description()}</p>
					</div>
					<div class={settingActionClass}>
						<DefaultNotifyModal />
					</div>
				</div>
				<div class={settingRowWithBorderClass}>
					<div class={settingTextClass}>
						<p class="text-sm font-medium">{m.settings_time_zone_label()}</p>
						<p class="text-muted-foreground text-sm">{m.settings_time_zone_description()}</p>
					</div>
					<div class={settingActionClass}>
						<TimeZoneModal />
					</div>
				</div>
				<div class={settingRowWithBorderClass}>
					<div class={settingTextClass}>
						<p class="text-sm font-medium">{m.settings_notify_time_label()}</p>
						<p class="text-muted-foreground text-sm">{m.settings_notify_time_description()}</p>
					</div>
					<div class={settingActionClass}>
						<NotifyTimeModal />
					</div>
				</div>
				<div class={settingRowWithBorderClass}>
					<div class={settingTextClass}>
						<p class="text-sm font-medium">{m.settings_notification_method_label()}</p>
						<p class="text-muted-foreground text-sm">
							{notificationMethodDescription}
						</p>
					</div>
					<div class={settingActionClass}>
						<NotificationMethodModal onRequestPushSetup={requestPushSetup} />
					</div>
				</div>
				<div class="border-t px-4 py-4 sm:px-5">
					<PushNotificationControl
						variant="settings"
						{vapidPublicKey}
						initialSubscribed={Boolean(hasPushSubscription)}
						guideHref={pushGuideHref}
						promptKey={pushSetupPromptKey}
						onSubscriptionChange={(subscribed) => (pushSubscribedOverride = subscribed)}
					/>
				</div>
			</div>
		</div>
	</section>

	<section class={sectionDividerClass}>
		<div class={sectionGridClass}>
			<div class={sectionHeaderClass}>
				<h2 class="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
					{m.settings_appearance_title()}
				</h2>
				<p class="text-muted-foreground text-sm">{m.settings_appearance_description()}</p>
			</div>
			<div class={settingsCardClass}>
				<div class={settingRowClass}>
					<div class={settingTextClass}>
						<p class="text-sm font-medium">{m.settings_theme_label()}</p>
						<p class="text-muted-foreground text-sm">{m.settings_theme_title()}</p>
					</div>
					<div class={settingActionClass}>
						<ThemeSelectModal />
					</div>
				</div>
			</div>
		</div>
	</section>

	<section>
		<div class={sectionGridClass}>
			<div class={sectionHeaderClass}>
				<h2 class="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
					{m.settings_session_title()}
				</h2>
				<p class="text-muted-foreground text-sm">{m.settings_session_description()}</p>
			</div>
			<div class={settingsCardClass}>
				<div class={settingRowClass}>
					<p class="text-sm font-medium">{m.settings_logout_label()}</p>
					<Button
						variant="outline"
						class={`${responsiveButtonClass} w-full md:w-auto`}
						onclick={() => {
							authClient.signOut();
							invalidateAll();
						}}>{m.settings_logout_button()}</Button
					>
				</div>
			</div>
		</div>
	</section>

	{#if !isPremium}
		<Dialog.Root bind:open={isPremiumModalOpen}>
			<Dialog.Content class="w-full max-w-[calc(100vw-1rem)] p-4 sm:max-w-2xl sm:p-6">
				<div class="flex flex-col items-center gap-3 text-center">
					<span
						class="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700"
					>
						{m.premium_modal_badge()}
					</span>
					<h3 class="text-xl font-semibold">{m.premium_modal_title()}</h3>
					<p class="text-muted-foreground text-sm">
						{m.premium_modal_description()}
					</p>
				</div>

				<div class="mt-5 grid gap-3 sm:grid-cols-2">
					<article
						class="border-primary bg-primary/5 flex flex-col rounded-lg border p-4 shadow-sm"
					>
						<div class="flex items-start justify-between gap-3">
							<div>
								<p class="text-base font-semibold">{billingCopy.lifetimeTitle}</p>
								<p class="text-muted-foreground text-xs">{billingCopy.lifetimeCycle}</p>
							</div>
							<span
								class="bg-primary text-primary-foreground rounded-md px-2 py-1 text-xs font-medium"
							>
								{billingCopy.recommended}
							</span>
						</div>
						<div class="mt-5">
							<p class="text-3xl leading-tight font-semibold">{billingCopy.lifetimePrice}</p>
							<p class="text-muted-foreground mt-2 text-sm leading-6">
								{billingCopy.lifetimeDescription}
							</p>
						</div>
						<Button
							class={`${responsiveButtonClass} mt-5 w-full`}
							onclick={handleLifetimeCheckout}
							disabled={isCreatingLifetimeCheckout}
						>
							{#if isCreatingLifetimeCheckout}
								<Loader2 class="size-4 animate-spin" />
							{/if}
							{billingCopy.lifetimeCta}
						</Button>
					</article>

					<article class="bg-background flex flex-col rounded-lg border p-4">
						<div>
							<p class="text-base font-semibold">{billingCopy.monthlyTitle}</p>
							<p class="text-muted-foreground text-xs">{billingCopy.monthlyCycle}</p>
						</div>
						<div class="mt-5">
							<p class="text-3xl leading-tight font-semibold">{billingCopy.monthlyPrice}</p>
							<p class="text-muted-foreground mt-2 text-sm leading-6">
								{billingCopy.monthlyDescription}
							</p>
							<p class="text-muted-foreground mt-2 text-xs leading-5">{billingCopy.trialNote}</p>
						</div>
						<Button
							class={`${responsiveButtonClass} mt-5 w-full`}
							variant="outline"
							onclick={handleUpgrade}
							disabled={isUpgrading}
						>
							{#if isUpgrading}
								<Loader2 class="size-4 animate-spin" />
							{/if}
							{billingCopy.monthlyCta}
						</Button>
					</article>
				</div>

				<div class="bg-muted/30 mt-4 rounded-lg border p-3">
					<p class="text-sm font-semibold">{billingCopy.featuresTitle}</p>
					<ul class="mt-3 grid gap-2 text-sm sm:grid-cols-2">
						{#each billingCopy.features as feature (feature)}
							<li class="flex gap-2 leading-6">
								<Check class="text-primary mt-1 size-4 shrink-0" />
								<span>{feature}</span>
							</li>
						{/each}
					</ul>
				</div>

				<div class="mt-4 flex flex-col gap-3">
					<p class="text-muted-foreground text-center text-xs leading-5">
						{billingCopy.checkoutNote}
						{m.settings_plan_refund_policy()}
					</p>
					<div
						class="text-muted-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-xs"
					>
						<Button
							variant="link"
							class="text-muted-foreground h-auto p-0 text-xs underline-offset-4"
							href={localizeInternalHref(resolve('/commercial-transactions'), currentLocale)}
						>
							{settingsCopy.commerceLink}
						</Button>
						<Button
							variant="link"
							class="text-muted-foreground h-auto p-0 text-xs underline-offset-4"
							href={localizeInternalHref(resolve('/terms'), currentLocale)}
						>
							{m.legal_terms()}
						</Button>
						<Button
							variant="link"
							class="text-muted-foreground h-auto p-0 text-xs underline-offset-4"
							href={localizeInternalHref(resolve('/privacy'), currentLocale)}
						>
							{m.legal_privacy()}
						</Button>
					</div>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	{/if}
</div>
