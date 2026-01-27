<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';

	let { children } = $props();
</script>

<div class="mx-auto mt-10 w-full max-w-4xl px-3">
	<div class="flex items-center justify-between">
		<h1 class="font-display text-4xl font-bold text-primary capitalize">
			{m.nav_profile()} / {m.nav_settings()}
		</h1>
	</div>
</div>

<div class="mx-auto my-10 w-full max-w-4xl px-3 md:px-0">
	{@render children()}
</div>
