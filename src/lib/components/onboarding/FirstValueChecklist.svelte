<script lang="ts">
	import { onMount } from 'svelte';
	import { Check, ChevronDown, ChevronUp } from 'lucide-svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { formatLongDate } from '$lib/locale';
	import type { AppLocale } from '$lib/constant';
	import {
		checklistProgress,
		emptyChecklistPreferences,
		parseChecklistPreferences,
		type ChecklistPreferences,
		type ChecklistSubscription
	} from '$lib/onboarding-progress';

	let {
		userId,
		subscriptions,
		locale,
		notificationMethod,
		settingsHref,
		onAdd,
		onReview
	}: {
		userId: string;
		subscriptions: ChecklistSubscription[];
		locale: AppLocale;
		notificationMethod: string;
		settingsHref: string;
		onAdd: () => void;
		onReview: (id: number | string) => void;
	} = $props();

	const copyByLocale = {
		ja: {
			title: '自分のサブスクで始めよう',
			intro: '1件から始められます。必要なところだけ進めて、残りはあとでも大丈夫です。',
			resume: 'ガイドを再開',
			later: 'あとで続ける',
			progress: (count: number) => `${count} / 4 ステップ確認済み`,
			done: '確認済み',
			todo: '未確認',
			first: '1件目を登録する',
			firstHint: 'テンプレートの料金は参考値です。実際の請求額と初回支払日を確認しましょう。',
			add: '1件目を登録',
			saved: (count: number) => `${count}件をアカウントに保存済み`,
			billing: '次回の請求日を確認する',
			billingHint: '登録後に、直近の請求日をここで確認できます。',
			view: '詳細を見る',
			reviewed: '請求日を確認した',
			more: 'ほかのサブスクもまとめる',
			moreHint: '3件を目安に登録すると支出を見渡しやすくなります。1件だけでも利用できます。',
			addMore: 'もう1件登録',
			notifications: '通知方法を確認する',
			email: '現在はメール通知を選択しています。',
			push: '現在はPush通知を選択しています。',
			both: '現在はメールとPush通知を選択しています。',
			notificationHint: '通知先・時刻や、この端末でPushを使えるかは設定で確認できます。',
			settings: '通知設定を開く',
			notificationReviewed: '通知方法を確認した',
			notReceived: 'ここでの確認は、通知の受信確認ではありません。',
			complete: 'はじめの確認ができました。登録内容や通知方法はいつでも変更できます。',
			storage: '進捗はこのブラウザにアカウント別で保存します。',
			storageUnavailable: 'このブラウザでは進捗を保存できません。今の画面では続けられます。'
		},
		en: {
			title: 'Get started with your subscriptions',
			intro:
				'Start with one subscription. Follow only the steps you need and return whenever you like.',
			resume: 'Resume guide',
			later: 'Continue later',
			progress: (count: number) => `${count} of 4 steps checked`,
			done: 'Checked',
			todo: 'Not checked',
			first: 'Add your first subscription',
			firstHint: 'Template prices are estimates. Check your actual bill and first payment date.',
			add: 'Add your first',
			saved: (count: number) => `${count} saved to your account`,
			billing: 'Check your next billing date',
			billingHint: 'Your nearest billing date will appear here once you save a subscription.',
			view: 'View details',
			reviewed: 'I checked the billing date',
			more: 'Bring your subscriptions together',
			moreHint: 'Try adding three to get a clearer overview. Using just one is fine too.',
			addMore: 'Add another',
			notifications: 'Check your notification method',
			email: 'Email notifications are currently selected.',
			push: 'Push notifications are currently selected.',
			both: 'Email and push notifications are currently selected.',
			notificationHint:
				'Check notification timing, destinations, and push availability on this device in settings.',
			settings: 'Open notification settings',
			notificationReviewed: 'I checked the notification method',
			notReceived: 'Checking this step does not confirm notification delivery.',
			complete:
				'Your first checks are complete. You can change subscriptions and notification settings at any time.',
			storage: 'Progress is saved for your account in this browser.',
			storageUnavailable:
				'Progress cannot be saved in this browser. You can still continue on this page.'
		}
	};
	const copy = $derived(copyByLocale[locale]);
	const storageKey = $derived(`subtrack:first-value:v1:${userId}`);
	let preferences = $state(emptyChecklistPreferences());
	let ready = $state(false);
	let storageAvailable = $state(true);
	const progress = $derived(checklistProgress(subscriptions, preferences, notificationMethod));
	const notificationLabel = $derived(
		notificationMethod === 'both'
			? copy.both
			: notificationMethod === 'push'
				? copy.push
				: copy.email
	);
	const titles = $derived([copy.first, copy.billing, copy.more, copy.notifications]);

	onMount(() => {
		try {
			const stored = localStorage.getItem(storageKey);
			preferences = parseChecklistPreferences(stored);
			// Existing users with several contracts can opt in without losing space in their list.
			if (stored === null && progress.count >= 3) preferences.collapsed = true;
		} catch {
			storageAvailable = false;
		}
		ready = true;
	});

	function update(values: Partial<ChecklistPreferences>) {
		preferences = { ...preferences, ...values };
		try {
			localStorage.setItem(storageKey, JSON.stringify(preferences));
		} catch {
			storageAvailable = false;
		}
	}
