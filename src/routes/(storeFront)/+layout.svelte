<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { watch } from 'runed';
	import { UserConfig, UserConfigContext } from '$lib/states/userConfig.svelte';
	import { ModeWatcher, setTheme } from 'mode-watcher';
	import Header from '$lib/components/Header.svelte';
	import OnboardingDialog from '$lib/components/onboarding/OnboardingDialog.svelte';
	import MobileBottomNav from '$lib/components/MobileBottomNav.svelte';
	import PublicFooter from '$lib/components/PublicFooter.svelte';

	const props = $props();
	// todo: この部分について修正する必要があるか確認する
	const userConfig = UserConfigContext.set(new UserConfig(props.data.userConfig));
	const homePath = resolve('/');

	const modeClasses = $derived([`theme-${userConfig.current.activeTheme}`]);
	const showPublicFooter = $derived(page.url.pathname === homePath);
	watch.pre(
		() => userConfig.current.activeTheme,
		() => {
			setTheme(userConfig.current.activeTheme);
		}
	);
	const themeColors = { light: '#ffffff', dark: '#09090b' };
</script>

<ModeWatcher
	defaultMode="system"
	disableTransitions
	defaultTheme={userConfig.current.activeTheme}
	{themeColors}
	darkClassNames={['dark', ...modeClasses]}
	lightClassNames={['light', ...modeClasses]}
/>

<Header />
{#if props.data.user}
	<OnboardingDialog
		userId={props.data.user.id}
		onboardingCompleted={props.data.user.onboardingCompleted ?? true}
		alwaysShow={props.data.isAdmin}
	/>
{/if}
{#if props.data.user}
	<div class="pb-[calc(env(safe-area-inset-bottom)+6rem)] md:pb-0">
		{@render props.children()}
	</div>
	<MobileBottomNav />
{:else}
	{@render props.children()}
{/if}
{#if showPublicFooter}
	<PublicFooter />
{/if}
