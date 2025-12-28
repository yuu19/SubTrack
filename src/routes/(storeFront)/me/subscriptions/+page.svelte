<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import Button from '$lib/components/ui/button/button.svelte';
	import { ChevronsUpDown, Star } from 'lucide-svelte';
	import { cn, formatCurrency } from '$lib/utils';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();
	// Dummy data

	let subscriptions = $derived(data.user?.subscriptions ?? []);
</script>

{#if subscriptions?.length > 0}
	{#each subscriptions ?? [] as { createdAt, amount, code, status, subscriptionPlans } (code)}
		<Collapsible.Root class=" mb-2">
			<div class="bg-muted flex items-center justify-between rounded-md p-5">
				<div class="flex flex-wrap items-center justify-between gap-3 md:gap-10">
					<div class="">
						<p class="text-sm font-medium capitalize">{m.order_date_placed()}</p>
						<p class="text-muted-foreground text-xs">
							{new Intl.DateTimeFormat('en-US', {
								year: 'numeric',
								month: 'short',
								day: '2-digit'
							}).format(createdAt)}
						</p>
					</div>
					<div>
						<p class="text-sm font-medium capitalize">{m.order_total_sum()}</p>
						<p class="text-muted-foreground text-xs">
							{formatCurrency(amount)}
						</p>
					</div>
					<div>
						<p class="text-sm font-medium capitalize">{m.order_number()}</p>
						<p class="text-muted-foreground text-xs">{code}</p>
					</div>
					<div class="">
						<p class="text-sm font-medium capitalize">{m.order_status()}</p>
						<span
							class={cn(
								'inline-flex items-center justify-center rounded-full border px-2 py-1 text-xs font-medium',
								{
									'border-yellow-200 bg-yellow-100 text-yellow-800': status === 'trialing',
									'border-green-200 bg-green-100 text-green-800': status === 'active',
									'border-red-200 bg-red-100 text-red-800': status === 'canceled'
								}
							)}
						>
							{status}
						</span>
					</div>
				</div>
				<Collapsible.Trigger>
					<Button variant="ghost" size="sm" class="w-9 p-0">
						<ChevronsUpDown class="h-4 w-4" />
						<span class="sr-only">{m.order_toggle()}</span>
					</Button>
				</Collapsible.Trigger>
			</div>
			<Collapsible.Content class="m-0 space-y-2 p-0">
				<Table.Root class="rounded-md border">
					<Table.Header>
						<Table.Row class="text-sm">
							<Table.Head class="w-[100px]"></Table.Head>
							<Table.Head>{m.order_item_name()}</Table.Head>
							<Table.Head>{m.order_item_sku()}</Table.Head>
							<Table.Head>{m.order_item_unit_price()}</Table.Head>
							<Table.Head>{m.order_item_quantity()}</Table.Head>
							<Table.Head class="text-right">{m.order_item_total()}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body class="text-xs">
						{#each subscriptionPlans as { plan: { images, name, sku, price }, quantity } (`${sku}-${price}-${quantity}`)}
							<Table.Row>
								<Table.Cell class="font-medium">
									<img src={images[0].fileUrl} class="size-16 rounded-lg" alt="" />
								</Table.Cell>
								<Table.Cell class="capitalize">{name}</Table.Cell>
								<Table.Cell class="capitalize">{sku}</Table.Cell>
								<Table.Cell>{formatCurrency(price)}</Table.Cell>
								<Table.Cell>{quantity}</Table.Cell>
								<Table.Cell class="text-right">{formatCurrency(price * quantity)}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Collapsible.Content>
		</Collapsible.Root>
	{/each}
{:else}
	<div class="flex h-[50vh] w-full flex-col items-center justify-center text-center">
		<h1 class="font-display text-3xl font-semibold">{m.order_empty_title()}</h1>
		<p class="text-muted-foreground">{m.order_empty_body()}</p>
	</div>
{/if}
