<script lang="ts">
	import { Button } from '$lib/components/ui/button';
</script>

<main class="flex min-h-[60vh] flex-col gap-4 px-8 py-10">
	<h1 class="text-3xl font-semibold">Admin</h1>
	<p class="text-muted-foreground max-w-xl">
		Manage team access and monitor account activity from the team panel.
	</p>
	<div>
		<Button href="/admin/users">Go to team</Button>
	</div>
</main>
