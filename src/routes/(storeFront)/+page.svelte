<script lang="ts">
	import { page } from '$app/state';
	import { startLifetimeCheckout } from '$lib/client/lifetime-checkout';
	import Button from '$lib/components/ui/button/button.svelte';
	import GoogleAuthButton from '$lib/components/GoogleAuthButton.svelte';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();
	let isCreatingLifetimeCheckout = $state(false);

	const currentPlan = $derived(data.currentPlan ?? null);
	const isLoggedIn = $derived(Boolean(data.user));
	const shouldShowLifetimeEntry = $derived(isLoggedIn && !currentPlan?.isPremium);

	async function handleLifetimeCheckout() {
		if (isCreatingLifetimeCheckout) return;
		isCreatingLifetimeCheckout = true;
		try {
			await startLifetimeCheckout({
				returnPath: page.url.pathname,
				errorMessage: m.settings_lifetime_checkout_error(),
				purchasedMessage: m.settings_plan_lifetime_purchased()
			});
		} catch (error) {
			console.error('Failed to start lifetime checkout from home', error);
		} finally {
			isCreatingLifetimeCheckout = false;
		}
	}
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
	</div>
	<div class="flex flex-wrap gap-3">
		{#if isLoggedIn}
			<Button href="/subscriptions">{m.hero_cta_subscriptions()}</Button>
			<Button href="/calendar" variant="secondary">{m.hero_cta_calendar()}</Button>
		{:else}
			<GoogleAuthButton label={m.hero_cta_login_register()} />
		{/if}
	</div>
	{#if shouldShowLifetimeEntry}
		<section class="bg-card flex w-full max-w-2xl flex-col gap-4 rounded-2xl border p-5 shadow-sm">
			<div class="space-y-2">
				<p class="text-muted-foreground text-xs font-semibold tracking-[0.24em] uppercase">
					{m.lifetime_entry_badge()}
				</p>
				<h2 class="text-xl font-semibold md:text-2xl">{m.lifetime_entry_title()}</h2>
				<p class="text-muted-foreground text-sm md:text-base">
					{m.lifetime_entry_description()}
				</p>
			</div>
			<div class="flex flex-wrap gap-3">
				<Button onclick={handleLifetimeCheckout} disabled={isCreatingLifetimeCheckout}>
					{m.premium_modal_cta_lifetime()}
				</Button>
				<Button href="/me/settings#plan-info" variant="outline">
					{m.settings_premium_status_action()}
				</Button>
			</div>
			<p class="text-muted-foreground text-xs">{m.premium_modal_lifetime_caption()}</p>
		</section>
	{/if}
</main>
