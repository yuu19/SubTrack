<script>
  import dayjs from 'dayjs';
  
  let { currentDate, events, onDateClick, onEventClick } = $props();
  
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
  
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
  
  function getEventsForDate(date) {
    const dateStr = date.format('YYYY-MM-DD');
    return events.filter(event => event.date === dateStr);
  }
  
  function isToday(date) {
    return date.isSame(dayjs(), 'day');
  }
  
  function formatDate(date) {
    return date.date();
  }
  
  const eventColors = {
    blue: 'color-mix(in oklch, var(--primary) 90%, var(--background) 10%)',
    green: 'color-mix(in oklch, var(--primary) 85%, var(--background) 15%)',
    red: 'color-mix(in oklch, var(--primary) 80%, var(--background) 20%)',
    yellow: 'color-mix(in oklch, var(--primary) 75%, var(--background) 25%)',
    purple: 'color-mix(in oklch, var(--primary) 70%, var(--background) 30%)',
    orange: 'color-mix(in oklch, var(--primary) 65%, var(--background) 35%)'
  };
</script>

<div class="flex-1 flex flex-col">
  <!-- Week day headers -->
  <div class="grid grid-cols-7 border-b border-border">
    {#each weekDays as day, index (day)}
      <div 
        class="py-3 text-center text-sm font-medium {index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-muted-foreground'}"
      >
        {day}
      </div>
    {/each}
  </div>
  
  <!-- Calendar grid -->
  <div class="flex-1 grid grid-cols-7 grid-rows-6">
    {#each calendarDays as { date, isCurrentMonth }, index (date.format('YYYY-MM-DD'))}
      {@const dayEvents = getEventsForDate(dayjs(date))}
      {@const isSunday = dayjs(date).day() === 0}
      {@const isSaturday = dayjs(date).day() === 6}
      <div
        role="gridcell"
        class="min-h-24 p-1 border-b border-r border-border text-left hover:bg-muted/50 transition-colors cursor-pointer {!isCurrentMonth ? 'bg-muted/30' : ''} {index % 7 === 0 ? 'border-l-0' : ''}"
      >
        <div class="flex flex-col h-full">
          <button
            type="button"
            onclick={() => onDateClick(dayjs(date))}
            class="inline-flex items-center justify-center w-7 h-7 text-sm rounded-full hover:bg-muted transition-colors
              {isToday(dayjs(date)) ? 'bg-primary text-primary-foreground font-semibold hover:bg-primary/90' : ''}
              {!isCurrentMonth ? 'text-muted-foreground' : isSunday ? 'text-red-500' : isSaturday ? 'text-blue-500' : 'text-foreground'}"
            aria-label={`${dayjs(date).format('M月D日')}に予定を追加`}
          >
            {formatDate(dayjs(date))}
          </button>
          
          <div class="flex-1 mt-1 space-y-0.5 overflow-hidden">
            {#each dayEvents.slice(0, 3) as event (event.id)}
              <button
                type="button"
                onclick={() => onEventClick(event)}
                class="w-full px-1.5 py-0.5 text-xs text-primary-foreground rounded truncate text-left hover:opacity-80 transition-opacity"
                style:background-color={eventColors[event.color] || eventColors.blue}
                aria-label={`予定: ${event.title}`}
              >
                {event.title}
              </button>
            {/each}
            {#if dayEvents.length > 3}
              <button
                type="button"
                onclick={() => onDateClick(dayjs(date))}
                class="text-xs text-muted-foreground px-1 hover:text-foreground transition-colors"
              >
                +{dayEvents.length - 3}件
              </button>
            {/if}
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>
