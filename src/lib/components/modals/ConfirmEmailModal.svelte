<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { confirmEmailModalState } from '$lib/states/modalState.svelte';

	import Button from '../ui/button/button.svelte';
	import { m } from '$lib/paraglide/messages.js';
</script>

<Dialog.Root bind:open={confirmEmailModalState.value}>
	<Dialog.Content class="w-full p-5 ">
		<Dialog.Header class="mt-10">
			<Dialog.Title class="font-display text-3xl ">{m.confirm_email_title()}</Dialog.Title>
			<Dialog.Description>
				{m.confirm_email_desc()}
			</Dialog.Description>
		</Dialog.Header>
		<div class="flex items-center justify-center gap-5 py-10">
			<Button variant="secondary" href="https://mail.google.com/mail/u/0/" class="gap-1">
				<img src="/gmail.png" alt="" />
				{m.confirm_email_open_gmail()}</Button
			>
			<Button href="https://outlook.live.com/mail/0/inbox" variant="secondary" class="gap-1">
				<img src="/outlook.png" alt="" />
				{m.confirm_email_open_outlook()}</Button
			>
		</div>

		<p class="text-muted-foreground text-center text-sm">
			{m.confirm_email_footer()}
		</p>
	</Dialog.Content>
</Dialog.Root>
