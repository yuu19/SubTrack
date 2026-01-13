<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { buttonVariants } from '$lib/components/ui/button';
	import { UserConfigContext } from '$lib/states/userConfig.svelte';

	let modalState = $state(false);
	const userConfig = UserConfigContext.get();

	const notifyOptions = [
		{ value: 0, label: '当日' },
		{ value: 1, label: '1日前' },
		{ value: 3, label: '3日前' },
		{ value: 7, label: '7日前' }
	];

	const currentValue = $derived(userConfig.current.defaultNotifyDaysBefore ?? 3);
	const currentLabel = $derived(
		currentValue === 0 ? '当日' : `${currentValue}日前`
	);

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
				デフォルト通知日
			</Dialog.Title>
			<Dialog.Description class="text-muted-foreground text-sm">
				支払日の何日前に通知するかを設定します。
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
