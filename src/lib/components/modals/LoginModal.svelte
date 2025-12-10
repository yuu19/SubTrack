<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Form from '$lib/components/ui/form';
	import { loginSchema } from '$lib/formSchema';
	import { Loader2 } from 'lucide-svelte';
	import { Input } from '../ui/input';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { loginModalState, requestPasswordResetModalState } from '$lib/states/modalState.svelte';
	import { authClient } from '$lib/auth-client';
import { m } from '$lib/paraglide/messages.js';

	const form = superForm(defaults(zod4(loginSchema)), {
		SPA: true,
		validators: zod4(loginSchema),
		async onUpdate({ form }) {
			if (form.valid) {
				const { email, password } = form.data;
				const { error } = await authClient.signIn.email(
					{
						email,
						password
					},
					{
						onSuccess(ctx) {
						toast.success(m.login_success());
							loginModalState.setFalse();
							if (page.url.pathname === '/password-reset')
								goto('/', {
									invalidateAll: true
								});
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

<Dialog.Root bind:open={loginModalState.value}>
	<Dialog.Content class="w-full p-5">
		<Dialog.Header class="mt-10">
			<Dialog.Title class="font-display text-3xl ">{m.login_title()}</Dialog.Title>
			<Dialog.Description>
				{m.login_desc()}
			</Dialog.Description>
		</Dialog.Header>
		<form method="post" use:enhance>
			<Form.Field {form} name="email">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>{m.login_email_label()}</Form.Label>
						<Input {...props} bind:value={$formData.email} />
					{/snippet}
				</Form.Control>
				<Form.Description>{m.login_email_desc()}</Form.Description>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Field {form} name="password">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>{m.login_password_label()}</Form.Label>
						<Input {...props} bind:value={$formData.password} type="password" />
					{/snippet}
				</Form.Control>
				<Form.Description>{m.login_password_desc()}</Form.Description>
				<Form.FieldErrors />
			</Form.Field>
			<button
				onclick={() => {
					loginModalState.setFalse();
					requestPasswordResetModalState.setTrue();
				}}
				class="text-primary text-sm"
				type="button">{m.login_forgot()}</button
			>
			<Form.Button class="mt-2 w-full" type="submit"
				>{#if $delayed}
					<Loader2 class="size-6 animate-spin " />
				{:else}
					{m.login_submit()}
				{/if}</Form.Button
			>
		</form>
	</Dialog.Content>
</Dialog.Root>
