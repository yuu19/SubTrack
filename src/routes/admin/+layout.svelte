<script lang="ts">
	import { Home, LayoutDashboard, Layers2, RefreshCcw, Tags, User, Users } from 'lucide-svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';

	// Menu items.
	const items = [
		{
			title: 'Overview',
			url: 'overview',
			icon: LayoutDashboard
		},
		{
			title: 'Plans',
			url: 'plans',
			icon: Layers2
		},
		{
			title: 'Subscriptions',
			url: 'subscriptions',
			icon: RefreshCcw
		},
		{
			title: 'Subscribers',
			url: 'customers',
			icon: Users
		},
		{
			title: 'Plan Groups',
			url: 'plan-groups',
			icon: Tags
		},
		{
			title: 'Team',
			url: 'users',
			icon: User
		},
		{
			title: 'Customer Portal',
			url: '../',
			icon: Home
		}
	];

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
										<a href={'/admin/' + item.url} {...props}>
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
		<Sidebar.Trigger />
		{@render children?.()}
	</main>
</Sidebar.Provider>
