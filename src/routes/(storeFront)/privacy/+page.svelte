<script lang="ts">
	import LegalDocument from '$lib/components/LegalDocument.svelte';
	import { privacyDocument } from '$lib/content/site-content';
	import { resolveLocale } from '$lib/locale';
	import { getLocale } from '$lib/paraglide/runtime';

	const locale = $derived(resolveLocale(getLocale()));
	const headTitle = $derived(
		locale === 'en' ? 'Privacy Policy | SubTrack' : 'プライバシーポリシー | SubTrack'
	);
	const headDescription = $derived(
		locale === 'en'
			? 'Read the SubTrack privacy policy.'
			: 'SubTrack のプライバシーポリシーです。'
	);
</script>

<svelte:head>
	<title>{headTitle}</title>
	<meta name="description" content={headDescription} />
</svelte:head>

<main class="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:py-14">
	<section class="space-y-4">
		<p class="text-muted-foreground text-sm uppercase tracking-[0.3em]">Privacy Policy</p>
		<h1 class="text-4xl font-semibold tracking-tight md:text-5xl">{privacyDocument.title}</h1>
		<p class="text-muted-foreground text-sm">
			{locale === 'en' ? 'Last updated' : '最終更新日'}: {privacyDocument.updatedAt}
		</p>
	</section>

	<LegalDocument document={privacyDocument} />
</main>
