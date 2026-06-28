<script lang="ts">
	import SubscriptionIcon from '$lib/components/subscriptions/SubscriptionIcon.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import {
		formatCurrency,
		formatLongDate,
		formatNotifyDays,
		getCancellationMethodDescription,
		getCancellationMethodLabel,
		getCycleLabel
	} from '$lib/locale';
	import type { AppLocale } from '$lib/constant';
	import { m } from '$lib/paraglide/messages.js';
	import {
		Bell,
		CalendarDays,
		ExternalLink,
		FileText,
		Link,
		Pencil,
		Repeat,
		RotateCcw,
		Trash2,
		XCircle
	} from 'lucide-svelte';

	type SubscriptionDetail = {
		id?: number | string | null;
		serviceName?: string | null;
		planName?: string | null;
		serviceUrl?: string | null;
		status?: string | null;
		color?: string | null;
		iconType?: string | null;
		iconValue?: string | null;
		amount: number;
		cycle: string;
		nextBillingAt?: string | null;
		daysUntilNextBilling?: number | null;
		firstPaymentDate?: string | null;
		notifyDaysBefore?: number | null;
		canceledAt?: Date | string | number | null;
		cancellationUrl?: string | null;
		cancellationMethod?: string | null;
		cancellationMemo?: string | null;
		cancellationDeadlineMemo?: string | null;
	};

	let {
		subscription,
		locale,
		canMutate = true,
		onEdit,
		onCancel,
		onReactivate,
		onDelete
	} = $props<{
		subscription: SubscriptionDetail | null;
		locale: AppLocale;
		canMutate?: boolean;
		onEdit?: () => void;
		onCancel?: () => void;
		onReactivate?: () => void;
		onDelete?: () => void;
	}>();

	const isCanceled = $derived(subscription?.status === 'canceled');
	const cancellationUrl = $derived(subscription?.cancellationUrl?.trim() ?? '');
	const cancellationHost = $derived.by(() => {
		if (!cancellationUrl) return '';
		try {
			return new URL(cancellationUrl).host;
		} catch {
			return cancellationUrl;
		}
	});
	const hasCancellationDetails = $derived(
		Boolean(
			cancellationUrl ||
			subscription?.cancellationMethod ||
			subscription?.cancellationMemo ||
			subscription?.cancellationDeadlineMemo
		)
	);

	const formatBillingDate = (value?: Date | string | number | null) => {
		return formatLongDate(value, locale);
	};

	const formatDaysUntilNextBilling = (value?: number | null) => {
		return m.subscription_due_in_days({ days: Number(value ?? 0) });
	};
</script>

