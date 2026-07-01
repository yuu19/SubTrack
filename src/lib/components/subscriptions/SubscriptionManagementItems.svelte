<script lang="ts">
	import { base } from '$app/paths';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { PAYMENT_METHOD_TYPES, type AppLocale, type PaymentMethodType } from '$lib/constant';
	import { resolveLocale } from '$lib/locale';
	import { getLocale } from '$lib/paraglide/runtime';
	import type {
		subscriptionCategoryTable,
		subscriptionPaymentMethodTable
	} from '$lib/server/db/schema';
	import {
		getSubscriptionColorLabel,
		getSubscriptionColorStyle,
		subscriptionColors,
		type SubscriptionColor
	} from '$lib/subscription-colors';
	import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	type Category = typeof subscriptionCategoryTable.$inferSelect;
	type PaymentMethod = typeof subscriptionPaymentMethodTable.$inferSelect;

	type ManagementItems = {
		categories: Category[];
		paymentMethods: PaymentMethod[];
	};

	let {
		categories = [],
		paymentMethods = [],
		isPremium = false,
		isOnline = true,
		compact = false,
		onItemsChange
	}: {
		categories?: Category[];
		paymentMethods?: PaymentMethod[];
		isPremium?: boolean;
		isOnline?: boolean;
		compact?: boolean;
		onItemsChange?: (items: ManagementItems) => void;
	} = $props();

	let localCategories = $state<Category[]>([]);
	let localPaymentMethods = $state<PaymentMethod[]>([]);
	let newCategoryName = $state('');
	let newCategoryColor = $state<SubscriptionColor>('blue');
	let newPaymentMethodName = $state('');
	let newPaymentMethodType = $state<PaymentMethodType>('credit_card');
	let editingPaymentMethodId = $state<number | null>(null);
	let editingPaymentMethodName = $state('');
	let editingPaymentMethodType = $state<PaymentMethodType>('credit_card');
	let busy = $state(false);

	const locale = $derived(resolveLocale(getLocale()));
	const paymentLimitReached = $derived(!isPremium && localPaymentMethods.length >= 3);
	const rootClass = $derived(compact ? 'space-y-4' : 'grid gap-8 lg:grid-cols-2');
	const sectionClass = $derived(compact ? 'min-w-0 space-y-2' : 'min-w-0 space-y-4');
	const listItemClass = $derived(
		compact
			? 'bg-background flex min-w-0 flex-wrap items-center gap-2 rounded-md px-2.5 py-1.5 text-sm ring-1 ring-border/60'
			: 'flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2 text-sm'
	);
	const addRowClass = $derived(
		compact
			? 'grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_8.5rem_auto]'
			: 'grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem] xl:grid-cols-[minmax(0,1fr)_10rem_auto]'
	);
	const addButtonClass = $derived(compact ? '' : 'sm:col-span-2 xl:col-span-1');

	const copy = $derived(getCopy(locale));

	$effect(() => {
		localCategories = categories;
		localPaymentMethods = paymentMethods;
	});

	const paymentTypeLabel = (type: string | null | undefined) => {
		const labels: Record<PaymentMethodType, Record<AppLocale, string>> = {
			credit_card: { ja: 'クレジットカード', en: 'Credit card' },
			app_store: { ja: 'Apple / Google', en: 'Apple / Google' },
			other: { ja: 'その他', en: 'Other' }
		};
		return labels[
			PAYMENT_METHOD_TYPES.includes(type as PaymentMethodType)
				? (type as PaymentMethodType)
				: 'other'
		][locale];
	};

	const categoryIcon = (key: string | null) => {
		const icons: Record<string, string> = {
			video: '🎬',
			music: '🎵',
			ai: '🤖',
			tools: '🔧',
			storage: '☁️',
			development: '💻',
			design: '🎨',
			business: '💼',
			shopping: '🛒'
		};
		return key ? (icons[key] ?? '📁') : '';
	};

	const syncItems = (items: ManagementItems) => {
		localCategories = items.categories;
		localPaymentMethods = items.paymentMethods;
		onItemsChange?.(items);
	};

	const requestJson = async (endpoint: string, init: RequestInit) => {
		busy = true;
		try {
			const response = await fetch(`${base}${endpoint}`, {
				...init,
				headers: {
					'content-type': 'application/json',
					...(init.headers ?? {})
				}
			});

			const payload = (await response.json().catch(() => null)) as
				| (ManagementItems & { error?: string })
				| null;

			if (!response.ok || !payload) {
				if (payload?.error === 'category_premium_required') {
					toast.error(copy.categoryPremiumRequired);
				} else if (payload?.error === 'payment_method_limit_reached') {
					toast.error(copy.paymentLimitReached);
				} else {
					toast.error(copy.saveFailed);
				}
				return null;
			}

			syncItems(payload);
			return payload;
		} finally {
			busy = false;
		}
	};

	const createCategory = async () => {
		const name = newCategoryName.trim();
		if (!name || !isOnline || busy) return;
		if (!isPremium) {
			toast.error(copy.categoryPremiumRequired);
			return;
		}
		const result = await requestJson('/api/subscription-categories', {
			method: 'POST',
			body: JSON.stringify({ name, color: newCategoryColor })
		});
		if (result) {
			newCategoryName = '';
			newCategoryColor = 'blue';
		}
	};

	const createPaymentMethod = async () => {
		const name = newPaymentMethodName.trim();
		if (!name || !isOnline || busy) return;
		const result = await requestJson('/api/subscription-payment-methods', {
			method: 'POST',
			body: JSON.stringify({ name, type: newPaymentMethodType })
		});
		if (result) {
			newPaymentMethodName = '';
			newPaymentMethodType = 'credit_card';
		}
	};

	const updatePaymentMethod = async () => {
		if (!editingPaymentMethodId || !editingPaymentMethodName.trim() || !isOnline || busy) return;
		const result = await requestJson(
			`/api/subscription-payment-methods/${editingPaymentMethodId}`,
			{
				method: 'PATCH',
				body: JSON.stringify({
					name: editingPaymentMethodName.trim(),
					type: editingPaymentMethodType
				})
			}
		);
		if (result) cancelPaymentMethodEdit();
	};

	const deletePaymentMethod = async (id: number) => {
		if (!isOnline || busy) return;
		const result = await requestJson(`/api/subscription-payment-methods/${id}`, {
			method: 'DELETE'
		});
		if (result && editingPaymentMethodId === id) cancelPaymentMethodEdit();
	};

	const startPaymentMethodEdit = (paymentMethod: PaymentMethod) => {
		editingPaymentMethodId = paymentMethod.id;
		editingPaymentMethodName = paymentMethod.name;
		editingPaymentMethodType = paymentMethod.type as PaymentMethodType;
	};

	const cancelPaymentMethodEdit = () => {
		editingPaymentMethodId = null;
		editingPaymentMethodName = '';
		editingPaymentMethodType = 'credit_card';
	};

	function getCopy(currentLocale: AppLocale) {
		if (currentLocale === 'en') {
			return {
				categoryTitle: 'Categories',
				categoryDescription: 'Standard categories are available to everyone.',
				paymentTitle: 'Payment methods',
				paymentDescription: 'Free users can keep up to 3 payment methods.',
				namePlaceholder: 'Name',
				customCategoryTitle: 'Custom category',
				customCategoryDescription: 'Premium users can add custom categories.',
				categoryPremiumNotice: 'Custom categories are available with Premium.',
				add: 'Add',
				save: 'Save',
				edit: 'Edit',
				cancel: 'Cancel',
				emptyCategories: 'No categories yet.',
				emptyPaymentMethods: 'No payment methods yet.',
				offline: 'Online connection is required to change these items.',
				categoryPremiumRequired: 'Custom categories are available with Premium.',
				paymentLimitReached: 'Free users can create up to 3 payment methods.',
				saveFailed: 'Failed to save.'
			};
		}
		return {
			categoryTitle: 'カテゴリー',
			categoryDescription: '標準カテゴリーはすべてのプランで利用できます。',
			paymentTitle: '支払い方法',
			paymentDescription: '無料プランでは最大3件まで管理できます。',
			namePlaceholder: '名前',
			customCategoryTitle: 'カスタムカテゴリー',
			customCategoryDescription: 'Premiumユーザーはカスタムカテゴリーを追加できます。',
			categoryPremiumNotice: 'カスタムカテゴリーの追加はPremiumで利用できます。',
			add: '追加',
			save: '保存',
			edit: '編集',
			cancel: 'キャンセル',
			emptyCategories: 'カテゴリーはまだありません。',
			emptyPaymentMethods: '支払い方法はまだありません。',
			offline: '変更にはオンライン接続が必要です。',
			categoryPremiumRequired: 'カスタムカテゴリーの追加はPremiumで利用できます。',
			paymentLimitReached: '無料プランでは支払い方法を最大3件まで作成できます。',
			saveFailed: '保存に失敗しました。'
		};
	}
