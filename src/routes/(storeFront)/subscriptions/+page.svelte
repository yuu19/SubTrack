<script lang="ts">
	import AddSubscription from '$lib/components/modals/AddSubscription.svelte';
	import EditSubscription from '$lib/components/modals/EditSubscription.svelte';
	import PushNotificationControl from '$lib/components/push/PushNotificationControl.svelte';
	import SubscriptionCsvImportDialog from '$lib/components/subscriptions/SubscriptionCsvImportDialog.svelte';
	import SubscriptionDetailPanel from '$lib/components/subscriptions/SubscriptionDetailPanel.svelte';
	import SubscriptionIcon from '$lib/components/subscriptions/SubscriptionIcon.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Badge } from '$lib/components/ui/badge';
	import Button from '$lib/components/ui/button/button.svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import {
		addPendingSubscription,
		getCachedSubscriptions,
		replaceSubscriptionsFromServer,
		syncPendingSubscriptions,
		type SubscriptionPayload,
		type SubscriptionRecord
	} from '$lib/offline/subscriptions';
	import {
		formatCurrency,
		formatLongDate,
		formatNotifyDays,
		getCycleLabel,
		getCycleUnitLabel,
		resolveLocale
	} from '$lib/locale';
	import { startLifetimeCheckout } from '$lib/client/lifetime-checkout';
	import {
		getReviewIdentity,
		mergeReviewRevisions,
		mergeReviewStates
	} from '$lib/client/subscription-reviews';
	import { UserConfigContext } from '$lib/states/userConfig.svelte';
	import { computeNextBilling } from '$lib/billing-dates';
	import {
		getReviewContext,
		isReviewWithinDays,
		type ReviewState
	} from '$lib/subscription-reviews';
	import { subscriptionReviewCopy, type ReviewFeedback } from '$lib/subscription-review-copy';
	import { localizeInternalHref } from '$lib/locale-routing';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime';
	import { browser } from '$app/environment';
	import { deserialize, enhance as kitEnhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { base, resolve } from '$app/paths';
	import { page } from '$app/state';
	import { fromAction } from 'svelte/attachments';
	import { onMount, untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import {
		ChevronDown,
		Download,
		FileDown,
		FileUp,
		FileSpreadsheet,
		Play,
		Plus
	} from 'lucide-svelte';
	import type {
		subscriptionCategoryTable,
		subscriptionPaymentMethodTable,
		trackedSubscriptionTable
	} from '$lib/server/db/schema';

	type Subscription = typeof trackedSubscriptionTable.$inferSelect;
	type Category = typeof subscriptionCategoryTable.$inferSelect;
	type PaymentMethod = typeof subscriptionPaymentMethodTable.$inferSelect;
	type SubscriptionView = Omit<Subscription, 'id'> & {
		id: number | string;
		_pending?: boolean;
	};

	let {
		data
	}: {
		data: {
			subscriptions: Subscription[];
			reviewStates: Record<number, ReviewState>;
			categories: Category[];
			paymentMethods: PaymentMethod[];
			form: unknown;
			vapidPublicKey: string;
			hasPushSubscription: boolean;
			currentPlan: {
				isPremium: boolean;
				hasSubscriptionAccess?: boolean;
				hasLifetimeEntitlement?: boolean;
			};
		};
	} = $props();

	function getInitialSubscriptions() {
		return data.subscriptions as SubscriptionView[];
	}

	let subscriptions = $state<SubscriptionView[]>(getInitialSubscriptions());
	let categories = $state<Category[]>(untrack(() => data.categories));
	let paymentMethods = $state<PaymentMethod[]>(untrack(() => data.paymentMethods));
	let reviewStates = $state<Record<number, ReviewState>>(untrack(() => data.reviewStates ?? {}));
	// Subscription cache normalization intentionally excludes review data. Keep the small
	// server revision separately, in memory only, so edit/revert cannot revive an old decision.
	let reviewRevisions = $state<Record<string, number>>(
		untrack(() => mergeReviewRevisions({}, data.subscriptions))
	);
	let pendingReviewId = $state<number | null>(null);
	let refreshingReviews = $state(false);
	let reviewLoadFailed = $state(false);
	let reviewFeedback = $state<
		Record<string, ReviewFeedback & { context?: string; billingDate?: string }>
	>({});
	let showThirtyDayReviews = $state(false);
	let isOnline = $state(true);
	let isSyncing = $state(false);
	let syncError = $state<string | null>(null);
	let pushPromptKey = $state(0);
	let isCreatingLifetimeCheckout = $state(false);
	let detailOpen = $state(false);
	let addSubscriptionOpen = $state(false);
	let csvImportOpen = $state(false);
	let editOpen = $state(false);
	let cancelOpen = $state(false);
	let reactivateOpen = $state(false);
	let deleteOpen = $state(false);
	let selectedSubscription = $state<SubscriptionView | null>(null);
	let lastOpenedSubscriptionParam = $state<string | null>(null);
	const userConfig = UserConfigContext.get();
	const currentLocale = $derived(resolveLocale(getLocale()));
	const reviewCopy = $derived(subscriptionReviewCopy[currentLocale]);
	const isPremium = $derived(Boolean(data.currentPlan?.isPremium));
	const hasSubscriptionAccess = $derived(Boolean(data.currentPlan?.hasSubscriptionAccess));
	const hasLifetimeEntitlement = $derived(Boolean(data.currentPlan?.hasLifetimeEntitlement));
	const shouldShowLifetimeEntry = $derived(
		!isPremium && !hasSubscriptionAccess && !hasLifetimeEntitlement
	);
	const upgradePlanHref = $derived(
		localizeInternalHref(`${resolve('/me/settings')}#plan-info`, currentLocale)
	);
	const pushGuideHref = $derived(localizeInternalHref(resolve('/push'), currentLocale));
	const demoHref = $derived(localizeInternalHref(resolve('/demo'), currentLocale));
	const activeSubscriptionParam = $derived(page.url.searchParams.get('subscription')?.trim() ?? '');
	const categoryById = $derived(new Map(categories.map((category) => [category.id, category])));
	const paymentMethodById = $derived(
		new Map(paymentMethods.map((paymentMethod) => [paymentMethod.id, paymentMethod]))
	);
	const getCategoryName = (categoryId?: number | null) =>
		categoryId ? (categoryById.get(categoryId)?.name ?? null) : null;

	const getPaymentMethodName = (paymentMethodId?: number | null) =>
		paymentMethodId ? (paymentMethodById.get(paymentMethodId)?.name ?? null) : null;
	const csvCopy = $derived(
		currentLocale === 'en'
			? {
					menu: 'CSV',
					export: 'Export CSV',
					import: 'Import CSV',
					template: 'Download template',
					upgrade: 'Unlock CSV'
				}
			: {
					menu: 'CSV',
					export: 'CSVを書き出す',
					import: 'CSVを取り込む',
					template: 'テンプレートCSV',
					upgrade: 'PremiumでCSV'
				}
	);
	const checkoutCopy = $derived(
		currentLocale === 'en'
			? {
					success: 'Purchase completed. Premium status is being updated.',
					cancel: 'Checkout was canceled.'
				}
			: {
					success: '購入が完了しました。Premium状態を更新しています。',
					cancel: '購入手続きがキャンセルされました。'
				}
	);

	const pendingCount = $derived(subscriptions.filter((sub) => sub._pending).length);
	const canMutateSelected = $derived(
		Boolean(selectedSubscription) &&
			isOnline &&
			!selectedSubscription?._pending &&
			pendingReviewId === null &&
			!refreshingReviews
	);
	// The layout can initialize the account zone while an IndexedDB read is in flight.
	// Derive visible dates from the current setting so an older read cannot undo that change.
	const getBillingView = (subscription: SubscriptionView): SubscriptionView =>
		subscription.status === 'canceled'
			? subscription
			: {
					...subscription,
					...computeNextBilling(subscription.firstPaymentDate, subscription.cycle, {
						timeZone: userConfig.current.timeZone
					})
				};
	const activeSubscriptions = $derived(
		subscriptions.filter((sub) => (sub.status ?? 'active') !== 'canceled').map(getBillingView)
	);
	const canceledSubscriptions = $derived(
		subscriptions.filter((sub) => (sub.status ?? 'active') === 'canceled')
	);
	const filteredSubscriptions = $derived(activeSubscriptions);
	const filteredCanceledSubscriptions = $derived(canceledSubscriptions);
	const selectedSubscriptionDetail = $derived(
		selectedSubscription
			? {
					...getBillingView(selectedSubscription),
					categoryName: getCategoryName(selectedSubscription.categoryId),
					paymentMethodName: getPaymentMethodName(selectedSubscription.paymentMethodId)
				}
			: null
	);

	const rememberReviewRevisions = (serverSubscriptions: Subscription[]) => {
		reviewRevisions = mergeReviewRevisions(reviewRevisions, serverSubscriptions);
	};

	const currentReview = (sub: SubscriptionView | null): ReviewState | null => {
		if (!sub || sub._pending || sub.status !== 'active') return null;
		const state = reviewStates[Number(sub.id)];
		if (!state || state.billingDate !== getBillingView(sub).nextBillingAt) return null;
		const context = getReviewContext({
			...sub,
			reviewRevision: reviewRevisions[getReviewIdentity(sub)] ?? 0
		});
		return state.context === context ? state : null;
	};
	const selectedReview = $derived(currentReview(selectedSubscription));
	const selectedReviewFeedback = $derived.by(() => {
		const feedback = selectedSubscription ? reviewFeedback[selectedSubscription.id] : null;
		if (!feedback?.context) return feedback ?? null;
		return selectedReview?.context === feedback.context &&
			selectedReview.billingDate === feedback.billingDate
			? feedback
			: null;
	});
	const unavailableReviewCount = $derived(
		activeSubscriptions.filter((sub) => !sub._pending && !currentReview(sub)).length
	);
	const upcomingReviews = $derived(
		activeSubscriptions
			.filter((sub) => {
				const review = currentReview(sub);
				return (
					review &&
					!review.decision &&
					isReviewWithinDays({ ...review, daysUntilBilling: sub.daysUntilNextBilling }, 30)
				);
			})
			.sort(
				(left, right) =>
					left.nextBillingAt.localeCompare(right.nextBillingAt) ||
					left.serviceName.localeCompare(right.serviceName)
			)
	);
	const sevenDayReviews = $derived(upcomingReviews.filter((sub) => sub.daysUntilNextBilling <= 7));
	const visibleReviewRows = $derived(
		sevenDayReviews.length > 0 ? sevenDayReviews : showThirtyDayReviews ? upcomingReviews : []
	);

	// A failed review refresh must not turn a completed create/edit/delete into a
	// reported save failure, which could invite duplicate submissions.
	const reloadReviewData = async () => {
		try {
			await invalidateAll();
			reviewLoadFailed = false;
		} catch {
			reviewLoadFailed = true;
		}
	};

	const refreshReviews = async () => {
		if (!isOnline || refreshingReviews || pendingReviewId !== null) return;
		const id = selectedSubscription?.id;
		refreshingReviews = true;
		try {
			await invalidateAll();
			await applyServerSubscriptions(data.subscriptions);
			reviewLoadFailed = false;
			if (id !== undefined) reviewFeedback[id] = { message: 'refreshed', error: false };
		} catch {
			reviewLoadFailed = true;
			if (id !== undefined) reviewFeedback[id] = { message: 'refreshFailed', error: true };
		} finally {
			refreshingReviews = false;
		}
	};

	const saveReview = async (decision: 'keep' | 'review' | 'undo') => {
		const sub = selectedSubscription;
		const state = currentReview(sub);
		if (!sub || pendingReviewId !== null || refreshingReviews) return;
		if (!isOnline || !navigator.onLine) {
			isOnline = false;
			return;
		}
		if (!state) {
			reviewFeedback[sub.id] = { message: 'stale', error: true };
			return;
		}
		const id = Number(sub.id);
		pendingReviewId = id;
		delete reviewFeedback[id];
		const payload = new FormData();
		payload.set('id', String(id));
		payload.set('billingDate', state.billingDate);
		payload.set('context', state.context);
		payload.set('reviewedAt', state.reviewedAt === null ? '' : String(state.reviewedAt));
		payload.set('decision', decision);
		const controller = new AbortController();
		const timeout = window.setTimeout(() => controller.abort(), 20_000);
		try {
			const response = await fetch(`${page.url.pathname}?/review`, {
				method: 'POST',
				body: payload,
				headers: { accept: 'application/json', 'x-sveltekit-action': 'true' },
				signal: controller.signal
			});
			const result = deserialize(await response.text());
			if (result.type === 'success') {
				const saved = result.data as
					| { subscriptionId?: number; reviewState?: ReviewState }
					| undefined;
				if (saved?.subscriptionId !== id || !saved.reviewState)
					throw new Error('Invalid review response');
				// Never attach a late result to another detail, a newer payment, or a newer
				// decision that a concurrent load has already returned.
				const liveSub = subscriptions.find((item) => Number(item.id) === id);
				const known = reviewStates[id];
				const stillCurrent =
					liveSub?.status === 'active' &&
					getReviewContext({
						...liveSub,
						reviewRevision: reviewRevisions[getReviewIdentity(liveSub)] ?? 0
					}) === saved.reviewState.context &&
					getBillingView(liveSub).nextBillingAt === saved.reviewState.billingDate;
				const newerKnown =
					known?.context === saved.reviewState.context &&
					known.billingDate === saved.reviewState.billingDate &&
					(known.reviewedAt ?? 0) > (saved.reviewState.reviewedAt ?? 0);
				if (!stillCurrent || newerKnown) {
					reviewFeedback[id] = { message: 'stale', error: true };
				} else {
					reviewStates = { ...reviewStates, [id]: saved.reviewState };
					reviewFeedback[id] = {
						message: decision === 'undo' ? 'undone' : 'saved',
						error: false,
						context: saved.reviewState.context,
						billingDate: saved.reviewState.billingDate
					};
				}
			} else {
				const code =
					result.type === 'failure'
						? (result.data as { reviewError?: string } | undefined)?.reviewError
						: result.type === 'redirect'
							? 'unauthorized'
							: 'unavailable';
				const message =
					code === 'invalid' || code === 'unauthorized' || code === 'not_found' || code === 'stale'
						? code
						: 'unavailable';
				reviewFeedback[id] = { message, error: true };
			}
		} catch {
			reviewFeedback[id] = { message: 'unavailable', error: true };
		} finally {
			window.clearTimeout(timeout);
			pendingReviewId = null;
		}
	};

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

	const handleLifetimeCheckout = async () => {
		if (isCreatingLifetimeCheckout) return;
		isCreatingLifetimeCheckout = true;
		try {
			await startLifetimeCheckout({
				returnPath: page.url.pathname,
				locale: currentLocale,
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
		rememberReviewRevisions(serverSubscriptions);
		const merged = await replaceSubscriptionsFromServer(
			serverSubscriptions as unknown as SubscriptionRecord[],
			{ timeZone: userConfig.current.timeZone }
		);
		subscriptions = merged as SubscriptionView[];
		if (selectedSubscription) {
			selectedSubscription =
				subscriptions.find((sub) => sub.id === selectedSubscription?.id) ?? null;
		}
	};

	const loadCachedSubscriptions = async () => {
		if (!browser) return;
		const cached = await getCachedSubscriptions({ timeZone: userConfig.current.timeZone });
		if (cached.length > 0) {
			subscriptions = cached as SubscriptionView[];
		}
	};

	const runSync = async () => {
		if (!browser || !navigator.onLine) return;
		isSyncing = true;
		syncError = null;
		try {
			const result = await syncPendingSubscriptions(`${base}/subscriptions?/create`, {
				timeZone: userConfig.current.timeZone
			});
			subscriptions = result.subscriptions as SubscriptionView[];
			if (result.synced > 0) await reloadReviewData();
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
		const merged = await addPendingSubscription(payload, { timeZone: userConfig.current.timeZone });
		subscriptions = merged as SubscriptionView[];
	};

	const handleServerResult = async (serverSubscriptions: Subscription[]) => {
		rememberReviewRevisions(serverSubscriptions);
		const merged = await replaceSubscriptionsFromServer(
			serverSubscriptions as unknown as SubscriptionRecord[],
			{ timeZone: userConfig.current.timeZone }
		);
		subscriptions = merged as SubscriptionView[];
		if (selectedSubscription) {
			const updated = merged.find((sub) => sub.id === selectedSubscription?.id);
			selectedSubscription = (updated as SubscriptionView | undefined) ?? null;
		}
		await reloadReviewData();
	};

	const handleManagementItemsChange = (items: {
		categories: Category[];
		paymentMethods: PaymentMethod[];
	}) => {
		categories = items.categories;
		paymentMethods = items.paymentMethods;
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

	const handleImportResult = async (result: {
		subscriptions?: Subscription[];
		categories?: Category[];
		paymentMethods?: PaymentMethod[];
	}) => {
		if (result.subscriptions) {
			await handleServerResult(result.subscriptions);
		}
		if (result.categories && result.paymentMethods) {
			handleManagementItemsChange({
				categories: result.categories,
				paymentMethods: result.paymentMethods
			});
		}
		pushPromptKey += 1;
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
		const checkoutResult = new URL(window.location.href).searchParams.get('checkout');
		if (checkoutResult === 'success' || checkoutResult === 'cancel') {
			if (checkoutResult === 'success') {
				toast.success(checkoutCopy.success);
				void invalidateAll();
			} else {
				toast.message(checkoutCopy.cancel);
			}
			const cleanUrl = new URL(window.location.href);
			cleanUrl.searchParams.delete('checkout');
			window.history.replaceState(
				null,
				'',
				`${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`
			);
		}
		void loadCachedSubscriptions();
		if (navigator.onLine) {
			void applyServerSubscriptions(data.subscriptions);
			void runSync();
		}

		const handleOnline = () => {
			isOnline = true;
			void runSync();
			void refreshReviews();
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
		const loadedReviews = data.reviewStates ?? {};
		untrack(() => {
			reviewStates = mergeReviewStates(reviewStates, loadedReviews);
		});
		const serverSubscriptions = data.subscriptions;
		untrack(() => rememberReviewRevisions(serverSubscriptions));
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
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						<Button size="sm" variant="outline">
							<FileSpreadsheet class="size-4" />
							{csvCopy.menu}
							<ChevronDown class="size-4" />
						</Button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-56">
						<DropdownMenu.Item>
							{#snippet child({ props })}
								<a href={resolve('/subscriptions/export')} download {...props}>
									<Download class="size-4" />
									{csvCopy.export}
								</a>
							{/snippet}
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => (csvImportOpen = true)}>
							<FileUp class="size-4" />
							{csvCopy.import}
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<DropdownMenu.Item>
							{#snippet child({ props })}
								<a href={resolve('/subscriptions/import-template')} download {...props}>
									<FileDown class="size-4" />
									{csvCopy.template}
								</a>
							{/snippet}
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{:else}
				<Button size="sm" variant="outline" href={upgradePlanHref}>
					{csvCopy.upgrade}
				</Button>
			{/if}
			{#if filteredSubscriptions.length > 0}
				<Button onclick={() => (addSubscriptionOpen = true)}
					>{m.subscription_page_add_button()}</Button
				>
			{/if}
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

	<section
		class="bg-card space-y-4 rounded-2xl border p-4 sm:p-5"
		aria-labelledby="review-list-title"
		data-testid="subscription-review-list"
		data-window={sevenDayReviews.length > 0 || !showThirtyDayReviews ? '7' : '30'}
	>
		<div class="space-y-1">
			<h2 id="review-list-title" class="text-lg font-semibold">{reviewCopy.title}</h2>
			<p class="text-muted-foreground text-sm">{reviewCopy.description}</p>
		</div>
		{#if !isOnline}
			<p class="text-muted-foreground text-sm">{reviewCopy.offline}</p>
		{/if}
		{#if unavailableReviewCount > 0 || reviewLoadFailed}
			<p class="text-muted-foreground text-sm">{reviewCopy.unavailableList}</p>
			<Button
				variant="outline"
				disabled={!isOnline || refreshingReviews || pendingReviewId !== null}
				onclick={refreshReviews}
				data-testid="review-list-refresh">{reviewCopy.refresh}</Button
			>
		{/if}
		{#if sevenDayReviews.length === 0}
			{#if unavailableReviewCount === 0 && !reviewLoadFailed}<p class="text-sm">
					{reviewCopy.emptySeven}
				</p>{/if}
			<Button
				variant="outline"
				class="min-h-11 whitespace-normal"
				onclick={() => (showThirtyDayReviews = !showThirtyDayReviews)}
				aria-expanded={showThirtyDayReviews}
				aria-controls="review-thirty-days"
				data-testid="review-show-30"
			>
				{showThirtyDayReviews ? reviewCopy.hideThirty : reviewCopy.showThirty}
			</Button>
			{#if showThirtyDayReviews}
				<div id="review-thirty-days" class="space-y-2">
					<h3 class="text-sm font-medium">{reviewCopy.thirtyTitle}</h3>
					{#if upcomingReviews.length === 0 && unavailableReviewCount === 0 && !reviewLoadFailed}<p
							class="text-muted-foreground text-sm"
						>
							{reviewCopy.emptyThirty}
						</p>{/if}
				</div>
			{/if}
		{/if}
		{#if visibleReviewRows.length > 0}
			<ul class="divide-y rounded-lg border">
				{#each visibleReviewRows as sub (sub.id)}
					<li>
						<button
							type="button"
							class="hover:bg-muted/50 focus-visible:ring-ring flex min-h-16 w-full items-center gap-3 rounded-lg p-3 text-left focus-visible:ring-2 focus-visible:outline-none"
							onclick={() => openDetail(sub)}
							data-testid={`review-open-${sub.id}`}
						>
							<SubscriptionIcon
								iconType={sub.iconType}
								iconValue={sub.iconValue}
								subscriptionId={sub.id}
								class="size-7 shrink-0"
							/>
							<span class="min-w-0 flex-1 space-y-1">
								<span class="block truncate text-sm font-medium">{sub.serviceName}</span>
								<time datetime={sub.nextBillingAt} class="text-muted-foreground block text-xs"
									>{formatBillingDate(sub.nextBillingAt)}</time
								>
							</span>
							<span class="shrink-0 text-right text-sm font-medium"
								>{formatCurrency(sub.amount, sub.currency, currentLocale)}</span
							>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	{#if filteredSubscriptions.length === 0}
		<div class="text-muted-foreground flex flex-col gap-4 rounded-lg border border-dashed p-6">
			{#if canceledSubscriptions.length > 0}
				<p>{m.subscription_active_empty_state()}</p>
				<div>
					<Button onclick={() => (addSubscriptionOpen = true)}>
						<Plus class="size-4" />
						{m.subscription_page_add_button()}
					</Button>
				</div>
			{:else}
				<div class="space-y-1">
					<p class="text-foreground font-medium">{m.subscription_empty_state()}</p>
					<p class="max-w-2xl text-sm">{m.subscription_empty_description()}</p>
				</div>
				<div class="flex flex-wrap gap-2">
					<Button onclick={() => (addSubscriptionOpen = true)}>
						<Plus class="size-4" />
						{m.subscription_page_add_button()}
					</Button>
					<Button href={demoHref} variant="outline">
						<Play class="size-4" />
						{m.subscription_empty_demo_button()}
					</Button>
				</div>
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
										{#if getCategoryName(sub.categoryId)}
											<Badge variant="secondary" class="text-[10px]">
												{getCategoryName(sub.categoryId)}
											</Badge>
										{/if}
										{#if getPaymentMethodName(sub.paymentMethodId)}
											<Badge variant="outline" class="text-[10px]">
												{getPaymentMethodName(sub.paymentMethodId)}
											</Badge>
										{/if}
										{#if currentReview(sub)?.decision}
											<Badge variant="outline" class="text-[10px]"
												>{currentReview(sub)?.decision === 'keep'
													? reviewCopy.kept
													: reviewCopy.reviewing}</Badge
											>
										{/if}
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
									{formatCurrency(sub.amount, sub.currency, currentLocale)}
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
												{#if getCategoryName(sub.categoryId)}
													<Badge variant="secondary" class="text-[10px]">
														{getCategoryName(sub.categoryId)}
													</Badge>
												{/if}
												{#if getPaymentMethodName(sub.paymentMethodId)}
													<Badge variant="outline" class="text-[10px]">
														{getPaymentMethodName(sub.paymentMethodId)}
													</Badge>
												{/if}
											</CardDescription>
										</div>
									</div>
									<div class="text-right">
										<div class="text-base font-semibold">
											{formatCurrency(sub.amount, sub.currency, currentLocale)}
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
							</CardContent>
						</Card>
					{/each}
				</div>
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
				subscription={selectedSubscriptionDetail}
				locale={currentLocale}
				canMutate={canMutateSelected}
				reviewState={selectedReview}
				reviewOnline={isOnline}
				reviewPending={pendingReviewId === Number(selectedSubscription.id)}
				reviewBlocked={pendingReviewId !== null}
				reviewRefreshing={refreshingReviews}
				reviewFeedback={selectedReviewFeedback}
				onReview={saveReview}
				onReviewRefresh={refreshReviews}
				onEdit={openEdit}
				onCancel={openCancel}
				onReactivate={openReactivate}
				onDelete={openDelete}
			/>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={editOpen}>
	<Dialog.Content
		class="flex h-[min(92dvh,calc(100dvh-1rem))] w-full max-w-[calc(100vw-1rem)] flex-col overflow-hidden p-0 sm:max-w-2xl lg:max-w-3xl"
	>
		<Dialog.Header class="shrink-0 space-y-1 border-b px-4 py-4 pr-12 sm:px-6">
			<Dialog.Title class="text-2xl font-bold">{m.subscription_edit_title()}</Dialog.Title>
			<Dialog.Description class="text-muted-foreground text-sm">
				{m.subscription_edit_description()}
			</Dialog.Description>
		</Dialog.Header>
		<div class="min-h-0 flex-1 overflow-hidden">
			{#key selectedSubscription?.id}
				<EditSubscription
					subscription={selectedSubscription}
					{categories}
					{paymentMethods}
					{isPremium}
					{isOnline}
					onServerResult={handleUpdateResult}
					onClose={closeEdit}
					onManagementItemsChange={handleManagementItemsChange}
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
	<Dialog.Content
		class="max-h-[90vh] w-full max-w-[calc(100vw-1rem)] overflow-x-hidden overflow-y-auto p-0 sm:max-w-2xl lg:max-w-3xl"
	>
		<AddSubscription
			{data}
			open={addSubscriptionOpen}
			{categories}
			{paymentMethods}
			{isPremium}
			{isOnline}
			onClose={() => (addSubscriptionOpen = false)}
			onOfflineSubmit={handleOfflineSubmit}
			onServerResult={handleCreateResult}
			onManagementItemsChange={handleManagementItemsChange}
		/>
	</Dialog.Content>
</Dialog.Root>

<SubscriptionCsvImportDialog bind:open={csvImportOpen} onImported={handleImportResult} />