{#if subscription}
	<div class="flex min-h-0 flex-1 flex-col">
		<div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
			<div class="bg-card rounded-xl border px-4 py-5 text-center">
				<div
					class="border-border bg-muted/50 mx-auto mb-3 flex size-14 items-center justify-center rounded-md border text-2xl"
					aria-hidden="true"
				>
					<SubscriptionIcon
						iconType={subscription.iconType}
						iconValue={subscription.iconValue}
						subscriptionId={subscription.id}
						class="size-7"
					/>
				</div>
				<p class="text-muted-foreground text-xs">{m.subscription_amount_label()}</p>
				<p class="text-3xl font-bold">
					{formatCurrency(subscription.amount, subscription.currency, locale)}
				</p>
				<div class="text-muted-foreground mt-4 flex items-center justify-center gap-2 text-sm">
					<Repeat class="size-4" />
					<span>{getCycleLabel(subscription.cycle, locale)}</span>
				</div>
				<div class="text-muted-foreground mt-2 flex items-center justify-center gap-2 text-sm">
					<CalendarDays class="size-4" />
					<span>{formatBillingDate(subscription.nextBillingAt)}</span>
				</div>
				{#if isCanceled}
					<div
						class="mt-4 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
					>
						{m.subscription_canceled_badge()}
					</div>
				{/if}
			</div>

			<div class="bg-card space-y-3 rounded-xl border px-4 py-4 text-sm">
				{#if subscription.planName}
					<div class="flex items-center justify-between gap-4">
						<span class="text-muted-foreground">{m.subscription_plan_name_label()}</span>
						<span class="text-right font-medium">{subscription.planName}</span>
					</div>
				{/if}
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
				{#if isCanceled}
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">{m.subscription_canceled_at_label()}</span>
						<span>{formatBillingDate(subscription.canceledAt)}</span>
					</div>
				{/if}
			</div>

			<div class="bg-card space-y-3 rounded-xl border px-4 py-4 text-sm">
				<div class="flex items-center gap-2 font-semibold">
					<Link class="size-4" />
					<span>{m.subscription_cancellation_section_title()}</span>
				</div>
				{#if hasCancellationDetails}
					<div class="space-y-3">
						<div class="space-y-1">
							<p class="text-muted-foreground text-xs">
								{m.subscription_cancellation_method_label()}
							</p>
							<p class="font-medium">
								{getCancellationMethodLabel(subscription.cancellationMethod, locale)}
							</p>
							<p class="text-muted-foreground text-xs">
								{getCancellationMethodDescription(subscription.cancellationMethod, locale)}
							</p>
						</div>

						{#if cancellationUrl}
							<div class="space-y-2">
								<p class="text-muted-foreground text-xs">
									{m.subscription_cancellation_saved_link_label()}: {cancellationHost}
								</p>
								<Button
									href={cancellationUrl}
									target="_blank"
									rel="noopener noreferrer"
									variant="outline"
									class="h-12 w-full text-base sm:h-10 sm:text-sm"
								>
									<ExternalLink class="size-4" />
									{m.subscription_cancellation_open_url()}
								</Button>
							</div>
						{:else}
							<p class="text-muted-foreground text-xs">{m.subscription_cancellation_no_url()}</p>
						{/if}

						{#if subscription.cancellationMemo}
							<div class="space-y-1">
								<p class="text-muted-foreground flex items-center gap-2 text-xs">
									<FileText class="size-3.5" />
									{m.subscription_cancellation_memo_label()}
								</p>
								<p class="whitespace-pre-wrap">{subscription.cancellationMemo}</p>
							</div>
						{/if}

						{#if subscription.cancellationDeadlineMemo}
							<div class="space-y-1">
								<p class="text-muted-foreground text-xs">
									{m.subscription_cancellation_deadline_memo_label()}
								</p>
								<p>{subscription.cancellationDeadlineMemo}</p>
							</div>
						{/if}
					</div>
				{:else}
					<p class="text-muted-foreground text-sm">{m.subscription_cancellation_empty()}</p>
				{/if}
			</div>
		</div>

		<div
			class="bg-background/95 shrink-0 space-y-3 border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
		>
			{#if !canMutate}
				<p class="text-muted-foreground text-xs">
					{m.subscription_cannot_edit_offline()}
				</p>
			{/if}

			<div class="grid gap-3 sm:grid-cols-2">
				<Button
					variant="outline"
					disabled={!canMutate}
					onclick={() => onEdit?.()}
					class="h-12 w-full text-base sm:h-10 sm:text-sm"
				>
					<Pencil class="size-4" />
					{m.subscription_edit_button()}
				</Button>
				{#if isCanceled}
					{#if onReactivate}
						<Button
							variant="outline"
							disabled={!canMutate}
							onclick={() => onReactivate?.()}
							class="h-12 w-full text-base sm:h-10 sm:text-sm"
						>
							<RotateCcw class="size-4" />
							{m.subscription_reactivate_button()}
						</Button>
					{/if}
					{#if onDelete}
						<Button
							variant="destructive"
							disabled={!canMutate}
							onclick={() => onDelete?.()}
							class="h-12 w-full text-base sm:h-10 sm:text-sm"
						>
							<Trash2 class="size-4" />
							{m.subscription_delete_button()}
						</Button>
					{/if}
				{:else if onCancel}
					<Button
						variant="outline"
						disabled={!canMutate}
						onclick={() => onCancel?.()}
						class="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive h-12 w-full text-base sm:h-10 sm:text-sm"
					>
						<XCircle class="size-4" />
						{m.subscription_cancel_button()}
					</Button>
				{/if}
			</div>
		</div>
	</div>
{/if}
