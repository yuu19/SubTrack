<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { buttonVariants } from '$lib/components/ui/button';
	import { UserConfigContext } from '$lib/states/userConfig.svelte';

	let modalState = $state(false);
	const userConfig = UserConfigContext.get();

	const options = [
		{ value: 'push', label: 'プッシュ通知' },
		{ value: 'email', label: 'メール通知' },
		{ value: 'both', label: '両方' }
	];

	const currentValue = $derived(userConfig.current.notificationMethod ?? 'push');
	const currentLabel = $derived(
		options.find((option) => option.value === currentValue)?.label ?? 'プッシュ通知'
	);

	const selectMethod = (value: string) => {
		userConfig.setConfig({ notificationMethod: value as 'push' | 'email' | 'both' });
		modalState = false;
	};
</script>

<Dialog.Root bind:open={modalState}>
	<Dialog.Trigger class={buttonVariants({ variant: 'link' })}>{currentLabel}</Dialog.Trigger>
	<Dialog.Content class="w-full p-3 sm:p-5">
		<Dialog.Header class="mt-10">
			<Dialog.Title class="font-display text-lg sm:text-xl md:text-3xl">
				通知方法
			</Dialog.Title>
			<Dialog.Description class="text-muted-foreground text-sm">
				サブスクの通知方法を選択してください。
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
