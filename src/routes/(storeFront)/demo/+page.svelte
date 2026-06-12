<script lang="ts">
	import { resolve } from '$app/paths';
	import SubTrackDemoExperience from '$lib/components/demo/SubTrackDemoExperience.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { demoPageCopy } from '$lib/content/site-content';
	import { resolveLocale } from '$lib/locale';
	import { getLocale } from '$lib/paraglide/runtime';
	import { ArrowLeft, BadgeInfo, Play } from 'lucide-svelte';

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
		</div>
	</div>

	<section class="bg-muted/30 border-b">
		<div
			class="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,0.9fr)_360px] lg:px-8 lg:py-10"
		>
			<div class="min-w-0 space-y-4">
				<p class="text-primary inline-flex items-center gap-2 text-sm font-semibold">
					<BadgeInfo class="size-4" />
					{copy.hero.eyebrow}
				</p>
				<div class="space-y-3">
					<h1 class="max-w-4xl text-3xl leading-tight font-semibold sm:text-4xl lg:text-5xl">
						{copy.hero.title}
					</h1>
					<p class="text-muted-foreground max-w-3xl text-sm leading-7 sm:text-base">
						{copy.hero.description}
					</p>
				</div>
				<div class="flex flex-col gap-3 sm:flex-row">
					<Button href={resolve('/#start')} class="h-10">
						{copy.hero.primaryAction}
					</Button>
					<Button href={resolve('/')} variant="outline" class="h-10">
						<ArrowLeft class="size-4" />
						{copy.hero.secondaryAction}
					</Button>
				</div>
			</div>

			<aside class="bg-background rounded-lg border p-5 shadow-sm">
				<div class="flex items-start gap-3">
					<span
						class="bg-primary/10 text-primary inline-flex size-10 shrink-0 items-center justify-center rounded-md"
					>
						<Play class="size-5" />
					</span>
					<div>
						<h2 class="text-lg font-semibold">{copy.badge}</h2>
						<p class="text-muted-foreground mt-2 text-sm leading-6">{copy.notice}</p>
					</div>
				</div>
			</aside>
		</div>
	</section>

	<SubTrackDemoExperience {copy} {locale} />
</main>
