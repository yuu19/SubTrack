<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';

	let { children } = $props();
</script>

<div class="mx-auto w-full max-w-5xl px-4 pt-8 md:pt-10">
	<div class="space-y-2">
		<h1 class="text-2xl font-semibold tracking-tight md:text-3xl">
			{m.nav_settings()}
		</h1>
		<p class="text-muted-foreground text-sm md:text-base">
			{m.settings_page_description()}
		</p>
	</div>
</div>

<div class="mx-auto my-8 w-full max-w-5xl px-4 md:my-10">
	{@render children()}
</div>
