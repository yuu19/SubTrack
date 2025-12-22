<script lang="ts">
	import AddSubscription from '$lib/components/modals/AddSubscription.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import Button from '$lib/components/ui/button/button.svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { addSubscriptionModalState } from '$lib/states/modalState.svelte';
	import { formatCurrency } from '$lib/utils';
	import type { subscriptionTable } from '$lib/server/db/schema';

	type Subscription = typeof subscriptionTable.$inferSelect;

	let { data } = $props<{ data: { subscriptions: Subscription[]; form: unknown } }>();

	const cycleLabelMap: Record<string, string> = {
		monthly: '毎月',
		quarterly: '3ヶ月ごと',
		yearly: '毎年'
	};

	const cycleUnitMap: Record<string, string> = {
		monthly: '月',
		quarterly: '3ヶ月',
		yearly: '年'
	};

	const cycleDayMap: Record<string, number> = {
		monthly: 30,
		quarterly: 90,
		yearly: 365
	};

	const formatBillingDate = (value?: string | null) => {
		if (!value) return '-';
		const safeValue = value.includes('T') ? value : `${value}T00:00:00`;
		const date = new Date(safeValue);
		if (Number.isNaN(date.getTime())) return value.slice(0, 10);
		return new Intl.DateTimeFormat('ja-JP', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		}).format(date);
	};

	const getCycleProgress = (subscription: Subscription) => {
		const total = cycleDayMap[subscription.cycle] ?? 0;
		if (!total) return 1;
		const daysLeft = Number(subscription.daysUntilNextBilling ?? 0);
		if (!Number.isFinite(daysLeft)) return 1;
		const elapsed = Math.max(0, total - daysLeft);
		return Math.min(1, elapsed / total);
	};
</script>

<section class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
	<header class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold">サブスク管理</h1>
			<p class="text-muted-foreground">契約を追加して支払いを整理しましょう。</p>
		</div>
		<Button onclick={() => addSubscriptionModalState.setTrue()}>サブスクを追加</Button>
	</header>

	{#if data.subscriptions.length === 0}
		<div class="text-muted-foreground rounded-lg border border-dashed p-6">
			まだ登録されたサブスクがありません。
		</div>
	{:else}
		<div class="flex flex-col gap-4">
			{#each data.subscriptions as sub (sub.id)}
				<Card class="overflow-hidden">
					<CardHeader class="pb-3">
						<div class="flex items-start justify-between gap-4">
							<div class="space-y-1">
								<CardTitle class="text-base">{sub.serviceName}</CardTitle>
								<CardDescription class="text-xs">
									{cycleLabelMap[sub.cycle] ?? sub.cycle}
								</CardDescription>
							</div>
							<div class="text-right">
								<div class="text-base font-semibold">
									{formatCurrency(sub.amount, { currency: 'JPY', locale: 'ja-JP' })}
									<span class="text-muted-foreground text-xs">
										/ {cycleUnitMap[sub.cycle] ?? sub.cycle}
									</span>
								</div>
							</div>
						</div>
					</CardHeader>
					<CardContent class="space-y-3 pt-0">
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">{formatBillingDate(sub.nextBillingAt)}</span>
							<span class="text-muted-foreground">支払いまで {sub.daysUntilNextBilling}日</span>
						</div>
						<div
							class="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs"
						>
							<span>
								通知
								{sub.notifyDaysBefore === 0 ? '当日' : `${sub.notifyDaysBefore}日前`}
							</span>
							{#if sub.tags.length > 0}
								<div class="flex flex-wrap gap-2">
									{#each sub.tags as tag, i (i)}
										<Badge variant="secondary" class="text-[10px]">{tag}</Badge>
									{/each}
								</div>
							{/if}
						</div>
						<div class="bg-muted h-1 w-full rounded-full">
							<div
								class="bg-primary h-1 rounded-full transition-[width]"
								style={`width: ${Math.max(8, Math.round(getCycleProgress(sub) * 100))}%`}
							></div>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}
</section>

<Dialog.Root bind:open={addSubscriptionModalState.value}>
	<Dialog.Content class="max-h-[90vh] w-full max-w-3xl overflow-y-auto p-0">
		<AddSubscription {data} />
	</Dialog.Content>
</Dialog.Root>
