<script lang="ts">
	import { base, resolve } from '$app/paths';
	import GoogleAuthButton from '$lib/components/GoogleAuthButton.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { landingPageCopy } from '$lib/content/site-content';
	import { resolveLocale } from '$lib/locale';
	import { getLocale } from '$lib/paraglide/runtime';
	import { cn } from '$lib/utils';
	import {
		Bell,
		CalendarDays,
		ChartPie,
		Check,
		CreditCard,
		Download,
		Home,
		Repeat
	} from 'lucide-svelte';

	const locale = $derived(resolveLocale(getLocale()));
	const copy = $derived(landingPageCopy[locale]);
	const problemIcons = [CreditCard, Bell, ChartPie];
	const stepIcons = [Check, Bell, CalendarDays];
	const featureIcons = [Check, CalendarDays, Bell, ChartPie, Download, Home];
	const pricingStartLabel = $derived(locale === 'en' ? 'Start with Google' : 'Googleで始める');
	const pwaImage = $derived({
		src: '/images/onboarding/pwa-real.png',
		alt:
			locale === 'en'
				? 'SubTrack added to a phone home screen'
				: 'SubTrack をスマホのホーム画面に追加した画面'
	});

	const imageSrc = (src: string) => `${base}${src}`;
	const pageHref = (href: string) => (href.startsWith('#') ? href : resolve(href));
</script>

<svelte:head>
	<title>{copy.headTitle}</title>
	<meta name="description" content={copy.headDescription} />
</svelte:head>

