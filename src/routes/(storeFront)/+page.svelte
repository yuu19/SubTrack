<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { m } from '$lib/paraglide/messages.js';
</script>

<main class="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-start justify-center gap-6 px-4 py-10">
	<div class="space-y-3">
		<p class="text-muted-foreground text-sm uppercase tracking-[0.3em]">{m.hero_brand()}</p>
		<h1 class="text-4xl font-semibold leading-tight md:text-6xl">
			{m.hero_title()}
		</h1>
		<p class="text-muted-foreground max-w-xl text-base md:text-lg">
			{m.hero_desc()}
		</p>
	</div>
	<div class="flex flex-wrap gap-3">
		<Button href="/subscriptions">{m.hero_cta_subscriptions()}</Button>
		<Button href="/calendar" variant="secondary">{m.hero_cta_calendar()}</Button>
	</div>
</main>
