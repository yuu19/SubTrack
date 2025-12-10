<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { registerSchema } from '$lib/formSchema';
	import * as Form from '$lib/components/ui/form';
	import { Loader2 } from 'lucide-svelte';
	import Input from '../ui/input/input.svelte';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import { registerModalState } from '$lib/states/modalState.svelte';
	import { authClient } from '$lib/auth-client';
import { m } from '$lib/paraglide/messages.js';
	const form = superForm(defaults(zod4(registerSchema)), {
		SPA: true,
		validators: zod4(registerSchema),
		async onUpdate({ form }) {
			if (form.valid) {
				const { name, email, password } = form.data;
				const { data, error } = await authClient.signUp.email(
					{
						email,
						password,
						name
						// callbackurlを指定する場合はここで指定する
					},
					{
						onSuccess(ctx) {
							toast.success(m.register_success());
							// toast.success('registration successful');
							registerModalState.setFalse();
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

<Dialog.Root bind:open={registerModalState.value}>
	<Dialog.Content class="w-full  p-5">
		<Dialog.Header class="mt-10">
			<Dialog.Title class="font-display text-3xl ">{m.register_title()}</Dialog.Title>
			<Dialog.Description>
				{m.register_desc()}
			</Dialog.Description>
		</Dialog.Header>

		<form method="POST" use:enhance>
			<Form.Field {form} name="name">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>{m.register_name_label()}</Form.Label>
						<Input {...props} bind:value={$formData.name} />
					{/snippet}
				</Form.Control>
				<Form.Description>{m.register_name_desc()}</Form.Description>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field {form} name="email">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>{m.register_email_label()}</Form.Label>
						<Input {...props} bind:value={$formData.email} />
					{/snippet}
				</Form.Control>
				<Form.Description>{m.register_email_desc()}</Form.Description>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Field {form} name="password">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>{m.register_password_label()}</Form.Label>
						<Input {...props} type="password" bind:value={$formData.password} />
					{/snippet}
				</Form.Control>
				<Form.Description>{m.register_password_desc()}</Form.Description>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Field {form} name="confirmPassword">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>{m.register_confirm_password_label()}</Form.Label>
						<Input {...props} type="password" bind:value={$formData.confirmPassword} />
					{/snippet}
				</Form.Control>
				<Form.Description>{m.register_confirm_password_desc()}</Form.Description>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Button disabled={$delayed} class="mt-2 w-full">
				{#if $delayed}
					<Loader2 class="h-6 w-6 animate-spin " />
				{:else}
					{m.register_submit()}
				{/if}
			</Form.Button>
		</form>
	</Dialog.Content>
</Dialog.Root>
