<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import type { AppLocale } from '$lib/constant';
	import type {
		DemoPageCopy,
		DemoSubscriptionCycle,
		DemoSubscriptionSample
	} from '$lib/content/site-content';
	import { formatCurrencyYen, formatNotifyDays } from '$lib/locale';
	import { cn } from '$lib/utils';
	import {
		Bell,
		CalendarDays,
		ChartPie,
		Check,
		CircleDollarSign,
		CreditCard,
		LayoutDashboard,
		List,
		Plus,
		RotateCcw,
		WalletCards
	} from 'lucide-svelte';

	type DemoTab = keyof DemoPageCopy['tabs'];
	type DemoSubscription = DemoSubscriptionSample;
	type AnalyticsPeriod = DemoSubscriptionCycle;

	type Props = {
		copy: DemoPageCopy;
		locale: AppLocale;
	};

	const tabOrder: DemoTab[] = [
		'dashboard',
		'subscriptions',
		'calendar',
		'analytics',
		'notifications'
	];
	const tabIcons = {
		dashboard: LayoutDashboard,
		subscriptions: List,
		calendar: CalendarDays,
		analytics: ChartPie,
		notifications: Bell
	};
	const calendarDays = Array.from({ length: 30 }, (_, index) => index + 1);

	let { copy, locale }: Props = $props();

	const cloneSubscriptions = (items: DemoSubscription[]) => items.map((item) => ({ ...item }));
	const getInitialSubscriptions = () => cloneSubscriptions(copy.samples.initialSubscriptions);
	const getInitialSelectedId = () => copy.samples.initialSubscriptions[0]?.id ?? '';

	let activeTab = $state<DemoTab>('dashboard');
	let subscriptions = $state<DemoSubscription[]>(getInitialSubscriptions());
	let selectedSubscriptionId = $state(getInitialSelectedId());
	let selectedCalendarId = $state(getInitialSelectedId());
	let acknowledgedNotificationIds = $state<string[]>([]);
	let snoozedNotificationIds = $state<string[]>([]);
	let analyticsPeriod = $state<AnalyticsPeriod>('monthly');
	let interactionMessage = $state('');

	const addCandidate = $derived(copy.samples.addCandidate);
	const hasAddCandidate = $derived(
		subscriptions.some((subscription) => subscription.id === addCandidate.id)
	);
	const sortedSubscriptions = $derived(
		[...subscriptions].sort((a, b) => a.calendarDay - b.calendarDay)
	);
	const selectedSubscription = $derived(
		subscriptions.find((subscription) => subscription.id === selectedSubscriptionId) ??
			sortedSubscriptions[0] ??
			null
	);
	const selectedCalendarSubscription = $derived(
		subscriptions.find((subscription) => subscription.id === selectedCalendarId) ??
			sortedSubscriptions[0] ??
			null
	);
	const upcomingSubscriptions = $derived(sortedSubscriptions.slice(0, 4));
	const notificationSubscriptions = $derived(sortedSubscriptions.slice(0, 3));
	const monthlyTotal = $derived(calculateTotal(subscriptions, 'monthly'));
	const yearlyTotal = $derived(calculateTotal(subscriptions, 'yearly'));
	const analyticsTotal = $derived(calculateTotal(subscriptions, analyticsPeriod));
	const categoryBreakdown = $derived.by(() => {
		const totals = new Map<string, { category: string; amount: number; color: string }>();

		for (const subscription of subscriptions) {
			const amount = normalizeAmount(subscription, analyticsPeriod);
			const existing = totals.get(subscription.category);

			if (existing) {
				existing.amount += amount;
				continue;
			}

			totals.set(subscription.category, {
				category: subscription.category,
				amount,
				color: subscription.color
			});
		}

		return Array.from(totals.values())
			.sort((a, b) => b.amount - a.amount)
			.map((item) => ({
				...item,
				share: analyticsTotal > 0 ? item.amount / analyticsTotal : 0
			}));
	});

	function normalizeAmount(subscription: DemoSubscription, period: AnalyticsPeriod) {
		if (period === 'monthly') {
			return subscription.cycle === 'yearly'
				? Math.round(subscription.amount / 12)
				: subscription.amount;
		}

		return subscription.cycle === 'yearly' ? subscription.amount : subscription.amount * 12;
	}

	function calculateTotal(items: DemoSubscription[], period: AnalyticsPeriod) {
		return items.reduce((total, subscription) => total + normalizeAmount(subscription, period), 0);
	}

	function formatAmount(amount: number) {
		return formatCurrencyYen(amount, locale);
	}

	function formatNotificationLeadTime(days: number) {
		return formatNotifyDays(days, locale);
	}

	function getSubscriptionsForDay(day: number) {
		return sortedSubscriptions.filter((subscription) => subscription.calendarDay === day);
	}

	function getNotificationStatus(subscriptionId: string) {
		if (acknowledgedNotificationIds.includes(subscriptionId)) {
			return copy.notifications.statusAcknowledged;
		}

		if (snoozedNotificationIds.includes(subscriptionId)) {
			return copy.notifications.statusSnoozed;
		}

		return copy.notifications.statusPending;
	}

	function getNotificationStatusClass(subscriptionId: string) {
		if (acknowledgedNotificationIds.includes(subscriptionId)) {
			return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
		}

		if (snoozedNotificationIds.includes(subscriptionId)) {
			return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300';
		}

		return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
	}

	function handleAddSubscription() {
		activeTab = 'subscriptions';

		if (hasAddCandidate) {
			selectedSubscriptionId = addCandidate.id;
			return;
		}

		subscriptions = [...subscriptions, { ...addCandidate }];
		selectedSubscriptionId = addCandidate.id;
		selectedCalendarId = addCandidate.id;
		interactionMessage = copy.operations.addedMessage;
	}

	function handleReset() {
		const initialSubscriptions = cloneSubscriptions(copy.samples.initialSubscriptions);
		subscriptions = initialSubscriptions;
		selectedSubscriptionId = initialSubscriptions[0]?.id ?? '';
		selectedCalendarId = initialSubscriptions[0]?.id ?? '';
		acknowledgedNotificationIds = [];
		snoozedNotificationIds = [];
		analyticsPeriod = 'monthly';
		activeTab = 'dashboard';
		interactionMessage = copy.operations.resetMessage;
	}

	function handleSelectSubscription(subscription: DemoSubscription) {
		selectedSubscriptionId = subscription.id;
	}

	function handleSelectCalendarEvent(subscription: DemoSubscription) {
		selectedCalendarId = subscription.id;
		interactionMessage = copy.operations.selectedEventMessage;
	}

	function handleToggleNotification(subscription: DemoSubscription) {
		if (acknowledgedNotificationIds.includes(subscription.id)) {
			acknowledgedNotificationIds = acknowledgedNotificationIds.filter(
				(id) => id !== subscription.id
			);
			snoozedNotificationIds = [...new Set([...snoozedNotificationIds, subscription.id])];
			interactionMessage = copy.operations.renotifiedMessage;
			return;
		}

		acknowledgedNotificationIds = [...new Set([...acknowledgedNotificationIds, subscription.id])];
		snoozedNotificationIds = snoozedNotificationIds.filter((id) => id !== subscription.id);
		interactionMessage = copy.operations.acknowledgedMessage;
	}
