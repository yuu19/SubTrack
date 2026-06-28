<script lang="ts">
	import AddSubscription from '$lib/components/modals/AddSubscription.svelte';
	import EditSubscription from '$lib/components/modals/EditSubscription.svelte';
	import PushNotificationControl from '$lib/components/push/PushNotificationControl.svelte';
	import SubscriptionDetailPanel from '$lib/components/subscriptions/SubscriptionDetailPanel.svelte';
	import SubscriptionIcon from '$lib/components/subscriptions/SubscriptionIcon.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Badge, badgeVariants } from '$lib/components/ui/badge';
	import Button from '$lib/components/ui/button/button.svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		addPendingSubscription,
		getCachedSubscriptions,
		replaceSubscriptionsFromServer,
		syncPendingSubscriptions,
		type SubscriptionPayload,
		type SubscriptionRecord
	} from '$lib/offline/subscriptions';
	import {
		formatCurrencyYen,
		formatLongDate,
		formatNotifyDays,
		getCycleLabel,
		getCycleUnitLabel,
		resolveLocale
	} from '$lib/locale';
	import { startLifetimeCheckout } from '$lib/client/lifetime-checkout';
	import { localizeInternalHref } from '$lib/locale-routing';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime';
	import { browser } from '$app/environment';
	import { enhance as kitEnhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { base, resolve } from '$app/paths';
	import { page } from '$app/state';
	import { fromAction } from 'svelte/attachments';
	import { cn } from '$lib/utils';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { trackedSubscriptionTable } from '$lib/server/db/schema';

	type Subscription = typeof trackedSubscriptionTable.$inferSelect;
	type SubscriptionView = Omit<Subscription, 'id'> & {
		id: number | string;
		_pending?: boolean;
	};

	let { data } = $props<{
		data: {
			subscriptions: Subscription[];
			form: unknown;
			vapidPublicKey: string;
			hasPushSubscription: boolean;
			currentPlan: {
				isPremium: boolean;
				hasSubscriptionAccess?: boolean;
				hasLifetimeEntitlement?: boolean;
			};
		};
	}>();

	function getInitialSubscriptions() {
		return data.subscriptions as SubscriptionView[];
	}

	let subscriptions = $state<SubscriptionView[]>(getInitialSubscriptions());
	let isOnline = $state(true);
	let isSyncing = $state(false);
	let syncError = $state<string | null>(null);
	let pushPromptKey = $state(0);
	let isCreatingLifetimeCheckout = $state(false);
	let detailOpen = $state(false);
	let addSubscriptionOpen = $state(false);
	let editOpen = $state(false);
	let cancelOpen = $state(false);
	let reactivateOpen = $state(false);
	let deleteOpen = $state(false);
	let selectedSubscription = $state<SubscriptionView | null>(null);
	let lastOpenedSubscriptionParam = $state<string | null>(null);
	const currentLocale = $derived(resolveLocale(getLocale()));
	const isPremium = $derived(Boolean(data.currentPlan?.isPremium));
	const hasSubscriptionAccess = $derived(Boolean(data.currentPlan?.hasSubscriptionAccess));
	const hasLifetimeEntitlement = $derived(Boolean(data.currentPlan?.hasLifetimeEntitlement));
	const shouldShowLifetimeEntry = $derived(
		!isPremium && !hasSubscriptionAccess && !hasLifetimeEntitlement
	);
	const exportHref = $derived(resolve('/subscriptions/export'));
	const upgradePlanHref = $derived(
		localizeInternalHref(`${resolve('/me/settings')}#plan-info`, currentLocale)
	);
	const pushGuideHref = $derived(localizeInternalHref(resolve('/push'), currentLocale));
	const activeTag = $derived(page.url.searchParams.get('tag')?.trim() ?? '');
	const activeSubscriptionParam = $derived(page.url.searchParams.get('subscription')?.trim() ?? '');
	const normalizedActiveTag = $derived(activeTag.toLocaleLowerCase());

	const pendingCount = $derived(subscriptions.filter((sub) => sub._pending).length);
	const canMutateSelected = $derived(
		Boolean(selectedSubscription) && isOnline && !selectedSubscription?._pending
	);
	const hasActiveTagFilter = $derived(activeTag.length > 0);
	const activeSubscriptions = $derived(
		subscriptions.filter((sub) => (sub.status ?? 'active') !== 'canceled')
	);
	const canceledSubscriptions = $derived(
		subscriptions.filter((sub) => (sub.status ?? 'active') === 'canceled')
	);
	const filteredSubscriptions = $derived.by(() => {
		if (!normalizedActiveTag) return activeSubscriptions;

		return activeSubscriptions.filter((sub) =>
			sub.tags.some((tag) => tag.trim().toLocaleLowerCase() === normalizedActiveTag)
		);
	});
	const filteredCanceledSubscriptions = $derived.by(() => {
		if (!normalizedActiveTag) return canceledSubscriptions;

		return canceledSubscriptions.filter((sub) =>
			sub.tags.some((tag) => tag.trim().toLocaleLowerCase() === normalizedActiveTag)
		);
	});

	const cycleDayMap: Record<string, number> = {
		monthly: 30,
		quarterly: 90,
		yearly: 365
	};

	const formatBillingDate = (value?: string | number | Date | null) => {
		return formatLongDate(value, currentLocale);
	};

	const getCycleProgress = (subscription: SubscriptionView) => {
		const total = cycleDayMap[subscription.cycle] ?? 0;
		if (!total) return 1;
		const daysLeft = Number(subscription.daysUntilNextBilling ?? 0);
		if (!Number.isFinite(daysLeft)) return 1;
		const elapsed = Math.max(0, total - daysLeft);
		return Math.min(1, elapsed / total);
	};

	const isActiveTag = (tag: string) => tag.trim().toLocaleLowerCase() === normalizedActiveTag;

	const updateTagFilter = async (tag: string) => {
		const nextTag = isActiveTag(tag) ? '' : tag.trim();
		const url = new URL(page.url);

		if (nextTag) {
			url.searchParams.set('tag', nextTag);
		} else {
			url.searchParams.delete('tag');
		}

		await goto(url, {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	};

	const handleTagClick = async (event: MouseEvent, tag: string) => {
		event.stopPropagation();
		await updateTagFilter(tag);
	};

	const handleLifetimeCheckout = async () => {
		if (isCreatingLifetimeCheckout) return;
		isCreatingLifetimeCheckout = true;
		try {
			await startLifetimeCheckout({
				returnPath: page.url.pathname,
				errorMessage: m.settings_lifetime_checkout_error(),
				purchasedMessage: m.settings_plan_lifetime_purchased()
			});
		} catch (error) {
			console.error('Failed to start lifetime checkout from subscriptions', error);
		} finally {
			isCreatingLifetimeCheckout = false;
		}
	};

	const applyServerSubscriptions = async (serverSubscriptions: Subscription[]) => {
		if (!browser) return;
		if (!navigator.onLine && serverSubscriptions.length === 0) return;
		const merged = await replaceSubscriptionsFromServer(
			serverSubscriptions as unknown as SubscriptionRecord[]
		);
		subscriptions = merged as SubscriptionView[];
	};

	const loadCachedSubscriptions = async () => {
		if (!browser) return;
		const cached = await getCachedSubscriptions();
		if (cached.length > 0) {
			subscriptions = cached as SubscriptionView[];
		}
	};

	const runSync = async () => {
		if (!browser || !navigator.onLine) return;
		isSyncing = true;
		syncError = null;
		try {
			const result = await syncPendingSubscriptions(`${base}/subscriptions?/create`);
			subscriptions = result.subscriptions as SubscriptionView[];
			if (result.failed > 0) {
				syncError = m.subscription_sync_failed_offline();
			}
		} catch (error) {
			console.error('Failed to sync subscriptions', error);
			syncError = m.subscription_sync_failed();
		} finally {
			isSyncing = false;
		}
	};

	const handleOfflineSubmit = async (payload: SubscriptionPayload) => {
		const merged = await addPendingSubscription(payload);
		subscriptions = merged as SubscriptionView[];
	};

	const handleServerResult = async (serverSubscriptions: Subscription[]) => {
		const merged = await replaceSubscriptionsFromServer(
			serverSubscriptions as unknown as SubscriptionRecord[]
		);
		subscriptions = merged as SubscriptionView[];
		if (selectedSubscription) {
			const updated = merged.find((sub) => sub.id === selectedSubscription?.id);
			selectedSubscription = (updated as SubscriptionView | undefined) ?? null;
		}
	};

	const handleCreateResult = async (serverSubscriptions: Subscription[]) => {
		await handleServerResult(serverSubscriptions);
		toast.success(m.subscription_added_toast());
		pushPromptKey += 1;
	};

	const handleUpdateResult = async (serverSubscriptions: Subscription[]) => {
		await handleServerResult(serverSubscriptions);
		toast.success(m.subscription_updated_toast());
	};

	const openDetail = (subscription: SubscriptionView) => {
		selectedSubscription = subscription;
		detailOpen = true;
	};

	const openEdit = () => {
		if (!canMutateSelected) return;
		detailOpen = false;
		editOpen = true;
	};

	const openDelete = () => {
		if (!canMutateSelected || selectedSubscription?.status !== 'canceled') return;
		detailOpen = false;
		deleteOpen = true;
	};

	const openCancel = () => {
		if (!canMutateSelected || selectedSubscription?.status === 'canceled') return;
		detailOpen = false;
		cancelOpen = true;
	};

	const openReactivate = () => {
		if (!canMutateSelected || selectedSubscription?.status !== 'canceled') return;
		detailOpen = false;
		reactivateOpen = true;
	};

	const closeEdit = () => {
		editOpen = false;
		detailOpen = false;
	};

	const subscriptionActionEnhance = (
		onSuccess: (subscriptions: Subscription[]) => Promise<void> | void,
		close: () => void
	) => {
		return async ({ result }: { result: { type: string; data?: unknown } }) => {
			if (result.type !== 'success') return;
			const data = result.data as { subscriptions?: Subscription[] };
			if (data?.subscriptions) {
				await handleServerResult(data.subscriptions);
				await onSuccess(data.subscriptions);
			}
			close();
		};
	};

	const deleteEnhance = () => {
		return async ({ result }: { result: { type: string; data?: unknown } }) => {
			if (result.type !== 'success') return;
			const data = result.data as { subscriptions?: Subscription[] };
			if (data?.subscriptions) {
				await handleServerResult(data.subscriptions);
			}
			toast.success(m.subscription_deleted_toast());
			deleteOpen = false;
			detailOpen = false;
			editOpen = false;
			cancelOpen = false;
			reactivateOpen = false;
			selectedSubscription = null;
		};
	};

	const cancelEnhance = () =>
		subscriptionActionEnhance(
			() => {
				toast.success(m.subscription_canceled_toast());
			},
			() => {
				cancelOpen = false;
				detailOpen = false;
			}
		);

	const reactivateEnhance = () =>
		subscriptionActionEnhance(
			() => {
				toast.success(m.subscription_reactivated_toast());
			},
			() => {
				reactivateOpen = false;
				detailOpen = false;
			}
		);

	onMount(() => {
		isOnline = navigator.onLine;
		void loadCachedSubscriptions();
		if (navigator.onLine) {
			void applyServerSubscriptions(data.subscriptions);
			void runSync();
		}

		const handleOnline = () => {
			isOnline = true;
			void runSync();
		};

		const handleOffline = () => {
			isOnline = false;
		};

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	});

	$effect(() => {
		if (!activeSubscriptionParam) {
			lastOpenedSubscriptionParam = null;
			return;
		}
		if (activeSubscriptionParam === lastOpenedSubscriptionParam) return;

		const target = subscriptions.find((sub) => String(sub.id) === activeSubscriptionParam);
		if (!target) return;

		selectedSubscription = target;
		detailOpen = true;
		lastOpenedSubscriptionParam = activeSubscriptionParam;
	});
</script>

<section class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
	<header class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold">{m.subscription_page_title()}</h1>
			<p class="text-muted-foreground">{m.subscription_page_description()}</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			{#if isPremium}
				<Button size="sm" variant="outline" href={exportHref} download>
					{m.subscription_export_button()}
				</Button>
			{:else}
				<Button size="sm" variant="outline" href={upgradePlanHref}>
					{m.subscription_export_upgrade_button()}
				</Button>
			{/if}
			<Button onclick={() => (addSubscriptionOpen = true)}
				>{m.subscription_page_add_button()}</Button
			>
		</div>
	</header>
	<PushNotificationControl
		vapidPublicKey={data.vapidPublicKey}
		initialSubscribed={data.hasPushSubscription}
		guideHref={pushGuideHref}
		promptKey={pushPromptKey}
		variant="banner"
	/>

	{#if shouldShowLifetimeEntry}
		<div class="bg-card flex flex-col gap-4 rounded-2xl border p-5 shadow-sm">
			<div class="space-y-1">
				<p class="text-muted-foreground text-xs font-semibold tracking-[0.24em] uppercase">
					{m.lifetime_entry_badge()}
				</p>
				<h2 class="text-lg font-semibold">{m.lifetime_entry_title()}</h2>
				<p class="text-muted-foreground text-sm">{m.subscription_lifetime_description()}</p>
			</div>
			<div class="flex flex-wrap gap-3">
				<Button onclick={handleLifetimeCheckout} disabled={isCreatingLifetimeCheckout}>
					{m.premium_modal_cta_lifetime()}
				</Button>
				<Button variant="outline" href={upgradePlanHref}>
					{m.settings_premium_status_action()}
				</Button>
			</div>
			<p class="text-muted-foreground text-xs">{m.premium_modal_lifetime_caption()}</p>
		</div>
	{/if}

	{#if !isOnline || pendingCount > 0 || syncError}
		<div
			class="border-border/60 bg-muted/40 text-muted-foreground flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-xs"
		>
			{#if !isOnline}
				<span>{m.subscription_offline_banner()}</span>
			{:else if pendingCount > 0}
				<span>
					{m.subscription_pending_sync_banner({ count: pendingCount })}
					{#if isSyncing}
						{m.subscription_syncing()}
					{/if}
				</span>
			{/if}
			{#if syncError}
				<span class="text-destructive">{syncError}</span>
			{/if}
		</div>
	{/if}

	{#if hasActiveTagFilter}
		<div class="bg-muted/50 flex flex-wrap items-center gap-2 rounded-lg border px-4 py-3 text-sm">
			<span class="text-muted-foreground">{m.subscription_tag_filter_active()}</span>
			<Badge class="text-[10px]">{activeTag}</Badge>
			<Button
				size="sm"
				variant="ghost"
				class="h-7 px-2 text-xs"
				onclick={() => void updateTagFilter('')}
			>
				{m.subscription_tag_filter_clear()}
			</Button>
		</div>
	{/if}

	{#if filteredSubscriptions.length === 0}
		<div class="text-muted-foreground rounded-lg border border-dashed p-6">
			{#if hasActiveTagFilter}
				{m.subscription_tag_filter_empty({ tag: activeTag })}
			{:else if canceledSubscriptions.length > 0}
				{m.subscription_active_empty_state()}
			{:else}
				{m.subscription_empty_state()}
			{/if}
		</div>
	{:else}
		<div class="flex flex-col gap-4">
			{#each filteredSubscriptions as sub (sub.id)}
				<Card
					class="cursor-pointer overflow-hidden"
					role="button"
					tabindex={0}
					onkeydown={(event) => {
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault();
							openDetail(sub);
						}
					}}
					onclick={() => openDetail(sub)}
				>
					<CardHeader class="pb-3">
						<div class="flex items-start justify-between gap-4">
							<div class="flex min-w-0 items-start gap-3">
								<div
									class="border-border bg-muted/50 flex size-11 shrink-0 items-center justify-center rounded-md border text-xl"
									aria-hidden="true"
								>
									<SubscriptionIcon
										iconType={sub.iconType}
										iconValue={sub.iconValue}
										subscriptionId={sub.id}
										class="size-6"
									/>
								</div>
								<div class="min-w-0 space-y-1">
									<CardTitle class="truncate text-base">{sub.serviceName}</CardTitle>
									<CardDescription class="flex flex-wrap items-center gap-2 text-xs">
										<span>{getCycleLabel(sub.cycle, currentLocale)}</span>
										{#if sub._pending}
											<Badge variant="secondary" class="text-[10px]"
												>{m.subscription_pending_badge()}</Badge
											>
										{/if}
									</CardDescription>
								</div>
							</div>
							<div class="text-right">
								<div class="text-base font-semibold">
									{formatCurrencyYen(sub.amount, currentLocale)}
									<span class="text-muted-foreground text-xs">
										/ {getCycleUnitLabel(sub.cycle, currentLocale)}
									</span>
								</div>
							</div>
						</div>
					</CardHeader>
					<CardContent class="space-y-3 pt-0">
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">
								{formatBillingDate(sub.nextBillingAt)}
							</span>
							<span class="text-muted-foreground">
								{m.subscription_due_in_days({ days: sub.daysUntilNextBilling })}
							</span>
						</div>
						<div
							class="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs"
						>
							<span>
								{m.subscription_notify_label()}
								{formatNotifyDays(sub.notifyDaysBefore, currentLocale)}
							</span>
							{#if sub.tags.length > 0}
								<div class="flex flex-wrap gap-2">
									{#each sub.tags as tag, i (i)}
										<button
											type="button"
											class={cn(
												badgeVariants({
													variant: isActiveTag(tag) ? 'default' : 'secondary'
												}),
												'cursor-pointer text-[10px]'
											)}
											aria-pressed={isActiveTag(tag)}
											onclick={(event) => void handleTagClick(event, tag)}
											onkeydown={(event) => event.stopPropagation()}
										>
											{tag}
										</button>
									{/each}
								</div>
							{/if}
						</div>
						<div class="bg-muted h-1 w-full rounded-full">
							<div
								class="bg-primary h-1 rounded-full transition-[width]"
								style={`width: ${Math.max(8, Math.round(getCycleProgress(sub) * 100))}%`}
							></div>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}

	{#if canceledSubscriptions.length > 0}
		<details class="rounded-lg border">
			<summary class="cursor-pointer px-4 py-3 text-sm font-semibold">
				{m.subscription_canceled_section_summary({ count: canceledSubscriptions.length })}
			</summary>
			<div class="border-t px-4 py-4">
				<p class="text-muted-foreground mb-4 text-sm">
					{m.subscription_canceled_section_description()}
				</p>
				{#if filteredCanceledSubscriptions.length === 0}
					<div class="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
						{m.subscription_tag_filter_empty({ tag: activeTag })}
					</div>
				{:else}
					<div class="flex flex-col gap-3">
						{#each filteredCanceledSubscriptions as sub (sub.id)}
							<Card
								class="cursor-pointer overflow-hidden opacity-80"
								role="button"
								tabindex={0}
								onkeydown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault();
										openDetail(sub);
									}
								}}
								onclick={() => openDetail(sub)}
							>
								<CardHeader class="pb-3">
									<div class="flex items-start justify-between gap-4">
										<div class="flex min-w-0 items-start gap-3">
											<div
												class="border-border bg-muted/50 flex size-10 shrink-0 items-center justify-center rounded-md border text-lg"
												aria-hidden="true"
											>
												<SubscriptionIcon
													iconType={sub.iconType}
													iconValue={sub.iconValue}
													subscriptionId={sub.id}
													class="size-5"
												/>
											</div>
											<div class="min-w-0 space-y-1">
												<CardTitle class="truncate text-base">{sub.serviceName}</CardTitle>
												<CardDescription class="flex flex-wrap items-center gap-2 text-xs">
													<Badge variant="secondary" class="text-[10px]">
														{m.subscription_canceled_badge()}
													</Badge>
													<span>{getCycleLabel(sub.cycle, currentLocale)}</span>
												</CardDescription>
											</div>
										</div>
										<div class="text-right">
											<div class="text-base font-semibold">
												{formatCurrencyYen(sub.amount, currentLocale)}
												<span class="text-muted-foreground text-xs">
													/ {getCycleUnitLabel(sub.cycle, currentLocale)}
												</span>
											</div>
										</div>
									</div>
								</CardHeader>
								<CardContent class="space-y-3 pt-0">
									<div class="flex items-center justify-between text-sm">
										<span class="text-muted-foreground">
											{m.subscription_canceled_at_label()}
										</span>
										<span class="text-muted-foreground">
											{formatBillingDate(sub.canceledAt)}
										</span>
									</div>
									{#if sub.tags.length > 0}
										<div class="flex flex-wrap gap-2">
											{#each sub.tags as tag, i (i)}
												<button
													type="button"
													class={cn(
														badgeVariants({
															variant: isActiveTag(tag) ? 'default' : 'secondary'
														}),
														'cursor-pointer text-[10px]'
													)}
													aria-pressed={isActiveTag(tag)}
													onclick={(event) => void handleTagClick(event, tag)}
													onkeydown={(event) => event.stopPropagation()}
												>
													{tag}
												</button>
											{/each}
										</div>
									{/if}
								</CardContent>
							</Card>
						{/each}
					</div>
				{/if}
			</div>
		</details>
	{/if}
</section>

<Dialog.Root bind:open={detailOpen}>
	<Dialog.Content class="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden p-0">
		<div class="flex items-center justify-between border-b px-4 py-3">
			<Dialog.Title class="flex min-w-0 items-center gap-3 text-base font-semibold">
				{#if selectedSubscription}
					<span
						class="border-border bg-muted/50 flex size-9 shrink-0 items-center justify-center rounded-md border text-lg"
						aria-hidden="true"
					>
						<SubscriptionIcon
							iconType={selectedSubscription.iconType}
							iconValue={selectedSubscription.iconValue}
							subscriptionId={selectedSubscription.id}
							class="size-5"
						/>
					</span>
				{/if}
				<span class="truncate">
					{selectedSubscription?.serviceName ?? m.subscription_detail_fallback_title()}
				</span>
			</Dialog.Title>
		</div>
		{#if selectedSubscription}
			<SubscriptionDetailPanel
				subscription={selectedSubscription}
				locale={currentLocale}
				canMutate={canMutateSelected}
				onEdit={openEdit}
				onCancel={openCancel}
				onReactivate={openReactivate}
				onDelete={openDelete}
			/>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={editOpen}>
	<Dialog.Content class="max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6">
		<Dialog.Header class="space-y-1">
			<Dialog.Title class="text-2xl font-bold">{m.subscription_edit_title()}</Dialog.Title>
			<Dialog.Description class="text-muted-foreground text-sm">
				{m.subscription_edit_description()}
			</Dialog.Description>
		</Dialog.Header>
		<div class="mt-6">
			{#key selectedSubscription?.id}
				<EditSubscription
					subscription={selectedSubscription}
					{isPremium}
					onServerResult={handleUpdateResult}
					onClose={closeEdit}
				/>
			{/key}
		</div>
	</Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={cancelOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{m.subscription_cancel_title()}</AlertDialog.Title>
			<AlertDialog.Description>
				{m.subscription_cancel_description()}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<form method="post" action="?/cancel" {@attach fromAction(kitEnhance, () => cancelEnhance)}>
			<input type="hidden" name="id" value={selectedSubscription?.id ?? ''} />
			<AlertDialog.Footer class="mt-4">
				<AlertDialog.Cancel type="button">{m.common_cancel()}</AlertDialog.Cancel>
				<AlertDialog.Action type="submit">
					{m.subscription_cancel_button()}
				</AlertDialog.Action>
			</AlertDialog.Footer>
		</form>
	</AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root bind:open={reactivateOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{m.subscription_reactivate_title()}</AlertDialog.Title>
			<AlertDialog.Description>
				{m.subscription_reactivate_description()}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<form
			method="post"
			action="?/reactivate"
			{@attach fromAction(kitEnhance, () => reactivateEnhance)}
		>
			<input type="hidden" name="id" value={selectedSubscription?.id ?? ''} />
			<AlertDialog.Footer class="mt-4">
				<AlertDialog.Cancel type="button">{m.common_cancel()}</AlertDialog.Cancel>
				<AlertDialog.Action type="submit">
					{m.subscription_reactivate_button()}
				</AlertDialog.Action>
			</AlertDialog.Footer>
		</form>
	</AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root bind:open={deleteOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{m.subscription_delete_title()}</AlertDialog.Title>
			<AlertDialog.Description>
				{m.subscription_delete_description()}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<form method="post" action="?/delete" {@attach fromAction(kitEnhance, () => deleteEnhance)}>
			<input type="hidden" name="id" value={selectedSubscription?.id ?? ''} />
			<AlertDialog.Footer class="mt-4">
				<AlertDialog.Cancel type="button">{m.common_cancel()}</AlertDialog.Cancel>
				<AlertDialog.Action type="submit" class="bg-destructive hover:bg-destructive/90 text-white">
					{m.common_delete()}
				</AlertDialog.Action>
			</AlertDialog.Footer>
		</form>
	</AlertDialog.Content>
</AlertDialog.Root>

<Dialog.Root bind:open={addSubscriptionOpen}>
	<Dialog.Content class="max-h-[90vh] w-full max-w-3xl overflow-y-auto p-0">
		<AddSubscription
			{data}
			open={addSubscriptionOpen}
			onClose={() => (addSubscriptionOpen = false)}
			onOfflineSubmit={handleOfflineSubmit}
			onServerResult={handleCreateResult}
		/>
	</Dialog.Content>
</Dialog.Root>
