<script lang="ts">
	import { page } from '$app/state';
	import { watch } from 'runed';
	import { UserConfig, UserConfigContext } from '$lib/states/userConfig.svelte';
	import { ModeWatcher, setTheme } from 'mode-watcher';
	import Header from '$lib/components/Header.svelte';
	import OnboardingDialog from '$lib/components/onboarding/OnboardingDialog.svelte';
	import MobileBottomNav from '$lib/components/MobileBottomNav.svelte';
	import PublicFooter from '$lib/components/PublicFooter.svelte';
	import { DEFAULT_TIME_ZONE } from '$lib/constant';
	import { stripLocalePrefix } from '$lib/locale-routing';
	import { isValidTimeZone } from '$lib/time-zone';

	const props = $props();
	// todo: この部分について修正する必要があるか確認する
	const userConfig = UserConfigContext.set(new UserConfig(props.data.userConfig));

	const modeClasses = $derived([`theme-${userConfig.current.activeTheme}`]);
	const showPublicFooter = $derived(stripLocalePrefix(page.url.pathname) === '/');
	watch.pre(
		() => userConfig.current.activeTheme,
		() => {
			setTheme(userConfig.current.activeTheme);
		}
	);
	$effect(() => {
		if (!props.data.user || typeof window === 'undefined') return;
		const storageKey = `subtrack_timezone_initialized:${props.data.user.id}`;
		if (window.localStorage.getItem(storageKey) === '1') return;

		const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		window.localStorage.setItem(storageKey, '1');
		if (
			isValidTimeZone(detectedTimeZone) &&
			userConfig.current.timeZone === DEFAULT_TIME_ZONE &&
			detectedTimeZone !== DEFAULT_TIME_ZONE
		) {
			void userConfig.updateConfig({ timeZone: detectedTimeZone });
		}
	});
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
