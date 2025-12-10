<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { buttonVariants } from '../ui/button';
	import * as Form from '$lib/components/ui/form';
	import { Loader2 } from 'lucide-svelte';
	import { defaults, superForm } from 'sveltekit-superforms/client';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import { addressSchema } from '$lib/formSchema';
	import Input from '../ui/input/input.svelte';
	import Checkbox from '../ui/checkbox/checkbox.svelte';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import { addressModalState } from '$lib/states/modalState.svelte';
import { m } from '$lib/paraglide/messages.js';

	const form = superForm(defaults(zod4(addressSchema)), {
		validators: zod4(addressSchema),
		onUpdated({ form }) {
			const { valid, message } = form;
			if (valid) {
				toast.success(message?.text || '');
				addressModalState.setFalse();
			}
		}
	});

	const { form: formData, enhance, delayed } = form;
</script>

<Dialog.Root bind:open={addressModalState.value}>
	<Dialog.Content class="w-full p-5 sm:p-10 ">
		<Dialog.Header>
			<Dialog.Title class="font-display font-medium md:text-xl">{m.add_address_title()}</Dialog.Title>
		</Dialog.Header>

		<form method="POST" use:enhance action="/me/addresses/?/addAddress">
			<Form.Field {form} name="name">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>{m.add_address_label()} <span class="font-bold text-red-500">*</span></Form.Label>

						<Input {...props} bind:value={$formData.name} />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Field {form} name="address">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>{m.add_address_address()} <span class="font-bold text-red-500">*</span></Form.Label>
						<Input
							{...props}
							autocomplete="shipping address-line1"
							bind:value={$formData.address}
						/>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

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
						<Form.Label>{m.add_address_country()} <span class="font-bold text-red-500">*</span></Form.Label>
						<Input {...props} bind:value={$formData.country} />
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
		<Form.Button type="submit" class="w-full shadow-md" size="lg">
			{#if $delayed}
				<Loader2 class="size-6 animate-spin " />
			{:else}
				{m.add_address_submit()}
			{/if}
		</Form.Button>
		</form>
	</Dialog.Content>
</Dialog.Root>
