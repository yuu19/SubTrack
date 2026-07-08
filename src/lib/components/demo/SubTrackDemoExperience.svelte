<script lang="ts">
	import dayjs from 'dayjs';
	import type { Dayjs } from 'dayjs';
	import DonutChart from '$lib/components/analytics/DonutChart.svelte';
	import CalendarGrid from '$lib/components/calendar/CalendarGrid.svelte';
	import CalendarHeader from '$lib/components/calendar/CalendarHeader.svelte';
	import EventDetailModal from '$lib/components/calendar/EventDetailModal.svelte';
	import SubscriptionDetailPanel from '$lib/components/subscriptions/SubscriptionDetailPanel.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import Button from '$lib/components/ui/button/button.svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import Input from '$lib/components/ui/input/input.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import type { AppLocale, SubscriptionCurrency } from '$lib/constant';
	import type {
		DemoPageCopy,
		DemoSubscriptionCycle,
		DemoSubscriptionSample
	} from '$lib/content/site-content';
	import {
		formatCurrency,
		formatLongDate,
		formatNotifyDays,
		getCycleLabel,
		getCycleUnitLabel
	} from '$lib/locale';
	import {
		getFallbackSubscriptionColor,
		getSubscriptionColorLabel,
		getSubscriptionColorStyle,
		getSubscriptionColorSurfaceStyle,
		resolveSubscriptionColor,
		subscriptionColors,
		type SubscriptionColor
	} from '$lib/subscription-colors';
	import { cn } from '$lib/utils';
	import { untrack } from 'svelte';
	import {
		Bell,
		CalendarDays,
		CreditCard,
		ListPlus,
		PieChart,
		Plus,
		RotateCcw
	} from 'lucide-svelte';

	type DemoTab = keyof DemoPageCopy['tabs'];
	type AnalyticsPeriod = 'monthly' | 'yearly';
	type DemoSubscription = DemoSubscriptionSample;

	type DemoCalendarEvent = {
		id: string;
		subscriptionId: number;
		title: string;
		date: string;
		amount: number;
		currency: SubscriptionCurrency;
		color: SubscriptionColor;
		description?: string | null;
	};

	type AddFormState = {
		serviceName: string;
		color: SubscriptionColor;
		cycle: DemoSubscriptionCycle;
		notifyDaysBefore: number;
		amount: number;
		currency: SubscriptionCurrency;
		firstPaymentDate: string;
	};

	type AnalyticsItem = {
		serviceName: string;
		color: SubscriptionColor;
		amount: number;
		share: number;
		subscriptionCount: number;
	};

	type AnalyticsSummary = {
		total: number;
		items: AnalyticsItem[];
		subscriptionCount: number;
	};

	type Props = {
		copy: DemoPageCopy;
		locale: AppLocale;
	};

	const tabOrder: DemoTab[] = ['subscriptions', 'calendar', 'analytics'];
	const tabIcons = {
		subscriptions: CreditCard,
		calendar: CalendarDays,
		analytics: PieChart
	};
	const demoToday = dayjs('2026-06-13');
	const cycleToMonths: Record<string, number> = {
		monthly: 1,
		quarterly: 3,
		yearly: 12
	};
	const cycleDayMap: Record<string, number> = {
		monthly: 30,
		quarterly: 90,
		yearly: 365
	};

	let { copy, locale }: Props = $props();

	const cloneSubscription = (item: DemoSubscription): DemoSubscription => ({
		...item
	});
	const cloneSubscriptions = (items: DemoSubscription[]) => items.map(cloneSubscription);
	const getInitialSubscriptions = () => cloneSubscriptions(copy.samples.initialSubscriptions);
	const getInitialSelectedId = () => copy.samples.initialSubscriptions[0]?.id ?? null;
	const getNextDemoId = () =>
		Math.max(
			0,
			...copy.samples.initialSubscriptions.map((subscription) => subscription.id),
			copy.samples.addCandidate.id
		) + 1;

	const createAddForm = (subscription: DemoSubscription): AddFormState => ({
		serviceName: subscription.serviceName,
		color: resolveSubscriptionColor(subscription.color),
		cycle: subscription.cycle,
		notifyDaysBefore: subscription.notifyDaysBefore,
		amount: subscription.amount,
		currency: subscription.currency,
		firstPaymentDate: subscription.firstPaymentDate
	});

	let activeTab = $state<DemoTab>('subscriptions');
	let subscriptions = $state<DemoSubscription[]>(untrack(getInitialSubscriptions));
	let selectedSubscriptionId = $state<number | null>(untrack(getInitialSelectedId));
	let currentDate = $state(demoToday.startOf('month'));
	let selectedDate = $state<string | null>(null);
	let selectedCalendarSubscriptionId = $state<number | null>(null);
	let isCalendarDetailOpen = $state(false);
	let detailOpen = $state(false);
	let addOpen = $state(false);
	let analyticsPeriod = $state<AnalyticsPeriod>('monthly');
	let pushSubscribed = $state(false);
	let interactionMessage = $state('');
	let addForm = $state<AddFormState>(untrack(() => createAddForm(copy.samples.addCandidate)));
	let nextDemoId = $state(untrack(getNextDemoId));

	const colorOptions = $derived(
		subscriptionColors.map((value) => ({
			value,
			label: getSubscriptionColorLabel(value, locale),
			style: getSubscriptionColorStyle(value),
			surface: getSubscriptionColorSurfaceStyle(value)
		}))
	);
	const sortedSubscriptions = $derived(
		[...subscriptions].sort(
			(a, b) =>
				a.nextBillingAt.localeCompare(b.nextBillingAt) || a.serviceName.localeCompare(b.serviceName)
		)
	);
	const selectedSubscription = $derived(
		subscriptions.find((subscription) => subscription.id === selectedSubscriptionId) ?? null
	);
	const demoCurrency = $derived(copy.samples.addCandidate.currency);
	const monthlyTotal = $derived(calculateTotal(subscriptions, 'monthly'));
	const yearlyTotal = $derived(calculateTotal(subscriptions, 'yearly'));
	const calendarEvents = $derived.by(() => {
		const { gridStart, gridEnd } = getGridRange(currentDate);
		return buildEventsForRange(subscriptions, gridStart, gridEnd).sort(
			(a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)
		);
	});
	const selectedEvents = $derived.by(() =>
		selectedDate ? calendarEvents.filter((event) => event.date === selectedDate) : []
	);
	const selectedCalendarSubscription = $derived(
		subscriptions.find((subscription) => subscription.id === selectedCalendarSubscriptionId) ?? null
	);
	const analyticsSummary = $derived(buildAnalyticsSummary(subscriptions, analyticsPeriod));
	const topAnalyticsItem = $derived(analyticsSummary.items[0] ?? null);
	const chartSegments = $derived(
		analyticsSummary.items.map((item) => ({
			label: item.serviceName,
			value: item.amount,
			color: getSubscriptionColorStyle(item.color)
		}))
	);
	const activeViewTitle = $derived(copy.tabs[activeTab]);

	function roundDemoAmount(amount: number, currency: SubscriptionCurrency) {
		const factor = currency === 'JPY' ? 1 : 100;
		return Math.round((amount + Number.EPSILON) * factor) / factor;
	}

	function normalizeAmount(subscription: DemoSubscription, period: AnalyticsPeriod) {
		if (!Number.isFinite(subscription.amount) || subscription.amount <= 0) return 0;

		if (period === 'monthly') {
			if (subscription.cycle === 'yearly') {
				return roundDemoAmount(subscription.amount / 12, subscription.currency);
			}
			if (subscription.cycle === 'quarterly') {
				return roundDemoAmount(subscription.amount / 3, subscription.currency);
			}
			return roundDemoAmount(subscription.amount, subscription.currency);
		}

		if (subscription.cycle === 'yearly') return roundDemoAmount(subscription.amount, subscription.currency);
		if (subscription.cycle === 'quarterly') {
			return roundDemoAmount(subscription.amount * 4, subscription.currency);
		}
		return roundDemoAmount(subscription.amount * 12, subscription.currency);
	}

	function calculateTotal(items: DemoSubscription[], period: AnalyticsPeriod) {
		return roundDemoAmount(
			items.reduce((total, subscription) => total + normalizeAmount(subscription, period), 0),
			demoCurrency
		);
	}

	function buildAnalyticsSummary(
		items: DemoSubscription[],
		period: AnalyticsPeriod
	): AnalyticsSummary {
		const grouped = new Map<
			string,
			{ amount: number; color: SubscriptionColor; subscriptionCount: number }
		>();

		for (const subscription of items) {
			const serviceName = subscription.serviceName.trim() || 'Unknown';
			const amount = normalizeAmount(subscription, period);
			if (amount <= 0) continue;

			const existing = grouped.get(serviceName);
			grouped.set(serviceName, {
				amount: (existing?.amount ?? 0) + amount,
				color: existing?.color ?? resolveSubscriptionColor(subscription.color),
				subscriptionCount: (existing?.subscriptionCount ?? 0) + 1
			});
		}

		const total = roundDemoAmount(
			Array.from(grouped.values()).reduce((sum, item) => sum + item.amount, 0),
			demoCurrency
		);
		const analyticsItems = Array.from(grouped.entries())
			.map(([serviceName, item]) => ({
				serviceName,
				color: item.color,
				amount: item.amount,
				subscriptionCount: item.subscriptionCount,
				share: total > 0 ? item.amount / total : 0
			}))
			.sort((a, b) => b.amount - a.amount || a.serviceName.localeCompare(b.serviceName));

		return {
			total,
			items: analyticsItems,
			subscriptionCount: items.length
		};
	}

	function formatAmount(amount: number, currency: SubscriptionCurrency = demoCurrency) {
		return formatCurrency(amount, currency, locale);
	}

	function formatBillingDate(value?: string | null) {
		return formatLongDate(value, locale);
	}

	function getCycleProgress(subscription: DemoSubscription) {
		const total = cycleDayMap[subscription.cycle] ?? 0;
		if (!total) return 1;
		const daysLeft = Number(subscription.daysUntilNextBilling ?? 0);
		if (!Number.isFinite(daysLeft)) return 1;
		const elapsed = Math.max(0, total - daysLeft);
		return Math.min(1, elapsed / total);
	}

	function getGridRange(date: Dayjs) {
		const startOfMonth = date.startOf('month');
		const startDay = startOfMonth.day();
		const gridStart = startOfMonth.subtract(startDay, 'day').startOf('day');
		const gridEnd = gridStart.add(41, 'day').startOf('day');
		return { gridStart, gridEnd };
	}

	function buildEventsForRange(
		items: DemoSubscription[],
		rangeStart: Dayjs,
		rangeEnd: Dayjs
	): DemoCalendarEvent[] {
		const events: DemoCalendarEvent[] = [];

		items.forEach((subscription, index) => {
			const first = dayjs(subscription.firstPaymentDate).startOf('day');
			if (!first.isValid()) return;

			const interval = cycleToMonths[subscription.cycle] ?? 1;
			let occurrence = first;

			if (occurrence.isBefore(rangeStart, 'day')) {
				const diffMonths = rangeStart.diff(occurrence, 'month');
				const steps = Math.floor(diffMonths / interval);
				occurrence = occurrence.add(steps * interval, 'month');
				while (occurrence.isBefore(rangeStart, 'day')) {
					occurrence = occurrence.add(interval, 'month');
				}
			}

			const color = resolveSubscriptionColor(
				subscription.color,
				getFallbackSubscriptionColor(index)
			);

			while (occurrence.isSame(rangeEnd, 'day') || occurrence.isBefore(rangeEnd, 'day')) {
				events.push({
					id: `demo-${subscription.id}-${occurrence.format('YYYY-MM-DD')}`,
					subscriptionId: subscription.id,
					title: subscription.serviceName,
					date: occurrence.format('YYYY-MM-DD'),
					amount: Number(subscription.amount ?? 0),
					currency: subscription.currency,
					color,
					description: ''
				});
				occurrence = occurrence.add(interval, 'month');
			}
		});

		return events;
	}

	function createSubscriptionFromForm(): DemoSubscription {
		const firstPayment = dayjs(addForm.firstPaymentDate).isValid()
			? dayjs(addForm.firstPaymentDate).format('YYYY-MM-DD')
			: copy.samples.addCandidate.firstPaymentDate;
		const nextBilling = calculateNextBilling(firstPayment, addForm.cycle);
		return {
			id: nextDemoId++,
			userId: null,
			serviceName: addForm.serviceName.trim() || copy.samples.addCandidate.serviceName,
			color: addForm.color,
			cycle: addForm.cycle,
			amount: roundDemoAmount(Math.max(0, Number(addForm.amount) || 0), addForm.currency),
			currency: addForm.currency,
			firstPaymentDate: firstPayment,
			nextBillingAt: nextBilling.format('YYYY-MM-DD'),
			daysUntilNextBilling: Math.max(0, nextBilling.diff(demoToday, 'day')),
			notifyDaysBefore: Number(addForm.notifyDaysBefore) || 3,
			isSample: true,
			note: copy.samples.addCandidate.note
		};
	}

	function calculateNextBilling(firstPaymentDate: string, cycle: DemoSubscriptionCycle) {
		const interval = cycleToMonths[cycle] ?? 1;
		let nextBilling = dayjs(firstPaymentDate).startOf('day');

		while (nextBilling.isBefore(demoToday, 'day')) {
			nextBilling = nextBilling.add(interval, 'month');
		}

		return nextBilling;
	}

	function handleAddSubmit(event: SubmitEvent) {
		event.preventDefault();
		const nextSubscription = createSubscriptionFromForm();
		subscriptions = [...subscriptions, nextSubscription];
		selectedSubscriptionId = nextSubscription.id;
		addOpen = false;
		interactionMessage = copy.operations.addedMessage;
		setActiveTab('subscriptions');
	}

	function handleReset() {
		const initialSubscriptions = getInitialSubscriptions();
		subscriptions = initialSubscriptions;
		selectedSubscriptionId = initialSubscriptions[0]?.id ?? null;
		selectedDate = null;
		selectedCalendarSubscriptionId = null;
		isCalendarDetailOpen = false;
		detailOpen = false;
		analyticsPeriod = 'monthly';
		pushSubscribed = false;
		addForm = createAddForm(copy.samples.addCandidate);
		nextDemoId = getNextDemoId();
		setActiveTab('subscriptions');
		interactionMessage = copy.operations.resetMessage;
		currentDate = demoToday.startOf('month');
	}

	function setActiveTab(tab: DemoTab) {
		activeTab = tab;
		scrollToTop();
	}

	function scrollToTop() {
		if (typeof window === 'undefined') return;
		window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
	}

	function handleSelectSubscription(subscription: DemoSubscription) {
		selectedSubscriptionId = subscription.id;
		detailOpen = true;
	}

	function handleTogglePush() {
		pushSubscribed = !pushSubscribed;
		interactionMessage = pushSubscribed
			? copy.operations.pushEnabledMessage
			: copy.operations.pushDisabledMessage;
	}

	function handleBlockedEdit() {
		detailOpen = false;
		isCalendarDetailOpen = false;
		interactionMessage = copy.operations.editBlockedMessage;
	}

	function handleBlockedDelete() {
		detailOpen = false;
		isCalendarDetailOpen = false;
		interactionMessage = copy.operations.deleteBlockedMessage;
	}

	function goToPrevMonth() {
		currentDate = currentDate.subtract(1, 'month');
	}

	function goToNextMonth() {
		currentDate = currentDate.add(1, 'month');
	}

	function goToDemoToday() {
		currentDate = demoToday;
	}

	function handleDateClick(date: Dayjs) {
		selectedDate = dayjs(date).format('YYYY-MM-DD');
		selectedCalendarSubscriptionId = null;
		isCalendarDetailOpen = true;
	}

	function handleEventClick(event: DemoCalendarEvent) {
		selectedDate = event.date;
		selectedCalendarSubscriptionId = null;
		isCalendarDetailOpen = true;
		interactionMessage = copy.operations.selectedEventMessage;
	}

	function handleCalendarEventSelect(event: DemoCalendarEvent) {
		selectedCalendarSubscriptionId = event.subscriptionId;
	}

	function backToDateList() {
		selectedCalendarSubscriptionId = null;
	}

	function closeCalendarDetail() {
		isCalendarDetailOpen = false;
		selectedDate = null;
		selectedCalendarSubscriptionId = null;
	}
