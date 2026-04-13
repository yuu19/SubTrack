<script lang="ts">
	import { formatCalendarDate, formatCurrencyYen } from '$lib/locale';
	import { m } from '$lib/paraglide/messages.js';
	import { getSubscriptionColorStyle, type SubscriptionColor } from '$lib/subscription-colors';

	type CalendarEvent = {
		id: string;
		title: string;
		amount: number;
		color: SubscriptionColor;
	};

	let { isOpen, locale, date, events, onClose } = $props();

	function formatDate(dateStr: string | null | undefined) {
		return formatCalendarDate(dateStr, locale);
	}

	function formatCurrency(amount: number) {
		const value = Number(amount);
		if (!Number.isFinite(value)) return '';
		return formatCurrencyYen(value, locale);
	}

	const totalAmount = $derived.by(
		() =>
			(events as CalendarEvent[] | undefined)?.reduce(
				(sum: number, item: CalendarEvent) => sum + Number(item.amount ?? 0),
				0
			) ?? 0
	);

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	const paymentInfoLabel = $derived(m.calendar_detail_title());
	const closeLabel = $derived(m.calendar_detail_close());
	const scheduledPaymentsLabel = $derived(m.calendar_detail_scheduled_payments());
	const emptyDayLabel = $derived(m.calendar_detail_empty());
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		tabindex="0"
		onkeydown={handleKeyDown}
	>
		<div class="bg-card w-full max-w-md rounded-xl shadow-xl">
			<div class="border-border flex items-center gap-3 border-b p-4">
				<h2 class="text-foreground flex-1 text-lg font-semibold">{paymentInfoLabel}</h2>
				<button
					onclick={onClose}
					class="hover:bg-muted rounded-lg p-1 transition-colors"
					aria-label={closeLabel}
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
						<path d="M18 6 6 18" /><path d="m6 6 12 12" />
					</svg>
				</button>
			</div>

			<div class="space-y-4 p-4">
				<div class="flex items-center gap-3 text-sm">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="text-muted-foreground"
					>
						<rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line
							x1="16"
							x2="16"
							y1="2"
							y2="6"
						/><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
					</svg>
					<span class="text-foreground">{formatDate(date)}</span>
				</div>

				<div class="border-border bg-muted/40 rounded-lg border p-4">
					<div class="text-muted-foreground flex items-center gap-2 text-xs">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
						</svg>
						<span>{scheduledPaymentsLabel}</span>
					</div>
					<div class="text-foreground mt-1 text-2xl font-semibold">
						{formatCurrency(totalAmount)}
					</div>
				</div>

				{#if events && events.length > 0}
					<div class="border-border bg-card rounded-lg border">
						{#each events as item, index (item.id)}
							<div
								class="flex items-center justify-between gap-3 px-4 py-3 {index !==
								events.length - 1
									? 'border-border border-b'
									: ''}"
							>
								<div class="flex min-w-0 items-center gap-2">
									<span
										class="size-2.5 shrink-0 rounded-full"
										style:background-color={getSubscriptionColorStyle(item.color)}
									></span>
									<span class="text-foreground truncate text-sm">{item.title}</span>
								</div>
								<span class="text-foreground text-sm font-semibold">
									{formatCurrency(item.amount)}
								</span>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-muted-foreground text-sm">{emptyDayLabel}</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
