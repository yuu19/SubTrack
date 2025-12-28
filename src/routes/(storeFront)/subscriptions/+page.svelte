<script lang="ts">
	import AddSubscription from '$lib/components/modals/AddSubscription.svelte';
	import EditSubscription from '$lib/components/modals/EditSubscription.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Badge } from '$lib/components/ui/badge';
	import Button from '$lib/components/ui/button/button.svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		addPendingSubscription,
		getCachedSubscriptions,
		replaceSubscriptionsFromServer,
		syncPendingSubscriptions,
		type SubscriptionPayload,
		type SubscriptionRecord
	} from '$lib/offline/subscriptions';
	import { addSubscriptionModalState } from '$lib/states/modalState.svelte';
	import { formatCurrency } from '$lib/utils';
	import { browser, dev } from '$app/environment';
	import { enhance as kitEnhance } from '$app/forms';
	import { base } from '$app/paths';
	import { fromAction } from 'svelte/attachments';
	import { Bell, CalendarDays, Repeat } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import type { trackedSubscriptionTable } from '$lib/server/db/schema';

	type Subscription = typeof trackedSubscriptionTable.$inferSelect;
	type SubscriptionView = Omit<Subscription, 'id'> & {
		id: number | string;
		_pending?: boolean;
	};

	let {
		data
	} = $props<{ data: { subscriptions: Subscription[]; form: unknown; vapidPublicKey: string; hasPushSubscription: boolean } }>();

	let subscriptions = $state<SubscriptionView[]>(data.subscriptions as SubscriptionView[]);
	let isOnline = $state(true);
	let isSyncing = $state(false);
	let syncError = $state<string | null>(null);
	let pushSupported = $state(false);
	let pushSubscribed = $state(data.hasPushSubscription);
	let pushPermission = $state<NotificationPermission>('default');
	let pushBusy = $state(false);
	let pushError = $state<string | null>(null);
	let detailOpen = $state(false);
	let editOpen = $state(false);
	let deleteOpen = $state(false);
	let selectedSubscription = $state<SubscriptionView | null>(null);

	const pendingCount = $derived(subscriptions.filter((sub) => sub._pending).length);
	const canMutateSelected = $derived(
		Boolean(selectedSubscription) && isOnline && !selectedSubscription?._pending
	);

	const cycleLabelMap: Record<string, string> = {
		monthly: '毎月',
		quarterly: '3ヶ月ごと',
		yearly: '毎年'
	};

	const cycleUnitMap: Record<string, string> = {
		monthly: '月',
		quarterly: '3ヶ月',
		yearly: '年'
	};

	const cycleDayMap: Record<string, number> = {
		monthly: 30,
		quarterly: 90,
		yearly: 365
	};

	const formatBillingDate = (value?: string | null) => {
		if (!value) return '-';
		const safeValue = value.includes('T') ? value : `${value}T00:00:00`;
		const date = new Date(safeValue);
		if (Number.isNaN(date.getTime())) return value.slice(0, 10);
		return new Intl.DateTimeFormat('ja-JP', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		}).format(date);
	};

	const getCycleProgress = (subscription: SubscriptionView) => {
		const total = cycleDayMap[subscription.cycle] ?? 0;
		if (!total) return 1;
		const daysLeft = Number(subscription.daysUntilNextBilling ?? 0);
		if (!Number.isFinite(daysLeft)) return 1;
		const elapsed = Math.max(0, total - daysLeft);
		return Math.min(1, elapsed / total);
	};

	const applyServerSubscriptions = async (serverSubscriptions: Subscription[]) => {
		if (!browser) return;
		if (!navigator.onLine && serverSubscriptions.length === 0) return;
		const merged = await replaceSubscriptionsFromServer(
			serverSubscriptions as unknown as SubscriptionRecord[]
		);
		subscriptions = merged as SubscriptionView[];
	};

	const loadCachedSubscriptions = async () => {
		if (!browser) return;
		const cached = await getCachedSubscriptions();
		if (cached.length > 0) {
			subscriptions = cached as SubscriptionView[];
		}
	};

	const runSync = async () => {
		if (!browser || !navigator.onLine) return;
		isSyncing = true;
		syncError = null;
		try {
			const result = await syncPendingSubscriptions(`${base}/subscriptions?/create`);
			subscriptions = result.subscriptions as SubscriptionView[];
			if (result.failed > 0) {
				syncError = '同期に失敗しました。オンライン状態を確認してください。';
			}
		} catch (error) {
			console.error('Failed to sync subscriptions', error);
			syncError = '同期に失敗しました。';
		} finally {
			isSyncing = false;
		}
	};

	const handleOfflineSubmit = async (payload: SubscriptionPayload) => {
		const merged = await addPendingSubscription(payload);
		subscriptions = merged as SubscriptionView[];
	};

	const handleServerResult = async (serverSubscriptions: Subscription[]) => {
		const merged = await replaceSubscriptionsFromServer(
			serverSubscriptions as unknown as SubscriptionRecord[]
		);
		subscriptions = merged as SubscriptionView[];
		if (selectedSubscription) {
			const updated = merged.find((sub) => sub.id === selectedSubscription?.id);
			selectedSubscription = (updated as SubscriptionView | undefined) ?? null;
		}
	};

	const openDetail = (subscription: SubscriptionView) => {
		selectedSubscription = subscription;
		detailOpen = true;
	};

	const openEdit = () => {
		if (!canMutateSelected) return;
		detailOpen = false;
		editOpen = true;
	};

	const openDelete = () => {
		if (!canMutateSelected) return;
		detailOpen = false;
		deleteOpen = true;
	};

	const closeEdit = () => {
		editOpen = false;
		detailOpen = false;
	};

	const deleteEnhance = () => {
		return async ({ result }: { result: { type: string; data?: unknown } }) => {
			if (result.type !== 'success') return;
			const data = result.data as { subscriptions?: Subscription[] };
			if (data?.subscriptions) {
				await handleServerResult(data.subscriptions);
			}
			deleteOpen = false;
			detailOpen = false;
			editOpen = false;
			selectedSubscription = null;
		};
	};

	const pushEndpoint = `${base}/api/push-subscriptions`;

	const urlBase64ToUint8Array = (base64String: string) => {
		const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
		const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
		const rawData = atob(base64);
		const outputArray = new Uint8Array(rawData.length);
		for (let i = 0; i < rawData.length; i += 1) {
			outputArray[i] = rawData.charCodeAt(i);
		}
		return outputArray;
	};

	const getServiceWorkerRegistration = async () => {
		if (!('serviceWorker' in navigator)) return null;
		const existing = await navigator.serviceWorker.getRegistration();
		if (existing) return existing;
		try {
			return await navigator.serviceWorker.register(`${base}/service-worker.js`, {
				type: dev ? 'module' : 'classic'
			});
		} catch {
			return null;
		}
	};

	const syncPushSubscription = async (subscription: PushSubscription) => {
		await fetch(pushEndpoint, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			credentials: 'same-origin',
			body: JSON.stringify(subscription)
		});
	};

	const removePushSubscription = async (endpoint: string) => {
		await fetch(pushEndpoint, {
			method: 'DELETE',
			headers: { 'content-type': 'application/json' },
			credentials: 'same-origin',
			body: JSON.stringify({ endpoint })
		});
	};

	const initPush = async () => {
		if (!browser) return;
		pushSupported =
			'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
		if (!pushSupported) return;
		pushPermission = Notification.permission;
		if (!data.vapidPublicKey) return;

		const registration = await getServiceWorkerRegistration();
		if (!registration) return;

		const subscription = await registration.pushManager.getSubscription();
		if (subscription) {
			pushSubscribed = true;
			void syncPushSubscription(subscription);
		} else {
			pushSubscribed = false;
		}
	};

	const enablePush = async () => {
		if (!pushSupported || !data.vapidPublicKey) return;
		pushBusy = true;
		pushError = null;
		try {
			const permission = await Notification.requestPermission();
			pushPermission = permission;
			if (permission !== 'granted') {
				pushError = '通知が許可されていません。';
				return;
			}

			const registration = await getServiceWorkerRegistration();
			if (!registration) {
				pushError = 'サービスワーカーが利用できません。';
				return;
			}

			let subscription = await registration.pushManager.getSubscription();
			if (!subscription) {
				subscription = await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: urlBase64ToUint8Array(data.vapidPublicKey)
				});
			}

			await syncPushSubscription(subscription);
			pushSubscribed = true;
		} catch (error) {
			console.error('Failed to enable push notifications', error);
			pushError = '通知の登録に失敗しました。';
		} finally {
			pushBusy = false;
		}
	};

	const disablePush = async () => {
		if (!pushSupported) return;
		pushBusy = true;
		pushError = null;
		try {
			const registration = await getServiceWorkerRegistration();
			if (!registration) return;
			const subscription = await registration.pushManager.getSubscription();
			if (subscription) {
				await subscription.unsubscribe();
				await removePushSubscription(subscription.endpoint);
			}
			pushSubscribed = false;
		} catch (error) {
			console.error('Failed to disable push notifications', error);
			pushError = '通知の解除に失敗しました。';
		} finally {
			pushBusy = false;
		}
	};

	onMount(() => {
		isOnline = navigator.onLine;
		void loadCachedSubscriptions();
		void initPush();
		if (navigator.onLine) {
			void applyServerSubscriptions(data.subscriptions);
			void runSync();
		}

		const handleOnline = () => {
			isOnline = true;
			void runSync();
		};

		const handleOffline = () => {
			isOnline = false;
		};

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	});
</script>

