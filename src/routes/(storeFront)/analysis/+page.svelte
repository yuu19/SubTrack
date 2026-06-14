<script lang="ts">
	import { resolve } from '$app/paths';
	import DonutChart from '$lib/components/analytics/DonutChart.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { formatCurrencyYen, resolveLocale } from '$lib/locale';
	import { localizeInternalHref } from '$lib/locale-routing';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime';
	import {
		getFallbackSubscriptionColor,
		getSubscriptionColorStyle
	} from '$lib/subscription-colors';
	import type {
		AnalyticsPeriod,
		SubscriptionAnalyticsItem,
		SubscriptionAnalyticsSnapshot
	} from '$lib/server/subscription-analytics';
	import { ChartPie, CreditCard } from 'lucide-svelte';

	let { data } = $props<{
		data: {
			analytics: SubscriptionAnalyticsSnapshot;
		};
	}>();

	let period = $state<AnalyticsPeriod>('monthly');

	const locale = $derived(resolveLocale(getLocale()));
	const subscriptionsHref = $derived(localizeInternalHref(resolve('/subscriptions'), locale));
	const summary = $derived(data.analytics[period]);
	const summaryHint = $derived(
		period === 'monthly' ? m.analysis_period_hint_monthly() : m.analysis_period_hint_yearly()
	);
	const totalDisplay = $derived(formatCurrencyYen(summary.total, locale));
	const chartSegments = $derived.by(() =>
		summary.items.map((item: SubscriptionAnalyticsItem, index: number) => ({
			label: item.serviceName,
			value: item.amount,
			color: getSubscriptionColorStyle(item.color ?? getFallbackSubscriptionColor(index))
		}))
	);
	const topItem = $derived(summary.items[0] ?? null);
</script>

<div
	class="mx-auto flex max-w-5xl flex-col gap-6 px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+6rem)] md:px-8 md:pb-8"
>
	<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
		<div class="space-y-2">
			<div class="text-primary inline-flex items-center gap-2 text-sm font-medium">
				<ChartPie class="size-4" />
				<span>{m.analysis_page_eyebrow()}</span>
			</div>
			<div class="space-y-2">
				<h1 class="text-3xl font-bold tracking-tight">{m.analysis_page_title()}</h1>
				<p class="text-muted-foreground max-w-2xl leading-7">
					{m.analysis_page_description()}
				</p>
			</div>
		</div>

		{#if topItem}
			<div class="bg-muted/40 hidden min-w-[240px] rounded-3xl border p-4 lg:block">
				<p class="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
					{m.analysis_top_service_label()}
				</p>
				<p class="text-foreground mt-3 truncate text-lg font-semibold">{topItem.serviceName}</p>
				<p class="text-primary mt-1 text-sm font-medium">
					{formatCurrencyYen(topItem.amount, locale)}
				</p>
			</div>
		{/if}
	</div>

	<Tabs.Root bind:value={period} class="gap-4">
		<Tabs.List class="grid h-11 w-full grid-cols-2 rounded-2xl p-1 sm:w-[18rem]">
			<Tabs.Trigger value="monthly" class="rounded-xl">
				{m.analysis_period_monthly()}
			</Tabs.Trigger>
			<Tabs.Trigger value="yearly" class="rounded-xl">
				{m.analysis_period_yearly()}
			</Tabs.Trigger>
		</Tabs.List>
	</Tabs.Root>

	{#if summary.items.length === 0}
		<section class="bg-muted/20 rounded-[2rem] border border-dashed px-6 py-12 text-center">
			<div class="mx-auto flex max-w-md flex-col items-center gap-4">
				<div
					class="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl"
				>
					<CreditCard class="size-6" />
				</div>
				<div class="space-y-2">
					<h2 class="text-xl font-semibold">{m.analysis_empty_title()}</h2>
					<p class="text-muted-foreground leading-7">{m.analysis_empty_description()}</p>
				</div>
				<Button href={subscriptionsHref}>{m.analysis_empty_action()}</Button>
			</div>
		</section>
	{:else}
		<div class="grid gap-6 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
			<section class="bg-background rounded-[2rem] border p-5 shadow-sm sm:p-6">
				<DonutChart
					segments={chartSegments}
					total={summary.total}
					totalLabel={m.analysis_total_label()}
					{totalDisplay}
					hint={summaryHint}
				/>

				<div class="mt-6 grid gap-3 sm:grid-cols-2">
					<div class="bg-muted/40 rounded-2xl border p-4">
						<p class="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
							{m.analysis_subscription_count_label()}
						</p>
						<p class="mt-2 text-2xl font-semibold">{summary.subscriptionCount}</p>
					</div>
					<div class="bg-muted/40 rounded-2xl border p-4">
						<p class="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
							{m.analysis_breakdown_count_label()}
						</p>
						<p class="mt-2 text-2xl font-semibold">{summary.items.length}</p>
					</div>
				</div>
			</section>

			<section class="bg-background rounded-[2rem] border p-5 shadow-sm sm:p-6">
				<div class="flex items-center justify-between gap-3 border-b pb-4">
					<div>
						<h2 class="text-xl font-semibold">{m.analysis_breakdown_title()}</h2>
						<p class="text-muted-foreground mt-1 text-sm">
							{m.analysis_breakdown_description()}
						</p>
					</div>
					<p class="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
						{m.analysis_share_label()}
					</p>
				</div>

				<div class="divide-y">
					{#each summary.items as item, index (item.serviceName)}
						<div class="flex items-center gap-3 py-4">
							<span
								class="size-3 shrink-0 rounded-full"
								style:background-color={getSubscriptionColorStyle(
									item.color ?? getFallbackSubscriptionColor(index)
								)}
							></span>
							<div class="min-w-0 flex-1">
								<p class="truncate font-medium">{item.serviceName}</p>
								<p class="text-muted-foreground text-sm">
									{item.subscriptionCount}
									{m.analysis_entry_count_suffix()}
								</p>
							</div>
							<div class="text-right">
								<p class="font-semibold">{formatCurrencyYen(item.amount, locale)}</p>
								<p class="text-muted-foreground text-sm">{Math.round(item.share * 100)}%</p>
							</div>
						</div>
					{/each}
				</div>
			</section>
		</div>
	{/if}
</div>
