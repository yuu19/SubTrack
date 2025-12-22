<script lang="ts">
	import { watch } from 'runed';
	import { UserConfig, UserConfigContext } from '$lib/states/userConfig.svelte';
	import { ModeWatcher, setTheme } from 'mode-watcher';
	import Header from '$lib/components/Header.svelte';

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
{@render children()}
