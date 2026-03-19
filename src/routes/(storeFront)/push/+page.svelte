<script lang="ts">
	import { resolve as resolvePath } from '$app/paths';
	import { page } from '$app/state';
	import { resolveLocale } from '$lib/locale';
	import { getLocale } from '$lib/paraglide/runtime';
	import Button from '$lib/components/ui/button/button.svelte';

	type FAQItem = {
		question: string;
		answer: string;
	};

	type DeviceGuide = {
		name: string;
		image: string;
		category: string;
		categoryLabel: string;
		title: string;
		steps: string[];
		note: string;
	};

	type PushCopy = {
		head: {
			title: string;
			description: string;
		};
		hero: {
			eyebrow: string;
			title: string;
			description: string;
			openSettings: string;
			login: string;
		};
		setup: {
			title: string;
			steps: Array<{ title: string; description: string }>;
		};
		devices: {
			title: string;
			description: string;
		};
		faqTitle: string;
		troubleshootingTitle: string;
		troubleshootingItems: string[];
		faqItems: FAQItem[];
		deviceGuides: DeviceGuide[];
	};

	const pushCopy: Record<'ja' | 'en', PushCopy> = {
		ja: {
			head: {
				title: 'Push通知について | SubTrack',
				description:
					'SubTrackのPush通知の使い方、設定手順、よくある質問、通知が届かない場合の対処方法をまとめています。'
			},
			hero: {
				eyebrow: 'SubTrack Push Guide',
				title: 'Push通知で、支払い日を見逃さない。',
				description:
					'SubTrackのPush通知を有効にすると、支払い日の前にリマインドを受け取れます。解約や見直しのタイミングを逃しにくくなり、固定費管理を続けやすくなります。',
				openSettings: '通知設定を開く',
				login: 'ログインして設定する'
			},
			setup: {
				title: '設定手順',
				steps: [
					{
						title: 'サブスク管理ページを開く',
						description:
							'「サブスク管理」画面で通知エリアを表示し、「通知を有効にする」を選択します。'
					},
					{
						title: 'ブラウザ通知を許可する',
						description: '通知許可ダイアログが表示されたら「許可」を選択してください。'
					},
					{
						title: '通知受信を確認する',
						description:
							'設定完了後、支払い日前にPush通知でお知らせします。不要な場合はいつでも無効化できます。'
					}
				]
			},
			devices: {
				title: 'デバイス別スクリーンショットと手順',
				description:
					'PC / Android / iPhone での設定イメージです。実際の表示はブラウザやOSのバージョンによって一部異なる場合があります。'
			},
			faqTitle: 'よくある質問',
			troubleshootingTitle: '通知が届かないときのチェック',
			troubleshootingItems: [
				'ブラウザのサイト設定で、SubTrackの通知許可が「許可」になっているか',
				'OS（iOS/Android/PC）の通知設定で、ブラウザ通知が無効化されていないか',
				'省電力モードやバックグラウンド制限で通知が抑制されていないか',
				'ネットワーク接続が不安定でないか'
			],
			faqItems: [
				{
					question: 'Push通知は無料で使えますか？',
					answer:
						'はい。SubTrackのPush通知機能は無料で利用できます。ブラウザの通知許可をONにするだけで使い始められます。'
				},
				{
					question: '通知はいつでも解除できますか？',
					answer:
						'いつでも解除できます。サブスク管理画面の「通知を無効にする」ボタン、またはブラウザのサイト設定から解除可能です。'
				},
				{
					question: 'どこで通知設定を変更できますか？',
					answer: 'サブスク管理ページで「通知を有効にする / 無効にする」を切り替えられます。'
				},
				{
					question: '通知が届かないときは？',
					answer:
						'ブラウザの通知許可、OS側の通知設定、バックグラウンド制限、ネットワーク接続を順に確認してください。'
				}
			],
			deviceGuides: [
				{
					name: 'PC',
					image: '/images/push-guide/pc-notification-toggle.svg',
					category: 'desktop',
					categoryLabel: 'デスクトップブラウザ向け',
					title: 'PCで設定する',
					steps: [
						'「サブスク管理」画面を開き、「通知を有効にする」をクリックします。',
						'ブラウザの通知許可ダイアログで「許可」を選択します。',
						'通知エリアにエラーが表示されていないことを確認します。'
					],
					note: 'Chrome / Edge などで、サイトごとの通知許可設定が必要です。'
				},
				{
					name: 'Android',
					image: '/images/push-guide/android-notification-toggle.svg',
					category: 'mobile',
					categoryLabel: 'モバイルブラウザ向け',
					title: 'Androidで設定する',
					steps: [
						'「サブスク管理」画面で「通知を有効にする」をタップします。',
						'ブラウザ側の通知許可ダイアログで「許可」を選択します。',
						'端末設定でブラウザ通知が無効になっていないか確認します。'
					],
					note: '省電力モードやバックグラウンド制限が有効だと通知が遅延する場合があります。'
				},
				{
					name: 'iPhone',
					image: '/images/push-guide/iphone-notification-toggle.svg',
					category: 'mobile',
					categoryLabel: 'モバイルブラウザ向け',
					title: 'iPhoneで設定する',
					steps: [
						'「サブスク管理」画面で「通知を有効にする」をタップします。',
						'表示される通知許可ダイアログで「許可」を選択します。',
						'iOSの通知設定で、使用ブラウザの通知が許可されていることを確認します。'
					],
					note: 'iOSでは使用ブラウザやOS設定の状態によって、通知許可ダイアログの表示条件が変わる場合があります。'
				}
			]
		},
		en: {
			head: {
				title: 'Push Notifications | SubTrack',
				description:
					'Learn how to enable SubTrack push notifications, follow setup steps, review common questions, and troubleshoot delivery issues.'
			},
			hero: {
				eyebrow: 'SubTrack Push Guide',
				title: 'Never miss a billing date with push notifications.',
				description:
					'When push notifications are enabled, SubTrack reminds you before each billing date so it is easier to review, cancel, or adjust subscriptions before they renew.',
				openSettings: 'Open notification settings',
				login: 'Log in to configure'
			},
			setup: {
				title: 'Setup steps',
				steps: [
					{
						title: 'Open the subscriptions page',
						description:
							'Open the subscriptions screen, find the notification area, and choose Enable notifications.'
					},
					{
						title: 'Allow browser notifications',
						description: 'When the browser permission dialog appears, choose Allow.'
					},
					{
						title: 'Confirm delivery',
						description:
							'After setup, SubTrack sends a reminder before the next billing date. You can turn notifications off at any time.'
					}
				]
			},
			devices: {
				title: 'Screenshots and steps by device',
				description:
					'These examples show the setup flow on desktop, Android, and iPhone. Actual dialogs can vary by browser and OS version.'
			},
			faqTitle: 'Frequently asked questions',
			troubleshootingTitle: 'When notifications are not arriving',
			troubleshootingItems: [
				'Check that the browser site setting for SubTrack notifications is set to Allow',
				'Check that browser notifications are not disabled in your OS settings on iPhone, Android, or desktop',
				'Check whether battery saver or background restrictions are delaying notifications',
				'Check whether your network connection is unstable'
			],
			faqItems: [
				{
					question: 'Are push notifications free to use?',
					answer:
						'Yes. SubTrack push notifications are free. You only need to allow notifications in your browser to start using them.'
				},
				{
					question: 'Can I disable notifications later?',
					answer:
						'Yes. You can disable them at any time from the subscriptions page or from your browser site settings.'
				},
				{
					question: 'Where can I change notification settings?',
					answer:
						'On the subscriptions page you can switch between Enable notifications and Disable notifications.'
				},
				{
					question: 'What should I check if notifications do not arrive?',
					answer:
						'Review browser permission, OS notification settings, background restrictions, and your network connection in that order.'
				}
			],
			deviceGuides: [
				{
					name: 'Desktop',
					image: '/images/push-guide/pc-notification-toggle.svg',
					category: 'desktop',
					categoryLabel: 'Desktop browser',
					title: 'Set up on desktop',
					steps: [
						'Open the subscriptions page and click Enable notifications.',
						'Choose Allow in the browser permission dialog.',
						'Confirm that no error message is shown in the notification area.'
					],
					note: 'Browsers such as Chrome and Edge require notification permission for each site.'
				},
				{
					name: 'Android',
					image: '/images/push-guide/android-notification-toggle.svg',
					category: 'mobile',
					categoryLabel: 'Mobile browser',
					title: 'Set up on Android',
					steps: [
						'Open the subscriptions page and tap Enable notifications.',
						'Choose Allow in the browser permission dialog.',
						'Confirm that browser notifications are not disabled in your Android settings.'
					],
					note: 'Battery saver or background restrictions can delay notifications.'
				},
				{
					name: 'iPhone',
					image: '/images/push-guide/iphone-notification-toggle.svg',
					category: 'mobile',
					categoryLabel: 'Mobile browser',
					title: 'Set up on iPhone',
					steps: [
						'Open the subscriptions page and tap Enable notifications.',
						'Choose Allow in the permission dialog that appears.',
						'Confirm that notifications are allowed for the browser you use in iOS settings.'
					],
					note: 'On iOS, the notification permission dialog can vary depending on the browser and OS configuration.'
				}
			]
		}
	};

	const locale = $derived(resolveLocale(getLocale()));
	const copy = $derived(pushCopy[locale]);
	const desktopGuide = $derived(copy.deviceGuides[0]);
	const mobileGuides = $derived(copy.deviceGuides.slice(1));
	const mobileBadgeLabel = $derived(locale === 'en' ? 'Mobile' : 'スマホ');
	const desktopBadgeLabel = $derived(locale === 'en' ? 'Desktop' : 'PC');
	const screenshotAlt = (deviceName: string) =>
		locale === 'en'
			? `Screenshot of enabling push notifications on ${deviceName}`
			: `${deviceName}でPush通知を有効化する画面のスクリーンショット`;
