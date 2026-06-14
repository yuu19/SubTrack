<script lang="ts" module>
	export type Language = {
		/** Language code (e.g., 'en', 'ja') */
		code: string;
		/** Display label (e.g., 'en', 'ja') */
		label: string;
	};

	export type LanguageSwitcherProps = {
		/** List of available languages */
		languages: Language[];

		/** Current selected language code */
		value?: string;

		/** Dropdown alignment */
		align?: 'start' | 'center' | 'end';

		/** Button variant */
		variant?: 'outline' | 'ghost';

		/** Accessible label for the trigger */
		ariaLabel?: string;

		/** Called when the language changes */
		onChange?: (code: string) => void;

		class?: string;
	};
</script>

<script lang="ts">
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { buttonVariants } from '$lib/components/ui/button';
	import { cn } from '$lib/utils.js';

	let {
		languages = [],
		value = $bindable(''),
		align = 'end',
		variant = 'outline',
		ariaLabel = 'Change language',
		onChange,
		class: className
	}: LanguageSwitcherProps = $props();

	const selectedLanguage = $derived(languages.find((language) => language.code === value));
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class={cn(buttonVariants({ variant, size: 'sm' }), 'min-w-16 px-2.5', className)}
		aria-label={ariaLabel}
	>
		<GlobeIcon class="size-4" />
		<span class="font-mono text-xs uppercase">{selectedLanguage?.label ?? value}</span>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content {align} class="min-w-20">
		<DropdownMenu.RadioGroup bind:value onValueChange={onChange}>
			{#each languages as language (language.code)}
				<DropdownMenu.RadioItem value={language.code} class="font-mono text-xs uppercase">
					{language.label}
				</DropdownMenu.RadioItem>
			{/each}
		</DropdownMenu.RadioGroup>
	</DropdownMenu.Content>
</DropdownMenu.Root>