</script>

<div class={rootClass}>
	<section class={sectionClass}>
		<div class={compact ? 'flex items-center justify-between gap-3' : 'space-y-1'}>
			<h3 class="text-sm font-semibold">{copy.categoryTitle}</h3>
			{#if !compact}
				<p class="text-muted-foreground text-xs">{copy.categoryDescription}</p>
			{/if}
		</div>
		{#if !isOnline}
			<p class="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
				{copy.offline}
			</p>
		{/if}
		<div class="space-y-2">
			{#if !compact && localCategories.length === 0}
				<p class="text-muted-foreground bg-muted/30 rounded-md px-3 py-2 text-sm">
					{copy.emptyCategories}
				</p>
			{/if}
			<div class="flex min-w-0 flex-wrap gap-2">
				{#each localCategories as category (category.id)}
					<div
						class="bg-background text-foreground ring-border/70 inline-flex max-w-full min-w-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-medium shadow-sm ring-1"
					>
						{#if category.key}
							<span class="text-base leading-none" aria-hidden="true">
								{categoryIcon(category.key)}
							</span>
						{:else}
							<span
								class="size-2.5 shrink-0 rounded-full"
								style:background-color={getSubscriptionColorStyle(
									category.color as SubscriptionColor
								)}
							></span>
						{/if}
						<span class="min-w-0 truncate">{category.name}</span>
					</div>
				{/each}
			</div>
		</div>
		{#if isPremium}
			<div class="space-y-2">
				<div class="space-y-0.5">
					<p class="text-sm font-medium">{copy.customCategoryTitle}</p>
					<p class="text-muted-foreground text-xs">{copy.customCategoryDescription}</p>
				</div>
				<div class={addRowClass}>
					<Input
						bind:value={newCategoryName}
						placeholder={copy.namePlaceholder}
						disabled={!isOnline}
					/>
					<select
						class="border-input bg-background h-9 rounded-md border px-2 text-sm"
						bind:value={newCategoryColor}
						disabled={!isOnline}
					>
						{#each subscriptionColors as color (color)}
							<option value={color}>{getSubscriptionColorLabel(color, locale)}</option>
						{/each}
					</select>
					<Button
						type="button"
						class={addButtonClass}
						disabled={!isOnline || busy || !newCategoryName.trim()}
						onclick={createCategory}
					>
						<Plus class="size-4" />
						{copy.add}
					</Button>
				</div>
			</div>
		{:else}
			<p class="text-muted-foreground bg-muted/30 rounded-md px-3 py-2 text-xs">
				{copy.categoryPremiumNotice}
			</p>
		{/if}
	</section>

	<section class={sectionClass}>
		<div class={compact ? 'flex items-center justify-between gap-3' : 'space-y-1'}>
			<h3 class="text-sm font-semibold">{copy.paymentTitle}</h3>
			{#if !compact}
				<p class="text-muted-foreground text-xs">{copy.paymentDescription}</p>
			{/if}
		</div>
		<div class="space-y-2">
			{#if !compact && localPaymentMethods.length === 0}
				<p class="text-muted-foreground bg-muted/30 rounded-md px-3 py-2 text-sm">
					{copy.emptyPaymentMethods}
				</p>
			{/if}
			{#each localPaymentMethods as paymentMethod (paymentMethod.id)}
				<div class={listItemClass}>
					{#if editingPaymentMethodId === paymentMethod.id}
						<Input bind:value={editingPaymentMethodName} placeholder={copy.namePlaceholder} />
						<select
							class="border-input bg-background h-9 rounded-md border px-2 text-sm"
							bind:value={editingPaymentMethodType}
						>
							{#each PAYMENT_METHOD_TYPES as type (type)}
								<option value={type}>{paymentTypeLabel(type)}</option>
							{/each}
						</select>
						<Button
							type="button"
							size="icon-sm"
							disabled={!isOnline || busy}
							onclick={updatePaymentMethod}
						>
							{#if busy}<Loader2 class="size-4 animate-spin" />{:else}<Check class="size-4" />{/if}
						</Button>
						<Button
							type="button"
							size="icon-sm"
							variant="outline"
							onclick={cancelPaymentMethodEdit}
						>
							<X class="size-4" />
						</Button>
					{:else}
						<span class="min-w-0 flex-1 truncate">{paymentMethod.name}</span>
						<span class="text-muted-foreground hidden text-xs sm:inline">
							{paymentTypeLabel(paymentMethod.type)}
						</span>
						<Button
							type="button"
							size="icon-sm"
							variant="ghost"
							disabled={!isOnline || busy}
							onclick={() => startPaymentMethodEdit(paymentMethod)}
						>
							<Pencil class="size-4" />
						</Button>
						<Button
							type="button"
							size="icon-sm"
							variant="ghost"
							disabled={!isOnline || busy}
							onclick={() => deletePaymentMethod(paymentMethod.id)}
						>
							<Trash2 class="size-4" />
						</Button>
					{/if}
				</div>
			{/each}
		</div>
		<div class={addRowClass}>
			<Input
				bind:value={newPaymentMethodName}
				placeholder={copy.namePlaceholder}
				disabled={!isOnline}
			/>
			<select
				class="border-input bg-background h-9 rounded-md border px-2 text-sm"
				bind:value={newPaymentMethodType}
				disabled={!isOnline}
			>
				{#each PAYMENT_METHOD_TYPES as type (type)}
					<option value={type}>{paymentTypeLabel(type)}</option>
				{/each}
			</select>
			<Button
				type="button"
				class={addButtonClass}
				disabled={!isOnline || busy || !newPaymentMethodName.trim() || paymentLimitReached}
				onclick={createPaymentMethod}
			>
				<Plus class="size-4" />
				{copy.add}
			</Button>
		</div>
	</section>
</div>
