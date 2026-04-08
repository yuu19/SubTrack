<script lang="ts">
	import { Toaster } from 'svelte-sonner';
	import '../app.css';
	import '../nprogress.css';
	import NProgress from 'nprogress';
	import { browser } from '$app/environment';
	import { baseLocale, getLocale, isLocale, setLocale } from '$lib/paraglide/runtime';

	import { afterNavigate, beforeNavigate } from '$app/navigation';

	let { children } = $props();

	if (browser) {
		const docLang = document.documentElement.lang;
		const locale = isLocale(docLang) ? docLang : baseLocale;

		try {
			if (getLocale() !== locale) {
				void setLocale(locale, { reload: false });
			}
		} catch {
			void setLocale(locale, { reload: false });
		}
	}

	if (browser) {
		NProgress.configure({
			showSpinner: false
		});

		beforeNavigate((navigation) => {
			if (navigation.willUnload) return;
			NProgress.start();
		});

		afterNavigate(() => {
			NProgress.done();
		});
	}
</script>

<svelte:head>
	<link rel="manifest" href="/manifest.webmanifest" />
	<link rel="apple-touch-icon" href="/favicon.png" />
	<meta name="theme-color" content="#ffffff" />
</svelte:head>

<Toaster closeButton richColors />

{@render children()}
