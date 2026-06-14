<script lang="ts">
	import type { AppLocale } from '$lib/constant';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { isAppLocale, localizeInternalHref } from '$lib/locale-routing';
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages.js';
	import { toast } from 'svelte-sonner';

	type LocaleSaveResponse = {
		ok: boolean;
		persistedUser?: boolean;
		persistedCookie?: boolean;
		error?: string;
	};

	const currentLocale = $derived(getLocale() as AppLocale);
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
		if (!isAppLocale(locale) || locale === currentLocale) return;

		const currentHref = `${page.url.pathname}${page.url.search}${page.url.hash}`;
		const targetHref = localizeInternalHref(currentHref, locale);
		let shouldShowSaveError = false;

		try {
			const response = await fetch('/api/locale', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({ locale })
			});
			const result = (await response.json().catch(() => null)) as LocaleSaveResponse | null;
			shouldShowSaveError = !response.ok || result?.ok === false;
		} catch {
			shouldShowSaveError = true;
		}

		if (shouldShowSaveError) {
			toast.error(m.settings_language_save_error());
		}

		await goto(targetHref, { invalidateAll: true });
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
