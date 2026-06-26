<script lang="ts">
	import SubscriptionDetailPanel from '$lib/components/subscriptions/SubscriptionDetailPanel.svelte';
	import SubscriptionIcon from '$lib/components/subscriptions/SubscriptionIcon.svelte';
	import type { AppLocale } from '$lib/constant';
	import { formatCalendarDate, formatCurrencyYen } from '$lib/locale';
	import { m } from '$lib/paraglide/messages.js';
	import type { SubscriptionColor } from '$lib/subscription-colors';
	import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from 'lucide-svelte';

	type CalendarEvent = {
		id: string;
		subscriptionId: number;
		title: string;
		date: string;
		amount: number;
		color: SubscriptionColor;
		iconType?: string | null;
		iconValue?: string | null;
	};

	type SubscriptionDetail = {
		serviceName?: string | null;
		amount: number;
		cycle: string;
		nextBillingAt?: string | null;
		daysUntilNextBilling?: number | null;
		firstPaymentDate?: string | null;
		notifyDaysBefore?: number | null;
	};

	let {
		isOpen,
		locale,
		date,
		events = [],
		selectedSubscription = null,
		canMutateSelected = true,
		onClose,
		onBackToList = () => {},
		onEventSelect = () => {},
		onEdit = () => {},
		onDelete = () => {}
	} = $props<{
		isOpen: boolean;
		locale: AppLocale;
		date: string | null;
		events?: CalendarEvent[];
		selectedSubscription?: SubscriptionDetail | null;
		canMutateSelected?: boolean;
		onClose: () => void;
		onBackToList?: () => void;
		onEventSelect?: (event: CalendarEvent) => void;
		onEdit?: () => void;
		onDelete?: () => void;
	}>();

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
			events?.reduce((sum: number, item: CalendarEvent) => sum + Number(item.amount ?? 0), 0) ?? 0
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
	const backLabel = $derived(m.calendar_detail_back());
	const closeLabel = $derived(m.calendar_detail_close());
	const scheduledPaymentsLabel = $derived(m.calendar_detail_scheduled_payments());
	const emptyDayLabel = $derived(m.calendar_detail_empty());
	const detailTitle = $derived(
		selectedSubscription?.serviceName ?? m.subscription_detail_fallback_title()
	);
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
				{#if selectedSubscription}
					<button
						type="button"
						onclick={onBackToList}
						class="hover:bg-muted rounded-lg p-1 transition-colors"
						aria-label={backLabel}
					>
						<ChevronLeft class="size-5" />
					</button>
				{/if}
				<h2 class="text-foreground flex-1 truncate text-lg font-semibold">
					{selectedSubscription ? detailTitle : paymentInfoLabel}
				</h2>
				<button
					type="button"
					onclick={onClose}
					class="hover:bg-muted rounded-lg p-1 transition-colors"
					aria-label={closeLabel}
				>
					<X class="size-5" />
				</button>
			</div>

			{#if selectedSubscription}
				<SubscriptionDetailPanel
					subscription={selectedSubscription}
					{locale}
					canMutate={canMutateSelected}
					{onEdit}
					{onDelete}
				/>
			{:else}
				<div class="space-y-4 p-4">
					<div class="flex items-center gap-3 text-sm">
						<CalendarDays class="text-muted-foreground size-[18px]" />
						<span class="text-foreground">{formatDate(date)}</span>
					</div>

					<div class="border-border bg-muted/40 rounded-lg border p-4">
						<div class="text-muted-foreground flex items-center gap-2 text-xs">
							<Clock class="size-3.5" />
							<span>{scheduledPaymentsLabel}</span>
						</div>
						<div class="text-foreground mt-1 text-2xl font-semibold">
							{formatCurrency(totalAmount)}
						</div>
					</div>

					{#if events.length > 0}
						<div class="border-border bg-card rounded-lg border">
							{#each events as item, index (item.id)}
								<button
									type="button"
									onclick={() => onEventSelect(item)}
									class="hover:bg-muted/50 flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors {index !==
									events.length - 1
										? 'border-border border-b'
										: ''}"
								>
									<span class="flex min-w-0 items-center gap-3">
										<span
											class="bg-muted flex size-10 shrink-0 items-center justify-center rounded-xl border"
										>
											<SubscriptionIcon
												iconType={item.iconType}
												iconValue={item.iconValue}
												subscriptionId={item.subscriptionId}
												class="size-6"
											/>
										</span>
										<span class="text-foreground truncate text-sm">{item.title}</span>
									</span>
									<span class="flex shrink-0 items-center gap-2">
										<span class="text-foreground text-sm font-semibold">
											{formatCurrency(item.amount)}
										</span>
										<ChevronRight class="text-muted-foreground size-4" />
									</span>
								</button>
							{/each}
						</div>
					{:else}
						<p class="text-muted-foreground text-sm">{emptyDayLabel}</p>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}
