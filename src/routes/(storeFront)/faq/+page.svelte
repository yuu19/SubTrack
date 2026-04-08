<script lang="ts">
	import { resolve } from '$app/paths';
	import { resolveLocale } from '$lib/locale';
	import { getLocale } from '$lib/paraglide/runtime';
	import { faqPageCopy } from '$lib/content/site-content';

	const locale = $derived(resolveLocale(getLocale()));
	const copy = $derived(faqPageCopy[locale]);
</script>

<svelte:head>
	<title>{copy.headTitle}</title>
	<meta name="description" content={copy.headDescription} />
</svelte:head>

<main class="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:py-14">
	<section class="space-y-4">
		<p class="text-muted-foreground text-sm uppercase tracking-[0.3em]">{copy.eyebrow}</p>
		<h1 class="text-4xl font-semibold tracking-tight md:text-5xl">{copy.title}</h1>
		<p class="text-muted-foreground max-w-3xl text-base leading-7 md:text-lg">
			{copy.description}
		</p>
	</section>

	<div class="grid gap-6">
		{#each copy.categories as category (category.title)}
			<section class="rounded-3xl border bg-white/70 p-6 shadow-sm dark:bg-zinc-950/40">
				<div class="space-y-4">
					<h2 class="text-xl font-semibold">{category.title}</h2>
					<div class="grid gap-4">
						{#each category.items as item (item.question)}
							<article class="rounded-2xl border bg-background p-5">
								<h3 class="text-base font-semibold">{item.question}</h3>
								<p class="text-muted-foreground mt-2 leading-7">{item.answer}</p>
							</article>
						{/each}
					</div>
				</div>
			</section>
		{/each}
	</div>

	<section class="text-muted-foreground rounded-3xl border border-dashed px-5 py-4 text-sm leading-7">
		<p>
			{locale === 'en'
				? 'For details on data handling and service terms, review the privacy policy and terms pages.'
				: 'データの取り扱いと利用条件の詳細は、プライバシーポリシーと利用規約をご確認ください。'}
		</p>
		<div class="mt-3 flex flex-wrap gap-4">
			<a class="underline-offset-4 hover:underline" href={resolve('/terms')}>
				{locale === 'en' ? 'Terms' : '利用規約'}
			</a>
			<a class="underline-offset-4 hover:underline" href={resolve('/privacy')}>
				{locale === 'en' ? 'Privacy policy' : 'プライバシーポリシー'}
			</a>
		</div>
	</section>
</main>
