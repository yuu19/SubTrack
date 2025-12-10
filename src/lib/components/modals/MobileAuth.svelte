<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		loginModalState,
		mobileAuthState,
		registerModalState
	} from '$lib/states/modalState.svelte';

	import Button from '../ui/button/button.svelte';
import { m } from '$lib/paraglide/messages.js';
</script>

<Dialog.Root bind:open={mobileAuthState.value}>
	<Dialog.Content class="w-full p-5">
		<Dialog.Header class="mt-10"></Dialog.Header>
		<Button
			onclick={() => {
				mobileAuthState.setFalse();
				loginModalState.setTrue();
			}}
			variant="secondary">{m.mobile_auth_login()}</Button
		>
		<Button
			onclick={() => {
				mobileAuthState.setFalse();
				registerModalState.setTrue();
			}}>{m.mobile_auth_register()}</Button
		>
	</Dialog.Content>
</Dialog.Root>
