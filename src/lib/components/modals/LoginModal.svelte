<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { loginModalState } from '$lib/states/modalState.svelte';
	import GoogleAuthButton from '$lib/components/GoogleAuthButton.svelte';
	import { m } from '$lib/paraglide/messages.js';
</script>

<Dialog.Root bind:open={loginModalState.value}>
	<Dialog.Content class="w-full p-5">
		<Dialog.Header class="mt-10">
			<Dialog.Title class="font-display text-3xl ">{m.login_title()}</Dialog.Title>
			<Dialog.Description>{m.login_desc()}</Dialog.Description>
		</Dialog.Header>
		<div class="mt-4 flex flex-col items-center gap-3">
			<GoogleAuthButton label="Sign in with Google" />
		</div>
	</Dialog.Content>
</Dialog.Root>