</script>

<svelte:head>
	<title>{copy.head.title}</title>
	<meta name="description" content={copy.head.description} />
</svelte:head>

<main class="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 md:py-12">
	<section
		class="from-primary/10 via-background rounded-2xl border bg-gradient-to-br to-cyan-500/10 p-6 md:p-8"
	>
		<p class="text-muted-foreground text-xs tracking-[0.2em] uppercase">{copy.hero.eyebrow}</p>
		<h1 class="mt-3 text-3xl leading-tight font-bold md:text-4xl">
			{copy.hero.title}
		</h1>
		<p class="text-muted-foreground mt-3 max-w-3xl text-sm leading-7 md:text-base">
			{copy.hero.description}
		</p>
		<div class="mt-5 flex flex-wrap gap-3">
			{#if page.data.user}
				<Button href={resolvePath('/subscriptions')}>{copy.hero.openSettings}</Button>
			{:else}
				<Button href={resolvePath('/')} variant="secondary">{copy.hero.login}</Button>
			{/if}
		</div>
	</section>

	<section class="space-y-4">
		<h2 class="text-xl font-semibold md:text-2xl">{copy.setup.title}</h2>
		<div class="grid gap-4 md:grid-cols-3">
			{#each copy.setup.steps as step, index (step.title)}
				<article class="bg-card rounded-xl border p-5">
					<p class="text-primary text-xs font-semibold">STEP {index + 1}</p>
					<h3 class="mt-2 text-base font-semibold">{step.title}</h3>
					<p class="text-muted-foreground mt-2 text-sm leading-6">
						{step.description}
					</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="space-y-4">
		<h2 class="text-xl font-semibold md:text-2xl">{copy.devices.title}</h2>
		<p class="text-muted-foreground text-sm leading-7">
			{copy.devices.description}
		</p>
		<div class="space-y-4">
			<article class="bg-card rounded-2xl border p-4 sm:p-5">
				<div
					class="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-center"
				>
					<div class="space-y-3">
						<div class="flex flex-wrap items-center gap-2">
							<span
								class="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-[11px] font-semibold"
							>
								{desktopBadgeLabel}
							</span>
							<span class="text-muted-foreground text-xs">{desktopGuide.categoryLabel}</span>
						</div>
						<h3 class="text-lg font-semibold">{desktopGuide.title}</h3>
						<ol class="text-foreground/90 list-decimal space-y-1.5 pl-5 text-sm leading-7">
							{#each desktopGuide.steps as step (step)}
								<li>{step}</li>
							{/each}
						</ol>
						<p class="text-muted-foreground text-xs leading-6">{desktopGuide.note}</p>
					</div>

					<div class="bg-muted/20 overflow-hidden rounded-xl border p-2 sm:p-3">
						<div class="bg-background overflow-hidden rounded-lg border shadow-sm">
							<div class="aspect-video">
								<img
									src={desktopGuide.image}
									alt={screenshotAlt(desktopGuide.name)}
									loading="lazy"
									class="h-full w-full object-cover object-top"
								/>
							</div>
						</div>
					</div>
				</div>
			</article>

			<div class="grid gap-4 md:grid-cols-2">
				{#each mobileGuides as guide (guide.name)}
					<article class="bg-card rounded-2xl border p-4 sm:p-5">
						<div class="flex flex-wrap items-center gap-2">
							<span
								class="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
							>
								{mobileBadgeLabel}
							</span>
							<span class="text-muted-foreground text-xs">{guide.categoryLabel}</span>
						</div>
						<h3 class="mt-3 text-base font-semibold">{guide.title}</h3>
						<div class="bg-muted/20 mt-4 rounded-xl border p-3">
							<div
								class="bg-background mx-auto w-full max-w-[220px] overflow-hidden rounded-[1.5rem] border shadow-sm sm:max-w-[250px]"
							>
								<div class="aspect-[21/45]">
									<img
										src={guide.image}
										alt={screenshotAlt(guide.name)}
										loading="lazy"
										class="h-full w-full object-cover object-top"
									/>
								</div>
							</div>
						</div>
						<ol class="text-foreground/90 mt-4 list-decimal space-y-1.5 pl-5 text-sm leading-7">
							{#each guide.steps as step (step)}
								<li>{step}</li>
							{/each}
						</ol>
						<p class="text-muted-foreground mt-2 text-xs leading-6">{guide.note}</p>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<section class="space-y-4">
		<h2 class="text-xl font-semibold md:text-2xl">{copy.faqTitle}</h2>
		<div class="space-y-3">
			{#each copy.faqItems as item (item.question)}
				<article class="bg-card rounded-xl border p-5">
					<h3 class="text-base font-semibold">{item.question}</h3>
					<p class="text-muted-foreground mt-2 text-sm leading-7">{item.answer}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="space-y-4">
		<h2 class="text-xl font-semibold md:text-2xl">{copy.troubleshootingTitle}</h2>
		<div class="bg-card rounded-xl border p-5">
			<ul class="text-muted-foreground list-disc space-y-2 pl-5 text-sm leading-7">
				{#each copy.troubleshootingItems as item (item)}
					<li>{item}</li>
				{/each}
			</ul>
		</div>
	</section>
</main>
