<script lang="ts">
	import { resolve } from '$app/paths';
	import SubTrackDemoExperience from '$lib/components/demo/SubTrackDemoExperience.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { demoPageCopy } from '$lib/content/site-content';
	import { resolveLocale } from '$lib/locale';
	import { getLocale } from '$lib/paraglide/runtime';
	import { ArrowLeft, Play } from 'lucide-svelte';

	const locale = $derived(resolveLocale(getLocale()));
	const copy = $derived(demoPageCopy[locale]);
</script>

<svelte:head>
	<title>{copy.headTitle}</title>
	<meta name="description" content={copy.headDescription} />
</svelte:head>

<main class="bg-background text-foreground min-h-screen">
	<div class="bg-background/95 sticky top-[57px] z-40 border-b backdrop-blur">
		<div
			class="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-8"
		>
			<div class="flex min-w-0 items-start gap-3">
				<span
					class="bg-primary text-primary-foreground inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold"
				>
					<Play class="size-3.5" />
					{copy.badge}
				</span>
				<div class="min-w-0">
					<p class="text-sm font-semibold">{copy.noticeTitle}</p>
					<p class="text-muted-foreground text-xs leading-5 sm:text-sm">{copy.notice}</p>
				</div>
			</div>
			<div class="flex shrink-0 flex-wrap gap-2">
				<Button href={`${resolve('/')}#start`} size="sm">
					{copy.hero.primaryAction}
				</Button>
				<Button href={resolve('/')} variant="outline" size="sm">
					<ArrowLeft class="size-4" />
					{copy.hero.secondaryAction}
				</Button>
			</div>
		</div>
	</div>

	<SubTrackDemoExperience {copy} {locale} />
</main>

<style>
	@media (max-width: 767px) {
		:global(#sentry-feedback) {
			display: none !important;
		}
	}
</style>
