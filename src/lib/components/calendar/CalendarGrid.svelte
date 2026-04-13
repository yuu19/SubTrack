<script lang="ts">
	import dayjs from 'dayjs';
	import { formatMonthDay, getWeekdayLabels } from '$lib/locale';
	import { m } from '$lib/paraglide/messages.js';
	import type { Dayjs } from 'dayjs';
	import { getSubscriptionColorStyle, type SubscriptionColor } from '$lib/subscription-colors';

	let {
		currentDate,
		locale,
		events,
		onDateClick,
		onEventClick,
		onPrevMonth = () => {},
		onNextMonth = () => {}
	} = $props();

	const weekDays = $derived(getWeekdayLabels(locale));

	const calendarDays = $derived.by(() => {
		const startOfMonth = dayjs(currentDate).startOf('month');
		const endOfMonth = dayjs(currentDate).endOf('month');
		const startDay = startOfMonth.day();
		const daysInMonth = endOfMonth.date();

		const days = [];

		// Previous month days
		const prevMonth = startOfMonth.subtract(1, 'month');
		const prevMonthDays = prevMonth.daysInMonth();
		for (let i = startDay - 1; i >= 0; i--) {
			days.push({
				date: prevMonth.date(prevMonthDays - i),
				isCurrentMonth: false
			});
		}

		// Current month days
		for (let i = 1; i <= daysInMonth; i++) {
			days.push({
				date: startOfMonth.date(i),
				isCurrentMonth: true
			});
		}

		// Next month days
		const nextMonth = endOfMonth.add(1, 'month');
		const remainingDays = 42 - days.length;
		for (let i = 1; i <= remainingDays; i++) {
			days.push({
				date: nextMonth.date(i),
				isCurrentMonth: false
			});
		}

		return days;
	});

	type CalendarEvent = {
		id: string;
		title: string;
		date: string;
		color: SubscriptionColor;
	};

	function getEventsForDate(date: Dayjs): CalendarEvent[] {
		const dateStr = date.format('YYYY-MM-DD');
		return events.filter((event: CalendarEvent) => event.date === dateStr);
	}

	function isToday(date: Dayjs) {
		return date.isSame(dayjs(), 'day');
	}

	function formatDate(date: Dayjs) {
		return date.date();
	}

	const addEventAriaLabel = (date: Dayjs) =>
		m.calendar_grid_open_payments({ date: formatMonthDay(date.toDate?.() ?? date, locale) });

	const eventAriaLabel = (title: string) => m.calendar_grid_event_label({ title });

	const moreEventsLabel = (count: number) => m.calendar_grid_more_events({ count });

	let touchStartX = 0;
	let touchStartY = 0;
	let hasTouch = false;
	const swipeThreshold = 40;

	function handleTouchStart(event: TouchEvent) {
		const touch = event.touches[0];
		if (!touch) return;
		touchStartX = touch.clientX;
		touchStartY = touch.clientY;
		hasTouch = true;
	}

	function handleTouchEnd(event: TouchEvent) {
		if (!hasTouch) return;
		hasTouch = false;
		const touch = event.changedTouches[0];
		if (!touch) return;
		const deltaX = touch.clientX - touchStartX;
		const deltaY = touch.clientY - touchStartY;
		if (Math.abs(deltaX) < swipeThreshold || Math.abs(deltaX) < Math.abs(deltaY)) {
			return;
		}
		if (deltaX > 0) {
			onPrevMonth();
		} else {
			onNextMonth();
		}
	}

	function handleTouchCancel() {
		hasTouch = false;
	}
</script>

<div
	class="flex flex-1 flex-col"
	role="presentation"
	ontouchstart={handleTouchStart}
	ontouchend={handleTouchEnd}
	ontouchcancel={handleTouchCancel}
>
	<!-- Week day headers -->
	<div class="border-border grid grid-cols-7 border-b">
		{#each weekDays as day, index (day)}
			<div
				class="py-3 text-center text-sm font-medium {index === 0
					? 'text-red-500'
					: index === 6
						? 'text-blue-500'
						: 'text-muted-foreground'}"
			>
				{day}
			</div>
		{/each}
	</div>

	<!-- Calendar grid -->
	<div class="grid flex-1 grid-cols-7 grid-rows-6">
		{#each calendarDays as { date, isCurrentMonth }, index (date.format('YYYY-MM-DD'))}
			{@const dayEvents = getEventsForDate(dayjs(date))}
			{@const isSunday = dayjs(date).day() === 0}
			{@const isSaturday = dayjs(date).day() === 6}
			<div
				role="gridcell"
				class="border-border hover:bg-muted/50 min-h-24 cursor-pointer border-r border-b p-1 text-left transition-colors {!isCurrentMonth
					? 'bg-muted/30'
					: ''} {index % 7 === 0 ? 'border-l-0' : ''}"
			>
				<div class="flex h-full flex-col">
					<button
						type="button"
						onclick={() => onDateClick(dayjs(date))}
						class="hover:bg-muted inline-flex h-7 w-7 items-center justify-center rounded-full text-sm transition-colors
              {isToday(dayjs(date))
							? 'bg-primary text-primary-foreground hover:bg-primary/90 font-semibold'
							: ''}
              {!isCurrentMonth
							? 'text-muted-foreground'
							: isSunday
								? 'text-red-500'
								: isSaturday
									? 'text-blue-500'
									: 'text-foreground'}"
						aria-label={addEventAriaLabel(dayjs(date))}
					>
						{formatDate(dayjs(date))}
					</button>

					<div class="mt-1 flex-1 space-y-0.5 overflow-hidden">
						{#each dayEvents.slice(0, 3) as event (event.id)}
							<button
								type="button"
								onclick={() => onEventClick(event)}
								class="text-primary-foreground w-full truncate rounded px-1.5 py-0.5 text-left text-xs transition-opacity hover:opacity-80"
								style:background-color={getSubscriptionColorStyle(event.color)}
								aria-label={eventAriaLabel(event.title)}
							>
								{event.title}
							</button>
						{/each}
						{#if dayEvents.length > 3}
							<button
								type="button"
								onclick={() => onDateClick(dayjs(date))}
								class="text-muted-foreground hover:text-foreground px-1 text-xs transition-colors"
							>
								{moreEventsLabel(dayEvents.length - 3)}
							</button>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