</script>

{#if ready}
	<section
		aria-label={copy.title}
		class="bg-card text-card-foreground rounded-xl border p-4 sm:p-5"
	>
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="min-w-0 space-y-1">
				<h2 class="text-lg font-semibold">{copy.title}</h2>
				<p class="text-muted-foreground text-sm" aria-live="polite">
					{copy.progress(progress.completed)}
				</p>
			</div>
			<Button
				variant="ghost"
				class="min-h-11 cursor-pointer"
				aria-expanded={!preferences.collapsed}
				aria-controls="first-value-steps"
				onclick={() => update({ collapsed: !preferences.collapsed })}
			>
				{#if preferences.collapsed}<ChevronDown
						aria-hidden="true"
						class="size-4"
					/>{:else}<ChevronUp aria-hidden="true" class="size-4" />{/if}
				{preferences.collapsed ? copy.resume : copy.later}
			</Button>
		</div>
		<div id="first-value-steps" hidden={preferences.collapsed}>
			<p class="text-muted-foreground mt-3 text-sm leading-relaxed">
				{progress.completed === 4 ? copy.complete : copy.intro}
			</p>
			<ol class="mt-4 divide-y">
				{#each titles as title, index (index)}
					<li class="flex min-w-0 gap-3 py-4">
						<span
							class="bg-muted text-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-sm"
							aria-label={progress.steps[index] ? copy.done : copy.todo}
						>
							{#if progress.steps[index]}<Check
									class="text-primary size-4"
									aria-hidden="true"
								/>{:else}<span aria-hidden="true">{index + 1}</span>{/if}
						</span>
						<div class="min-w-0 flex-1 space-y-2">
							<h3 class="font-medium">{title}</h3>
							{#if index === 0}
								<p class="text-muted-foreground text-sm leading-relaxed">
									{progress.count ? copy.saved(progress.count) : copy.firstHint}
								</p>
								{#if !progress.steps[0]}<Button class="min-h-11 cursor-pointer" onclick={onAdd}
										>{copy.add}</Button
									>{/if}
							{:else if index === 1}
								{#if progress.next}
									<p class="text-sm leading-relaxed break-words">
										{progress.next.serviceName} · {formatLongDate(
											progress.next.nextBillingAt,
											locale
										)}
									</p>
									<div class="flex flex-wrap gap-2">
										<Button
											variant="outline"
											class="min-h-11 cursor-pointer"
											onclick={() => progress.next && onReview(progress.next.id)}
											>{copy.view}</Button
										>
										{#if !progress.steps[1]}<Button
												variant="secondary"
												class="h-auto min-h-11 cursor-pointer whitespace-normal"
												onclick={() =>
													progress.next &&
													update({
														reviewedSubscriptionId: String(progress.next.id),
														reviewedBillingDate: progress.next.nextBillingAt
													})}>{copy.reviewed}</Button
											>{/if}
									</div>
								{:else}<p class="text-muted-foreground text-sm leading-relaxed">
										{copy.billingHint}
									</p>{/if}
							{:else if index === 2}
								<p class="text-muted-foreground text-sm leading-relaxed">{copy.moreHint}</p>
								{#if !progress.steps[2] && progress.count > 0}<Button
										variant="outline"
										class="min-h-11 cursor-pointer"
										onclick={onAdd}>{copy.addMore}</Button
									>{/if}
							{:else}
								<p class="text-sm">{notificationLabel}</p>
								<p class="text-muted-foreground text-sm leading-relaxed">{copy.notificationHint}</p>
								<div class="flex flex-wrap gap-2">
									<Button
										variant="outline"
										class="h-auto min-h-11 cursor-pointer whitespace-normal"
										href={settingsHref}>{copy.settings}</Button
									>
									{#if !progress.steps[3]}<Button
											variant="secondary"
											class="h-auto min-h-11 cursor-pointer whitespace-normal"
											onclick={() => update({ reviewedNotificationMethod: notificationMethod })}
											>{copy.notificationReviewed}</Button
										>{/if}
								</div>
								<p class="text-muted-foreground text-xs leading-relaxed">{copy.notReceived}</p>
							{/if}
						</div>
					</li>
				{/each}
			</ol>
			<p class="text-muted-foreground text-xs leading-relaxed">
				{storageAvailable ? copy.storage : copy.storageUnavailable}
			</p>
		</div>
	</section>
{/if}
