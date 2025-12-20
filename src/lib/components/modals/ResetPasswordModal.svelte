<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import Input from '../ui/input/input.svelte';
	import * as Form from '$lib/components/ui/form';
	import { requestPasswordResetSchema } from '$lib/formSchema';
	import { Loader2 } from 'lucide-svelte';
	import { defaults, superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import {
		confirmEmailModalState,
		requestPasswordResetModalState
	} from '$lib/states/modalState.svelte';
	import { authClient } from '$lib/auth-client';
	import { m } from '$lib/paraglide/messages.js';
	const form = superForm(defaults(zod4(requestPasswordResetSchema)), {
		SPA: true,
		validators: zod4(requestPasswordResetSchema),
		onUpdate: async ({ form }) => {
			if (form.valid) {
				const { email } = form.data;
				const { data, error } = await authClient.forgetPassword(
					{
						email,
						redirectTo: '/password-reset'
					},
					{
						onSuccess() {
							requestPasswordResetModalState.setFalse();
							confirmEmailModalState.setTrue();
						}
					}
				);

				if (error) {
					if (error.message) {
						toast.error(error.message);
					} else {
						toast.error(error.statusText);
					}
				}
			}
		}
	});

	const { form: formData, enhance, delayed } = form;
</script>

<Dialog.Root bind:open={requestPasswordResetModalState.value}>
	<Dialog.Content class="w-full p-3 sm:p-5">
		<Dialog.Header class="mt-10">
			<Dialog.Title class="font-display text-3xl ">{m.reset_title()}</Dialog.Title>
		</Dialog.Header>
		<form method="post" use:enhance>
			<Form.Field {form} name="email">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>{m.reset_email_label()}</Form.Label>
						<Input {...props} bind:value={$formData.email} />
					{/snippet}
				</Form.Control>
				<Form.Description>{m.reset_email_desc()}</Form.Description>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Button class="mt-2 w-full shadow-md"
				>{#if $delayed}
					<Loader2 class="size-6 animate-spin " />
				{:else}
					{m.reset_submit()}
				{/if}</Form.Button
			>
		</form>
	</Dialog.Content>
</Dialog.Root>
