<script lang="ts">
	import { resolve } from '$app/paths';
	import { resolveLocale } from '$lib/locale';
	import { getLocalizedSeoLinks, localizeInternalHref } from '$lib/locale-routing';
	import { getLocale } from '$lib/paraglide/runtime';
	import { faqPageCopy } from '$lib/content/site-content';
	import { ChevronDown } from 'lucide-svelte';

	const locale = $derived(resolveLocale(getLocale()));
	const copy = $derived(faqPageCopy[locale]);
	const seoLinks = $derived(getLocalizedSeoLinks('/faq', locale));
	const localizedHref = (href: string) => localizeInternalHref(resolve(href), locale);
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
		<p class="text-muted-foreground text-sm uppercase">{copy.eyebrow}</p>
		<h1 class="text-4xl font-semibold md:text-5xl">{copy.title}</h1>
		<p class="text-muted-foreground max-w-3xl text-base leading-7 md:text-lg">
			{copy.description}
		</p>
	</section>

	<div class="grid gap-8">
		{#each copy.categories as category (category.title)}
			<section class="space-y-4">
				<h2 class="text-xl font-semibold">{category.title}</h2>
				<div class="grid gap-3">
					{#each category.items as item (item.question)}
						<details class="group bg-background rounded-lg border shadow-sm">
							<summary
								class="focus-visible:ring-ring flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
							>
								<span class="font-semibold">{item.question}</span>
								<ChevronDown
									class="text-muted-foreground size-5 shrink-0 transition-transform group-open:rotate-180"
									aria-hidden="true"
								/>
							</summary>
							<div class="border-t px-5 py-4">
								<p class="text-muted-foreground leading-7">{item.answer}</p>
								{#if item.link}
									<a
										class="mt-3 inline-flex text-sm font-medium underline-offset-4 hover:underline"
										href={item.link.href}
										target="_blank"
										rel="noreferrer"
									>
										{item.link.label}
									</a>
								{/if}
							</div>
						</details>
					{/each}
				</div>
			</section>
		{/each}
	</div>

	<section
		class="text-muted-foreground rounded-3xl border border-dashed px-5 py-4 text-sm leading-7"
	>
		<p>
			{locale === 'en'
				? 'For details on data handling and service terms, review the privacy policy and terms pages.'
				: 'データの取り扱いと利用条件の詳細は、プライバシーポリシーと利用規約をご確認ください。'}
		</p>
		<div class="mt-3 flex flex-wrap gap-4">
			<a class="underline-offset-4 hover:underline" href={localizedHref('/terms')}>
				{locale === 'en' ? 'Terms' : '利用規約'}
			</a>
			<a class="underline-offset-4 hover:underline" href={localizedHref('/privacy')}>
				{locale === 'en' ? 'Privacy policy' : 'プライバシーポリシー'}
			</a>
		</div>
	</section>
</main>
