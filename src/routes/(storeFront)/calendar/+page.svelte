<script lang="ts">
	import dayjs from 'dayjs';
	import CalendarHeader from '$lib/components/calendar/CalendarHeader.svelte';
	import CalendarGrid from '$lib/components/calendar/CalendarGrid.svelte';
	import EventDetailModal from '$lib/components/calendar/EventDetailModal.svelte';
	import EditSubscription from '$lib/components/modals/EditSubscription.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Dialog from '$lib/components/ui/dialog';
	import { resolveLocale } from '$lib/locale';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime';
	import type { trackedSubscriptionTable } from '$lib/server/db/schema';
	import {
		getFallbackSubscriptionColor,
		resolveSubscriptionColor,
		type SubscriptionColor
	} from '$lib/subscription-colors';
	import { enhance as kitEnhance } from '$app/forms';
	import { base } from '$app/paths';
	import { fromAction } from 'svelte/attachments';
	import { toast } from 'svelte-sonner';

	type Subscription = typeof trackedSubscriptionTable.$inferSelect;
	const cycleToMonths: Record<string, number> = {
		monthly: 1,
		quarterly: 3,
		yearly: 12
	};

	type CalendarEvent = {
		id: string;
		subscriptionId: number;
		title: string;
		date: string;
		amount: number;
		currency: string;
		color: SubscriptionColor;
		iconType: string | null;
		iconValue: string | null;
		description?: string | null;
	};

	let { data } = $props<{ data: { subscriptions: Subscription[] } }>();

	function getInitialSubscriptions() {
		return data.subscriptions ?? [];
	}

	let subscriptions = $state<Subscription[]>(getInitialSubscriptions());
	const locale = $derived(resolveLocale(getLocale()));
	const subscriptionsUpdateAction = $derived(`${base}/subscriptions?/update`);
	const subscriptionsDeleteAction = $derived(`${base}/subscriptions?/delete`);

	const getGridRange = (date: dayjs.Dayjs) => {
		const startOfMonth = date.startOf('month');
		const startDay = startOfMonth.day();
		const gridStart = startOfMonth.subtract(startDay, 'day').startOf('day');
		const gridEnd = gridStart.add(41, 'day').startOf('day');
		return { gridStart, gridEnd };
	};

	const buildEventsForRange = (
		subscriptions: Subscription[],
		rangeStart: dayjs.Dayjs,
		rangeEnd: dayjs.Dayjs
	): CalendarEvent[] => {
		const events: CalendarEvent[] = [];
		subscriptions.forEach((sub, index) => {
			const first = dayjs(sub.firstPaymentDate).startOf('day');
			if (!first.isValid()) return;
			const interval = cycleToMonths[sub.cycle] ?? 1;
			if (interval <= 0) return;

			let occurrence = first;
			if (occurrence.isBefore(rangeStart, 'day')) {
				const diffMonths = rangeStart.diff(occurrence, 'month');
				const steps = Math.floor(diffMonths / interval);
				occurrence = occurrence.add(steps * interval, 'month');
				while (occurrence.isBefore(rangeStart, 'day')) {
					occurrence = occurrence.add(interval, 'month');
				}
			}

			const color = resolveSubscriptionColor(sub.color, getFallbackSubscriptionColor(index));
			while (occurrence.isSame(rangeEnd, 'day') || occurrence.isBefore(rangeEnd, 'day')) {
				events.push({
					id: `sub-${sub.id}-${occurrence.format('YYYY-MM-DD')}`,
					subscriptionId: sub.id,
					title: sub.serviceName,
					date: occurrence.format('YYYY-MM-DD'),
					amount: Number(sub.amount ?? 0),
					currency: sub.currency ?? 'JPY',
					color,
					iconType: sub.iconType,
					iconValue: sub.iconValue,
					description: sub.tags?.length ? sub.tags.join(' / ') : ''
				});
				occurrence = occurrence.add(interval, 'month');
			}
		});
		return events;
	};

	let currentDate = $state(dayjs());

	const events = $derived.by(() => {
		const { gridStart, gridEnd } = getGridRange(currentDate);
		return buildEventsForRange(subscriptions, gridStart, gridEnd).sort(
			(a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)
		);
	});

	let isDetailModalOpen = $state(false);
	let editOpen = $state(false);
	let deleteOpen = $state(false);
	let selectedDate = $state<string | null>(null);
	let selectedSubscription = $state<Subscription | null>(null);
	const canMutateSelected = $derived(Boolean(selectedSubscription));

	const selectedEvents = $derived.by(() =>
		selectedDate ? events.filter((event) => event.date === selectedDate) : []
	);

	function goToPrevMonth() {
		currentDate = currentDate.subtract(1, 'month');
	}

	function goToNextMonth() {
		currentDate = currentDate.add(1, 'month');
	}

	function goToToday() {
		currentDate = dayjs();
	}

	function handleDateClick(date: dayjs.Dayjs) {
		selectedDate = dayjs(date).format('YYYY-MM-DD');
		selectedSubscription = null;
		isDetailModalOpen = true;
	}

	function handleEventClick(event: CalendarEvent) {
		selectedDate = event.date;
		selectedSubscription = null;
		isDetailModalOpen = true;
	}

	function handleCalendarEventSelect(event: { subscriptionId: number }) {
		selectedSubscription =
			subscriptions.find((subscription) => subscription.id === event.subscriptionId) ?? null;
	}

	function backToDateList() {
		selectedSubscription = null;
	}

	function closeDetailModal() {
		isDetailModalOpen = false;
		selectedDate = null;
		selectedSubscription = null;
	}

	function openEdit() {
		if (!selectedSubscription) return;
		isDetailModalOpen = false;
		editOpen = true;
	}

	function openDelete() {
		if (!selectedSubscription) return;
		isDetailModalOpen = false;
		deleteOpen = true;
	}

	function closeEdit() {
		editOpen = false;
		if (selectedSubscription && selectedDate) {
			isDetailModalOpen = true;
		}
	}

	function applyServerSubscriptions(serverSubscriptions: Subscription[]) {
		const selectedId = selectedSubscription?.id;
		const activeSubscriptions = serverSubscriptions.filter(
			(subscription) => (subscription.status ?? 'active') !== 'canceled'
		);
		subscriptions = activeSubscriptions;
		if (selectedId !== undefined) {
			selectedSubscription =
				activeSubscriptions.find((subscription) => subscription.id === selectedId) ?? null;
		}
	}

	const handleUpdateResult = async (serverSubscriptions: Subscription[]) => {
		applyServerSubscriptions(serverSubscriptions);
		toast.success(m.subscription_updated_toast());
	};

	const deleteEnhance = () => {
		return async ({ result }: { result: { type: string; data?: unknown } }) => {
			if (result.type !== 'success') return;
			const resultData = result.data as { subscriptions?: Subscription[] };
			if (resultData?.subscriptions) {
				applyServerSubscriptions(resultData.subscriptions);
			}
			toast.success(m.subscription_deleted_toast());
			deleteOpen = false;
			selectedSubscription = null;
			if (selectedDate) {
				isDetailModalOpen = true;
			}
		};
	};
