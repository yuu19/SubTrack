<script lang="ts">
	import { onMount } from 'svelte';
	import { cubicIn, cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fly } from 'svelte/transition';
	import { resolve } from '$app/paths';
	import * as Dialog from '$lib/components/ui/dialog';
	import Button from '$lib/components/ui/button/button.svelte';
	import { resolveLocale } from '$lib/locale';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime';
	import { cn } from '$lib/utils';
	import { BellRing, CalendarDays, Check, Download, Sparkles, X } from 'lucide-svelte';

	type Props = {
		userId: string | null;
		onboardingCompleted?: boolean;
		alwaysShow?: boolean;
	};

	type FeatureValue = string | number | boolean;
	type OnboardingCopy = {
		tutorialBadge: string;
		tutorialProgressLabel: string;
		pwaInfoTitle: string;
		pwaInfoBody1: string;
		pwaInfoBody2: string;
		close: string;
		back: string;
		start: string;
		continue: string;
		planBadge: string;
		planTitle: string;
		planDescription: string;
		planRoleLabel: string;
		planFreeTitle: string;
		planFreeDescription: string;
		planPremiumTitle: string;
		planPremiumDescription: string;
		planFeatureTitle: string;
		planBullet1: string;
		planBullet2: string;
		planAction: string;
		faqLink: string;
		termsLink: string;
		privacyLink: string;
		steps: Array<{
			title: string;
			description: string;
			badge: string;
			previewAlt: string;
			previewLabel: string;
			previewTitle: string;
			previewHintMobile: string;
			previewHint: string;
		}>;
	};

	let { userId = null, onboardingCompleted = true, alwaysShow = false }: Props = $props();
	const copyByLocale: Record<'ja' | 'en', OnboardingCopy> = {
		ja: {
			tutorialBadge: 'チュートリアル',
			tutorialProgressLabel: '使い方のガイド',
			pwaInfoTitle: 'ホーム画面追加とプッシュ通知について',
			pwaInfoBody1: 'PWAは、ホーム画面に追加してアプリのように素早く開ける仕組みです。',
			pwaInfoBody2:
				'プッシュ通知は更新前にお知らせを送る機能で、設定からいつでもオン/オフを切り替えられます。',
			close: '閉じる',
			back: '戻る',
			start: 'はじめる',
			continue: '続ける',
			planBadge: 'プレミアムのご案内',
			planTitle: 'サブスク管理 プレミアム',
			planDescription: '広告を非表示にし、登録件数や通知設定の制限なくサブスクを管理できます。',
			planRoleLabel: 'プランの役割',
			planFreeTitle: '無料プラン',
			planFreeDescription: '登録数が少ない方や、まずは気軽に使いたい方向けです。',
			planPremiumTitle: 'Premium',
			planPremiumDescription: '複数のサブスクをまとめて継続管理したい人向けです。',
			planFeatureTitle: '比較できる主な違い',
			planBullet1: '無料お試しは、初回登録時のみ利用できます。',
			planBullet2: '購読期間終了の24時間前までにキャンセルしない場合、自動更新されます。',
			planAction: 'プランを選ぶ',
			faqLink: 'よくある質問',
			termsLink: '利用規約',
			privacyLink: 'プライバシーポリシー',
			steps: [
				{
					title: 'サブスクをまとめて管理',
					description:
						'料金・支払い間隔・タグをまとめて管理できます。毎月の支出をすぐに把握できます。',
					badge: 'サブスク一覧',
					previewAlt: 'SubTrackのサブスク一覧画面',
					previewLabel: '一覧画面',
					previewTitle: '登録したサブスクをそのまま確認',
					previewHintMobile: '一覧と操作ボタンが見えるように調整しています。',
					previewHint:
						'上部の操作ボタンとカード全体が見えるよう、PC向けの横長バランスにしています。'
				},
				{
					title: '支払い日をカレンダーで確認',
					description:
						'支払いが重なる時期を見つけやすくなり、出費の多い月を前もって把握できます。',
					badge: '支払いカレンダー',
					previewAlt: 'SubTrackのカレンダー画面',
					previewLabel: 'カレンダー',
					previewTitle: '1か月の支払い予定をまとめて確認',
					previewHintMobile: '日付と予定の位置関係が見やすい高さです。',
					previewHint: '横幅を活かしつつ、予定ラベルと日付の密度が崩れない高さに抑えています。'
				},
				{
					title: '通知で見落としを防ぐ',
					description:
						'更新日前にお知らせします。解約を検討したいときも、タイミングを確認しやすくなります。',
					badge: 'リマインダー',
					previewAlt: 'SubTrackのPush通知ガイド画面',
					previewLabel: '通知設定',
					previewTitle: '通知の設定手順を画面で確認',
					previewHintMobile: '通知の設定手順が見やすい位置で表示されます。',
					previewHint: '説明ブロックとCTAが見える位置を優先して、縦方向に少し余裕を持たせています。'
				},
				{
					title: 'ホーム画面からすぐ開ける',
					description:
						'ホーム画面に追加すると、アプリのようにすぐ開けます。プッシュ通知は設定からいつでもオン/オフを切り替えられます。',
					badge: 'PWA / Push',
					previewAlt: 'SubTrackのPushガイド下部画面',
					previewLabel: 'PWA / Push',
					previewTitle: '設定後の使い方まで続けて確認できる',
					previewHintMobile: '縦方向の情報量を保ったまま詰めています。',
					previewHint:
						'スマホ寄りの情報量に合わせて、縦長に寄せたプレビューで読める密度を保っています。'
				}
			]
		},
		en: {
			tutorialBadge: 'Tutorial',
			tutorialProgressLabel: 'Quick setup guide',
			pwaInfoTitle: 'About PWA and push notifications',
			pwaInfoBody1: 'A PWA lets you open SubTrack quickly from your home screen like an app.',
			pwaInfoBody2:
				'Push notifications remind you before renewals, and you can turn them on or off from settings at any time.',
			close: 'Close',
			back: 'Back',
			start: 'Start',
			continue: 'Continue',
			planBadge: 'Premium overview',
			planTitle: 'SubTrack Premium',
			planDescription:
				'Remove ads and keep managing subscriptions without limits on registrations or reminder settings.',
			planRoleLabel: 'Who each plan is for',
			planFreeTitle: 'Free',
			planFreeDescription: 'For lighter usage when you only need to manage a small set of subscriptions.',
			planPremiumTitle: 'Premium',
			planPremiumDescription:
				'For people who want to keep many subscriptions organized and maintained over time.',
			planFeatureTitle: 'Key differences at a glance',
			planBullet1: 'The free trial is only available on the first upgrade.',
			planBullet2:
				'Unless you cancel at least 24 hours before the billing period ends, the subscription renews automatically.',
			planAction: 'Choose a plan',
			faqLink: 'FAQ',
			termsLink: 'Terms',
			privacyLink: 'Privacy',
			steps: [
				{
					title: 'Add subscriptions in one place',
					description:
						'Track price, cycle, and tags together so your recurring costs become visible immediately.',
					badge: 'Subscriptions',
					previewAlt: 'SubTrack subscriptions screen',
					previewLabel: 'List view',
					previewTitle: 'Review everything you added at a glance',
					previewHintMobile: 'Framed to keep the list and action buttons visible.',
					previewHint:
						'Sized to keep the top controls and the full card layout readable on desktop.'
				},
				{
					title: 'See renewal dates on a calendar',
					description:
						'Visualize clusters of payments and anticipate heavy billing periods before they happen.',
					badge: 'Billing calendar',
					previewAlt: 'SubTrack calendar screen',
					previewLabel: 'Calendar',
					previewTitle: 'Scan upcoming payments month by month',
					previewHintMobile: 'Tuned so date placement and event positions stay easy to read.',
					previewHint: 'Keeps the layout wide enough for labels while preserving readable density.'
				},
				{
					title: 'Avoid missed renewals with reminders',
					description:
						'Get notified before billing dates so cancellation timing is easier to catch.',
					badge: 'Reminders',
					previewAlt: 'SubTrack push guide screen',
					previewLabel: 'Notification setup',
					previewTitle: 'Follow the notification flow on a real screen',
					previewHintMobile: 'Prioritizes the notification path so the key controls stay visible.',
					previewHint: 'Leaves enough vertical room for the explanation blocks and the CTA.'
				},
				{
					title: 'Launch quickly with PWA',
					description:
						'Add SubTrack to your home screen and open it like an app. Push can be toggled from settings any time.',
					badge: 'PWA / Push',
					previewAlt: 'Lower section of the SubTrack push guide',
					previewLabel: 'PWA / Push',
					previewTitle: 'See the post-setup flow as it is',
					previewHintMobile: 'Keeps the vertical information density readable on smaller screens.',
					previewHint: 'Uses a taller preview so the mobile-oriented content still reads clearly.'
				}
			]
		}
	};
	const locale = $derived(resolveLocale(getLocale()));
	const copy = $derived(copyByLocale[locale]);

	const steps = $derived([
		{
			title: copy.steps[0].title,
			description: copy.steps[0].description,
			badge: copy.steps[0].badge,
			accent: 'from-sky-400/25 via-cyan-300/10 to-transparent',
			pointer: 'border-sky-200/70',
			icon: Sparkles,
			previewImage: '/images/onboarding/subscriptions-real.png',
			previewAlt: copy.steps[0].previewAlt,
			previewLabel: copy.steps[0].previewLabel,
			previewTitle: copy.steps[0].previewTitle,
			previewHintMobile: copy.steps[0].previewHintMobile,
			previewHint: copy.steps[0].previewHint,
			previewShellClass: 'bg-sky-50/70',
			previewFrameClass: 'h-[190px] sm:h-[280px] md:h-[340px]',
			previewImageClass: 'h-full w-full object-cover object-top'
		},
		{
			title: copy.steps[1].title,
			description: copy.steps[1].description,
			badge: copy.steps[1].badge,
			accent: 'from-amber-400/25 via-orange-300/10 to-transparent',
			pointer: 'border-amber-200/70',
			icon: CalendarDays,
			previewImage: '/images/onboarding/calendar-real.png',
			previewAlt: copy.steps[1].previewAlt,
			previewLabel: copy.steps[1].previewLabel,
			previewTitle: copy.steps[1].previewTitle,
			previewHintMobile: copy.steps[1].previewHintMobile,
			previewHint: copy.steps[1].previewHint,
			previewShellClass: 'bg-amber-50/70',
			previewFrameClass: 'h-[180px] sm:h-[270px] md:h-[320px]',
			previewImageClass: 'h-full w-full object-cover object-[center_12%]'
		},
		{
			title: copy.steps[2].title,
			description: copy.steps[2].description,
			badge: copy.steps[2].badge,
			accent: 'from-emerald-400/25 via-lime-300/10 to-transparent',
			pointer: 'border-emerald-200/70',
			icon: BellRing,
			previewImage: '/images/onboarding/notification-real.png',
			previewAlt: copy.steps[2].previewAlt,
			previewLabel: copy.steps[2].previewLabel,
			previewTitle: copy.steps[2].previewTitle,
			previewHintMobile: copy.steps[2].previewHintMobile,
			previewHint: copy.steps[2].previewHint,
			previewShellClass: 'bg-emerald-50/70',
			previewFrameClass: 'h-[220px] sm:h-[320px] md:h-[390px]',
			previewImageClass: 'h-full w-full object-cover object-top'
		},
		{
			title: copy.steps[3].title,
			description: copy.steps[3].description,
			badge: copy.steps[3].badge,
			accent: 'from-violet-400/25 via-fuchsia-300/10 to-transparent',
			pointer: 'border-violet-200/70',
			icon: Download,
			previewImage: '/images/onboarding/pwa-real.png',
			previewAlt: copy.steps[3].previewAlt,
			previewLabel: copy.steps[3].previewLabel,
			previewTitle: copy.steps[3].previewTitle,
			previewHintMobile: copy.steps[3].previewHintMobile,
			previewHint: copy.steps[3].previewHint,
			previewShellClass: 'bg-violet-50/75',
			previewFrameClass: 'h-[240px] sm:h-[360px] md:h-[430px]',
			previewImageClass: 'h-full w-full object-cover object-[center_18%]'
		}
	]);

	const premiumFeatures = $derived([
		{ label: m.premium_feature_subscription_limit(), free: '5', premium: '∞' },
		{ label: m.premium_feature_category_limit(), free: '3', premium: '∞' },
		{ label: m.premium_feature_payment_method_limit(), free: '3', premium: '∞' },
		{ label: m.premium_feature_hide_ads(), free: false, premium: true },
		{ label: m.premium_feature_image_upload(), free: false, premium: true },
		{ label: m.premium_feature_custom_notification(), free: false, premium: true },
		{ label: m.premium_feature_csv_export(), free: false, premium: true }
	]);
	const premiumFeatureColumns = $derived([
		premiumFeatures.slice(0, Math.ceil(premiumFeatures.length / 2)),
		premiumFeatures.slice(Math.ceil(premiumFeatures.length / 2))
	]);

	let open = $state(false);
	let planOpen = $state(false);
	let stepIndex = $state(0);
	let hasOpened = false;
	let direction = $state(1);

	const step = $derived(steps[stepIndex]);
	const lastStepIndex = $derived(steps.length - 1);
	const progressPercent = $derived(((stepIndex + 1) / steps.length) * 100);
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
		planOpen = true;
	};

	const handleBack = () => {
		if (stepIndex === 0) {
			setOpen(false);
			return;
		}
		direction = -1;
		stepIndex -= 1;
	};

	const jumpToStep = (index: number) => {
		if (index === stepIndex) return;
		direction = index > stepIndex ? 1 : -1;
		stepIndex = index;
	};
