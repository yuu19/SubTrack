<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { buttonVariants } from '$lib/components/ui/button';
	import { m } from '$lib/paraglide/messages.js';
	import { UserConfigContext } from '$lib/states/userConfig.svelte';
	import { isValidNotifyTime } from '$lib/time-zone';

	let modalState = $state(false);
	const userConfig = UserConfigContext.get();

	const currentValue = $derived(userConfig.current.defaultNotifyTime);
	let draftValue = $state('');

	$effect(() => {
		if (modalState) {
			draftValue = currentValue;
		}
	});

	const saveNotifyTime = () => {
		if (!isValidNotifyTime(draftValue)) return;
		userConfig.setConfig({ defaultNotifyTime: draftValue });
		modalState = false;
	};
</script>

<Dialog.Root bind:open={modalState}>
	<Dialog.Trigger class={buttonVariants({ variant: 'link' })}>{currentValue}</Dialog.Trigger>
	<Dialog.Content class="w-full p-3 sm:p-5">
		<Dialog.Header class="mt-10">
			<Dialog.Title class="font-display text-lg sm:text-xl md:text-3xl">
				{m.settings_notify_time_title()}
			</Dialog.Title>
			<Dialog.Description class="text-muted-foreground text-sm">
				{m.settings_notify_time_description()}
			</Dialog.Description>
		</Dialog.Header>

		<div class="mt-6 flex flex-col gap-4">
			<input
				class="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
				type="time"
				bind:value={draftValue}
			/>
			<button
				type="button"
				class={buttonVariants({ variant: 'default' })}
				disabled={!isValidNotifyTime(draftValue)}
				onclick={saveNotifyTime}
			>
				{m.common_save()}
			</button>
		</div>
	</Dialog.Content>
</Dialog.Root>
