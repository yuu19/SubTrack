<script lang="ts">
	import { onMount } from 'svelte';
	import { cubicIn, cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fly } from 'svelte/transition';
	import * as Dialog from '$lib/components/ui/dialog';
	import Button from '$lib/components/ui/button/button.svelte';
	import { cn } from '$lib/utils';
	import { BellRing, CalendarDays, Download, Sparkles } from 'lucide-svelte';

	type Props = {
		userId: string | null;
		onboardingCompleted?: boolean;
		alwaysShow?: boolean;
	};

	let { userId = null, onboardingCompleted = true, alwaysShow = false }: Props = $props();

	const steps = [
		{
			title: 'サブスクをまとめて登録',
			description: '料金・周期・タグを一括で管理。支出の見える化がすぐに始まります。',
			badge: 'サブスク一覧',
			accent: 'from-sky-400/25 via-cyan-300/10 to-transparent',
			pointer: 'border-sky-200/70',
			icon: Sparkles
		},
		{
			title: '更新日をカレンダーで把握',
			description: '支払いの山を可視化して、家計の波を先読みできます。',
			badge: '支払いカレンダー',
			accent: 'from-amber-400/25 via-orange-300/10 to-transparent',
			pointer: 'border-amber-200/70',
			icon: CalendarDays
		},
		{
			title: '通知で取りこぼしゼロに',
			description: '更新日前にリマインド。解約タイミングも逃しません。',
			badge: 'リマインダー',
			accent: 'from-emerald-400/25 via-lime-300/10 to-transparent',
			pointer: 'border-emerald-200/70',
			icon: BellRing
		},
		{
			title: 'PWAでサッと開ける',
			description:
				'ホーム画面に追加すればアプリのように起動できます。Push通知は設定からいつでもON/OFFできます。',
			badge: 'PWA / Push',
			accent: 'from-violet-400/25 via-fuchsia-300/10 to-transparent',
			pointer: 'border-violet-200/70',
			icon: Download
		}
	];

	const subscriptionRows = [
		{ name: 'Netflix', price: '\u00a51,490', cycle: '月', dot: 'bg-rose-500/70' },
		{ name: 'Spotify', price: '\u00a5980', cycle: '月', dot: 'bg-emerald-500/70' },
		{ name: 'iCloud+', price: '\u00a5150', cycle: '月', dot: 'bg-sky-500/70' }
	];

	const calendarDays = [
		{ label: '10', highlight: false },
		{ label: '11', highlight: false },
		{ label: '12', highlight: false },
		{ label: '13', highlight: true },
		{ label: '14', highlight: false },
		{ label: '15', highlight: true },
		{ label: '16', highlight: false },
		{ label: '17', highlight: false },
		{ label: '18', highlight: false },
		{ label: '19', highlight: false },
		{ label: '20', highlight: false },
		{ label: '21', highlight: false },
		{ label: '22', highlight: false },
		{ label: '23', highlight: false }
	];

	const notificationRows = [
		{
			label: '次回更新 3日前',
			detail: 'Push',
			pill: 'bg-emerald-500/15 text-emerald-700'
		},
		{
			label: '金額変動を検知',
			detail: 'Email',
			pill: 'bg-sky-500/15 text-sky-700'
		},
		{
			label: '解約期限リマインド',
			detail: 'Push',
			pill: 'bg-amber-500/15 text-amber-700'
		}
	];

	const installSteps = [
		'ブラウザの共有 / メニューを開く',
		'「ホーム画面に追加」を選ぶ',
		'アイコン名を確認して追加'
	];

	let open = $state(false);
	let stepIndex = $state(0);
	let hasOpened = false;
	let direction = $state(1);

	const step = $derived(steps[stepIndex]);
	const motion = $derived({
		duration: prefersReducedMotion.current ? 0 : 240,
		outDuration: prefersReducedMotion.current ? 0 : 200,
		offset: prefersReducedMotion.current ? 0 : 18
	});

	onMount(() => {
		if (!userId) return;
		if (!alwaysShow && onboardingCompleted) return;
		setOpen(true);
	});

	const markCompleted = async () => {
		if (!userId || alwaysShow) return;
		await fetch('/api/onboarding', {
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({ completed: true })
		}).catch(() => null);
	};

	const setOpen = (next: boolean) => {
		open = next;
		if (next) {
			hasOpened = true;
			return;
		}
		if (hasOpened) {
			void markCompleted();
		}
	};

	const handleNext = () => {
		if (stepIndex < steps.length - 1) {
			direction = 1;
			stepIndex += 1;
			return;
		}
		setOpen(false);
	};

	const handleBack = () => {
		if (stepIndex === 0) {
			setOpen(false);
			return;
		}
		direction = -1;
		stepIndex -= 1;
	};
</script>

