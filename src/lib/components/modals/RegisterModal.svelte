<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { registerModalState } from '$lib/states/modalState.svelte';
	import GoogleAuthButton from '$lib/components/GoogleAuthButton.svelte';
	import { m } from '$lib/paraglide/messages.js';
</script>

<Dialog.Root bind:open={registerModalState.value}>
	<Dialog.Content class="w-full p-5">
		<Dialog.Header class="mt-10">
			<Dialog.Title class="font-display text-3xl ">{m.register_title()}</Dialog.Title>
			<Dialog.Description>{m.register_desc()}</Dialog.Description>
		</Dialog.Header>
		<div class="mt-4 flex flex-col items-center gap-3">
			<GoogleAuthButton label="Sign up with Google" />
		</div>
	</Dialog.Content>
</Dialog.Root>
