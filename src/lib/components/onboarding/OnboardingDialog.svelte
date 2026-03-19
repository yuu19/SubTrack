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
			pwaInfoTitle: 'PWAとPush通知について',
			pwaInfoBody1: 'PWAは、ホーム画面に追加してアプリのように素早く開ける仕組みです。',
			pwaInfoBody2: 'Push通知は更新前にお知らせを送る機能で、設定からいつでもON/OFFできます。',
			close: '閉じる',
			back: '戻る',
			start: 'はじめる',
			continue: '続ける',
			planBadge: 'プレミアムのご案内',
			planTitle: 'サブスク管理 プレミアム',
			planDescription: '広告を非表示にして、登録数や通知の制限なくサブスク管理を続けられます。',
			planBullet1: '無料おためしは初回の登録のみ対象です。',
			planBullet2: '購読期間終了の24時間前までにキャンセルしない場合、自動更新されます。',
			planAction: 'プランを選ぶ',
			faqLink: 'よくある質問',
			termsLink: '利用規約',
			privacyLink: 'プライバシーポリシー',
			steps: [
				{
					title: 'サブスクをまとめて登録',
					description: '料金・周期・タグを一括で管理。支出の見える化がすぐに始まります。',
					badge: 'サブスク一覧',
					previewAlt: 'SubTrackのサブスク一覧画面',
					previewLabel: '一覧画面',
					previewTitle: '登録したサブスクをそのまま確認',
					previewHintMobile: '一覧と操作ボタンが見えるように調整しています。',
					previewHint:
						'上部の操作ボタンとカード全体が見えるよう、PC向けの横長バランスにしています。'
				},
				{
					title: '更新日をカレンダーで把握',
					description: '支払いの山を可視化して、家計の波を先読みできます。',
					badge: '支払いカレンダー',
					previewAlt: 'SubTrackのカレンダー画面',
					previewLabel: 'カレンダー',
					previewTitle: '支払い予定を月単位で俯瞰',
					previewHintMobile: '日付と予定の位置関係が見やすい高さです。',
					previewHint: '横幅を活かしつつ、予定ラベルと日付の密度が崩れない高さに抑えています。'
				},
				{
					title: '通知で取りこぼしゼロに',
					description: '更新日前にリマインド。解約タイミングも逃しません。',
					badge: 'リマインダー',
					previewAlt: 'SubTrackのPush通知ガイド画面',
					previewLabel: '通知設定',
					previewTitle: '通知導線を実画面で確認',
					previewHintMobile: '通知導線が読める位置を優先しています。',
					previewHint: '説明ブロックとCTAが見える位置を優先して、縦方向に少し余裕を持たせています。'
				},
				{
					title: 'PWAでサッと開ける',
					description:
						'ホーム画面に追加すればアプリのように起動できます。Push通知は設定からいつでもON/OFFできます。',
					badge: 'PWA / Push',
					previewAlt: 'SubTrackのPushガイド下部画面',
					previewLabel: 'PWA / Push',
					previewTitle: '導入後の使い方までそのまま追える',
					previewHintMobile: '縦方向の情報量を保ったまま詰めています。',
					previewHint:
						'スマホ寄りの情報量に合わせて、縦長に寄せたプレビューで読める密度を保っています。'
				}
			]
		},
		en: {
			tutorialBadge: 'Tutorial',
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
</script>

<Dialog.Root bind:open={() => open, setOpen}>
	<Dialog.Content
		showCloseButton={false}
		class="w-[min(1120px,calc(100vw-2rem))] !max-w-[calc(100vw-2rem)] overflow-hidden p-0 pb-24 sm:!max-w-[1120px] sm:pb-0"
	>
		<div
			class="grid gap-0 lg:min-h-[560px] lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.92fr)] xl:grid-cols-[minmax(0,1.04fr)_minmax(420px,0.96fr)]"
		>
			<section class="flex min-w-0 flex-col gap-4 p-4 sm:gap-6 sm:p-6 md:p-8">
				<div
					class="text-muted-foreground flex items-center gap-3 text-xs tracking-[0.3em] uppercase"
				>
					<span
						class="bg-primary/10 text-primary rounded-full border px-3 py-1 text-[10px] font-semibold"
					>
						{copy.tutorialBadge}
					</span>
					<span>{stepIndex + 1}/{steps.length}</span>
				</div>

				{#key stepIndex}
					<div
						in:fly={{ x: direction * motion.offset, duration: motion.duration, easing: cubicOut }}
						class="space-y-3"
					>
						<Dialog.Title
							class="font-display text-[clamp(2rem,7vw,3.25rem)] leading-[1.1] font-semibold"
						>
							{step.title}
						</Dialog.Title>
						<Dialog.Description class="text-muted-foreground text-sm leading-7 md:text-base">
							{step.description}
						</Dialog.Description>
					</div>
				{/key}

				{#if stepIndex === steps.length - 1}
					<div
						in:fly={{ y: 8, duration: motion.duration, easing: cubicOut }}
						out:fly={{ y: 8, duration: motion.outDuration, easing: cubicIn }}
						class="bg-muted/30 text-muted-foreground rounded-2xl border p-4 text-sm leading-relaxed"
					>
						<p class="text-foreground font-semibold">{copy.pwaInfoTitle}</p>
						<p class="mt-2">{copy.pwaInfoBody1}</p>
						<p class="mt-2">
							{copy.pwaInfoBody2}
						</p>
					</div>
				{/if}

				<div class="mt-auto hidden gap-4 sm:grid sm:grid-cols-[auto_1fr_auto] sm:items-center">
					<Button variant="ghost" onclick={handleBack}>
						{stepIndex === 0 ? copy.close : copy.back}
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
						{stepIndex === steps.length - 1 ? copy.start : copy.continue}
					</Button>
				</div>
			</section>

			<section class="relative min-w-0 overflow-hidden border-t lg:border-t-0 lg:border-l">
				<div class={cn('relative h-full bg-gradient-to-br p-4 sm:p-6 md:p-8', step.accent)}>
					<div
						class="bg-background/80 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
					>
						<step.icon class="text-primary size-4" />
						<span>{step.badge}</span>
					</div>

					{#key stepIndex}
						<div
							in:fly={{ x: direction * motion.offset, duration: motion.duration, easing: cubicOut }}
							class="mt-4 w-full space-y-3 sm:mt-6 sm:space-y-4 lg:ml-auto lg:max-w-[460px]"
						>
							<div
								class={cn(
									'bg-background/90 mx-auto rounded-[24px] border border-white/60 p-2.5 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.45)] backdrop-blur sm:rounded-[28px] sm:p-3 md:p-4',
									step.previewShellClass
								)}
							>
								<div
									class={cn(
										'relative overflow-hidden rounded-[22px] border bg-white shadow-[0_18px_36px_-28px_rgba(15,23,42,0.55)]',
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

					<div
						class={cn(
							'bg-background/80 absolute -bottom-6 left-10 hidden h-12 w-12 rotate-45 rounded-2xl border shadow-sm lg:block',
							step.pointer
						)}
					></div>
				</div>
			</section>
		</div>
		<div
			class="bg-background/95 fixed bottom-0 left-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 border-t px-4 py-3 shadow-[0_-8px_30px_-20px_rgba(0,0,0,0.45)] backdrop-blur sm:hidden"
		>
			<div class="flex items-center justify-between gap-3">
				<Button variant="ghost" size="sm" onclick={handleBack}>
					{stepIndex === 0 ? copy.close : copy.back}
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
				<Button size="sm" onclick={handleNext}>
					{stepIndex === steps.length - 1 ? copy.start : copy.continue}
				</Button>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={planOpen}>
	<Dialog.Content class="w-full max-w-[560px] p-0 sm:max-w-[760px]">
		<div class="max-h-[90vh] overflow-y-auto">
			<div class="space-y-3 p-4 sm:p-5">
				<div class="flex flex-col items-center gap-1.5 text-center sm:items-start sm:text-left">
					<span class="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600">
						{copy.planBadge}
					</span>
					<h3 class="text-base font-semibold sm:text-lg">{copy.planTitle}</h3>
					<p class="text-muted-foreground text-[11px] sm:text-xs">
						{copy.planDescription}
					</p>
				</div>

				<div class="grid gap-3 sm:grid-cols-[1.35fr_1fr]">
					<div class="bg-muted/30 rounded-lg border p-3 text-[11px]">
						<div class="text-muted-foreground flex items-center justify-between pb-2 font-semibold">
							<span>{m.premium_modal_feature_label()}</span>
							<div class="flex items-center gap-3">
								<span class="bg-muted rounded-full px-2 py-0.5 text-[10px]">{m.plan_free()}</span>
								<span
									class="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[10px]"
								>
									{m.plan_premium()}
								</span>
							</div>
						</div>
						<div class="grid gap-2 sm:grid-cols-2 sm:gap-3">
							{#each premiumFeatureColumns as column, columnIndex (columnIndex)}
								<div class={cn('divide-y', columnIndex === 0 ? '' : 'sm:border-l sm:pl-3')}>
									{#each column as feature (feature.label)}
										<div class="flex items-center justify-between gap-2 py-1">
											<span class="text-foreground">{feature.label}</span>
											<div class="flex items-center gap-3">
												<span class="text-muted-foreground flex w-9 items-center justify-center">
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
												<span class="flex w-9 items-center justify-center">
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

					<div class="space-y-3">
						<div class="bg-background/80 text-muted-foreground rounded-lg border p-3 text-[11px]">
							<ul class="space-y-1.5">
								<li class="flex items-start gap-2">
									<span class="bg-primary mt-1 h-1.5 w-1.5 rounded-full"></span>
									<span>{copy.planBullet1}</span>
								</li>
								<li class="flex items-start gap-2">
									<span class="bg-primary mt-1 h-1.5 w-1.5 rounded-full"></span>
									<span>{copy.planBullet2}</span>
								</li>
							</ul>
						</div>

						<div class="flex flex-col gap-2">
							<Button class="w-full" href={resolve('/me/settings')}>{copy.planAction}</Button>
							<div
								class="text-primary flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold sm:justify-start"
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
