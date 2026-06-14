<script lang="ts">
	import type { AppLocale } from '$lib/constant';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		LanguageSwitcher as LanguageSwitcherPrimitive,
		type Language
	} from '$lib/components/ui/language-switcher';
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
			code: 'ja',
			label: 'ja'
		},
		{
			code: 'en',
			label: 'en'
		}
	] satisfies Language[];

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

<LanguageSwitcherPrimitive
	languages={localeOptions}
	value={currentLocale}
	ariaLabel={m.language_label()}
	onChange={switchLocale}
/>
