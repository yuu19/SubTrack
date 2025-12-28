<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { ChevronDown } from 'lucide-svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { authClient } from '$lib/auth-client';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	let { data } = $props();
	console.log('🚀 ~ data:', data);
</script>

<div class="flex-1 space-y-4 p-8 pt-6">
	<div class="flex items-center justify-between space-y-2">
		<h2 class="text-3xl font-bold tracking-tight">Team Members</h2>
		<div class="flex items-center space-x-2">
			<Input class="w-[150px] lg:w-[250px]" placeholder="Search team members..." />
			<Button href="/admin/users/add">Invite Member</Button>
		</div>
	</div>
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head>Name</Table.Head>
				<Table.Head>Email</Table.Head>
				<Table.Head>Role</Table.Head>
				<Table.Head>Access</Table.Head>
				<Table.Head>Added</Table.Head>
				<!-- <Table.Head>Order Count</Table.Head> -->
				<Table.Head class="text-right">Actions</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each data.users as user (user.id)}
				<Table.Row>
					<Table.Cell>{user.name}</Table.Cell>
					<Table.Cell>{user.email}</Table.Cell>
					<Table.Cell>{user.role}</Table.Cell>
					<Table.Cell>{!user.banned ? 'active' : 'suspended'}</Table.Cell>
					<Table.Cell>{user.createdAt}</Table.Cell>
					<!-- <Table.Cell>{user.orderCount}</Table.Cell> -->
					<Table.Cell class="text-right">
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								<Button variant="outline" size="icon">
									<ChevronDown />
								</Button>
							</DropdownMenu.Trigger>
							<DropdownMenu.Content>
								{#if user.banned}
									<DropdownMenu.Item
										onclick={async () => {
											const res = await authClient.admin.unbanUser({
												userId: user.id
											});
											if (res.error) {
												toast.error(res.error.message || '');
												return;
											}
											toast.success('Access restored');
											invalidateAll();
										}}
									>
										Restore access
									</DropdownMenu.Item>
								{:else}
									<DropdownMenu.Item
										onclick={async () => {
											const res = await authClient.admin.banUser({
												userId: user.id
											});
											if (res.error) {
												toast.error(res.error.message || '');
												return;
											}
											toast.success('Access suspended');
											invalidateAll();
										}}
									>
										Suspend access
									</DropdownMenu.Item>
								{/if}
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>
