<script lang="ts">
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { m } from '$lib/paraglide/messages.js';
	import Check from 'lucide-svelte/icons/check';
	import X from 'lucide-svelte/icons/x';
	import { Loader2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';

	let { user, subscription } = $derived(page.data);

	type FeatureValue = string | number | boolean;

	const statusLabels: Record<string, string> = {
		active: '有効',
		trialing: 'トライアル中',
		past_due: '支払い遅延',
		canceled: '解約済み',
		incomplete: '手続き中',
		incomplete_expired: '期限切れ',
		unpaid: '未払い'
	};

	const planKey = $derived(subscription?.plan?.toLowerCase() ?? '');
	const isPremium = $derived(planKey.includes('premium'));
	const planLabel = $derived(isPremium ? 'プレミアムプラン' : '無料プラン');
	const statusLabel = $derived(
		subscription?.status ? (statusLabels[subscription.status] ?? '未設定') : '未設定'
	);
	const periodEndLabel = $derived(formatDate(subscription?.periodEnd ?? subscription?.trialEnd));
	const nextBillingLabel = $derived(formatDate(subscription?.periodEnd ?? subscription?.trialEnd));
	const billingAmountLabel = $derived(isPremium ? '¥5,000' : '—');
	const premiumPlanName = 'Premium';

	const premiumFeatures: { label: string; free: FeatureValue; premium: FeatureValue }[] = [
		{ label: 'サブスクリプション登録数', free: '8', premium: '∞' },
		{ label: 'カテゴリー登録数', free: '3', premium: '∞' },
		{ label: '支払い方法登録数', free: '3', premium: '∞' },
		{ label: '全広告の非表示', free: false, premium: true },
		{ label: '画像の登録', free: false, premium: true },
		{ label: '支払い日前通知を個別に設定可能', free: false, premium: true },
		{ label: 'データのCSVエクスポート', free: false, premium: true }
	];

	let isPremiumModalOpen = $state(false);
	let isUpgrading = $state(false);

	onMount(() => {
		if (!isPremium) {
			isPremiumModalOpen = true;
		}
	});

	async function handleUpgrade() {
		if (isUpgrading) return;
		isUpgrading = true;
		try {
			const { error } = await authClient.subscription.upgrade({
				plan: premiumPlanName,
				successUrl: page.url.pathname,
				cancelUrl: page.url.pathname,
				returnUrl: page.url.pathname
			});
			if (error) {
				toast.error(error.message ?? error.statusText);
			}
		} finally {
			isUpgrading = false;
		}
	}

	async function handleManagePlan() {
		if (isUpgrading) return;
		isUpgrading = true;
		try {
			const { data, error } = await authClient.subscription.billingPortal({
				returnUrl: page.url.pathname
			});

			if (error) {
				toast.error(error.message ?? error.statusText);
				return;
			}

			if (data?.url) {
				window.location.href = data.url;
				return;
			}

			toast.error('ポータルのURL取得に失敗しました。');
		} finally {
			isUpgrading = false;
		}
	}

	function getUserInitial(name: string) {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('');
	}

	function formatDate(value: number | null | undefined) {
		if (!value) return '未設定';
		const date = new Date(value);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
</script>

<div class="space-y-16">
	<!-- {#if true}
		<Alert.Root variant="destructive" class="bg-red-600 text-white">
			<Alert.Title>Profile is incomplete</Alert.Title>
			<Alert.Description>
				Kindly complete your profile update
				<a href="/me/settings" class="border-b border-b-white text-lg font-semibold md:text-lg">
					Here
				</a>
			</Alert.Description>
		</Alert.Root>
	{/if} -->
	<section class="flex gap-10">
		<div class="flex flex-col items-center gap-3">
			<div
				class="h-[3.75rem] w-[3.75rem] rounded-full bg-white p-1 shadow-lg md:h-[6.25rem] md:w-[6.25rem]"
			>
				<div
					class="relative flex h-full w-full items-center justify-center rounded-full bg-[#FAE9C7]"
				>
					<p class="text-2xl font-medium text-[#b6b5b1] capitalize lg:text-4xl">
						{getUserInitial(user?.name ?? '')}
					</p>
				</div>
			</div>
		</div>
		<div class="flex flex-col gap-3">
			<h1 class="font-display text-lg font-semibold capitalize md:text-2xl">
				{user?.name}
			</h1>
			<div class="flex flex-col">
				<h2 class="text-sm font-semibold md:text-base">{m.profile_email_label()}</h2>
				<p class="text-sm font-normal md:text-base">{user?.email}</p>
			</div>
		</div>
	</section>

	<section class="rounded-2xl border bg-card p-6 shadow-sm">
		<div class="flex flex-col gap-1">
			<h2 class="text-base font-semibold md:text-lg">プラン情報</h2>
			<p class="text-sm text-muted-foreground">
				{#if isPremium}
					プレミアムプランをご利用中です。
				{:else}
					無料プランをご利用中です。
				{/if}
			</p>
		</div>

		{#if isPremium}
			<div class="mt-5 divide-y rounded-lg border text-sm">
				<div class="flex items-center justify-between px-4 py-3">
					<span class="text-muted-foreground">現在のプラン</span>
					<span class="font-medium">{planLabel}</span>
				</div>
				<div class="flex items-center justify-between px-4 py-3">
					<span class="text-muted-foreground">ステータス</span>
					<span class="font-medium">{statusLabel}</span>
				</div>
				<div class="flex items-center justify-between px-4 py-3">
					<span class="text-muted-foreground">有効期限</span>
					<span class="font-medium">{periodEndLabel}</span>
				</div>
				<div class="flex items-center justify-between px-4 py-3">
					<span class="text-muted-foreground">次回の更新日</span>
					<span class="font-medium">{nextBillingLabel}</span>
				</div>
				<div class="flex items-center justify-between px-4 py-3">
					<span class="text-muted-foreground">請求予定金額</span>
					<span class="font-medium">{billingAmountLabel}</span>
				</div>
			</div>
			<div class="mt-6 flex flex-col items-center gap-3">
				<Button class="w-full sm:w-auto" onclick={handleManagePlan} disabled={isUpgrading}>
					{#if isUpgrading}
						<Loader2 class="size-4 animate-spin" />
					{/if}
					プランの詳細確認・変更・キャンセルはこちら
				</Button>
				<span class="text-xs text-muted-foreground">返金ポリシー</span>
			</div>
		{/if}
	</section>

	{#if !isPremium}
		<Dialog.Root bind:open={isPremiumModalOpen}>
			<Dialog.Content class="w-full max-w-[420px] p-6 sm:p-7">
				<div class="flex flex-col items-center gap-4 text-center">
					<span class="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600">
						一生分のお得をあなたに
					</span>
					<h3 class="text-xl font-semibold">サブスク管理 プレミアム</h3>
					<div class="flex h-32 w-32 items-center justify-center rounded-full bg-muted">
						<span class="text-4xl">¥</span>
					</div>
					<p class="text-sm text-muted-foreground">
						プレミアム機能でサブスク管理をもっと快適に。
					</p>
				</div>

				<div class="mt-6 rounded-xl border bg-muted/30 p-4 text-sm">
					<div class="flex items-center justify-between pb-3 text-xs font-semibold text-muted-foreground">
						<span>機能</span>
						<div class="flex items-center gap-4">
							<span class="rounded-full bg-muted px-2 py-0.5">無料</span>
							<span class="rounded-full bg-primary px-2 py-0.5 text-primary-foreground">
								プレミアム
							</span>
						</div>
					</div>
					<div class="divide-y">
						{#each premiumFeatures as feature (feature.label)}
							<div class="flex items-center justify-between py-2">
								<span class="text-foreground">{feature.label}</span>
								<div class="flex items-center gap-6">
									<span class="flex w-12 items-center justify-center text-muted-foreground">
										{#if typeof feature.free === 'boolean'}
											{#if feature.free}
												<Check class="h-4 w-4 text-emerald-500" />
											{:else}
												<X class="h-4 w-4 text-muted-foreground" />
											{/if}
										{:else}
											{feature.free}
										{/if}
									</span>
									<span class="flex w-12 items-center justify-center">
										{#if typeof feature.premium === 'boolean'}
											{#if feature.premium}
												<Check class="h-4 w-4 text-emerald-500" />
											{:else}
												<X class="h-4 w-4 text-muted-foreground" />
											{/if}
										{:else}
											{feature.premium}
										{/if}
									</span>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<div class="mt-6 flex flex-col gap-3">
					<Button class="w-full" onclick={handleUpgrade} disabled={isUpgrading}>
						{#if isUpgrading}
							<Loader2 class="size-4 animate-spin" />
						{/if}
						プレミアムプランに登録する
					</Button>
					<div class="flex items-center justify-center gap-6 text-xs text-muted-foreground">
						<span>利用規約</span>
						<span>プライバシーポリシー</span>
					</div>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	{/if}
</div>
