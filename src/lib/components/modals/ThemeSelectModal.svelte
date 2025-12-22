<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { buttonVariants } from '$lib/components/ui/button';
	import { THEMES, THEME_COLORS, type Theme } from '$lib/themes';
	import { UserConfigContext } from '$lib/states/userConfig.svelte';
	import { setTheme } from 'mode-watcher';
	import Check from 'lucide-svelte/icons/check';
	import { m } from '$lib/paraglide/messages.js';

	let modalState = $state(false);
	const userConfig = UserConfigContext.get();

	const activeTheme = $derived((userConfig.current.activeTheme ?? 'default') as Theme);
	const themeLabel = $derived(
		activeTheme === 'default' ? m.settings_theme_default() : activeTheme
	);

	function selectTheme(theme: Theme) {
		userConfig.setConfig({ activeTheme: theme });
		setTheme(theme);
	}
</script>

<Dialog.Root bind:open={modalState}>
	<Dialog.Trigger class={buttonVariants({ variant: 'link' })}>{themeLabel}</Dialog.Trigger>
	<Dialog.Content class="w-full p-3 sm:p-5">
		<Dialog.Header class="mt-10">
			<Dialog.Title class="font-display text-lg sm:text-xl md:text-3xl">
				{m.settings_theme_title()}
			</Dialog.Title>
		</Dialog.Header>

		<div class="mt-6 flex flex-col gap-3">
			<span class="text-sm font-medium text-foreground">{m.settings_theme_label()}</span>
			<div class="grid grid-cols-6 gap-2 sm:grid-cols-11">
				{#each THEMES as theme (theme)}
					<button
						type="button"
						onclick={() => selectTheme(theme)}
						class="group relative flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						style="background-color: {THEME_COLORS[theme]}"
						title={theme}
					>
						{#if activeTheme === theme}
							<Check class="h-5 w-5 text-white drop-shadow-md" />
						{/if}
						<span class="sr-only">{theme}</span>
					</button>
				{/each}
			</div>
			<p class="text-sm text-muted-foreground">
				{m.settings_theme_selected_label()}
				<span class="font-medium capitalize" style="color: {THEME_COLORS[activeTheme]}">
					{themeLabel}
				</span>
			</p>
		</div>
	</Dialog.Content>
</Dialog.Root>
