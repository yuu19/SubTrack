<script lang="ts">
	import GoogleAuthButton from '$lib/components/GoogleAuthButton.svelte';
	import { m } from '$lib/paraglide/messages.js';
</script>

<main
	class="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-start justify-center gap-6 px-4 py-10"
>
	<div class="space-y-3">
		<p class="text-muted-foreground text-sm tracking-[0.3em] uppercase">{m.hero_brand()}</p>
		<h1 class="text-4xl leading-tight font-semibold md:text-6xl">
			{m.hero_title()}
		</h1>
		<p class="text-muted-foreground max-w-xl text-base md:text-lg">
			{m.hero_desc()}
		</p>
		<p class="text-muted-foreground max-w-xl text-sm md:text-base">
			{m.hero_note()}
		</p>
	</div>
	<div class="flex flex-wrap gap-3">
		<GoogleAuthButton label={m.hero_cta_login_register()} />
	</div>
</main>
