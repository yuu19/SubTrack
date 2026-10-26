<script lang="ts">
	import { navigating, page } from '$app/state';
	import { resolve } from '$app/paths';
	import { resolveLocale } from '$lib/locale';
	import { localizeInternalHref } from '$lib/locale-routing';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime';
	import { cn } from '$lib/utils';
	import { CalendarDays, CreditCard, LoaderCircle, PieChart, Settings } from 'lucide-svelte';

	const currentLocale = $derived(resolveLocale(getLocale()));
	const localizedHref = (href: string) => localizeInternalHref(resolve(href), currentLocale);
	const items = $derived([
		{
			href: localizedHref('/subscriptions'),
			label: () => m.mobile_nav_subscriptions(),
			icon: CreditCard
		},
		{
			href: localizedHref('/calendar'),
			label: () => m.mobile_nav_calendar(),
			icon: CalendarDays
		},
		{
			href: localizedHref('/analysis'),
			label: () => m.mobile_nav_analysis(),
			icon: PieChart
		},
		{
			href: localizedHref('/me/settings'),
			label: () => m.nav_settings(),
			icon: Settings
		}
	]);

	const pathname = $derived(page.url.pathname);
	const pendingPathname = $derived(navigating.to?.url.pathname);

	const matchesPath = (path: string | undefined, href: string) => {
		return path === href || path?.startsWith(`${href}/`) === true;
	};
</script>

<nav class="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden" aria-label="Primary">
	<div class="mx-auto w-full max-w-[420px] px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
		<div
			class="bg-background/90 pointer-events-auto flex items-center justify-between rounded-full border px-3 py-2 shadow-lg shadow-black/10 backdrop-blur"
		>
			{#each items as item (item.href)}
				{@const active = matchesPath(pathname, item.href)}
				{@const pending = matchesPath(pendingPathname, item.href)}
				{@const highlighted = pendingPathname ? pending : active}
				{@const Icon = item.icon}
				<a
					href={item.href}
					data-sveltekit-preload-code="viewport"
					class={cn(
						'flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-100 active:scale-95 motion-reduce:transition-none',
						highlighted
							? 'bg-primary text-primary-foreground shadow-md shadow-black/20'
							: 'text-muted-foreground hover:text-foreground'
					)}
					aria-current={active ? 'page' : undefined}
					aria-busy={pending}
				>
					{#if pending}
						<LoaderCircle
							class="size-5 animate-spin motion-reduce:animate-none"
							aria-hidden="true"
						/>
					{:else}
						<Icon class="size-5" aria-hidden="true" />
					{/if}
					<span class="sr-only">{item.label()}</span>
				</a>
			{/each}
		</div>
	</div>
</nav>