</script>

<div class="bg-background flex h-screen flex-col">
	<CalendarHeader
		{currentDate}
		{locale}
		onPrevMonth={goToPrevMonth}
		onNextMonth={goToNextMonth}
		onToday={goToToday}
	/>

	<CalendarGrid
		{currentDate}
		{locale}
		{events}
		onDateClick={handleDateClick}
		onEventClick={handleEventClick}
		onPrevMonth={goToPrevMonth}
		onNextMonth={goToNextMonth}
	/>

	<EventDetailModal
		isOpen={isDetailModalOpen}
		{locale}
		date={selectedDate}
		events={selectedEvents}
		{selectedSubscription}
		{canMutateSelected}
		onClose={closeDetailModal}
		onBackToList={backToDateList}
		onEventSelect={handleCalendarEventSelect}
		onEdit={openEdit}
		onDelete={openDelete}
	/>
</div>

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
					action={subscriptionsUpdateAction}
					onServerResult={handleUpdateResult}
					onClose={closeEdit}
				/>
			{/key}
		</div>
	</Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={deleteOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{m.subscription_delete_title()}</AlertDialog.Title>
			<AlertDialog.Description>
				{m.subscription_delete_description()}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<form
			method="post"
			action={subscriptionsDeleteAction}
			{@attach fromAction(kitEnhance, () => deleteEnhance)}
		>
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
