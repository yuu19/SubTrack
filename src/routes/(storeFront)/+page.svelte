<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
</script>

<main class="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-start justify-center gap-6 px-4 py-10">
	<div class="space-y-3">
		<p class="text-muted-foreground text-sm uppercase tracking-[0.3em]">SubTrack</p>
		<h1 class="text-4xl font-semibold leading-tight md:text-6xl">
			All your subscriptions, one place.
		</h1>
		<p class="text-muted-foreground max-w-xl text-base md:text-lg">
			Track renewals, set reminders, and keep your monthly spending visible at a glance.
		</p>
	</div>
	<div class="flex flex-wrap gap-3">
		<Button href="/subscriptions">Open subscriptions</Button>
		<Button href="/calendar" variant="secondary">View calendar</Button>
	</div>
</main>