<section class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
	<header class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold">サブスク管理</h1>
			<p class="text-muted-foreground">契約を追加して支払いを整理しましょう。</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			{#if pushSupported && data.vapidPublicKey}
				<Button
					size="sm"
					variant="outline"
					disabled={pushBusy}
					onclick={pushSubscribed ? disablePush : enablePush}
				>
					{pushSubscribed ? '通知を無効にする' : '通知を有効にする'}
				</Button>
			{/if}
			<Button onclick={() => addSubscriptionModalState.setTrue()}>サブスクを追加</Button>
		</div>
	</header>
	{#if pushSupported && data.vapidPublicKey}
		<div class="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
			<span>通知日にプッシュ通知を受け取れます。</span>
			{#if pushPermission === 'denied'}
				<span class="text-destructive">ブラウザの通知設定を許可してください。</span>
			{/if}
			{#if pushError}
				<span class="text-destructive">{pushError}</span>
			{/if}
		</div>
	{/if}

	{#if !isOnline || pendingCount > 0 || syncError}
		<div
			class="border-border/60 bg-muted/40 text-muted-foreground flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-xs"
		>
			{#if !isOnline}
				<span>オフライン中のためキャッシュを表示しています。</span>
			{:else if pendingCount > 0}
				<span>
					未同期のデータが {pendingCount} 件あります。
					{#if isSyncing}
						同期中...
					{/if}
				</span>
			{/if}
			{#if syncError}
				<span class="text-destructive">{syncError}</span>
			{/if}
		</div>
	{/if}

	{#if subscriptions.length === 0}
		<div class="text-muted-foreground rounded-lg border border-dashed p-6">
			まだ登録されたサブスクがありません。
		</div>
	{:else}
		<div class="flex flex-col gap-4">
			{#each subscriptions as sub (sub.id)}
				<Card
					class="overflow-hidden cursor-pointer"
					role="button"
					tabindex="0"
					onkeydown={(event) => {
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault();
							openDetail(sub);
						}
					}}
					onclick={() => openDetail(sub)}
				>
					<CardHeader class="pb-3">
						<div class="flex items-start justify-between gap-4">
							<div class="space-y-1">
								<CardTitle class="text-base">{sub.serviceName}</CardTitle>
								<CardDescription class="text-xs flex flex-wrap items-center gap-2">
									<span>{cycleLabelMap[sub.cycle] ?? sub.cycle}</span>
									{#if sub._pending}
										<Badge variant="secondary" class="text-[10px]">同期待ち</Badge>
									{/if}
								</CardDescription>
							</div>
							<div class="text-right">
								<div class="text-base font-semibold">
									{formatCurrency(sub.amount, { currency: 'JPY', locale: 'ja-JP' })}
									<span class="text-muted-foreground text-xs">
										/ {cycleUnitMap[sub.cycle] ?? sub.cycle}
									</span>
								</div>
							</div>
						</div>
					</CardHeader>
					<CardContent class="space-y-3 pt-0">
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">
								{formatBillingDate(sub.nextBillingAt)}
							</span>
							<span class="text-muted-foreground">
								支払いまで {sub.daysUntilNextBilling}日
							</span>
						</div>
						<div
							class="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs"
						>
							<span>
								通知
								{sub.notifyDaysBefore === 0 ? '当日' : `${sub.notifyDaysBefore}日前`}
							</span>
							{#if sub.tags.length > 0}
								<div class="flex flex-wrap gap-2">
									{#each sub.tags as tag, i (i)}
										<Badge variant="secondary" class="text-[10px]">{tag}</Badge>
									{/each}
								</div>
							{/if}
						</div>
						<div class="bg-muted h-1 w-full rounded-full">
							<div
								class="bg-primary h-1 rounded-full transition-[width]"
								style={`width: ${Math.max(8, Math.round(getCycleProgress(sub) * 100))}%`}
							></div>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}
</section>

<Dialog.Root bind:open={detailOpen}>
	<Dialog.Content class="w-full max-w-md overflow-hidden p-0">
		<div class="flex items-center justify-between border-b px-4 py-3">
			<Dialog.Title class="text-base font-semibold">
				{selectedSubscription?.serviceName ?? 'サブスク詳細'}
			</Dialog.Title>
		</div>
		{#if selectedSubscription}
			<div class="space-y-4 p-4">
				<div class="bg-card rounded-xl border px-4 py-5 text-center">
					<p class="text-muted-foreground text-xs">支払い料金</p>
					<p class="text-3xl font-bold">
						{formatCurrency(selectedSubscription.amount, { currency: 'JPY', locale: 'ja-JP' })}
					</p>
					<div class="text-muted-foreground mt-4 flex items-center justify-center gap-2 text-sm">
						<Repeat class="size-4" />
						<span>{cycleLabelMap[selectedSubscription.cycle] ?? selectedSubscription.cycle}</span>
					</div>
					<div class="text-muted-foreground mt-2 flex items-center justify-center gap-2 text-sm">
						<CalendarDays class="size-4" />
						<span>{formatBillingDate(selectedSubscription.nextBillingAt)}</span>
					</div>
				</div>

				<div class="bg-card space-y-3 rounded-xl border px-4 py-4 text-sm">
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">支払いまで</span>
						<span class="font-semibold">{selectedSubscription.daysUntilNextBilling}日</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">初回支払日</span>
						<span>{formatBillingDate(selectedSubscription.firstPaymentDate)}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground flex items-center gap-2">
							<Bell class="size-4" />
							通知
						</span>
						<span>
							{selectedSubscription.notifyDaysBefore === 0
								? '当日'
								: `${selectedSubscription.notifyDaysBefore}日前`}
						</span>
					</div>
				</div>

				{#if !canMutateSelected}
					<p class="text-muted-foreground text-xs">
						オフライン中、または同期待ちのデータは編集・削除できません。
					</p>
				{/if}

				<div class="flex flex-col gap-2">
					<Button
						variant="outline"
						disabled={!canMutateSelected}
						onclick={openEdit}
					>
						編集する
					</Button>
					<Button
						variant="destructive"
						disabled={!canMutateSelected}
						onclick={openDelete}
					>
						削除する
					</Button>
				</div>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={editOpen}>
	<Dialog.Content class="max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6">
		<Dialog.Header class="space-y-1">
			<Dialog.Title class="text-2xl font-bold">サブスクを編集</Dialog.Title>
			<Dialog.Description class="text-muted-foreground text-sm">
				契約内容を更新できます。
			</Dialog.Description>
		</Dialog.Header>
		<div class="mt-6">
			{#key selectedSubscription?.id}
				<EditSubscription
					subscription={selectedSubscription}
					onServerResult={handleServerResult}
					onClose={closeEdit}
				/>
			{/key}
		</div>
	</Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={deleteOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>サブスクを削除しますか？</AlertDialog.Title>
			<AlertDialog.Description>
				削除すると元に戻せません。必要であれば内容を確認してください。
			</AlertDialog.Description>
		</AlertDialog.Header>
		<form method="post" action="?/delete" {@attach fromAction(kitEnhance, () => deleteEnhance)}>
			<input type="hidden" name="id" value={selectedSubscription?.id ?? ''} />
			<AlertDialog.Footer class="mt-4">
				<AlertDialog.Cancel type="button">キャンセル</AlertDialog.Cancel>
				<AlertDialog.Action
					type="submit"
					class="bg-destructive hover:bg-destructive/90 text-white"
				>
					削除する
				</AlertDialog.Action>
			</AlertDialog.Footer>
		</form>
	</AlertDialog.Content>
</AlertDialog.Root>

<Dialog.Root bind:open={addSubscriptionModalState.value}>
	<Dialog.Content class="max-h-[90vh] w-full max-w-3xl overflow-y-auto p-0">
		<AddSubscription {data} onOfflineSubmit={handleOfflineSubmit} onServerResult={handleServerResult} />
	</Dialog.Content>
</Dialog.Root>
