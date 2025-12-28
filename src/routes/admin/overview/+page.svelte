<script lang="ts">
	import { CheckCircleIcon, ClockIcon, CreditCard, Users, XCircle } from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { formatCurrency } from '$lib/utils';

	let { data } = $props();
</script>

<div class="flex-1 space-y-4 p-8 pt-6">
	<h2 class="text-3xl font-bold tracking-tight">Subscription Dashboard</h2>
	<div class="grid gap-4 md:grid-cols-2">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Monthly Recurring Revenue</Card.Title>
				<CreditCard class="text-muted-foreground h-4 w-4" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</div>
				<p class="text-muted-foreground text-xs">+{data.revenueGrowth}% vs last month</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">New Subscribers</Card.Title>
				<Users class="text-muted-foreground h-4 w-4" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">+{data.newCustomers}</div>
				<p class="text-muted-foreground text-xs">+{data.userGrowth}% vs last month</p>
			</Card.Content>
		</Card.Root>
	</div>
	<Card.Root class="col-span-5">
		<Card.Header>
			<Card.Title>Recent Subscriptions</Card.Title>
		</Card.Header>
		<Card.Content>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-[140px]">Subscription</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Subscriber</Table.Head>
						<Table.Head class="text-right">MRR</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.subscriptions as { id, amount, code, user: { name }, status } (id)}
						<Table.Row>
							<Table.Cell class="font-medium">{code}</Table.Cell>
							<Table.Cell>
								<div class="flex items-center">
									{#if status === 'trialing'}
										<ClockIcon class="mr-2 h-4 w-4 text-yellow-500" />
										<span>Trialing</span>
									{:else if status === 'active'}
										<CheckCircleIcon class="mr-2 h-4 w-4 text-green-500" />
										<span>Active</span>
									{:else if status === 'canceled'}
										<XCircle class="mr-2 h-4 w-4 text-red-500" />
										<span>Canceled</span>
									{/if}
								</div>
							</Table.Cell>
							<Table.Cell>{name}</Table.Cell>
							<Table.Cell class="text-right">{formatCurrency(amount)}</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
