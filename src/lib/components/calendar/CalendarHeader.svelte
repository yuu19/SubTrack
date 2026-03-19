<script lang="ts">
	import { formatMonthYear } from '$lib/locale';

	let { currentDate, locale, onPrevMonth, onNextMonth, onToday } = $props();

	const displayDate = $derived(formatMonthYear(currentDate.toDate?.() ?? currentDate, locale));
	const todayLabel = $derived(locale === 'en' ? 'Today' : '今日');
	const previousMonthLabel = $derived(locale === 'en' ? 'Previous month' : '前の月');
	const nextMonthLabel = $derived(locale === 'en' ? 'Next month' : '次の月');
</script>

<header class="border-border flex items-center justify-between border-b px-6 py-4">
	<div class="flex items-center gap-4">
		<h1 class="text-foreground text-2xl font-semibold">
			{displayDate}
		</h1>
	</div>

	<div class="flex items-center gap-2">
		<button
			onclick={onToday}
			class="text-foreground bg-secondary hover:bg-muted rounded-lg px-4 py-2 text-sm font-medium transition-colors"
		>
			{todayLabel}
		</button>
		<div class="flex items-center gap-1">
			<button
				onclick={onPrevMonth}
				class="hover:bg-muted rounded-lg p-2 transition-colors"
				aria-label={previousMonthLabel}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="m15 18-6-6 6-6" />
				</svg>
			</button>
			<button
				onclick={onNextMonth}
				class="hover:bg-muted rounded-lg p-2 transition-colors"
				aria-label={nextMonthLabel}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="m9 18 6-6-6-6" />
				</svg>
			</button>
		</div>
	</div>
</header>