<Dialog.Root bind:open={() => open, setOpen}>
	<Dialog.Content showCloseButton={false} class="max-w-4xl overflow-hidden p-0">
		<div class="grid gap-0 md:min-h-[520px] md:grid-cols-[1.1fr_0.9fr]">
			<section class="flex flex-col gap-6 p-6 md:p-8">
				<div class="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
					<span
						class="rounded-full border bg-primary/10 px-3 py-1 text-[10px] font-semibold text-primary"
					>
						チュートリアル
					</span>
					<span>{stepIndex + 1}/{steps.length}</span>
				</div>

				{#key stepIndex}
					<div
						in:fly={{ x: direction * motion.offset, duration: motion.duration, easing: cubicOut }}
						out:fly={{ x: -direction * motion.offset, duration: motion.outDuration, easing: cubicIn }}
						class="space-y-3"
					>
						<Dialog.Title class="font-display text-2xl font-semibold md:text-3xl">
							{step.title}
						</Dialog.Title>
						<Dialog.Description class="text-muted-foreground text-sm md:text-base">
							{step.description}
						</Dialog.Description>
					</div>
				{/key}

				{#if stepIndex === steps.length - 1}
					<div
						in:fly={{ y: 8, duration: motion.duration, easing: cubicOut }}
						out:fly={{ y: 8, duration: motion.outDuration, easing: cubicIn }}
						class="rounded-2xl border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground"
					>
						<p class="font-semibold text-foreground">PWAとPush通知について</p>
						<p class="mt-2">
							PWAは、ホーム画面に追加してアプリのように素早く開ける仕組みです。
						</p>
						<p class="mt-2">
							Push通知は更新前にお知らせを送る機能で、設定からいつでもON/OFFできます。
						</p>
					</div>
				{/if}

				<div class="mt-auto grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
					<Button variant="ghost" onclick={handleBack}>
						{stepIndex === 0 ? '閉じる' : '戻る'}
					</Button>
					<div class="flex items-center justify-center gap-2">
						{#each steps as _, index (index)}
							<span
								class={cn(
									'h-2 w-2 rounded-full transition-colors',
									index === stepIndex ? 'bg-primary' : 'bg-muted'
								)}
							></span>
						{/each}
					</div>
					<Button onclick={handleNext}>
						{stepIndex === steps.length - 1 ? 'はじめる' : '続ける'}
					</Button>
				</div>
			</section>

			<section class="relative overflow-hidden border-t md:border-t-0 md:border-l">
				<div class={cn('relative h-full bg-gradient-to-br p-6 md:p-8', step.accent)}>
					<div
						class="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-semibold"
					>
					<step.icon class="size-4 text-primary" />
						<span>{step.badge}</span>
					</div>

					{#key stepIndex}
						<div
							in:fly={{ x: direction * motion.offset, duration: motion.duration, easing: cubicOut }}
							out:fly={{ x: -direction * motion.offset, duration: motion.outDuration, easing: cubicIn }}
							class="mt-6 space-y-4"
						>
							{#if stepIndex === 0}
								<div class="space-y-3">
									{#each subscriptionRows as row (row.name)}
										<div
											class="flex items-center justify-between rounded-xl border bg-background/80 px-3 py-2 shadow-sm"
										>
											<div class="flex items-center gap-2">
												<span class={cn('h-2.5 w-2.5 rounded-full', row.dot)}></span>
												<span class="text-sm font-medium">{row.name}</span>
											</div>
											<span class="text-xs text-muted-foreground">
												{row.price}/{row.cycle}
											</span>
										</div>
									{/each}
								</div>
							{:else if stepIndex === 1}
								<div class="rounded-2xl border bg-background/80 p-4 shadow-sm">
									<div class="flex items-center justify-between text-xs text-muted-foreground">
										<span>8月</span>
										<span>支払い予定</span>
									</div>
									<div class="mt-3 grid grid-cols-7 gap-2 text-xs">
										{#each calendarDays as day (day.label)}
											<span
												class={cn(
													'flex h-7 items-center justify-center rounded-md',
													day.highlight
														? 'bg-primary text-primary-foreground'
														: 'bg-muted text-foreground'
												)}
											>
												{day.label}
											</span>
										{/each}
									</div>
								</div>
							{:else}
								{#if stepIndex === 2}
									<div class="space-y-3">
										{#each notificationRows as row (row.label)}
											<div
												class="flex items-center justify-between rounded-xl border bg-background/80 px-3 py-2 shadow-sm"
											>
												<div>
													<p class="text-sm font-medium">{row.label}</p>
													<p class="text-xs text-muted-foreground">{row.detail}</p>
												</div>
												<span class={cn('rounded-full px-2 py-1 text-[10px] font-semibold', row.pill)}>
													ON
												</span>
											</div>
										{/each}
									</div>
								{:else}
									<div class="space-y-3">
										<div class="rounded-xl border bg-background/80 px-3 py-3 shadow-sm">
											<p class="text-sm font-semibold">ホーム画面に追加</p>
											<ul class="mt-2 space-y-1 text-xs text-muted-foreground">
												{#each installSteps as stepLine (stepLine)}
													<li class="flex items-start gap-2">
														<span class="mt-1 h-1.5 w-1.5 rounded-full bg-primary"></span>
														<span>{stepLine}</span>
													</li>
												{/each}
											</ul>
										</div>
										<div class="rounded-xl border bg-background/80 px-3 py-3 text-xs text-muted-foreground shadow-sm">
											<p class="font-semibold text-foreground">Push通知</p>
											<p class="mt-1">更新前にお知らせを送る機能です。設定からいつでもON/OFFできます。</p>
										</div>
									</div>
								{/if}
							{/if}
						</div>
					{/key}

					<div
						class={cn(
							'absolute -bottom-6 left-10 h-12 w-12 rotate-45 rounded-2xl border bg-background/80 shadow-sm',
							step.pointer
						)}
					></div>
				</div>
			</section>
		</div>
	</Dialog.Content>
</Dialog.Root>
