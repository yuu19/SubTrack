<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { resolveLocale } from '$lib/locale';
	import { localizeInternalHref } from '$lib/locale-routing';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime';
	import { cn } from '$lib/utils';
	import { CalendarDays, CreditCard, PieChart, Settings } from 'lucide-svelte';

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

	const isActive = (href: string) => {
		return pathname === href || pathname.startsWith(`${href}/`);
	};
</script>

<nav class="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden" aria-label="Primary">
	<div class="mx-auto w-full max-w-[420px] px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
		<div
			class="bg-background/90 pointer-events-auto flex items-center justify-between rounded-full border px-3 py-2 shadow-lg shadow-black/10 backdrop-blur"
		>
			{#each items as item (item.href)}
				{@const active = isActive(item.href)}
				{@const Icon = item.icon}
				<a
					href={item.href}
					class={cn(
						'flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200',
						active
							? 'bg-primary text-primary-foreground shadow-md shadow-black/20'
							: 'text-muted-foreground hover:text-foreground'
					)}
					aria-current={active ? 'page' : undefined}
				>
					<Icon class="size-5" />
					<span class="sr-only">{item.label()}</span>
				</a>
			{/each}
		</div>
	</div>
</nav>
