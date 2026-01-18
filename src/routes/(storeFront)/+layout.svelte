<script lang="ts">
	import { watch } from 'runed';
	import { UserConfig, UserConfigContext } from '$lib/states/userConfig.svelte';
	import { ModeWatcher, setTheme } from 'mode-watcher';
	import Header from '$lib/components/Header.svelte';
	import OnboardingDialog from '$lib/components/onboarding/OnboardingDialog.svelte';
	import MobileBottomNav from '$lib/components/MobileBottomNav.svelte';

	let { children, data } = $props();
	// todo: この部分について修正する必要があるか確認する
	const userConfig = UserConfigContext.set(new UserConfig(data.userConfig));

	const modeClasses = $derived([
		`theme-${userConfig.current.activeTheme}`,
	]);
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
{#if data.user}
	<OnboardingDialog
		userId={data.user.id}
		onboardingCompleted={data.user.onboardingCompleted ?? true}
		alwaysShow={data.isAdmin}
	/>
{/if}
{#if data.user}
	<div class="pb-[calc(env(safe-area-inset-bottom)+6rem)] md:pb-0">
		{@render children()}
	</div>
	<MobileBottomNav />
{:else}
	{@render children()}
{/if}
