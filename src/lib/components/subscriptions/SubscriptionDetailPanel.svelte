<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { formatCurrencyYen, formatLongDate, formatNotifyDays, getCycleLabel } from '$lib/locale';
	import type { AppLocale } from '$lib/constant';
	import { m } from '$lib/paraglide/messages.js';
	import { Bell, CalendarDays, Repeat } from 'lucide-svelte';

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
		subscription,
		locale,
		canMutate = true,
		onEdit,
		onDelete
	} = $props<{
		subscription: SubscriptionDetail | null;
		locale: AppLocale;
		canMutate?: boolean;
		onEdit?: () => void;
		onDelete?: () => void;
	}>();

	const formatBillingDate = (value?: string | null) => {
		return formatLongDate(value, locale);
	};

	const formatDaysUntilNextBilling = (value?: number | null) => {
		return m.subscription_due_in_days({ days: Number(value ?? 0) });
	};
</script>

{#if subscription}
	<div class="space-y-4 p-4">
		<div class="bg-card rounded-xl border px-4 py-5 text-center">
			<p class="text-muted-foreground text-xs">{m.subscription_amount_label()}</p>
			<p class="text-3xl font-bold">
				{formatCurrencyYen(subscription.amount, locale)}
			</p>
			<div class="text-muted-foreground mt-4 flex items-center justify-center gap-2 text-sm">
				<Repeat class="size-4" />
				<span>{getCycleLabel(subscription.cycle, locale)}</span>
			</div>
			<div class="text-muted-foreground mt-2 flex items-center justify-center gap-2 text-sm">
				<CalendarDays class="size-4" />
				<span>{formatBillingDate(subscription.nextBillingAt)}</span>
			</div>
		</div>

		<div class="bg-card space-y-3 rounded-xl border px-4 py-4 text-sm">
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground">{m.subscription_days_until_label()}</span>
				<span class="font-semibold">
					{formatDaysUntilNextBilling(subscription.daysUntilNextBilling)}
				</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground">{m.subscription_first_payment_label()}</span>
				<span>{formatBillingDate(subscription.firstPaymentDate)}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground flex items-center gap-2">
					<Bell class="size-4" />
					{m.subscription_notify_label()}
				</span>
				<span>
					{formatNotifyDays(subscription.notifyDaysBefore ?? 0, locale)}
				</span>
			</div>
		</div>

		{#if !canMutate}
			<p class="text-muted-foreground text-xs">
				{m.subscription_cannot_edit_offline()}
			</p>
		{/if}

		<div class="flex flex-col gap-3">
			<Button
				variant="outline"
				disabled={!canMutate}
				onclick={() => onEdit?.()}
				class="h-12 w-full text-base sm:h-10 sm:text-sm"
			>
				{m.subscription_edit_button()}
			</Button>
			<Button
				variant="destructive"
				disabled={!canMutate}
				onclick={() => onDelete?.()}
				class="h-12 w-full text-base sm:h-10 sm:text-sm"
			>
				{m.subscription_delete_button()}
			</Button>
		</div>
	</div>
{/if}