</script>

<section class="bg-background">
	<div class="border-b">
		<div class="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 lg:px-8">
			<div class="min-w-0">
				<p class="text-primary text-sm font-semibold">SubTrack</p>
				<h1 class="truncate text-xl font-semibold">{activeViewTitle}</h1>
			</div>

			<nav class="ml-auto hidden items-center gap-1 md:flex" aria-label={copy.badge}>
				{#each tabOrder as tab (tab)}
					{@const Icon = tabIcons[tab]}
					<button
						type="button"
						class={cn(
							'text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
							activeTab === tab && 'bg-muted text-foreground'
						)}
						aria-current={activeTab === tab ? 'page' : undefined}
						onclick={() => setActiveTab(tab)}
					>
						<Icon class="size-4" />
						{copy.tabs[tab]}
					</button>
				{/each}
			</nav>
		</div>
	</div>

	<div
		class="mx-auto max-w-7xl px-4 py-6 pb-[calc(env(safe-area-inset-bottom)+6rem)] md:pb-8 lg:px-8"
	>
		{#if interactionMessage}
			<div
				class="border-primary/25 bg-primary/10 text-primary mb-4 rounded-lg border px-4 py-3 text-sm font-medium"
				aria-live="polite"
			>
				{interactionMessage}
			</div>
		{/if}

		{#if activeTab === 'subscriptions'}
			<div class="flex flex-col gap-6">
				<header class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div class="space-y-2">
						<div class="text-primary inline-flex items-center gap-2 text-sm font-medium">
							<CreditCard class="size-4" />
							<span>{copy.subscriptions.title}</span>
						</div>
						<div class="space-y-2">
							<h2 class="text-3xl font-bold tracking-tight">{copy.subscriptions.tableTitle}</h2>
							<p class="text-muted-foreground max-w-2xl leading-7">
								{copy.subscriptions.description}
							</p>
						</div>
					</div>

					<div class="flex flex-wrap items-center gap-2">
						<Button type="button" size="sm" variant="outline" onclick={handleTogglePush}>
							<Bell class="size-4" />
							{pushSubscribed ? copy.subscriptions.pushDisable : copy.subscriptions.pushEnable}
						</Button>
						<Button type="button" size="sm" variant="outline" onclick={handleReset}>
							<RotateCcw class="size-4" />
							{copy.subscriptions.resetAction}
						</Button>
						<Button type="button" size="sm" onclick={() => (addOpen = true)}>
							<Plus class="size-4" />
							{copy.subscriptions.addAction}
						</Button>
					</div>
				</header>

				<div class="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
					<Badge variant={pushSubscribed ? 'default' : 'secondary'}>
						{pushSubscribed ? copy.subscriptions.pushEnabled : copy.subscriptions.pushDisabled}
					</Badge>
					<span>{copy.subscriptions.pushHint}</span>
				</div>

				<div class="grid gap-4 md:grid-cols-3">
					<div class="rounded-lg border p-4">
						<p class="text-muted-foreground text-sm">{copy.common.monthlyTotal}</p>
						<p class="mt-2 text-2xl font-semibold">{formatAmount(monthlyTotal)}</p>
					</div>
					<div class="rounded-lg border p-4">
						<p class="text-muted-foreground text-sm">{copy.common.yearlyTotal}</p>
						<p class="mt-2 text-2xl font-semibold">{formatAmount(yearlyTotal)}</p>
					</div>
					<div class="rounded-lg border p-4">
						<p class="text-muted-foreground text-sm">{copy.common.activeSubscriptions}</p>
						<p class="mt-2 text-2xl font-semibold">{subscriptions.length}</p>
					</div>
				</div>

				<div class="flex flex-col gap-4">
					{#each sortedSubscriptions as sub (sub.id)}
						<Card
							class="cursor-pointer overflow-hidden"
							role="button"
							tabindex={0}
							onkeydown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault();
									handleSelectSubscription(sub);
								}
							}}
							onclick={() => handleSelectSubscription(sub)}
						>
							<CardHeader class="pb-3">
								<div class="flex items-start justify-between gap-4">
									<div class="min-w-0 space-y-1">
										<CardTitle class="flex min-w-0 items-center gap-2 text-base">
											<span
												class="size-2.5 shrink-0 rounded-full"
												style:background-color={getSubscriptionColorStyle(
													resolveSubscriptionColor(sub.color)
												)}
											></span>
											<span class="truncate">{sub.serviceName}</span>
										</CardTitle>
										<CardDescription class="flex flex-wrap items-center gap-2 text-xs">
											<span>{getCycleLabel(sub.cycle, locale)}</span>
										</CardDescription>
									</div>
									<div class="shrink-0 text-right">
										<div class="text-base font-semibold">
											{formatAmount(sub.amount, sub.currency)}
											<span class="text-muted-foreground text-xs">
												/ {getCycleUnitLabel(sub.cycle, locale)}
											</span>
										</div>
									</div>
								</div>
							</CardHeader>
							<CardContent class="space-y-3 pt-0">
								<div class="flex items-center justify-between gap-3 text-sm">
									<span class="text-muted-foreground truncate">
										{formatBillingDate(sub.nextBillingAt)}
									</span>
									<span class="text-muted-foreground shrink-0">
										{formatNotifyDays(sub.notifyDaysBefore, locale)}
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
			</div>
		{:else if activeTab === 'calendar'}
			<div class="flex flex-col gap-6">
				<header class="space-y-2">
					<div class="text-primary inline-flex items-center gap-2 text-sm font-medium">
						<CalendarDays class="size-4" />
						<span>{copy.calendar.title}</span>
					</div>
					<h2 class="text-3xl font-bold tracking-tight">{copy.calendar.title}</h2>
					<p class="text-muted-foreground max-w-2xl leading-7">{copy.calendar.description}</p>
				</header>

				<div class="bg-background flex min-h-[680px] flex-col overflow-hidden rounded-lg border">
					<CalendarHeader
						{currentDate}
						{locale}
						onPrevMonth={goToPrevMonth}
						onNextMonth={goToNextMonth}
						onToday={goToDemoToday}
					/>
					<CalendarGrid
						{currentDate}
						{locale}
						events={calendarEvents}
						onDateClick={handleDateClick}
						onEventClick={handleEventClick}
						onPrevMonth={goToPrevMonth}
						onNextMonth={goToNextMonth}
					/>
				</div>
			</div>
		{:else}
			<div class="mx-auto flex max-w-5xl flex-col gap-6">
				<header class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div class="space-y-2">
						<div class="text-primary inline-flex items-center gap-2 text-sm font-medium">
							<PieChart class="size-4" />
							<span>{copy.analytics.title}</span>
						</div>
						<div class="space-y-2">
							<h2 class="text-3xl font-bold tracking-tight">{copy.analytics.title}</h2>
							<p class="text-muted-foreground max-w-2xl leading-7">
								{copy.analytics.description}
							</p>
						</div>
					</div>

					{#if topAnalyticsItem}
						<div class="bg-muted/40 hidden min-w-[240px] rounded-lg border p-4 lg:block">
							<p class="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
								{copy.analytics.topServiceLabel}
							</p>
							<p class="text-foreground mt-3 truncate text-lg font-semibold">
								{topAnalyticsItem.serviceName}
							</p>
							<p class="text-primary mt-1 text-sm font-medium">
								{formatAmount(topAnalyticsItem.amount)}
							</p>
						</div>
					{/if}
				</header>

				<div class="bg-muted/30 grid h-11 w-full grid-cols-2 rounded-lg border p-1 sm:w-[18rem]">
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

				<div class="grid gap-6 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
					<section class="bg-background rounded-lg border p-5 shadow-sm sm:p-6">
						<DonutChart
							segments={chartSegments}
							total={analyticsSummary.total}
							totalLabel={copy.analytics.totalLabel}
							totalDisplay={formatAmount(analyticsSummary.total)}
							hint={analyticsPeriod === 'monthly'
								? copy.analytics.periodHintMonthly
								: copy.analytics.periodHintYearly}
						/>

						<div class="mt-6 grid gap-3 sm:grid-cols-2">
							<div class="bg-muted/40 rounded-lg border p-4">
								<p class="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
									{copy.analytics.subscriptionCountLabel}
								</p>
								<p class="mt-2 text-2xl font-semibold">{analyticsSummary.subscriptionCount}</p>
							</div>
							<div class="bg-muted/40 rounded-lg border p-4">
								<p class="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
									{copy.analytics.breakdownCountLabel}
								</p>
								<p class="mt-2 text-2xl font-semibold">{analyticsSummary.items.length}</p>
							</div>
						</div>
					</section>

					<section class="bg-background rounded-lg border p-5 shadow-sm sm:p-6">
						<div class="flex items-center justify-between gap-3 border-b pb-4">
							<div>
								<h2 class="text-xl font-semibold">{copy.analytics.breakdownTitle}</h2>
								<p class="text-muted-foreground mt-1 text-sm">
									{copy.analytics.description}
								</p>
							</div>
							<p class="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
								{copy.analytics.shareLabel}
							</p>
						</div>

						<div class="divide-y">
							{#each analyticsSummary.items as item (item.serviceName)}
								<div class="flex items-center gap-3 py-4">
									<span
										class="size-3 shrink-0 rounded-full"
										style:background-color={getSubscriptionColorStyle(item.color)}
									></span>
									<div class="min-w-0 flex-1">
										<p class="truncate font-medium">{item.serviceName}</p>
										<p class="text-muted-foreground text-sm">{item.subscriptionCount}</p>
									</div>
									<div class="text-right">
										<p class="font-semibold">{formatAmount(item.amount)}</p>
										<p class="text-muted-foreground text-sm">{Math.round(item.share * 100)}%</p>
									</div>
								</div>
							{/each}
						</div>
					</section>
				</div>
			</div>
		{/if}
	</div>
</section>

<nav class="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden" aria-label={copy.badge}>
	<div class="mx-auto w-full max-w-[420px] px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
		<div
			class="bg-background/90 pointer-events-auto flex items-center justify-between rounded-full border px-3 py-2 shadow-lg shadow-black/10 backdrop-blur"
		>
			{#each tabOrder as tab (tab)}
				{@const Icon = tabIcons[tab]}
				<button
					type="button"
					class={cn(
						'flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200',
						activeTab === tab
							? 'bg-primary text-primary-foreground shadow-md shadow-black/20'
							: 'text-muted-foreground hover:text-foreground'
					)}
					aria-current={activeTab === tab ? 'page' : undefined}
					onclick={() => setActiveTab(tab)}
				>
					<Icon class="size-5" />
					<span class="sr-only">{copy.tabs[tab]}</span>
				</button>
			{/each}
		</div>
	</div>
</nav>

<Dialog.Root bind:open={detailOpen}>
	<Dialog.Content class="w-full max-w-md overflow-hidden p-0">
		<div class="flex items-center justify-between border-b px-4 py-3">
			<Dialog.Title class="truncate text-base font-semibold">
				{selectedSubscription?.serviceName ?? copy.subscriptions.title}
			</Dialog.Title>
		</div>
		{#if selectedSubscription}
			<SubscriptionDetailPanel
				subscription={selectedSubscription}
				{locale}
				canMutate
				onEdit={handleBlockedEdit}
				onDelete={handleBlockedDelete}
			/>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={addOpen}>
	<Dialog.Content class="max-h-[90vh] w-full max-w-3xl overflow-y-auto p-0">
		<div class="space-y-6 p-6">
			<div class="space-y-2">
				<Dialog.Title class="text-2xl font-bold">{copy.subscriptions.addTitle}</Dialog.Title>
				<Dialog.Description class="text-muted-foreground text-sm">
					{copy.subscriptions.addDescription}
				</Dialog.Description>
			</div>

			<form class="space-y-4" onsubmit={handleAddSubmit}>
				<div class="space-y-2">
					<label for="demo-service-name" class="font-medium">
						{copy.subscriptions.formServiceName}
					</label>
					<Input
						id="demo-service-name"
						type="text"
						required
						placeholder="Netflix"
						bind:value={addForm.serviceName}
					/>
				</div>

				<div class="space-y-2">
					<p class="font-medium">{copy.subscriptions.formColor}</p>
					<div
						class="flex flex-wrap gap-3"
						role="radiogroup"
						aria-label={copy.subscriptions.formColor}
					>
						{#each colorOptions as option (option.value)}
							<button
								type="button"
								onclick={() => (addForm.color = option.value)}
								class={cn(
									'flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors',
									option.value === addForm.color
										? 'outline-2 outline-offset-2'
										: 'border-border hover:bg-muted/60'
								)}
								style:border-color={option.value === addForm.color ? option.style : undefined}
								style:background-color={option.value === addForm.color ? option.surface : undefined}
								style:outline-color={option.value === addForm.color ? option.style : undefined}
								role="radio"
								aria-checked={option.value === addForm.color}
								aria-label={option.label}
								title={option.label}
							>
								<span
									class="size-4 rounded-full border border-black/10"
									style:background-color={option.style}
								></span>
								<span class:font-semibold={option.value === addForm.color}>{option.label}</span>
							</button>
						{/each}
					</div>
					<p class="text-muted-foreground text-xs">{copy.subscriptions.formColorDescription}</p>
				</div>

				<div class="grid gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<label for="demo-cycle" class="font-medium">{copy.subscriptions.formCycle}</label>
						<select
							id="demo-cycle"
							class="border-input focus-visible:ring-ring focus-visible:border-ring bg-background flex h-10 w-full rounded-md border px-3 text-sm shadow-sm transition"
							bind:value={addForm.cycle}
						>
							{#each ['monthly', 'quarterly', 'yearly'] as DemoSubscriptionCycle[] as cycle (cycle)}
								<option value={cycle}>{copy.cycleLabels[cycle]}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-2">
						<label for="demo-notify" class="font-medium">{copy.subscriptions.formNotify}</label>
						<select
							id="demo-notify"
							class="border-input focus-visible:ring-ring focus-visible:border-ring bg-background flex h-10 w-full rounded-md border px-3 text-sm shadow-sm transition"
							bind:value={addForm.notifyDaysBefore}
						>
							{#each [1, 3, 7] as days (days)}
								<option value={days}>{formatNotifyDays(days, locale)}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="grid gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<label for="demo-amount" class="font-medium">{copy.subscriptions.formAmount}</label>
						<Input
							id="demo-amount"
							type="number"
							min="0"
							step={addForm.currency === 'JPY' ? '1' : '0.01'}
							required
							bind:value={addForm.amount}
						/>
					</div>

					<div class="space-y-2">
						<label for="demo-first-payment" class="font-medium">
							{copy.subscriptions.formFirstPayment}
						</label>
						<Input
							id="demo-first-payment"
							type="date"
							required
							bind:value={addForm.firstPaymentDate}
						/>
					</div>
				</div>

				<Button type="submit" class="h-12 w-full text-base sm:h-10 sm:text-sm">
					<ListPlus class="size-4" />
					{copy.subscriptions.addAction}
				</Button>
			</form>
		</div>
	</Dialog.Content>
</Dialog.Root>

<EventDetailModal
	isOpen={isCalendarDetailOpen}
	{locale}
	date={selectedDate}
	events={selectedEvents}
	selectedSubscription={selectedCalendarSubscription}
	canMutateSelected
	onClose={closeCalendarDetail}
	onBackToList={backToDateList}
	onEventSelect={handleCalendarEventSelect}
	onEdit={handleBlockedEdit}
	onDelete={handleBlockedDelete}
/>
