<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { buttonVariants } from '$lib/components/ui/button';
	import { m } from '$lib/paraglide/messages.js';
	import { UserConfigContext } from '$lib/states/userConfig.svelte';
	import { TIME_ZONE_OPTIONS, isValidTimeZone } from '$lib/time-zone';

	let modalState = $state(false);
	const userConfig = UserConfigContext.get();

	const currentValue = $derived(userConfig.current.timeZone);
	const options = $derived(
		TIME_ZONE_OPTIONS.includes(currentValue as (typeof TIME_ZONE_OPTIONS)[number])
			? TIME_ZONE_OPTIONS
			: [currentValue, ...TIME_ZONE_OPTIONS]
	);

	const selectTimeZone = (timeZone: string) => {
		if (!isValidTimeZone(timeZone)) return;
		userConfig.setConfig({ timeZone });
		modalState = false;
	};
</script>

<Dialog.Root bind:open={modalState}>
	<Dialog.Trigger class={buttonVariants({ variant: 'link' })}>{currentValue}</Dialog.Trigger>
	<Dialog.Content class="w-full p-3 sm:p-5">
		<Dialog.Header class="mt-10">
			<Dialog.Title class="font-display text-lg sm:text-xl md:text-3xl">
				{m.settings_time_zone_title()}
			</Dialog.Title>
			<Dialog.Description class="text-muted-foreground text-sm">
				{m.settings_time_zone_description()}
			</Dialog.Description>
		</Dialog.Header>

		<div class="mt-6 flex max-h-[55vh] flex-col gap-2 overflow-y-auto pr-1">
			{#each options as option (option)}
				<button
					type="button"
					class={buttonVariants({
						variant: currentValue === option ? 'default' : 'outline'
					})}
					onclick={() => selectTimeZone(option)}
				>
					{option}
				</button>
			{/each}
		</div>
	</Dialog.Content>
</Dialog.Root>
