<script lang="ts">
	import Button from './ui/button/button.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Avatar from '$lib/components/ui/avatar';
	import { ChevronDown, Menu } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import { authClient } from '$lib/auth-client';
	import { invalidateAll } from '$app/navigation';

	import {
		loginModalState,
		mobileAuthState,
		registerModalState
	} from '$lib/states/modalState.svelte';
	import LoginModal from './modals/LoginModal.svelte';
	import RegisterModal from './modals/RegisterModal.svelte';
	import ConfirmEmailModal from './modals/ConfirmEmailModal.svelte';
	import ResetPasswordModal from './modals/ResetPasswordModal.svelte';
	import MobileAuth from './modals/MobileAuth.svelte';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';

	function getUserInitial(name: string) {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('');
	}
	// const session = authClient.useSession();
	const accountPages = [
		{
			title: () => m.nav_profile(),
			href: '/me/personal-info'
		},
		{
			title: () => m.nav_settings(),
			href: '/me/settings'
		}
	];
</script>

<header
	class={cn(
		'bg-background sticky top-0 left-0 z-50 flex items-center justify-between border px-3 py-3 md:px-10'
	)}
>
	<a href="/" class="text-2xl capitalize">
		<span class="text-primary font-bold">SubTrack</span>
	</a>

	<div class="flex items-center gap-2 md:gap-6">
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
									<a href="/admin" {...props}>{m.nav_admin_dashboard()}</a>
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
			<div class="hidden items-center gap-2 md:flex">
				<Button onclick={() => loginModalState.setTrue()} variant="ghost">{m.action_login()}</Button
				>
				<Button onclick={() => registerModalState.setTrue()}>{m.action_register()}</Button>
			</div>
			<button
				onclick={() => {
					mobileAuthState.setTrue();
				}}
				class="hover:bg-secondary flex size-10 items-center justify-center rounded-full md:hidden"
			>
				<Menu class="size-6 " />
			</button>
		{/if}
<!-- todo 将来的に多言語対応を整備する -->
		<!-- <LanguageSwitcher /> -->

	</div>
</header>
<LoginModal />
<RegisterModal />
<ConfirmEmailModal />
<ResetPasswordModal />
<MobileAuth />
<!-- 
-->
