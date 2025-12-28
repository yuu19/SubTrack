<script lang="ts">
  import dayjs from 'dayjs';
  import 'dayjs/locale/ja';
  import CalendarHeader from '$lib/components/calendar/CalendarHeader.svelte';
  import CalendarGrid from '$lib/components/calendar/CalendarGrid.svelte';
  import EventDetailModal from '$lib/components/calendar/EventDetailModal.svelte';
  import type { trackedSubscriptionTable } from '$lib/server/db/schema';
  
  dayjs.locale('ja');
  
  type Subscription = typeof trackedSubscriptionTable.$inferSelect;
  const colorPalette = ['blue', 'green', 'red', 'yellow', 'purple', 'orange'] as const;
  type EventColor = (typeof colorPalette)[number];
  const cycleToMonths: Record<string, number> = {
    monthly: 1,
    quarterly: 3,
    yearly: 12
  };
  
  type CalendarEvent = {
    id: string;
    title: string;
    date: string;
    amount: number;
    color: EventColor;
    description?: string | null;
  };
  
  let { data } = $props<{ data: { subscriptions: Subscription[] } }>();
  
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
      
      const color = colorPalette[index % colorPalette.length];
      while (occurrence.isSame(rangeEnd, 'day') || occurrence.isBefore(rangeEnd, 'day')) {
        events.push({
          id: `sub-${sub.id}-${occurrence.format('YYYY-MM-DD')}`,
          title: sub.serviceName,
          date: occurrence.format('YYYY-MM-DD'),
          amount: Number(sub.amount ?? 0),
          color,
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
    return buildEventsForRange(data.subscriptions ?? [], gridStart, gridEnd).sort(
      (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)
    );
  });
  
  let isDetailModalOpen = $state(false);
  let selectedDate = $state<string | null>(null);
  
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
  
  function handleDateClick(date) {
    selectedDate = dayjs(date).format('YYYY-MM-DD');
    isDetailModalOpen = true;
  }
  
  function handleEventClick(event: CalendarEvent) {
    selectedDate = event.date;
    isDetailModalOpen = true;
  }
  
  function closeDetailModal() {
    isDetailModalOpen = false;
    selectedDate = null;
  }
</script>

<div class="h-screen flex flex-col bg-background">
  <CalendarHeader 
    {currentDate}
    onPrevMonth={goToPrevMonth}
    onNextMonth={goToNextMonth}
    onToday={goToToday}
  />
  
  <CalendarGrid 
    {currentDate}
    {events}
    onDateClick={handleDateClick}
    onEventClick={handleEventClick}
  />
  
  <EventDetailModal
    isOpen={isDetailModalOpen}
    date={selectedDate}
    events={selectedEvents}
    onClose={closeDetailModal}
  />
</div>
