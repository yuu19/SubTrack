<script lang="ts">
	import { Toaster } from 'svelte-sonner';
	import '../app.css';
	import NProgress from 'nprogress';

	import { afterNavigate, beforeNavigate } from '$app/navigation';

	let { children } = $props();

	beforeNavigate(() => {
		NProgress.start();
	});
	afterNavigate(() => {
		NProgress.done();
	});
	NProgress.configure({
		showSpinner: false
	});
</script>

<svelte:head>
	<link rel="manifest" href="/manifest.webmanifest" />
	<link rel="apple-touch-icon" href="/favicon.png" />
	<meta name="theme-color" content="#ffffff" />
</svelte:head>

<Toaster closeButton richColors />

{@render children()}
