<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { buttonVariants } from '../ui/button';
	import { authClient } from '$lib/auth-client';

	import Input from '../ui/input/input.svelte';
	import { page } from '$app/state';
	import * as Form from '$lib/components/ui/form';
	import { updatePasswordSchema } from '$lib/formSchema';
	import { Loader2 } from 'lucide-svelte';
	import { defaults, superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import { m } from '$lib/paraglide/messages.js';
	let modalState = $state(false);
	const form = superForm(defaults(zod4(updatePasswordSchema)), {
		SPA: true,
		validators: zod4(updatePasswordSchema),
		onUpdate: async ({ form }) => {
			if (form.valid) {
				const { currentPassword, newPassword } = form.data;
				const { error } = await authClient.changePassword(
					{
						newPassword,
						currentPassword,
						revokeOtherSessions: true // revoke all other sessions the user is signed into
					},

					{
						onSuccess(ctx) {
							toast.success(m.update_password_success());
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
	<Dialog.Trigger class={buttonVariants({ variant: 'link' })}
		>{m.update_password_trigger()}</Dialog.Trigger
	>
	<Dialog.Content class="w-full p-3 sm:p-5">
		<Dialog.Header class="mt-10">
			<Dialog.Title class="font-display text-3xl ">{m.update_password_title()}</Dialog.Title>
		</Dialog.Header>
		<form method="post" use:enhance>
			<Form.Field {form} name="currentPassword">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>{m.update_password_current_label()}</Form.Label>
						<Input type="password" {...props} bind:value={$formData.currentPassword} />
					{/snippet}
				</Form.Control>
				<Form.Description>{m.update_password_current_desc()}</Form.Description>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Field {form} name="newPassword">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>{m.update_password_new_label()}</Form.Label>

						<Input type="password" {...props} bind:value={$formData.newPassword} />
					{/snippet}
				</Form.Control>
				<Form.Description>{m.update_password_new_desc()}</Form.Description>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field {form} name="confirmNewPassword">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>{m.update_password_confirm_label()}</Form.Label>

						<Input type="password" {...props} bind:value={$formData.confirmNewPassword} />
					{/snippet}
				</Form.Control>
				<Form.Description>{m.update_password_confirm_desc()}</Form.Description>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Button class="mt-2 w-full"
				>{#if $delayed}
					<Loader2 class="size-6 animate-spin " />
				{:else}
					{m.update_password_submit()}
				{/if}</Form.Button
			>
		</form>
	</Dialog.Content>
</Dialog.Root>
