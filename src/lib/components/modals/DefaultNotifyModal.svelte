<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { buttonVariants } from '$lib/components/ui/button';
	import { formatNotifyDays, resolveLocale } from '$lib/locale';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime';
	import { UserConfigContext } from '$lib/states/userConfig.svelte';

	let modalState = $state(false);
	const userConfig = UserConfigContext.get();

	const currentLocale = $derived(resolveLocale(getLocale()));
	const notifyOptions = $derived([
		{ value: 0, label: formatNotifyDays(0, currentLocale) },
		{ value: 1, label: formatNotifyDays(1, currentLocale) },
		{ value: 3, label: formatNotifyDays(3, currentLocale) },
		{ value: 7, label: formatNotifyDays(7, currentLocale) }
	]);

	const currentValue = $derived(userConfig.current.defaultNotifyDaysBefore ?? 3);
	const currentLabel = $derived(formatNotifyDays(currentValue, currentLocale));

	const selectDefault = (value: number) => {
		userConfig.setConfig({ defaultNotifyDaysBefore: value });
		modalState = false;
	};
</script>

<Dialog.Root bind:open={modalState}>
	<Dialog.Trigger class={buttonVariants({ variant: 'link' })}>{currentLabel}</Dialog.Trigger>
	<Dialog.Content class="w-full p-3 sm:p-5">
		<Dialog.Header class="mt-10">
			<Dialog.Title class="font-display text-lg sm:text-xl md:text-3xl">
				{m.settings_default_notify_title()}
			</Dialog.Title>
			<Dialog.Description class="text-muted-foreground text-sm">
				{m.settings_default_notify_description()}
			</Dialog.Description>
		</Dialog.Header>

		<div class="mt-6 flex flex-col gap-2">
			{#each notifyOptions as option (option.value)}
				<button
					type="button"
					class={buttonVariants({
						variant: currentValue === option.value ? 'default' : 'outline'
					})}
					onclick={() => selectDefault(option.value)}
				>
					{option.label}
				</button>
			{/each}
		</div>
	</Dialog.Content>
</Dialog.Root>
