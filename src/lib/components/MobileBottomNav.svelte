<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { cn } from '$lib/utils';
	import { CalendarDays, CreditCard, LayoutGrid, PieChart, Settings } from 'lucide-svelte';

	const items = [
		{
			href: resolve('/'),
			label: 'Home',
			icon: LayoutGrid,
			exact: true
		},
		{
			href: resolve('/subscriptions'),
			label: 'Subscriptions',
			icon: CreditCard
		},
		{
			href: resolve('/analysis'),
			label: 'Analytics',
			icon: PieChart
		},
		{
			href: resolve('/calendar'),
			label: 'Calendar',
			icon: CalendarDays
		},
		{
			href: resolve('/me/settings'),
			label: 'Settings',
			icon: Settings
		}
	];

	const pathname = $derived(page.url.pathname);

	const isActive = (href: string, exact = false) => {
		if (exact) return pathname === href;
		return pathname === href || pathname.startsWith(`${href}/`);
	};
</script>

<nav class="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden" aria-label="Primary">
	<div class="mx-auto w-full max-w-[420px] px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
		<div
			class="pointer-events-auto flex items-center justify-between rounded-full border bg-background/90 px-3 py-2 shadow-lg shadow-black/10 backdrop-blur"
		>
		{#each items as item (item.href)}
			{@const active = isActive(item.href, item.exact)}
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
				<span class="sr-only">{item.label}</span>
			</a>
		{/each}
		</div>
	</div>
</nav>
