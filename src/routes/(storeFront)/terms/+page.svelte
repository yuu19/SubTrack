<script lang="ts">
	import LegalDocument from '$lib/components/LegalDocument.svelte';
	import { termsDocuments, termsPageCopy } from '$lib/content/site-content';
	import { resolveLocale } from '$lib/locale';
	import { getLocalizedSeoLinks } from '$lib/locale-routing';
	import { getLocale } from '$lib/paraglide/runtime';

	const locale = $derived(resolveLocale(getLocale()));
	const copy = $derived(termsPageCopy[locale]);
	const document = $derived(termsDocuments[locale]);
	const seoLinks = $derived(getLocalizedSeoLinks('/terms', locale));
</script>

<svelte:head>
	<title>{copy.headTitle}</title>
	<meta name="description" content={copy.headDescription} />
	<link rel="canonical" href={seoLinks.canonical} />
	{#each seoLinks.alternates as alternate (alternate.hreflang)}
		<link rel="alternate" hreflang={alternate.hreflang} href={alternate.href} />
	{/each}
</svelte:head>

<main class="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:py-14">
	<section class="space-y-4">
		<p class="text-muted-foreground text-sm tracking-[0.3em] uppercase">{copy.eyebrow}</p>
		<h1 class="text-4xl font-semibold tracking-tight md:text-5xl">{document.title}</h1>
		<p class="text-muted-foreground text-sm">
			{copy.updatedLabel}: {document.updatedAt}
		</p>
	</section>

	<LegalDocument {document} />
</main>
