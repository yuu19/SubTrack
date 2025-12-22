<script>
  import dayjs from 'dayjs';

  let { currentDate, onPrevMonth, onNextMonth, onToday } = $props();
  
  const displayDate = $derived(dayjs(currentDate).format('YYYY年 M月'));
</script>

<header class="flex items-center justify-between px-6 py-4 border-b border-border">
  <div class="flex items-center gap-4">
    <h1 class="text-2xl font-semibold text-foreground">
      {displayDate}
    </h1>
  </div>
  
  <div class="flex items-center gap-2">
    <button
      onclick={onToday}
      class="px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-muted rounded-lg transition-colors"
    >
      今日
    </button>
    <div class="flex items-center gap-1">
      <button
        onclick={onPrevMonth}
        class="p-2 hover:bg-muted rounded-lg transition-colors"
        aria-label="前の月"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>
      <button
        onclick={onNextMonth}
        class="p-2 hover:bg-muted rounded-lg transition-colors"
        aria-label="次の月"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </button>
    </div>
  </div>
</header>
