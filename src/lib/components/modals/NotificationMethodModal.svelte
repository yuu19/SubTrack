<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { buttonVariants } from '$lib/components/ui/button';
	import { m } from '$lib/paraglide/messages.js';
	import { UserConfigContext } from '$lib/states/userConfig.svelte';

	let {
		onRequestPushSetup
	}: {
		onRequestPushSetup?: () => void;
	} = $props();
	let modalState = $state(false);
	const userConfig = UserConfigContext.get();

	const options = $derived([
		{ value: 'email', label: m.notification_method_email() },
		{ value: 'both', label: m.notification_method_both() }
	]);

	const currentValue = $derived(userConfig.current.notificationMethod ?? 'email');
	const currentLabel = $derived(
		options.find((option) => option.value === currentValue)?.label ?? m.notification_method_email()
	);

	const selectMethod = async (value: string) => {
		modalState = false;
		if (value === 'both') {
			onRequestPushSetup?.();
			return;
		}

		await userConfig.updateConfig({ notificationMethod: 'email' });
	};
</script>

<Dialog.Root bind:open={modalState}>
	<div class="flex flex-wrap items-center gap-2">
		<span
			class="bg-secondary text-secondary-foreground rounded-full px-2.5 py-1 text-sm font-medium"
		>
			{currentLabel}
		</span>
		<Dialog.Trigger class={buttonVariants({ variant: 'outline', size: 'sm' })}>
			{m.settings_notification_method_change()}
		</Dialog.Trigger>
	</div>
	<Dialog.Content class="w-full p-3 sm:p-5">
		<Dialog.Header class="mt-10">
			<Dialog.Title class="font-display text-lg sm:text-xl md:text-3xl">
				{m.settings_notification_method_title()}
			</Dialog.Title>
			<Dialog.Description class="text-muted-foreground text-sm">
				{m.settings_notification_method_description()}
			</Dialog.Description>
		</Dialog.Header>

		<div class="mt-6 flex flex-col gap-2">
			{#each options as option (option.value)}
				<button
					type="button"
					class={buttonVariants({
						variant: currentValue === option.value ? 'default' : 'outline'
					})}
					onclick={() => selectMethod(option.value)}
				>
					{option.label}
				</button>
			{/each}
		</div>
	</Dialog.Content>
</Dialog.Root>
