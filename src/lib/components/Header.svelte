<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Avatar from '$lib/components/ui/avatar';
	import { ChevronDown } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import { authClient } from '$lib/auth-client';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';

	function getUserInitial(name: string) {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('');
	}
	// const session = authClient.useSession();
	const mainNavItems = [
		{
			title: () => m.mobile_nav_home(),
			href: resolve('/'),
			exact: true
		},
		{
			title: () => m.mobile_nav_subscriptions(),
			href: resolve('/subscriptions')
		},
		{
			title: () => m.mobile_nav_calendar(),
			href: resolve('/calendar')
		},
		{
			title: () => m.mobile_nav_analysis(),
			href: resolve('/analysis')
		}
	];

	const accountPages = [
		{
			title: () => m.nav_settings(),
			href: resolve('/me/settings')
		}
	];

	const pathname = $derived(page.url.pathname);

	const isActive = (href: string, exact = false) => {
		if (exact) return pathname === href;
		return pathname === href || pathname.startsWith(`${href}/`);
	};
</script>

<header
	class={cn(
		'bg-background sticky top-0 left-0 z-50 flex items-center gap-4 border px-3 py-3 md:px-10'
	)}
>
	<a href={resolve('/')} class="text-2xl capitalize">
		<span class="text-primary font-bold">SubTrack</span>
	</a>

	{#if page.data.user}
		<nav class="hidden items-center gap-1 md:flex" aria-label="Primary">
			{#each mainNavItems as item (item.href)}
				{@const active = isActive(item.href, item.exact)}
				<a
					href={item.href}
					class={cn(
						'text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium transition-colors',
						active && 'bg-muted text-foreground'
					)}
					aria-current={active ? 'page' : undefined}
				>
					{item.title()}
				</a>
			{/each}
		</nav>
	{/if}

	<div class="ml-auto flex items-center gap-2 md:gap-6">
		{#if page.data.user}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger
					class="border-border bg-muted flex items-center gap-3 rounded-3xl border p-1"
				>
					<Avatar.Root class="ring-primary ring">
						<Avatar.Image alt="profile picture" />
						<Avatar.Fallback class="capitalize">
							{getUserInitial(page.data.user.name)}
						</Avatar.Fallback>
					</Avatar.Root>

					<ChevronDown />
				</DropdownMenu.Trigger>
				<DropdownMenu.Content class="w-56">
					<DropdownMenu.Label>{m.nav_my_account()}</DropdownMenu.Label>
					<DropdownMenu.Separator />
					<DropdownMenu.Group>
						{#each accountPages as { title, href } (href)}
							<DropdownMenu.Item>
								{#snippet child({ props })}
									<a {href} {...props}>{title()}</a>
								{/snippet}
							</DropdownMenu.Item>
						{/each}
						{#if page.data.user.role === 'admin'}
							<DropdownMenu.Item>
								{#snippet child({ props })}
									<a href={resolve('/admin')} {...props}>{m.nav_admin_dashboard()}</a>
								{/snippet}
							</DropdownMenu.Item>
						{/if}
					</DropdownMenu.Group>
					<DropdownMenu.Separator />

					<DropdownMenu.Item
						onclick={async () => {
							await authClient.signOut();
							invalidateAll();
						}}>{m.action_logout()}</DropdownMenu.Item
					>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		{:else}
			<div class="flex items-center"></div>
		{/if}
		<!-- todo 将来的に多言語対応を整備する -->
		<!-- <LanguageSwitcher /> -->
	</div>
</header>
<!-- 
-->