</script>

<section class="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-10">
	<div class="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
		<div
			role="tablist"
			aria-label={copy.badge}
			class="bg-background grid h-auto grid-cols-2 gap-2 rounded-lg border p-2 sm:grid-cols-5 lg:sticky lg:top-36 lg:grid-cols-1 lg:self-start"
		>
			{#each tabOrder as tab (tab)}
				{@const Icon = tabIcons[tab]}
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === tab}
					class={cn(
						'inline-flex h-11 min-w-0 items-center justify-start gap-1.5 rounded-md border border-transparent px-3 text-xs font-medium transition-colors focus-visible:ring-[3px] focus-visible:outline-1 sm:text-sm lg:justify-start',
						activeTab === tab
							? 'bg-background text-foreground shadow-sm'
							: 'text-muted-foreground hover:bg-muted hover:text-foreground'
					)}
					onclick={() => (activeTab = tab)}
				>
					<Icon class="size-4" />
					<span class="truncate">{copy.tabs[tab]}</span>
				</button>
			{/each}
		</div>

		<div class="min-w-0">
			{#if interactionMessage}
				<div
					class="border-primary/25 bg-primary/10 text-primary mb-4 rounded-lg border px-4 py-3 text-sm font-medium"
					aria-live="polite"
				>
					{interactionMessage}
				</div>
			{/if}

			{#if activeTab === 'dashboard'}
				<div class="mt-0">
					<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
						<div class="grid min-w-0 gap-4 md:grid-cols-3">
							<article class="demo-motion bg-background rounded-lg border p-5 shadow-sm">
								<div class="text-muted-foreground flex items-center gap-2">
									<WalletCards class="size-4" />
									<span class="text-sm font-medium">{copy.common.monthlyTotal}</span>
								</div>
								<p class="mt-3 text-3xl font-semibold tracking-tight">
									{formatAmount(monthlyTotal)}
								</p>
								<p class="text-muted-foreground mt-2 text-sm">{copy.dashboard.overviewTitle}</p>
							</article>

							<article class="demo-motion bg-background rounded-lg border p-5 shadow-sm">
								<div class="text-muted-foreground flex items-center gap-2">
									<CircleDollarSign class="size-4" />
									<span class="text-sm font-medium">{copy.common.yearlyTotal}</span>
								</div>
								<p class="mt-3 text-3xl font-semibold tracking-tight">
									{formatAmount(yearlyTotal)}
								</p>
								<p class="text-muted-foreground mt-2 text-sm">{copy.common.activeSubscriptions}</p>
							</article>

							<article class="demo-motion bg-background rounded-lg border p-5 shadow-sm">
								<div class="text-muted-foreground flex items-center gap-2">
									<CreditCard class="size-4" />
									<span class="text-sm font-medium">{copy.common.nextBilling}</span>
								</div>
								{#if upcomingSubscriptions[0]}
									<p class="mt-3 truncate text-xl font-semibold">
										{upcomingSubscriptions[0].serviceName}
									</p>
									<p class="text-muted-foreground mt-2 text-sm">
										{upcomingSubscriptions[0].nextBillingLabel} / {formatAmount(
											upcomingSubscriptions[0].amount
										)}
									</p>
								{/if}
							</article>
						</div>

						<aside class="bg-background rounded-lg border p-5 shadow-sm">
							<div class="flex items-start justify-between gap-3">
								<div>
									<h2 class="text-lg font-semibold">{copy.dashboard.quickActionsTitle}</h2>
									<p class="text-muted-foreground mt-1 text-sm">{copy.dashboard.description}</p>
								</div>
								<span
									class="bg-primary/10 text-primary inline-flex size-9 shrink-0 items-center justify-center rounded-md"
								>
									<LayoutDashboard class="size-5" />
								</span>
							</div>

							<div class="mt-5 grid gap-2">
								<Button type="button" class="justify-start" onclick={handleAddSubscription}>
									<Plus class="size-4" />
									{copy.dashboard.addAction}
								</Button>
								<Button
									type="button"
									variant="outline"
									class="justify-start"
									onclick={() => (activeTab = 'calendar')}
								>
									<CalendarDays class="size-4" />
									{copy.dashboard.calendarAction}
								</Button>
								<Button
									type="button"
									variant="outline"
									class="justify-start"
									onclick={() => (activeTab = 'notifications')}
								>
									<Bell class="size-4" />
									{copy.dashboard.notificationAction}
								</Button>
							</div>
						</aside>
					</div>

					<div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
						<section class="bg-background rounded-lg border p-5 shadow-sm">
							<div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
								<div>
									<p class="text-primary text-sm font-medium">{copy.dashboard.title}</p>
									<h2 class="mt-1 text-2xl font-semibold">{copy.dashboard.upcomingTitle}</h2>
								</div>
								<p class="text-muted-foreground text-sm">
									{subscriptions.length}
									{copy.common.activeSubscriptions}
								</p>
							</div>

							<div class="mt-5 grid gap-3">
								{#each upcomingSubscriptions as subscription (subscription.id)}
									<button
										type="button"
										class={cn(
											'demo-motion flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left',
											selectedSubscription?.id === subscription.id && 'border-primary bg-primary/5'
										)}
										onclick={() => handleSelectSubscription(subscription)}
									>
										<span
											class="size-3 shrink-0 rounded-full"
											style:background-color={subscription.color}
										></span>
										<span class="min-w-0 flex-1">
											<span class="block truncate font-medium">{subscription.serviceName}</span>
											<span class="text-muted-foreground block truncate text-sm">
												{subscription.nextBillingLabel} / {copy.cycleLabels[subscription.cycle]}
											</span>
										</span>
										<span class="shrink-0 text-sm font-semibold">
											{formatAmount(normalizeAmount(subscription, 'monthly'))}
										</span>
									</button>
								{/each}
							</div>
						</section>

						<section class="bg-background rounded-lg border p-5 shadow-sm">
							<h2 class="text-lg font-semibold">{copy.common.nextBilling}</h2>
							{#if selectedSubscription}
								<div class="mt-4 space-y-4">
									<div class="flex items-center gap-3">
										<span
											class="size-4 rounded-full"
											style:background-color={selectedSubscription.color}
										></span>
										<div class="min-w-0">
											<p class="truncate text-xl font-semibold">
												{selectedSubscription.serviceName}
											</p>
											<p class="text-muted-foreground text-sm">{selectedSubscription.note}</p>
										</div>
									</div>
									<div class="grid grid-cols-2 gap-3 text-sm">
										<div class="bg-muted/30 rounded-lg border p-3">
											<p class="text-muted-foreground">{copy.common.nextBilling}</p>
											<p class="mt-1 font-semibold">{selectedSubscription.nextBillingLabel}</p>
										</div>
										<div class="bg-muted/30 rounded-lg border p-3">
											<p class="text-muted-foreground">{copy.common.notification}</p>
											<p class="mt-1 font-semibold">
												{formatNotificationLeadTime(selectedSubscription.notifyDaysBefore)}
											</p>
										</div>
									</div>
								</div>
							{/if}
						</section>
					</div>
				</div>
			{/if}

			{#if activeTab === 'subscriptions'}
				<div class="mt-0">
					<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
						<section class="bg-background rounded-lg border p-5 shadow-sm">
							<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
								<div>
									<p class="text-primary text-sm font-medium">{copy.subscriptions.title}</p>
									<h2 class="mt-1 text-2xl font-semibold">{copy.subscriptions.tableTitle}</h2>
									<p class="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
										{copy.subscriptions.description}
									</p>
								</div>
								<Button type="button" variant="outline" onclick={handleReset}>
									<RotateCcw class="size-4" />
									{copy.subscriptions.resetAction}
								</Button>
							</div>

							<div class="mt-5 grid gap-3">
								{#each sortedSubscriptions as subscription (subscription.id)}
									<button
										type="button"
										class={cn(
											'demo-motion grid min-w-0 gap-3 rounded-lg border p-4 text-left md:grid-cols-[minmax(0,1fr)_120px_120px]',
											selectedSubscription?.id === subscription.id && 'border-primary bg-primary/5'
										)}
										onclick={() => handleSelectSubscription(subscription)}
									>
										<span class="flex min-w-0 items-center gap-3">
											<span
												class="size-3 shrink-0 rounded-full"
												style:background-color={subscription.color}
											></span>
											<span class="min-w-0">
												<span class="block truncate font-semibold">{subscription.serviceName}</span>
												<span class="text-muted-foreground block truncate text-sm">
													{subscription.category} / {subscription.note}
												</span>
											</span>
										</span>
										<span>
											<span class="text-muted-foreground block text-xs font-medium">
												{copy.common.amount}
											</span>
											<span class="block font-semibold">{formatAmount(subscription.amount)}</span>
										</span>
										<span>
											<span class="text-muted-foreground block text-xs font-medium">
												{copy.common.cycle}
											</span>
											<span class="block font-semibold">{copy.cycleLabels[subscription.cycle]}</span
											>
										</span>
									</button>
								{/each}
							</div>
						</section>

						<aside class="bg-background rounded-lg border p-5 shadow-sm">
							<div class="flex items-start gap-3">
								<span
									class="bg-primary/10 text-primary inline-flex size-10 shrink-0 items-center justify-center rounded-md"
								>
									<Plus class="size-5" />
								</span>
								<div>
									<h2 class="text-lg font-semibold">{copy.subscriptions.addTitle}</h2>
									<p class="text-muted-foreground mt-1 text-sm leading-6">
										{copy.subscriptions.addDescription}
									</p>
								</div>
							</div>

							<div class="bg-muted/30 mt-5 rounded-lg border p-4">
								<div class="flex items-center gap-3">
									<span class="size-3 rounded-full" style:background-color={addCandidate.color}
									></span>
									<div class="min-w-0">
										<p class="truncate font-semibold">{addCandidate.serviceName}</p>
										<p class="text-muted-foreground text-sm">{addCandidate.category}</p>
									</div>
								</div>
								<div class="mt-4 grid grid-cols-2 gap-3 text-sm">
									<div>
										<p class="text-muted-foreground">{copy.common.amount}</p>
										<p class="font-semibold">{formatAmount(addCandidate.amount)}</p>
									</div>
									<div>
										<p class="text-muted-foreground">{copy.common.nextBilling}</p>
										<p class="font-semibold">{addCandidate.nextBillingLabel}</p>
									</div>
								</div>
							</div>

							<Button
								type="button"
								class="mt-4 w-full"
								onclick={handleAddSubscription}
								disabled={hasAddCandidate}
							>
								<Plus class="size-4" />
								{hasAddCandidate ? copy.subscriptions.addedAction : copy.subscriptions.addAction}
							</Button>
						</aside>
					</div>
				</div>
			{/if}

			{#if activeTab === 'calendar'}
				<div class="mt-0">
					<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
						<section class="bg-background rounded-lg border p-5 shadow-sm">
							<div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
								<div>
									<p class="text-primary text-sm font-medium">{copy.calendar.title}</p>
									<h2 class="mt-1 text-2xl font-semibold">{copy.calendar.monthLabel}</h2>
									<p class="text-muted-foreground mt-2 text-sm leading-6">
										{copy.calendar.description}
									</p>
								</div>
							</div>

							<div
								class="text-muted-foreground mt-5 grid grid-cols-7 gap-1 text-center text-xs font-medium"
							>
								{#each copy.calendar.weekdays as weekday (weekday)}
									<div class="py-2">{weekday}</div>
								{/each}
							</div>

							<div class="grid grid-cols-7 gap-1">
								{#each calendarDays as day (day)}
									{@const events = getSubscriptionsForDay(day)}
									<button
										type="button"
										class={cn(
											'demo-motion flex aspect-square min-h-14 min-w-0 flex-col items-start justify-between rounded-md border p-1.5 text-left text-xs',
											events.length > 0
												? 'bg-background hover:border-primary'
												: 'bg-muted/30 text-muted-foreground',
											selectedCalendarSubscription?.calendarDay === day &&
												'border-primary bg-primary/5'
										)}
										disabled={events.length === 0}
										onclick={() => events[0] && handleSelectCalendarEvent(events[0])}
										aria-label={events[0]?.serviceName ?? copy.calendar.emptyDay}
									>
										<span class="font-semibold">{day}</span>
										{#if events[0]}
											<span class="flex w-full min-w-0 items-center gap-1">
												<span
													class="size-1.5 shrink-0 rounded-full"
													style:background-color={events[0].color}
												></span>
												<span class="truncate">{events[0].serviceName}</span>
											</span>
										{/if}
									</button>
								{/each}
							</div>
						</section>

						<aside class="bg-background rounded-lg border p-5 shadow-sm">
							<h2 class="text-lg font-semibold">{copy.calendar.selectedTitle}</h2>
							{#if selectedCalendarSubscription}
								<div class="mt-5 space-y-4">
									<div class="flex items-center gap-3">
										<span
											class="size-4 rounded-full"
											style:background-color={selectedCalendarSubscription.color}
										></span>
										<div class="min-w-0">
											<p class="truncate text-xl font-semibold">
												{selectedCalendarSubscription.serviceName}
											</p>
											<p class="text-muted-foreground text-sm">
												{selectedCalendarSubscription.nextBillingLabel}
											</p>
										</div>
									</div>
									<div class="bg-muted/30 rounded-lg border p-4">
										<p class="text-muted-foreground text-sm">{copy.common.amount}</p>
										<p class="mt-1 text-2xl font-semibold">
											{formatAmount(selectedCalendarSubscription.amount)}
										</p>
										<p class="text-muted-foreground mt-2 text-sm">
											{selectedCalendarSubscription.note}
										</p>
									</div>
								</div>
							{/if}
						</aside>
					</div>
				</div>
			{/if}

			{#if activeTab === 'analytics'}
				<div class="mt-0">
					<section class="bg-background rounded-lg border p-5 shadow-sm">
						<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
							<div>
								<p class="text-primary text-sm font-medium">{copy.analytics.title}</p>
								<h2 class="mt-1 text-2xl font-semibold">{copy.analytics.breakdownTitle}</h2>
								<p class="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
									{copy.analytics.description}
								</p>
							</div>
							<div
								class="bg-muted/30 grid grid-cols-2 rounded-lg border p-1"
								aria-label={copy.analytics.title}
							>
								{#each ['monthly', 'yearly'] as AnalyticsPeriod[] as period (period)}
									<button
										type="button"
										class={cn(
											'rounded-md px-4 py-2 text-sm font-medium transition-colors',
											analyticsPeriod === period
												? 'bg-background text-foreground shadow-sm'
												: 'text-muted-foreground hover:text-foreground'
										)}
										aria-pressed={analyticsPeriod === period}
										onclick={() => (analyticsPeriod = period)}
									>
										{copy.analytics[period]}
									</button>
								{/each}
							</div>
						</div>

						<div class="mt-6 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
							<div class="bg-muted/20 rounded-lg border p-5">
								<div
									class="border-primary/20 flex aspect-square items-center justify-center rounded-full border-[18px]"
								>
									<div class="text-center">
										<p class="text-muted-foreground text-sm">{copy.analytics.totalLabel}</p>
										<p class="mt-1 text-2xl font-semibold">{formatAmount(analyticsTotal)}</p>
									</div>
								</div>
							</div>

							<div class="grid content-start gap-3">
								{#each categoryBreakdown as item (item.category)}
									<div class="rounded-lg border p-4">
										<div class="flex items-center justify-between gap-3">
											<div class="flex min-w-0 items-center gap-3">
												<span
													class="size-3 shrink-0 rounded-full"
													style:background-color={item.color}
												></span>
												<div class="min-w-0">
													<p class="truncate font-semibold">{item.category}</p>
													<p class="text-muted-foreground text-sm">{formatAmount(item.amount)}</p>
												</div>
											</div>
											<p class="text-sm font-semibold">{Math.round(item.share * 100)}%</p>
										</div>
										<div class="bg-muted mt-3 h-2 overflow-hidden rounded-full">
											<div
												class="h-full rounded-full"
												style={`width: ${Math.max(4, Math.round(item.share * 100))}%; background-color: ${item.color};`}
											></div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</section>
				</div>
			{/if}

			{#if activeTab === 'notifications'}
				<div class="mt-0">
					<section class="bg-background rounded-lg border p-5 shadow-sm">
						<div>
							<p class="text-primary text-sm font-medium">{copy.notifications.title}</p>
							<h2 class="mt-1 text-2xl font-semibold">{copy.common.notification}</h2>
							<p class="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
								{copy.notifications.description}
							</p>
						</div>

						<div class="mt-5 grid gap-3 lg:grid-cols-3">
							{#each notificationSubscriptions as subscription (subscription.id)}
								<article class="bg-muted/20 rounded-lg border p-4">
									<div class="flex items-start justify-between gap-3">
										<div class="flex min-w-0 items-center gap-3">
											<span
												class="bg-background text-primary inline-flex size-9 shrink-0 items-center justify-center rounded-md"
											>
												<Bell class="size-4" />
											</span>
											<div class="min-w-0">
												<h3 class="truncate font-semibold">{subscription.serviceName}</h3>
												<p class="text-muted-foreground text-sm">
													{subscription.nextBillingLabel} / {formatNotificationLeadTime(
														subscription.notifyDaysBefore
													)}
												</p>
											</div>
										</div>
										<span
											class={cn(
												'rounded-md border px-2 py-1 text-xs font-medium',
												getNotificationStatusClass(subscription.id)
											)}
										>
											{getNotificationStatus(subscription.id)}
										</span>
									</div>

									<p class="text-muted-foreground mt-4 text-sm leading-6">{subscription.note}</p>

									<Button
										type="button"
										class="mt-4 w-full"
										variant={acknowledgedNotificationIds.includes(subscription.id)
											? 'outline'
											: 'default'}
										onclick={() => handleToggleNotification(subscription)}
									>
										{#if acknowledgedNotificationIds.includes(subscription.id)}
											<RotateCcw class="size-4" />
											{copy.notifications.resendAction}
										{:else}
											<Check class="size-4" />
											{copy.notifications.confirmAction}
										{/if}
									</Button>
								</article>
							{/each}
						</div>
					</section>
				</div>
			{/if}
		</div>
	</div>
</section>

<style>
	.demo-motion {
		transition:
			transform 180ms ease,
			border-color 180ms ease,
			background-color 180ms ease,
			box-shadow 180ms ease;
	}

	button.demo-motion:not(:disabled):hover,
	.demo-motion:hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 28px color-mix(in oklab, var(--foreground) 6%, transparent);
	}

	@media (prefers-reduced-motion: reduce) {
		.demo-motion {
			transition: none;
		}

		button.demo-motion:not(:disabled):hover,
		.demo-motion:hover {
			transform: none;
			box-shadow: none;
		}
	}
</style>
