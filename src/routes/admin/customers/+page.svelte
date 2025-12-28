<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { ChevronDown } from 'lucide-svelte';

	const customers = [
		{ id: 1, name: 'Olivia Martin', email: 'olivia.martin@email.com', subscriptions: 5, spent: 299.0 },
		{ id: 2, name: 'Ava Johnson', email: 'ava.johnson@email.com', subscriptions: 3, spent: 249.0 },
		{ id: 3, name: 'Michael Johnson', email: 'michael.johnson@email.com', subscriptions: 2, spent: 99.0 },
		{ id: 4, name: 'Lisa Anderson', email: 'lisa.anderson@email.com', subscriptions: 1, spent: 39.0 },
		{ id: 5, name: 'Richard Davis', email: 'richard.davis@email.com', subscriptions: 4, spent: 189.0 }
	];
</script>

<div class="flex-1 space-y-4 p-8 pt-6">
	<div class="flex items-center justify-between space-y-2">
		<h2 class="text-3xl font-bold tracking-tight">Subscribers</h2>
		<div class="flex items-center space-x-2">
			<Input class="w-[150px] lg:w-[250px]" placeholder="Search subscribers..." />
			<Button>Add Subscriber</Button>
		</div>
	</div>
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head class="w-[120px]">Subscriber ID</Table.Head>
				<Table.Head>Name</Table.Head>
				<Table.Head>Email</Table.Head>
				<Table.Head>Subscriptions</Table.Head>
				<Table.Head>Lifetime Value</Table.Head>
				<Table.Head class="text-right">Actions</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each customers as customer (customer.id)}
				<Table.Row>
					<Table.Cell class="font-medium">{customer.id}</Table.Cell>
					<Table.Cell>{customer.name}</Table.Cell>
					<Table.Cell>{customer.email}</Table.Cell>
					<Table.Cell>{customer.subscriptions}</Table.Cell>
					<Table.Cell>${customer.spent.toFixed(2)}</Table.Cell>
					<Table.Cell class="text-right">
						<Button variant="outline" size="sm" class="mr-2">Open</Button>
						<Button variant="outline" size="icon">
							<ChevronDown />
							Manage
						</Button>
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>
