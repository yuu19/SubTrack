<script lang="ts">
	import { resolveLocale } from '$lib/locale';
	import { getLocalizedSeoLinks } from '$lib/locale-routing';
	import { getLocale } from '$lib/paraglide/runtime';
	import { commercePageCopy } from '$lib/content/site-content';

	const locale = $derived(resolveLocale(getLocale()));
	const copy = $derived(commercePageCopy[locale]);
	const seoLinks = $derived(getLocalizedSeoLinks('/commercial-transactions', locale));
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
		<h1 class="text-4xl font-semibold tracking-tight md:text-5xl">{copy.title}</h1>
		<p class="text-muted-foreground max-w-3xl text-base leading-7 md:text-lg">
			{copy.description}
		</p>
	</section>

	<section class="overflow-hidden rounded-3xl border">
		<div class="divide-y">
			{#each copy.rows as row (row.label)}
				<div class="grid gap-3 px-5 py-4 md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 md:px-6">
					<div class="font-medium">{row.label}</div>
					<div class="text-muted-foreground leading-7">{row.value}</div>
				</div>
			{/each}
		</div>
	</section>

	<p class="text-muted-foreground text-sm">{copy.note}</p>
</main>