<main class="bg-background text-foreground">
	<section id="start" class="scroll-mt-20 border-b">
		<div
			class="mx-auto grid max-w-6xl items-center gap-6 px-4 py-6 md:py-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)] lg:gap-10 lg:px-8 lg:py-12"
		>
			<div class="min-w-0 space-y-5 lg:space-y-6">
				<div class="space-y-3 lg:space-y-4">
					<p class="text-primary text-sm font-semibold">{copy.hero.eyebrow}</p>
					<h1
						class="max-w-3xl text-3xl leading-[1.1] font-semibold sm:text-4xl md:text-5xl lg:text-6xl"
					>
						{copy.hero.title}
					</h1>
					<p class="text-muted-foreground max-w-2xl text-sm leading-7 md:text-base lg:text-lg">
						{copy.hero.description}
					</p>
				</div>

				<div class="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
					<div class="w-full sm:max-w-[330px]">
						<GoogleAuthButton label={copy.hero.cta} />
					</div>
					<Button class="h-10" href="#features" variant="outline">
						{copy.hero.secondaryCta}
					</Button>
				</div>

				<div
					class="flex flex-wrap gap-2"
					aria-label={locale === 'en' ? 'Safety notes' : '安心材料'}
				>
					{#each copy.hero.trustItems as item (item)}
						<span
							class="bg-muted text-muted-foreground inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs sm:text-sm"
						>
							<Check class="text-primary size-4" />
							{item}
						</span>
					{/each}
				</div>
				<p class="text-muted-foreground max-w-xl text-xs leading-6 sm:text-sm">{copy.hero.note}</p>
			</div>

			<figure class="bg-muted/30 min-w-0 overflow-hidden rounded-lg border shadow-sm">
				<div class="bg-background border-b px-3 py-2">
					<div class="flex items-center gap-2">
						<span class="size-2 rounded-full bg-red-400"></span>
						<span class="size-2 rounded-full bg-yellow-400"></span>
						<span class="size-2 rounded-full bg-green-400"></span>
					</div>
				</div>
				<div class="p-3 md:p-4">
					<img
						class="mx-auto max-h-[150px] w-full rounded-md object-contain sm:max-h-[260px] lg:max-h-[420px]"
						src={imageSrc(copy.hero.image.src)}
						alt={copy.hero.image.alt}
						loading="eager"
						decoding="async"
					/>
				</div>
				<figcaption
					class="bg-background text-muted-foreground border-t px-3 py-2 text-xs sm:flex sm:items-center sm:justify-between sm:px-4 sm:py-3 sm:text-sm"
				>
					<span>{copy.hero.image.caption}</span>
					<div class="mt-3 hidden grid-cols-3 gap-2 sm:grid md:mt-0 md:min-w-[260px]">
						{#each copy.hero.metrics as metric (metric.label)}
							<div class="bg-muted rounded-md px-3 py-2 text-center">
								<div class="text-foreground text-sm font-semibold">{metric.value}</div>
								<div class="mt-1 text-[11px] leading-4">{metric.label}</div>
							</div>
						{/each}
					</div>
				</figcaption>
			</figure>
		</div>
	</section>

	<section class="bg-muted/30 py-14 md:py-18">
		<div class="mx-auto max-w-6xl px-4 lg:px-8">
			<div class="max-w-3xl space-y-3">
				<p class="text-primary text-sm font-semibold">{copy.problems.eyebrow}</p>
				<h2 class="text-3xl leading-tight font-semibold md:text-4xl">{copy.problems.title}</h2>
				<p class="text-muted-foreground text-base leading-7">{copy.problems.description}</p>
			</div>

			<div class="mt-8 grid gap-4 md:grid-cols-3">
				{#each copy.problems.items as item, index (item.title)}
					{@const Icon = problemIcons[index] ?? Repeat}
					<article class="bg-background rounded-lg border p-5 shadow-sm">
						<div
							class="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-md"
						>
							<Icon class="size-5" />
						</div>
						<h3 class="mt-5 text-lg font-semibold">{item.title}</h3>
						<p class="text-muted-foreground mt-2 leading-7">{item.description}</p>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<section class="py-14 md:py-18">
		<div class="mx-auto max-w-6xl px-4 lg:px-8">
			<div class="max-w-3xl space-y-3">
				<p class="text-primary text-sm font-semibold">{copy.steps.eyebrow}</p>
				<h2 class="text-3xl leading-tight font-semibold md:text-4xl">{copy.steps.title}</h2>
				<p class="text-muted-foreground text-base leading-7">{copy.steps.description}</p>
			</div>

			<div class="mt-8 grid gap-5 lg:grid-cols-3">
				{#each copy.steps.items as item, index (item.title)}
					{@const Icon = stepIcons[index] ?? Check}
					<article class="bg-background overflow-hidden rounded-lg border shadow-sm">
						<div class="space-y-4 p-5">
							<div class="flex items-center gap-3">
								<span
									class="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-md"
								>
									<Icon class="size-5" />
								</span>
								<span class="text-muted-foreground text-sm font-medium">{item.label}</span>
							</div>
							<div>
								<h3 class="text-lg font-semibold">{item.title}</h3>
								<p class="text-muted-foreground mt-2 leading-7">{item.description}</p>
							</div>
						</div>
						<div class="bg-muted/30 border-t p-3">
							<img
								class="mx-auto h-[180px] w-full rounded-md object-contain md:h-[220px]"
								src={imageSrc(item.image.src)}
								alt={item.image.alt}
								loading="lazy"
								decoding="async"
							/>
						</div>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<section id="features" class="bg-muted/30 scroll-mt-20 border-y py-14 md:py-18">
		<div class="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-[minmax(0,0.9fr)_340px] lg:px-8">
			<div class="min-w-0">
				<div class="max-w-3xl space-y-3">
					<p class="text-primary text-sm font-semibold">{copy.features.eyebrow}</p>
					<h2 class="text-3xl leading-tight font-semibold md:text-4xl">{copy.features.title}</h2>
					<p class="text-muted-foreground text-base leading-7">{copy.features.description}</p>
				</div>

				<div class="mt-8 grid gap-4 md:grid-cols-2">
					{#each copy.features.items as item, index (item.title)}
						{@const Icon = featureIcons[index] ?? Check}
						<article class="bg-background rounded-lg border p-5 shadow-sm">
							<div class="flex items-start gap-4">
								<div
									class="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md"
								>
									<Icon class="size-5" />
								</div>
								<div class="min-w-0">
									<h3 class="font-semibold">{item.title}</h3>
									<p class="text-muted-foreground mt-1 text-sm">{item.description}</p>
									<p class="mt-3 leading-7">{item.detail}</p>
								</div>
							</div>
						</article>
					{/each}
				</div>
			</div>

			<figure
				class="bg-background overflow-hidden rounded-lg border shadow-sm lg:sticky lg:top-24 lg:self-start"
			>
				<div class="border-b px-4 py-3">
					<p class="font-medium">{locale === 'en' ? 'Home-screen access' : 'ホーム画面から起動'}</p>
				</div>
				<div class="bg-muted/30 p-4">
					<img
						class="mx-auto max-h-[420px] w-full rounded-md object-contain"
						src={imageSrc(pwaImage.src)}
						alt={pwaImage.alt}
						loading="lazy"
						decoding="async"
					/>
				</div>
			</figure>
		</div>
	</section>

	<section id="pricing" class="scroll-mt-20 py-14 md:py-18">
		<div class="mx-auto max-w-6xl px-4 lg:px-8">
			<div class="max-w-3xl space-y-3">
				<p class="text-primary text-sm font-semibold">{copy.pricing.eyebrow}</p>
				<h2 class="text-3xl leading-tight font-semibold md:text-4xl">{copy.pricing.title}</h2>
				<p class="text-muted-foreground text-base leading-7">{copy.pricing.description}</p>
			</div>

			<div class="mt-8 grid gap-4 lg:grid-cols-3">
				{#each copy.pricing.plans as plan (plan.name)}
					<article
						class={cn(
							'bg-background flex rounded-lg border p-5 shadow-sm',
							plan.featured && 'border-primary shadow-md'
						)}
					>
						<div class="flex w-full flex-col">
							<div class="flex items-start justify-between gap-3">
								<div>
									<h3 class="text-xl font-semibold">{plan.name}</h3>
									<p class="text-muted-foreground mt-1 text-sm">{plan.cycle}</p>
								</div>
								{#if plan.badge}
									<span
										class="bg-primary text-primary-foreground rounded-md px-2.5 py-1 text-xs font-medium"
									>
										{plan.badge}
									</span>
								{/if}
							</div>
							<div class="mt-5">
								<div class="text-2xl leading-tight font-semibold">{plan.price}</div>
								<p class="text-muted-foreground mt-3 leading-7">{plan.description}</p>
							</div>
							<ul class="mt-5 space-y-3">
								{#each plan.bullets as bullet (bullet)}
									<li class="flex gap-3 text-sm leading-6">
										<Check class="text-primary mt-0.5 size-4 shrink-0" />
										<span>{bullet}</span>
									</li>
								{/each}
							</ul>
							<Button
								class="mt-6 h-10 w-full"
								href="#start"
								variant={plan.featured ? 'default' : 'outline'}
							>
								{pricingStartLabel}
							</Button>
						</div>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<section id="faq" class="bg-muted/30 scroll-mt-20 border-y py-14 md:py-18">
		<div class="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-8">
			<div class="space-y-3">
				<p class="text-primary text-sm font-semibold">{copy.faq.eyebrow}</p>
				<h2 class="text-3xl leading-tight font-semibold md:text-4xl">{copy.faq.title}</h2>
				<p class="text-muted-foreground text-base leading-7">{copy.faq.description}</p>
				<Button href={pageHref(copy.faq.moreLink.href)} variant="outline">
					{copy.faq.moreLink.label}
				</Button>
			</div>

			<div class="space-y-3">
				{#each copy.faq.items as item (item.question)}
					<details class="group bg-background rounded-lg border p-5 shadow-sm">
						<summary class="flex cursor-pointer list-none items-center justify-between gap-4">
							<span class="font-semibold">{item.question}</span>
							<span
								class="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-md transition group-open:rotate-45"
							>
								+
							</span>
						</summary>
						<div class="text-muted-foreground mt-4 leading-7">
							<p>{item.answer}</p>
							{#if item.href && item.linkLabel}
								<a
									class="text-primary mt-2 inline-flex underline-offset-4 hover:underline"
									href={pageHref(item.href)}
								>
									{item.linkLabel}
								</a>
							{/if}
						</div>
					</details>
				{/each}
			</div>
		</div>
	</section>

	<section class="py-14 md:py-18">
		<div class="mx-auto max-w-4xl px-4 text-center lg:px-8">
			<div class="space-y-4">
				<h2 class="text-3xl leading-tight font-semibold md:text-4xl">{copy.finalCta.title}</h2>
				<p class="text-muted-foreground mx-auto max-w-2xl text-base leading-7">
					{copy.finalCta.description}
				</p>
			</div>
			<div class="mx-auto mt-7 w-full max-w-[360px]">
				<GoogleAuthButton label={copy.finalCta.cta} />
			</div>
		</div>
	</section>
</main>
