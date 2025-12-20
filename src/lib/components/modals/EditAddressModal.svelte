<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Form from '$lib/components/ui/form';
	import { Loader2 } from 'lucide-svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { addressSchema } from '$lib/formSchema';
	import Input from '../ui/input/input.svelte';
	import Checkbox from '../ui/checkbox/checkbox.svelte';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { editAddressModalState } from '$lib/states/modalState.svelte';
	import { m } from '$lib/paraglide/messages.js';
	let countries = page.data.countries;

	let form = superForm(page.state.form);

	const { form: formData, enhance, delayed } = form;
</script>

<Dialog.Root
	bind:open={editAddressModalState.value}
	onOpenChange={() => {
		// editAddressModalStore.setFalse();
		history.back();
	}}
>
	<Dialog.Content class="w-full   p-5 sm:p-10 ">
		<Dialog.Header>
			<Dialog.Title class="font-display font-medium md:text-xl"
				>{m.edit_address_title()}</Dialog.Title
			>
		</Dialog.Header>
		<form method="POST" use:enhance>
			<Form.Field {form} name="name">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label
							>{m.add_address_label()} <span class="font-bold text-red-500">*</span></Form.Label
						>

						<Input {...props} bind:value={$formData.name} />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Field {form} name="address">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label
							>{m.add_address_address()} <span class="font-bold text-red-500">*</span></Form.Label
						>
						<Input {...props} bind:value={$formData.address} />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Field {form} name="apartment">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>{m.edit_address_apartment()}</Form.Label>
						<Input {...props} bind:value={$formData.apartment} />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-4">
				<Form.Field {form} name="postalCode" class="col-span-1">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label
								>{m.edit_address_postal()} <span class="font-bold text-red-500">*</span></Form.Label
							>
							<Input {...props} bind:value={$formData.postalCode} />
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field {form} class="col-span-3" name="city">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label
								>{m.edit_address_city()} <span class="font-bold text-red-500">*</span></Form.Label
							>
							<Input {...props} bind:value={$formData.city} />
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</div>
			<Form.Field {form} name="state">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>{m.add_address_state()}</Form.Label>
						<Input {...props} bind:value={$formData.state} />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Field {form} name="country">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label
							>{m.add_address_country()} <span class="font-bold text-red-500">*</span></Form.Label
						>
						<select
							{...props}
							class="border-input bg-background ring-offset-background focus-visible:ring-primary h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
							bind:value={$formData.country}
						>
							<option value="" disabled selected>{m.edit_address_select_country()}</option>
							{#each countries as { name, code, id }}
								<option value={code}>{name}</option>
							{/each}
						</select>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Field {form} name="phone">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>{m.edit_address_phone()}</Form.Label>
						<Input {...props} bind:value={$formData.phone} />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Field
				{form}
				name="isDefaultShipping"
				class="flex flex-row items-start space-y-0 space-x-3  p-4"
			>
				<Form.Control>
					{#snippet children({ props })}
						<Checkbox {...props} bind:checked={$formData.isDefaultShipping} />
						<div class="space-y-1 leading-none">
							<Form.Label>{m.add_address_default_shipping()}</Form.Label>
						</div>
						<input name={props.name} value={$formData.isDefaultShipping} hidden />
					{/snippet}
				</Form.Control>
			</Form.Field>
			<Form.Field
				{form}
				name="isDefaultBilling"
				class="flex flex-row items-start space-y-0 space-x-3  p-4"
			>
				<Form.Control>
					{#snippet children({ props })}
						<Checkbox {...props} bind:checked={$formData.isDefaultBilling} />
						<div class="space-y-1 leading-none">
							<Form.Label>{m.add_address_default_billing()}</Form.Label>
						</div>
						<input name={props.name} value={$formData.isDefaultBilling} hidden />
					{/snippet}
				</Form.Control>
			</Form.Field>
			<Form.Button class="w-full shadow-md" size="lg">
				{#if $delayed}
					<Loader2 class="size-6 animate-spin " />
				{:else}
					{m.edit_address_submit()}
				{/if}
			</Form.Button>
		</form>
	</Dialog.Content>
</Dialog.Root>
