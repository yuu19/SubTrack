<script lang="ts">
	import { resolve } from '$app/paths';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import { resolveLocale } from '$lib/locale';
	import { localizeInternalHref } from '$lib/locale-routing';
	import { getLocale } from '$lib/paraglide/runtime';
	import { Home, ShieldCheck, User } from 'lucide-svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';

	const currentLocale = $derived(resolveLocale(getLocale()));
	type AdminRoute = '/admin/users' | '/admin/security' | '/subscriptions';
	const localizedHref = (href: AdminRoute) => localizeInternalHref(resolve(href), currentLocale);
	const items = $derived([
		{
			title: 'Team',
			href: localizedHref('/admin/users'),
			icon: User
		},
		{
			title: 'Security',
			href: localizedHref('/admin/security'),
			icon: ShieldCheck
		},
		{
			title: 'Customer Portal',
			href: localizedHref('/subscriptions'),
			icon: Home
		}
	]);

	let { children } = $props();
</script>

<Sidebar.Provider>
	<Sidebar.Root>
		<Sidebar.Content>
			<Sidebar.Group>
				<Sidebar.GroupLabel>Application</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each items as item (item.title)}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton>
									{#snippet child({ props })}
										<a href={item.href} {...props}>
											<item.icon />
											<span>{item.title}</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		</Sidebar.Content>
	</Sidebar.Root>
	<main class=" flex-1">
		<div class="flex items-center justify-between gap-3 p-3">
			<Sidebar.Trigger />
			<LanguageSwitcher />
		</div>
		{@render children?.()}
	</main>
</Sidebar.Provider>
