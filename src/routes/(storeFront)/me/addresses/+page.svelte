<script lang="ts">
	import { page } from '$app/state';
	import AddAddressModal from '$lib/components/modals/AddAddressModal.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Pen, Trash } from 'lucide-svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import type { ActionData } from './$types';
	import { addressModalState } from '$lib/states/modalState.svelte';
	import { m } from '$lib/paraglide/messages.js';

	let addresses = $derived(page.data.user.addresses);
	let deleteModalState = $state(false);
	let addressId = $state(0);
</script>

<AddAddressModal />

{#if addresses.length === 0}
	<div class="flex h-[50vh] flex-col items-center justify-center text-center">
		<h1 class="font-display text-3xl font-semibold">{m.addresses_empty_title()}</h1>
		<p class="text-muted-foreground mb-5 text-sm">{m.addresses_empty_body()}</p>
		<Button onclick={() => addressModalState.setTrue()}>{m.addresses_add_button()}</Button>
	</div>
{:else}
	<div>
		<div class="mb-2 ml-auto w-fit px-3">
			<AddAddressModal />
			<Button onclick={() => addressModalState.setTrue()}>{m.addresses_add_button()}</Button>
		</div>

		<div class="mb-3 grid gap-5 lg:grid-cols-2">
			{#each addresses as address (address.id)}
				<Card.Root>
					<Card.Header class="border-none">
						<Card.Title class="capitalize ">{address.label}</Card.Title>
					</Card.Header>
					<Card.Content class="text-muted-foreground flex justify-between text-sm capitalize ">
						<div>
							<p>{address.address}</p>
							<p>{address.state}</p>
							<p>{address.country}</p>
						</div>
						<div class="mt-auto w-[150px] space-y-2">
							{#if address.isDefaultShipping}
								<Badge variant="secondary" class="uppercase">{m.addresses_shipping_badge()}</Badge>
							{/if}
							{#if address.isDefaultBilling}
								<Badge variant="secondary" class=" uppercase">{m.addresses_billing_badge()}</Badge>
							{/if}
						</div>
					</Card.Content>
					<Card.Footer class=" -pb-2 gap-5 pt-1 text-sm">
						<Button
							onclick={() => {
								addressId = address.id;
								deleteModalState = true;
							}}
							variant="destructive"
							class="bg-destructive/20 text-destructive hover:bg-destructive/30 gap-2 "
						>
							<Trash class="size-3" />
							<p>Remove</p>
						</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	</div>
{/if}
<AlertDialog.Root bind:open={deleteModalState}>
	<AlertDialog.Content class="w-full  p-5">
		<form
			action="?/deleteAddress"
			use:enhance={() => {
				return async ({ update, result }) => {
					await update();
					if (result.type === 'success') {
						const data = result.data as ActionData;
						toast.success(data?.message || '');
						deleteModalState = false;
					}
				};
			}}
			method="post"
		>
			<input type="number" name="id" value={addressId} hidden />
			<AlertDialog.Header class="mt-10">
				<AlertDialog.Title class="font-display text-lg sm:text-xl md:text-3xl  "
					>{m.addresses_delete_title()}</AlertDialog.Title
				>
				<AlertDialog.Description>
					{m.addresses_delete_body()}
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer class="mt-5">
				<AlertDialog.Cancel type="button" class="w-full"
					>{m.addresses_delete_cancel()}</AlertDialog.Cancel
				>
				<AlertDialog.Action type="submit" class=" bg-destructive hover:bg-destructive/90 w-full">
					{m.addresses_delete_confirm()}</AlertDialog.Action
				>
			</AlertDialog.Footer>
		</form>
	</AlertDialog.Content>
</AlertDialog.Root>
