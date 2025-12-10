<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { buttonVariants } from '../ui/button';
	import { authClient } from '$lib/auth-client';
	import Input from '../ui/input/input.svelte';
	import * as Form from '$lib/components/ui/form';
	import { updateEmailSchema } from '$lib/formSchema';
	import { Loader2 } from 'lucide-svelte';
	import { defaults, superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import { zod4 } from 'sveltekit-superforms/adapters';
import { m } from '$lib/paraglide/messages.js';
	let modalState = $state(false);
	const form = superForm(defaults(zod4(updateEmailSchema)), {
		SPA: true,
		validators: zod4(updateEmailSchema),
		onUpdate: async ({ form }) => {
			if (form.valid) {
				const { email } = form.data;
				const { error } = await authClient.changeEmail(
					{
						newEmail: email
					},
					{
						onSuccess(ctx) {
							toast.success(m.update_email_success());
							modalState = false;
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

<Dialog.Root bind:open={modalState}>
	<Dialog.Trigger class={buttonVariants({ variant: 'link' })}>{m.update_email_trigger()}</Dialog.Trigger>
	<Dialog.Content class="w-full p-3 sm:p-5">
		<Dialog.Header class="mt-10">
			<Dialog.Title class="font-display text-3xl ">{m.update_email_title()}</Dialog.Title>
		</Dialog.Header>
		<form method="post" use:enhance>
			<Form.Field {form} name="email">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>{m.update_email_label()}</Form.Label>
						<Input {...props} bind:value={$formData.email} />
					{/snippet}
				</Form.Control>
				<Form.Description>{m.update_email_desc()}</Form.Description>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Button class="mt-2 w-full shadow-md"
				>{#if $delayed}
					<Loader2 class="size-6 animate-spin " />
				{:else}
					{m.update_email_submit()}
				{/if}</Form.Button
			>
		</form>
	</Dialog.Content>
</Dialog.Root>
