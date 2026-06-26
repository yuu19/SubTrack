<script lang="ts">
	import { resolve } from '$app/paths';
	import SubscriptionIcon from '$lib/components/subscriptions/SubscriptionIcon.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { formatCurrencyYen, getIntlLocale, resolveLocale } from '$lib/locale';
	import { localizeInternalHref } from '$lib/locale-routing';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime';
	import type { SubscriptionAnalyticsSnapshot } from '$lib/server/subscription-analytics';
	import { CreditCard } from 'lucide-svelte';

	let { data } = $props<{
		data: {
			analytics: SubscriptionAnalyticsSnapshot;
		};
	}>();

	const locale = $derived(resolveLocale(getLocale()));
	const subscriptionsHref = $derived(localizeInternalHref(resolve('/subscriptions'), locale));
	const monthlySummary = $derived(data.analytics.monthly);
	const yearlySummary = $derived(data.analytics.yearly);
	const topItems = $derived(monthlySummary.items.slice(0, 5));
	const monthlyTotalDisplay = $derived(formatCurrencyYen(monthlySummary.total, locale));
	const annualizedDisplay = $derived(formatCurrencyYen(yearlySummary.total, locale));
	const dailyAverageDisplay = $derived(
		formatCurrencyYen(Math.round(yearlySummary.total / 365), locale)
	);
	const trendMax = $derived.by(() =>
		Math.max(...monthlySummary.trend.map((point: { amount: number }) => point.amount), 1)
	);

	function formatMonthLabel(month: string) {
		const [year, monthNumber] = month.split('-').map(Number);
		return new Intl.DateTimeFormat(getIntlLocale(locale), {
			month: 'short'
		}).format(new Date(year, monthNumber - 1, 1));
	}
</script>

<div
	class="mx-auto flex max-w-6xl flex-col gap-7 px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+6rem)] md:px-8 md:pb-10"
>
	{#if monthlySummary.items.length === 0}
		<section class="bg-muted/20 rounded-[1.5rem] border border-dashed px-6 py-12 text-center">
			<div class="mx-auto flex max-w-md flex-col items-center gap-4">
				<div
					class="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl"
				>
					<CreditCard class="size-6" />
				</div>
				<div class="space-y-2">
					<h1 class="text-xl font-semibold">{m.analysis_empty_title()}</h1>
					<p class="text-muted-foreground leading-7">{m.analysis_empty_description()}</p>
				</div>
				<Button href={subscriptionsHref}>{m.analysis_empty_action()}</Button>
			</div>
		</section>
	{:else}
		<section class="bg-muted/30 rounded-[1.5rem] border p-5 shadow-sm sm:p-7">
			<div class="border-border/70 border-b pb-6">
				<p class="text-muted-foreground text-sm font-semibold">
					{m.analysis_monthly_total_label()}
				</p>
				<p class="text-foreground mt-2 text-4xl font-bold tracking-normal sm:text-5xl">
					{monthlyTotalDisplay}
				</p>
			</div>

			<div class="grid gap-5 pt-6 sm:grid-cols-3">
				<div>
					<p class="text-muted-foreground text-sm font-semibold">
						{m.analysis_annualized_label()}
					</p>
					<p class="text-foreground mt-2 text-2xl font-bold tracking-normal">
						{annualizedDisplay}
					</p>
				</div>
				<div>
					<p class="text-muted-foreground text-sm font-semibold">
						{m.analysis_daily_average_label()}
					</p>
					<p class="text-foreground mt-2 text-2xl font-bold tracking-normal">
						{dailyAverageDisplay}
					</p>
				</div>
				<div class="sm:text-right">
					<p class="text-muted-foreground text-sm font-semibold">
						{m.analysis_subscription_count_label()}
					</p>
					<p class="text-foreground mt-2 text-2xl font-bold tracking-normal">
						{monthlySummary.subscriptionCount}{m.analysis_entry_count_suffix()}
					</p>
				</div>
			</div>
		</section>

		<section class="space-y-4">
			<h1 class="text-xl font-bold tracking-normal">{m.analysis_high_cost_title()}</h1>
			<div class="bg-muted/30 overflow-hidden rounded-[1.5rem] border shadow-sm">
				{#each topItems as item, index (item.serviceName)}
					<div
						class="flex items-center gap-4 px-5 py-4 {index !== topItems.length - 1
							? 'border-border/70 border-b'
							: ''}"
					>
						<div
							class="bg-background flex size-12 shrink-0 items-center justify-center rounded-xl border"
						>
							<SubscriptionIcon
								iconType={item.iconType}
								iconValue={item.iconValue}
								subscriptionId={item.subscriptionId}
								class="size-7"
							/>
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-base font-semibold">{item.serviceName}</p>
							<p class="text-muted-foreground mt-1 text-sm">
								{item.subscriptionCount}{m.analysis_entry_count_suffix()}
							</p>
						</div>
						<div class="shrink-0 text-right">
							<p class="text-lg font-bold tracking-normal">
								{formatCurrencyYen(item.amount, locale)}
							</p>
							<p class="text-muted-foreground mt-1 text-sm">
								{m.analysis_monthly_equivalent_suffix()}
							</p>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<section class="space-y-4">
			<div class="flex items-center justify-between gap-4">
				<h2 class="text-xl font-bold tracking-normal">{m.analysis_forecast_title()}</h2>
				<div class="bg-muted flex items-center rounded-full p-1 text-xs font-semibold">
					<span class="bg-background rounded-full px-3 py-1 shadow-sm">
						{m.analysis_forecast_range_6m()}
					</span>
					<span class="text-muted-foreground/40 px-3 py-1">
						{m.analysis_forecast_range_12m()}
					</span>
					<span class="text-muted-foreground/40 px-3 py-1">
						{m.analysis_forecast_range_24m()}
					</span>
				</div>
			</div>

			<div
				class="bg-background grid min-h-[280px] grid-cols-[auto_minmax(0,1fr)] gap-x-4 rounded-[1.5rem] border p-5"
			>
				<div class="text-muted-foreground/50 flex flex-col justify-between py-5 text-xs">
					<span>{formatCurrencyYen(trendMax, locale)}</span>
					<span>{formatCurrencyYen(Math.round(trendMax * 0.5), locale)}</span>
					<span>{formatCurrencyYen(0, locale)}</span>
				</div>
				<div class="flex items-end gap-4 overflow-hidden border-b">
					{#each monthlySummary.trend as point (point.month)}
						<div class="flex h-full min-w-12 flex-1 flex-col justify-end gap-3">
							<div class="flex flex-1 items-end justify-center">
								<div
									class="bg-muted w-full max-w-12 rounded-t-md transition-[height]"
									style:height={`${Math.max(8, (point.amount / trendMax) * 100)}%`}
									title={formatCurrencyYen(point.amount, locale)}
								></div>
							</div>
							<p class="text-muted-foreground/60 pb-2 text-center text-xs">
								{formatMonthLabel(point.month)}
							</p>
						</div>
					{/each}
				</div>
			</div>
			<p class="text-muted-foreground/60 text-right text-xs">
				{m.analysis_forecast_detail_hint()}
			</p>
		</section>
	{/if}
</div>
