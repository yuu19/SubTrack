<script lang="ts">
	import { resolve } from '$app/paths';
	import { resolveLocale } from '$lib/locale';
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages.js';

	const locale = $derived(resolveLocale(getLocale()));
	const copy = $derived(
		locale === 'en'
			? {
					faq: 'FAQ',
					commerce: 'Commercial Transactions',
					caption: 'Legal information and support resources for SubTrack'
				}
			: {
					faq: 'よくある質問',
					commerce: '特定商取引法に基づく表記',
					caption: 'SubTrack の公開情報とサポート案内'
				}
	);

	const links = $derived([
		{ href: resolve('/faq'), label: copy.faq },
		{ href: resolve('/commercial-transactions'), label: copy.commerce },
		{ href: resolve('/terms'), label: m.legal_terms() },
		{ href: resolve('/privacy'), label: m.legal_privacy() }
	]);
</script>

<footer class="border-t bg-muted/30">
	<div class="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 text-sm md:flex-row md:items-center md:justify-between">
		<div class="space-y-1">
			<p class="font-medium">SubTrack</p>
			<p class="text-muted-foreground">{copy.caption}</p>
		</div>
		<nav aria-label="Footer" class="flex flex-wrap items-center gap-x-4 gap-y-2">
			{#each links as link (link.href)}
				<a class="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline" href={link.href}>
					{link.label}
				</a>
			{/each}
		</nav>
	</div>
</footer>