</script>

<Dialog.Root bind:open={() => open, setOpen}>
	<Dialog.Content
		showCloseButton={false}
		class="w-[min(1120px,calc(100vw-1rem))] !max-w-[calc(100vw-1rem)] overflow-hidden p-0 sm:!max-w-[1120px]"
	>
		<div class="flex max-h-[min(92vh,860px)] min-h-0 flex-col overflow-hidden">
			<div class="border-b px-4 py-4 sm:px-6 md:px-8">
				<div class="flex items-start justify-between gap-4">
					<div class="min-w-0 flex-1 space-y-3">
						<div class="text-muted-foreground flex flex-wrap items-center gap-3 text-[11px] tracking-[0.3em] uppercase">
							<span class="bg-primary/10 text-primary rounded-full border px-3 py-1 font-semibold">
								{copy.tutorialBadge}
							</span>
							<span>{copy.tutorialProgressLabel}</span>
							<span>{stepIndex + 1}/{steps.length}</span>
						</div>
						<div class="bg-muted h-2 overflow-hidden rounded-full">
							<div
								class="bg-primary h-full rounded-full transition-[width] duration-300"
								style={`width: ${progressPercent}%`}
							></div>
						</div>
					</div>
					<Button
						variant="ghost"
						size="icon"
						class="shrink-0"
						aria-label={copy.close}
						onclick={() => setOpen(false)}
					>
						<X class="size-4" />
					</Button>
				</div>

				<div class="-mb-1 mt-4 flex gap-2 overflow-x-auto pb-1">
					{#each steps as item, index (index)}
						<button
							type="button"
							class={cn(
								'min-h-11 min-w-[9.5rem] shrink-0 rounded-2xl border px-3 py-2 text-left transition-colors sm:min-w-0 sm:flex-1',
								index === stepIndex
									? 'border-primary bg-primary/8 text-foreground'
									: 'bg-background text-muted-foreground hover:bg-muted/70'
							)}
							aria-current={index === stepIndex ? 'step' : undefined}
							onclick={() => jumpToStep(index)}
						>
							<div class="flex items-center gap-2">
								<span
									class={cn(
										'inline-flex size-6 items-center justify-center rounded-full text-[11px] font-semibold',
										index === stepIndex
											? 'bg-primary text-primary-foreground'
											: 'bg-muted text-muted-foreground'
									)}
								>
									{index + 1}
								</span>
								<span class="truncate text-sm font-semibold">{item.badge}</span>
							</div>
						</button>
					{/each}
				</div>
			</div>

			<div class="flex-1 overflow-y-auto px-4 py-4 sm:px-6 md:px-8 md:py-6">
				<div class="grid items-start gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(340px,1.1fr)] lg:gap-6">
					<section class="order-2 min-w-0 space-y-4 lg:order-1 lg:space-y-5">
						{#key stepIndex}
							<div
								in:fly={{ x: direction * motion.offset, duration: motion.duration, easing: cubicOut }}
								class="space-y-3"
							>
								<Dialog.Title
									class="font-display text-[clamp(1.85rem,6vw,3.2rem)] leading-[1.08] font-semibold tracking-tight"
								>
									{step.title}
								</Dialog.Title>
								<Dialog.Description class="text-muted-foreground max-w-[36rem] text-sm leading-7 md:text-base">
									{step.description}
								</Dialog.Description>
							</div>
						{/key}

						<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
							<div class="bg-muted/30 rounded-2xl border p-4">
								<p class="text-foreground text-sm font-semibold">{step.previewLabel}</p>
								<p class="text-muted-foreground mt-2 text-sm leading-6">
									{step.previewHint}
								</p>
							</div>
							<div class="bg-background rounded-2xl border p-4">
								<div class="flex items-center gap-2">
									<step.icon class="text-primary size-4" />
									<p class="text-foreground text-sm font-semibold">{step.badge}</p>
								</div>
								<p class="text-muted-foreground mt-2 text-sm leading-6">
									{step.previewTitle}
								</p>
							</div>
						</div>

						{#if stepIndex === lastStepIndex}
							<div
								in:fly={{ y: 8, duration: motion.duration, easing: cubicOut }}
								out:fly={{ y: 8, duration: motion.outDuration, easing: cubicIn }}
								class="bg-muted/30 text-muted-foreground rounded-2xl border p-4 text-sm leading-relaxed"
							>
								<p class="text-foreground font-semibold">{copy.pwaInfoTitle}</p>
								<p class="mt-2">{copy.pwaInfoBody1}</p>
								<p class="mt-2">{copy.pwaInfoBody2}</p>
							</div>
						{/if}
					</section>

					<section class="order-1 min-w-0 overflow-hidden rounded-[28px] border lg:order-2">
						<div class={cn('relative h-full bg-gradient-to-br p-4 sm:p-5 md:p-6', step.accent)}>
							<div
								class="bg-background/80 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
							>
								<step.icon class="text-primary size-4" />
								<span>{step.badge}</span>
							</div>

							{#key stepIndex}
								<div
									in:fly={{ x: direction * motion.offset, duration: motion.duration, easing: cubicOut }}
									class="mt-4 space-y-3"
								>
									<div
										class={cn(
											'bg-background/90 rounded-[24px] border border-white/60 p-2.5 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.45)] backdrop-blur sm:p-3 md:p-4',
											step.previewShellClass
										)}
									>
										<div
											class={cn(
												'relative overflow-hidden rounded-[20px] border bg-white shadow-[0_18px_36px_-28px_rgba(15,23,42,0.55)]',
												step.previewFrameClass
											)}
										>
											<img
												src={step.previewImage}
												alt={step.previewAlt}
												loading="lazy"
												class={step.previewImageClass}
											/>
											<div
												class="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-white/25 to-transparent md:h-20"
											></div>
										</div>

										<div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
											<div class="min-w-0 space-y-1">
												<p class="text-foreground text-sm font-semibold">{step.previewTitle}</p>
												<p class="text-muted-foreground text-[11px] leading-5 sm:hidden">
													{step.previewHintMobile}
												</p>
												<p class="text-muted-foreground hidden text-xs leading-6 sm:block">
													{step.previewHint}
												</p>
											</div>
											<span
												class="bg-background/80 text-muted-foreground inline-flex w-fit shrink-0 self-start rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap"
											>
												{step.previewLabel}
											</span>
										</div>
									</div>
								</div>
							{/key}
						</div>
					</section>
				</div>
			</div>

			<div class="bg-background/95 border-t px-4 py-3 backdrop-blur sm:px-6 md:px-8">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div class="flex items-center gap-2">
						{#each steps as _, index (index)}
							<span
								class={cn(
									'h-2.5 rounded-full transition-all',
									index === stepIndex ? 'bg-primary w-7' : 'bg-muted w-2.5'
								)}
							></span>
						{/each}
					</div>
					<div class="flex items-center justify-end gap-2">
						<Button variant="ghost" class="min-h-11 min-w-24" onclick={handleBack}>
							{stepIndex === 0 ? copy.close : copy.back}
						</Button>
						<Button class="min-h-11 min-w-28" onclick={handleNext}>
							{stepIndex === lastStepIndex ? copy.start : copy.continue}
						</Button>
					</div>
				</div>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={planOpen}>
	<Dialog.Content class="w-[min(960px,calc(100vw-1rem))] !max-w-[calc(100vw-1rem)] p-0 sm:!max-w-[960px]">
		<div class="max-h-[min(92vh,860px)] overflow-y-auto">
			<div class="space-y-5 p-5 sm:p-6 md:p-8">
				<div class="flex max-w-[640px] flex-col items-center gap-2 text-center sm:items-start sm:text-left">
					<span class="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600">
						{copy.planBadge}
					</span>
					<h3 class="text-lg font-semibold sm:text-2xl">{copy.planTitle}</h3>
					<p class="text-muted-foreground text-sm leading-6">
						{copy.planDescription}
					</p>
				</div>

				<div class="grid gap-4 md:grid-cols-2">
					<div class="rounded-2xl border bg-muted/30 p-4 sm:p-5">
						<p class="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">
							{copy.planRoleLabel}
						</p>
						<div class="mt-3 grid gap-3">
							<div class="bg-background rounded-2xl border p-4">
								<p class="text-sm font-semibold">{copy.planFreeTitle}</p>
								<p class="text-muted-foreground mt-2 text-sm leading-6">
									{copy.planFreeDescription}
								</p>
							</div>
							<div class="bg-primary/6 rounded-2xl border border-primary/20 p-4">
								<p class="text-sm font-semibold">{copy.planPremiumTitle}</p>
								<p class="text-muted-foreground mt-2 text-sm leading-6">
									{copy.planPremiumDescription}
								</p>
							</div>
						</div>
					</div>

					<div class="bg-muted/30 flex h-full flex-col rounded-2xl border p-4 text-sm sm:p-5">
						<div class="text-muted-foreground flex items-center justify-between gap-4 pb-3 font-semibold">
							<span>{copy.planFeatureTitle}</span>
							<div class="flex items-center gap-2 sm:gap-3">
								<span class="bg-muted rounded-full px-2.5 py-1 text-[11px]">{m.plan_free()}</span>
								<span
									class="bg-primary text-primary-foreground rounded-full px-2.5 py-1 text-[11px]"
								>
									{m.plan_premium()}
								</span>
							</div>
						</div>
						<div class="grid flex-1 gap-2 sm:grid-cols-2 sm:gap-4">
							{#each premiumFeatureColumns as column, columnIndex (columnIndex)}
								<div class={cn('divide-y', columnIndex === 0 ? '' : 'sm:border-l sm:pl-4')}>
									{#each column as feature (feature.label)}
										<div class="flex items-center justify-between gap-3 py-2">
											<span class="text-foreground pr-3 leading-6">{feature.label}</span>
											<div class="flex items-center gap-3">
												<span class="text-muted-foreground flex w-10 items-center justify-center text-base">
													{#if typeof feature.free === 'boolean'}
														{#if feature.free}
															<Check class="h-3.5 w-3.5 text-emerald-500" />
														{:else}
															<X class="text-muted-foreground h-3.5 w-3.5" />
														{/if}
													{:else}
														{feature.free}
													{/if}
												</span>
												<span class="flex w-10 items-center justify-center text-base">
													{#if typeof feature.premium === 'boolean'}
														{#if feature.premium}
															<Check class="h-3.5 w-3.5 text-emerald-500" />
														{:else}
															<X class="text-muted-foreground h-3.5 w-3.5" />
														{/if}
													{:else}
														{feature.premium}
													{/if}
												</span>
											</div>
										</div>
									{/each}
								</div>
							{/each}
						</div>
					</div>
				</div>

				<div class="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.14fr)_minmax(320px,0.86fr)]">
					<div class="bg-background/80 text-muted-foreground rounded-2xl border p-4 text-sm leading-7 sm:p-5">
						<ul class="space-y-2">
							<li class="flex items-start gap-2">
								<span class="bg-primary mt-2 h-2 w-2 rounded-full"></span>
								<span>{copy.planBullet1}</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="bg-primary mt-2 h-2 w-2 rounded-full"></span>
								<span>{copy.planBullet2}</span>
							</li>
						</ul>
					</div>

					<div class="flex h-full flex-col gap-4">
						<div class="bg-background/80 text-muted-foreground rounded-2xl border p-4 text-sm leading-7 sm:p-5">
							<p class="text-foreground text-sm font-semibold">{copy.planPremiumTitle}</p>
							<p class="mt-2">
								{copy.planPremiumDescription}
							</p>
						</div>

						<div class="mt-auto flex flex-col gap-3">
							<Button class="h-12 w-full text-base" href={resolve('/me/settings')}>
								{copy.planAction}
							</Button>
							<div
								class="text-primary flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-semibold sm:justify-start"
							>
								<a class="hover:underline" href="/faq">{copy.faqLink}</a>
								<a class="hover:underline" href="/terms">{copy.termsLink}</a>
								<a class="hover:underline" href="/privacy">{copy.privacyLink}</a>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
