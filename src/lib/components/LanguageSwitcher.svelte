<script lang="ts">
	import type { AppLocale } from '$lib/constant';
	import { UserConfigContext } from '$lib/states/userConfig.svelte';
	import { isLocale, setLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages.js';
	import { toast } from 'svelte-sonner';

	const userConfig = UserConfigContext.get();
	const currentLocale = $derived(userConfig.current.locale);
	const localeOptions = [
		{
			value: 'ja' as const,
			label: () => m.language_option_ja()
		},
		{
			value: 'en' as const,
			label: () => m.language_option_en()
		}
	];

	const switchLocale = async (locale: string) => {
		if (!isLocale(locale) || locale === currentLocale) return;

		const previousLocale = currentLocale;
		const persisted = await userConfig.updateConfig({ locale: locale as AppLocale });
		if (!persisted) {
			userConfig.setLocale(previousLocale);
			toast.error(m.settings_language_save_error());
			return;
		}

		await setLocale(locale);
	};
</script>

<label class="sr-only" for="locale">{m.language_label()}</label>
<select
	id="locale"
	class="border-border bg-muted text-foreground hover:border-primary focus:border-primary rounded-full border px-3 py-1 text-sm shadow-sm"
	value={currentLocale}
	onchange={(event) => switchLocale((event.target as HTMLSelectElement).value)}
>
	{#each localeOptions as option (option.value)}
		<option value={option.value} selected={option.value === currentLocale}>{option.label()}</option>
	{/each}
</select>
