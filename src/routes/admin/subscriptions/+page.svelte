<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';

	import { formatCurrency } from '$lib/utils.js';
	import { CheckCircleIcon, ClipboardIcon, ClockIcon, XCircle } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { queryParam, ssp } from 'sveltekit-search-params';

	let { data } = $props();
	console.log('🚀 ~ data:', data.subscriptions);
	let code = queryParam('code', ssp.string(), {
		debounceHistory: 500,
		pushHistory: false
	});
	let searchTerm = $state($code);
</script>

<div class="flex-1 space-y-4 p-8 pt-6">
	<div class="flex items-center justify-between space-y-2">
		<h2 class="text-3xl font-bold tracking-tight">Subscriptions</h2>
		<form
			class="flex items-center space-x-2"
			onsubmit={(e) => {
				e.preventDefault();
				code.set(searchTerm);
			}}
		>
			<Input
				bind:value={searchTerm}
				class="w-[150px] lg:w-[250px]"
				placeholder="Search by subscription ID"
			/>
			<Button type="submit">Search</Button>
		</form>
	</div>
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head class="w-[140px]">Subscription ID</Table.Head>
				<Table.Head>Status</Table.Head>
				<Table.Head>Subscriber</Table.Head>
				<Table.Head>Monthly Charge</Table.Head>
				<Table.Head>Started</Table.Head>
				<Table.Head class="text-right">Lifecycle</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each data.subscriptions as { status, code, amount, user: { name }, createdAt, id } (id)}
				<Table.Row>
					<Table.Cell class="font-medium  ">
						<div class="flex items-center">
							<span>{code}</span>
							<button
								class="text-muted-foreground hover:text-primary ml-2 inline"
								onclick={() => {
									navigator.clipboard.writeText(code);
									toast.success('Copied to clipboard');
								}}
							>
								<ClipboardIcon class="h-4 w-4" />
							</button>
						</div>
					</Table.Cell>
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
							{:else}
								<span>{status}</span>
							{/if}
						</div>
					</Table.Cell>
					<Table.Cell>{name}</Table.Cell>
					<Table.Cell>{formatCurrency(amount)}</Table.Cell>
					<Table.Cell>{createdAt.toLocaleString()}</Table.Cell>
					<Table.Cell class="text-right">
						<form
							action="?/updateSubscription"
							use:enhance={({ formData }) => {
								formData.append('id', String(id));
								return async ({ update, result }) => {
									// Wait for the form to be updated
									await update();
									// Check if there's a message in the result
									if (result.type === 'success') {
										const data = result.data as any;

										toast.success(data?.message!);
									} else if (result.type === 'failure') {
										const data = result.data as any;

										toast.error(data?.message!);
									}
								};
							}}
							method="POST"
						>
							{#if status === 'trialing'}
								<Button type="submit" variant="outline" size="sm" class="mr-2"
									>Activate subscription</Button
								>
							{:else if status === 'active'}
								<Button type="submit" variant="outline" size="sm" class="mr-2"
									>Cancel subscription</Button
								>
							{/if}
						</form>
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>
