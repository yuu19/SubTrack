<script lang="ts">
	import { Verified } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
</script>

<main class="grid h-[500px] place-items-center px-3">
	<div class="bg-primary/20 mx-auto max-w-[350px] space-y-3 rounded-md p-5 text-center">
		<Verified class="text-primary mx-auto " />

		<h1 class="font-display text-primary text-2xl font-bold capitalize">confirmed successfully</h1>
		<p>Your email has been updated successfully</p>

		<Button href="/me/personal-info" class="shadow-md">Go to your account page</Button>
		<Button href="/subscriptions" variant="secondary" class="shadow-md"
			>View subscriptions</Button
		>
	</div>
</main>
