<script lang="ts">
	import { fieldProxy, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { createSubscriptionSchema } from '$lib/formSchema';
	import { subscriptionFormCopy } from '$lib/i18n-copy';
	import { untrack } from 'svelte';
	import { fromAction } from 'svelte/attachments';
	import { Field, Control, Label, Description, FieldErrors } from 'formsnap';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import SubscriptionManagementItems from '$lib/components/subscriptions/SubscriptionManagementItems.svelte';
	import SubscriptionIcon from '$lib/components/subscriptions/SubscriptionIcon.svelte';
	import { ArrowLeft, ChevronDown, Pencil } from 'lucide-svelte';
	import { payloadFromFormData, type SubscriptionPayload } from '$lib/offline/subscriptions';
	import {
		formatCurrency,
		formatLongDate,
		formatNotifyDays,
		getCancellationMethodLabel,
		getCycleLabel,
		resolveLocale
	} from '$lib/locale';
	import {
		CANCELLATION_METHODS,
		DEFAULT_SUBSCRIPTION_CURRENCY,
		SUPPORTED_CURRENCIES,
		type SubscriptionCurrency
	} from '$lib/constant';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime';
	import {
		serviceTemplates,
		type ServiceTemplate,
		type ServiceTemplateCategory,
		type ServiceTemplatePlan,
		type ServiceTemplatePlanPrice
	} from '$lib/service-templates';
	import type {
		subscriptionCategoryTable,
		subscriptionPaymentMethodTable
	} from '$lib/server/db/schema';
	import { UserConfigContext } from '$lib/states/userConfig.svelte';
	import {
		defaultSubscriptionColor,
		getSubscriptionColorStyle,
		type SubscriptionColor
	} from '$lib/subscription-colors';
	import {
		defaultSubscriptionIconType,
		defaultSubscriptionIconValue,
		resolveFaviconUrl,
		subscriptionEmojiOptions,
		subscriptionPresetIconOptions,
		type SubscriptionIconType
	} from '$lib/subscription-icons';

	type Category = typeof subscriptionCategoryTable.$inferSelect;
	type PaymentMethod = typeof subscriptionPaymentMethodTable.$inferSelect;

	let {
		data,
		open = false,
		categories = [],
		paymentMethods = [],
		isPremium = false,
		isOnline = true,
		onClose = () => {},
		onOfflineSubmit,
		onServerResult,
		onManagementItemsChange
	} = $props<{
		data: { form: unknown };
		open?: boolean;
		categories?: Category[];
		paymentMethods?: PaymentMethod[];
		isPremium?: boolean;
		isOnline?: boolean;
		onClose?: () => void;
		onOfflineSubmit?: (payload: SubscriptionPayload) => Promise<void>;
		onServerResult?: (subscriptions: any[]) => Promise<void>;
		onManagementItemsChange?: (items: {
			categories: Category[];
			paymentMethods: PaymentMethod[];
		}) => void;
	}>();
	const userConfig = UserConfigContext.get();
	const currentLocale = $derived(resolveLocale(getLocale()));
	const formCopy = $derived(subscriptionFormCopy[currentLocale]);
	const localizedSubscriptionSchema = untrack(() => createSubscriptionSchema(currentLocale));
	const cycleOptions = $derived([
		{ value: 'monthly', label: getCycleLabel('monthly', currentLocale) },
		{ value: 'quarterly', label: getCycleLabel('quarterly', currentLocale) },
		{ value: 'yearly', label: getCycleLabel('yearly', currentLocale) }
	]);
	const notifyOptions = $derived([1, 3, 7]);
	const cancellationMethodOptions = $derived(
		CANCELLATION_METHODS.map((value) => ({
			value,
			label: getCancellationMethodLabel(value, currentLocale)
		}))
	);
	const iconFieldLabel = $derived(formCopy.fields.icon);
	const iconFieldDescription = $derived(formCopy.fields.iconDescription);
	const iconOptions = $derived(subscriptionEmojiOptions);
	const serviceUrlFieldLabel = $derived(formCopy.fields.officialWebsiteUrl);
	const serviceUrlFieldDescription = $derived(formCopy.fields.officialWebsiteDescription);
	const presetIconOptions = $derived(
		subscriptionPresetIconOptions.map((option) => ({
			...option,
			label: option.label[currentLocale]
		}))
	);
	const recommendedPresetIconOptions = $derived(
		presetIconOptions.filter((option) =>
			['box', 'video', 'music', 'cloud', 'payment', 'shopping', 'game', 'work'].includes(
				option.value
			)
		)
	);
	const lastCurrencyStorageKey = 'subtrack:last-subscription-currency';
	const currencyFieldLabel = $derived(formCopy.fields.currency);
	const categoryFieldLabel = $derived(formCopy.fields.category);
	const paymentMethodFieldLabel = $derived(formCopy.fields.paymentMethod);
	const notSetLabel = $derived(formCopy.fields.notSet);
	const managementSummaryLabel = $derived(formCopy.fields.managementSummary);
	const managementSectionTitle = $derived(formCopy.fields.managementSection);
	const currencyOptions = $derived(SUPPORTED_CURRENCIES.map((currency) => ({ value: currency })));
	const templateCategoryOptions: Array<{ value: 'all' | ServiceTemplateCategory }> = [
		{ value: 'all' },
		{ value: 'video' },
		{ value: 'music' },
		{ value: 'ai' },
		{ value: 'tools' },
		{ value: 'storage' },
		{ value: 'development' },
		{ value: 'design' },
		{ value: 'business' },
		{ value: 'card' },
		{ value: 'shopping' },
		{ value: 'other' }
	];
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
	const isCategorySelected = (id: number | null) =>
		id === null ? !$categoryIdField : Number($categoryIdField) === id;
	const categoryChipClass = (selected: boolean) =>
		`inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium shadow-sm transition ${
			selected
				? 'border-primary bg-primary/10 text-primary ring-primary/20 ring-2'
				: 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted/50'
		}`;

	const defaultNotifyDaysBefore = $derived(userConfig.current.defaultNotifyDaysBefore ?? 3);
	const now = new Date();
	const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
		now.getDate()
	).padStart(2, '0')}`;
	let wasOpen = false;
	let entryMode = $state<'templates' | 'form'>('templates');
	let templateSearch = $state('');
	let selectedCategory = $state<'all' | ServiceTemplateCategory>('all');
	let selectedPlanId = $state('');
	let isManagementOpen = $state(false);

	const form = superForm(
		untrack(() => data.form),
		{
			validators: zod4Client(localizedSubscriptionSchema)
		}
	);

	const { enhance } = form;

	const textField = fieldProxy(form, 'text');
	const serviceTemplateIdField = fieldProxy(form, 'serviceTemplateId');
	const planNameField = fieldProxy(form, 'planName');
	const serviceUrlField = fieldProxy(form, 'serviceUrl');
	const priceEditedByUserField = fieldProxy(form, 'priceEditedByUser');
	const categoryIdField = fieldProxy(form, 'categoryId');
	const paymentMethodIdField = fieldProxy(form, 'paymentMethodId');
	const colorField = fieldProxy(form, 'color');
	const iconTypeField = fieldProxy(form, 'iconType');
	const iconValueField = fieldProxy(form, 'iconValue');
	const selectField = fieldProxy(form, 'select');
	const notifyDaysBeforeField = fieldProxy(form, 'notifyDaysBefore');
	const numberField = fieldProxy(form, 'number');
	const currencyField = fieldProxy(form, 'currency');
	const datepickerField = fieldProxy(form, 'datepicker');
	const cancellationUrlField = fieldProxy(form, 'cancellationUrl');
	const cancellationMethodField = fieldProxy(form, 'cancellationMethod');
	const cancellationMemoField = fieldProxy(form, 'cancellationMemo');
	const cancellationDeadlineMemoField = fieldProxy(form, 'cancellationDeadlineMemo');

	const localizedPlanName = (plan: ServiceTemplatePlan) => plan.name[currentLocale];
	const getTemplateCategoryLabel = (category: 'all' | ServiceTemplateCategory) => {
		const labels: Record<'all' | ServiceTemplateCategory, { ja: string; en: string }> = {
			all: { ja: 'すべて', en: 'All' },
			video: { ja: '動画', en: 'Video' },
			music: { ja: '音楽', en: 'Music' },
			ai: { ja: 'AI', en: 'AI' },
			tools: { ja: 'ツール', en: 'Tools' },
			storage: { ja: 'ストレージ', en: 'Storage' },
			development: { ja: '開発', en: 'Development' },
			design: { ja: 'デザイン', en: 'Design' },
			business: { ja: 'ビジネス', en: 'Business' },
			card: { ja: 'カード', en: 'Card' },
			shopping: { ja: '買い物', en: 'Shopping' },
			other: { ja: 'その他', en: 'Other' }
		};

		return labels[category][currentLocale];
	};
	const resolvePlanPrice = (
		plan: ServiceTemplatePlan | null | undefined,
		currency: string | null | undefined
	): ServiceTemplatePlanPrice | null =>
		plan?.prices.find((price) => price.currency === currency) ?? null;
	const resolveAutofillPlanPrice = (
		plan: ServiceTemplatePlan | null | undefined,
		currency: string | null | undefined
	): ServiceTemplatePlanPrice | null => resolvePlanPrice(plan, currency) ?? plan?.prices[0] ?? null;
	const formatSelectedCurrencyPlanPrice = (plan: ServiceTemplatePlan) => {
		const price = resolvePlanPrice(plan, $currencyField);
		return price ? ` - ${formatCurrency(price.amount, price.currency, currentLocale)}` : '';
	};
	const resolveStoredCurrency = (): SubscriptionCurrency => {
		if (typeof window === 'undefined') return DEFAULT_SUBSCRIPTION_CURRENCY;
		const value = window.localStorage.getItem(lastCurrencyStorageKey);
		return SUPPORTED_CURRENCIES.includes(value as SubscriptionCurrency)
			? (value as SubscriptionCurrency)
			: DEFAULT_SUBSCRIPTION_CURRENCY;
	};
	const resetFormFields = () => {
		form.reset();
		$textField = '';
		$serviceTemplateIdField = '';
		$planNameField = '';
		$serviceUrlField = '';
		$priceEditedByUserField = false;
		$categoryIdField = null;
		$paymentMethodIdField = null;
		$colorField = defaultSubscriptionColor;
		$iconTypeField = defaultSubscriptionIconType;
		$iconValueField = defaultSubscriptionIconValue;
		$selectField = '';
		$notifyDaysBeforeField = defaultNotifyDaysBefore;
		$numberField = 0;
		$currencyField = resolveStoredCurrency();
		$datepickerField = todayISO;
		$cancellationUrlField = '';
		$cancellationMethodField = '';
		$cancellationMemoField = '';
		$cancellationDeadlineMemoField = '';
		selectedPlanId = '';
	};
	const templateQuery = $derived(templateSearch.trim().toLocaleLowerCase());
	const selectedTemplate = $derived.by(() =>
		serviceTemplates.find((template) => template.id === $serviceTemplateIdField)
	);
	const selectedPlan = $derived.by(() =>
		selectedTemplate?.plans.find((plan) => plan.id === selectedPlanId)
	);
	const selectedPlanPrice = $derived(resolvePlanPrice(selectedPlan, $currencyField));
	const matchingTemplates = $derived.by(() => {
		return serviceTemplates
			.filter((template) => {
				if (selectedCategory !== 'all' && template.category !== selectedCategory) return false;
				if (!templateQuery) return true;

				const haystack = [
					template.name,
					getTemplateCategoryLabel(template.category),
					...template.plans.flatMap((plan) => [plan.name.ja, plan.name.en])
				]
					.join(' ')
					.toLocaleLowerCase();
				return haystack.includes(templateQuery);
			})
			.slice();
	});
	const selectedTemplateVerifiedAt = $derived(
		selectedTemplate ? formatLongDate(selectedTemplate.lastVerifiedAt, currentLocale) : ''
	);
	const selectedPlanPriceVerifiedAt = $derived(
		selectedPlanPrice ? formatLongDate(selectedPlanPrice.verifiedAt, currentLocale) : ''
	);
	const resolveTemplateCategoryId = (template: ServiceTemplate) =>
		categories.find((category: Category) => category.key === template.category)?.id ?? null;

	const applyTemplatePlan = (
		template: ServiceTemplate,
		plan: ServiceTemplatePlan,
		options: { applyIcon?: boolean } = {}
	) => {
		const { applyIcon = true } = options;
		$serviceTemplateIdField = template.id;
		selectedPlanId = plan.id;
		$planNameField = localizedPlanName(plan);
		$serviceUrlField = template.sourceUrl;
		$priceEditedByUserField = false;
		$textField = template.name;
		$colorField = template.color;
		if (applyIcon) {
			$iconTypeField = 'templateImage';
			$iconValueField = template.id;
		}
		$selectField = plan.cycle;
		const price = resolveAutofillPlanPrice(plan, $currencyField);
		if (price) {
			$currencyField = price.currency;
			$numberField = price.amount;
		} else {
			$numberField = 0;
		}
		$cancellationUrlField = template.cancellation.url ?? '';
		$cancellationMethodField = template.cancellation.method;
		$cancellationMemoField = template.cancellation.memo[currentLocale];
		$cancellationDeadlineMemoField = template.cancellation.deadlineMemo?.[currentLocale] ?? '';
		$categoryIdField = resolveTemplateCategoryId(template);
	};

	const selectTemplate = (template: ServiceTemplate) => {
		resetFormFields();
		applyTemplatePlan(template, template.plans[0]);
		templateSearch = template.name;
		entryMode = 'form';
	};

	const enterManualForm = () => {
		resetFormFields();
		entryMode = 'form';
	};

	const returnToTemplateList = () => {
		resetFormFields();
		templateSearch = '';
		selectedCategory = 'all';
		entryMode = 'templates';
	};

	const updateSelectedPlan = (event: Event) => {
		const planId = (event.currentTarget as HTMLSelectElement).value;
		if (!selectedTemplate) return;
		const plan = selectedTemplate.plans.find((item) => item.id === planId);
		if (!plan) return;
		applyTemplatePlan(selectedTemplate, plan, { applyIcon: false });
	};

	const markPriceEdited = () => {
		if ($serviceTemplateIdField) {
			$priceEditedByUserField = true;
		}
	};

	const selectIcon = (iconType: SubscriptionIconType, iconValue: string) => {
		$iconTypeField = iconType;
		$iconValueField = iconValue;
	};
	const serviceFaviconUrl = $derived(resolveFaviconUrl($serviceUrlField));
	const selectOfficialSiteIcon = () => {
		if (!serviceFaviconUrl) return;
		selectIcon('favicon', $serviceUrlField ?? '');
	};

	const enhanceEvents = {
		onSubmit: async (input: any) => {
			if (typeof navigator === 'undefined' || navigator.onLine) return;
			input.cancel();
			const payload = payloadFromFormData(input.formData);
			if (onOfflineSubmit) {
				await onOfflineSubmit(payload);
				form.reset();
				onClose();
			}
		},
		onResult: async (event: any) => {
			const result = event?.result as { data?: { subscriptions?: unknown } } | undefined;
			const subscriptions = result?.data?.subscriptions;
			if (subscriptions && Array.isArray(subscriptions)) {
				await onServerResult?.(subscriptions);
				onClose();
			}
		}
	};

	$effect(() => {
		const isOpen = open;
		if (isOpen && !wasOpen) {
			resetFormFields();
			templateSearch = '';
			selectedCategory = 'all';
			selectedPlanId = '';
			entryMode = 'templates';
			isManagementOpen = categories.length === 0 || paymentMethods.length === 0;
		}
		wasOpen = isOpen;
	});

	$effect(() => {
		const currency = $currencyField;
		if (typeof window === 'undefined') return;
		if (!SUPPORTED_CURRENCIES.includes(currency as SubscriptionCurrency)) return;
		window.localStorage.setItem(lastCurrencyStorageKey, currency);
	});

	$effect(() => {
		if (!selectedPlan || $priceEditedByUserField) return;
		const price = resolveAutofillPlanPrice(selectedPlan, $currencyField);
		if (price) {
			if (!selectedPlanPrice) {
				$currencyField = price.currency;
			}
			$numberField = price.amount;
		} else {
			$numberField = 0;
		}
	});

	$effect(() => {
		if ($iconTypeField === 'favicon') {
			$iconValueField = $serviceUrlField ?? '';
		}
	});
</script>

<div class="min-w-0 space-y-6 overflow-x-hidden p-4 sm:p-6">
	{#if entryMode === 'templates'}
		<div class="space-y-4">
			<h2 class="text-2xl font-bold">{m.add_subscription_title()}</h2>
			<div class="space-y-1">
				<label for="service-template-search" class="font-medium">
					{m.subscription_template_search_label()}
				</label>
				<p class="text-muted-foreground text-xs">
					{m.subscription_template_search_description()}
				</p>
			</div>
			<Input
				id="service-template-search"
				type="search"
				placeholder={m.subscription_template_search_placeholder()}
				bind:value={templateSearch}
			/>
			<Button type="button" variant="outline" class="h-12 w-full" onclick={enterManualForm}>
				<Pencil class="size-4" aria-hidden="true" />
				{formCopy.actions.enterManually}
			</Button>
			<div class="flex flex-wrap gap-2" aria-label={m.subscription_template_search_label()}>
				{#each templateCategoryOptions as category (category.value)}
					<button
						type="button"
						class="rounded-full border px-3 py-2 text-sm font-medium whitespace-nowrap transition sm:px-4 {selectedCategory ===
						category.value
							? 'bg-foreground text-background border-foreground'
							: 'bg-background hover:bg-muted/60 text-muted-foreground'}"
						onclick={() => (selectedCategory = category.value)}
					>
						{getTemplateCategoryLabel(category.value)}
					</button>
				{/each}
			</div>
			{#if matchingTemplates.length > 0}
				<div class="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10.5rem),1fr))] gap-3">
					{#each matchingTemplates as template (template.id)}
						<button
							type="button"
							class="hover:bg-muted/60 flex min-h-32 min-w-0 flex-col items-center justify-center gap-3 rounded-lg border px-3 py-4 text-center text-sm transition sm:min-h-36 sm:px-4 sm:py-5"
							onclick={() => selectTemplate(template)}
						>
							<span
								class="border-border bg-muted/50 flex size-12 shrink-0 items-center justify-center rounded-md border"
								aria-hidden="true"
							>
								<SubscriptionIcon iconType="templateImage" iconValue={template.id} class="size-8" />
							</span>
							<span class="w-full min-w-0 space-y-1">
								<span class="block truncate font-medium">{template.name}</span>
								<span class="text-muted-foreground block text-xs">
									{getTemplateCategoryLabel(template.category)}
								</span>
							</span>
						</button>
					{/each}
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">{m.subscription_template_empty()}</p>
			{/if}
		</div>
	{:else}
		<div class="flex items-center gap-3">
			<Button type="button" variant="outline" size="icon" onclick={returnToTemplateList}>
				<ArrowLeft class="size-4" aria-hidden="true" />
				<span class="sr-only">{formCopy.actions.backToTemplates}</span>
			</Button>
			<h2 class="text-2xl font-bold">{m.add_subscription_title()}</h2>
		</div>
		<form
			method="post"
			action="?/create"
			class="space-y-4"
			{@attach fromAction(enhance, () => enhanceEvents)}
		>
			<input type="hidden" name="serviceTemplateId" value={$serviceTemplateIdField ?? ''} />
			<input type="hidden" name="planName" value={$planNameField ?? ''} />
			<input type="hidden" name="color" value={$colorField ?? defaultSubscriptionColor} />
			<input type="hidden" name="iconType" value={$iconTypeField ?? defaultSubscriptionIconType} />
			<input
				type="hidden"
				name="priceEditedByUser"
				value={$priceEditedByUserField ? 'true' : 'false'}
			/>

			{#if selectedTemplate}
				<div class="space-y-2 rounded-lg border p-4">
					<label for="service-template-plan" class="text-sm font-medium">
						{m.subscription_template_plan_label()}
					</label>
					<select
						id="service-template-plan"
						class="border-input focus-visible:ring-ring focus-visible:border-ring bg-background flex h-10 w-full rounded-md border px-3 text-sm shadow-sm transition"
						value={selectedPlanId}
						onchange={updateSelectedPlan}
					>
						{#each selectedTemplate.plans as plan (plan.id)}
							<option value={plan.id}>
								{localizedPlanName(plan)}{formatSelectedCurrencyPlanPrice(plan)}
							</option>
						{/each}
					</select>
					<p class="text-muted-foreground text-xs">
						{m.subscription_template_cancellation_notice()}
					</p>
				</div>
			{/if}

			<Field {form} name="text">
				<Control>
					{#snippet children({ props })}
						<Label class="font-medium">{m.subscription_form_service_name_label()}</Label>
						<Input {...props} type="text" placeholder="Netflix" bind:value={$textField} />
					{/snippet}
				</Control>
				<FieldErrors class="text-destructive text-sm" />
			</Field>

			<section class="min-w-0 space-y-4 rounded-lg border p-3 sm:p-4">
				<div>
					<h3 class="text-sm font-semibold">{managementSectionTitle}</h3>
				</div>

				<div class="grid min-w-0 gap-3 sm:grid-cols-2">
					<div class="min-w-0 space-y-2">
						<Field {form} name="categoryId">
							<Control>
								{#snippet children({ props })}
									<Label class="font-medium">{categoryFieldLabel}</Label>
									<input {...props} type="hidden" value={$categoryIdField ?? ''} />
									<div
										class="flex min-w-0 flex-wrap gap-2"
										role="radiogroup"
										aria-label={categoryFieldLabel}
									>
										<button
											type="button"
											class={categoryChipClass(isCategorySelected(null))}
											aria-pressed={isCategorySelected(null)}
											onclick={() => ($categoryIdField = null)}
										>
											{notSetLabel}
										</button>
										{#each categories as category (category.id)}
											<button
												type="button"
												class={categoryChipClass(isCategorySelected(category.id))}
												aria-pressed={isCategorySelected(category.id)}
												onclick={() => ($categoryIdField = category.id)}
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
											</button>
										{/each}
									</div>
								{/snippet}
							</Control>
							<FieldErrors class="text-destructive text-sm" />
						</Field>
					</div>

					<div class="min-w-0 space-y-2">
						<Field {form} name="paymentMethodId">
							<Control>
								{#snippet children({ props })}
									<Label class="font-medium">{paymentMethodFieldLabel}</Label>
									<select
										{...props}
										class="border-input focus-visible:ring-ring focus-visible:border-ring bg-background flex h-10 w-full rounded-md border px-3 text-sm shadow-sm transition"
										bind:value={$paymentMethodIdField}
									>
										<option value="">{notSetLabel}</option>
										{#each paymentMethods as paymentMethod (paymentMethod.id)}
											<option value={paymentMethod.id}>{paymentMethod.name}</option>
										{/each}
									</select>
								{/snippet}
							</Control>
							<FieldErrors class="text-destructive text-sm" />
						</Field>
					</div>
				</div>

				<details bind:open={isManagementOpen} class="min-w-0 border-t pt-3">
					<summary
						class="text-primary flex min-w-0 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold"
					>
						<span class="min-w-0">{managementSummaryLabel}</span>
						<ChevronDown
							class={`size-4 shrink-0 transition-transform ${isManagementOpen ? 'rotate-180' : ''}`}
						/>
					</summary>
					<div class="mt-3">
						<SubscriptionManagementItems
							{categories}
							{paymentMethods}
							{isPremium}
							{isOnline}
							compact
							onItemsChange={onManagementItemsChange}
						/>
					</div>
				</details>
			</section>

			<details class="rounded-lg border p-4">
				<summary
					class="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium"
				>
					<span>{iconFieldLabel}</span>
					<span class="ml-auto flex items-center gap-3">
						<span
							class="border-border bg-muted/50 flex size-9 items-center justify-center rounded-md border"
						>
							<SubscriptionIcon
								iconType={$iconTypeField}
								iconValue={$iconValueField}
								class="size-5"
							/>
						</span>
						<span class="text-primary text-xs font-medium">
							{formCopy.actions.change}
						</span>
					</span>
				</summary>
				<div class="mt-4 space-y-4">
					<Field {form} name="iconValue">
						<Control>
							{#snippet children({ props })}
								<input {...props} type="hidden" bind:value={$iconValueField} />
								<div class="space-y-3">
									<div class="space-y-2">
										<p class="text-muted-foreground text-xs">
											{formCopy.actions.recommended}
										</p>
										<div class="flex flex-wrap gap-2" role="radiogroup" aria-label={iconFieldLabel}>
											{#each recommendedPresetIconOptions as icon (icon.value)}
												<button
													type="button"
													onclick={() => selectIcon('preset', icon.value)}
													class="border-border bg-background hover:bg-muted/60 flex size-11 items-center justify-center rounded-md border transition-colors {$iconTypeField ===
														'preset' && icon.value === $iconValueField
														? 'border-primary bg-primary/10 outline-primary outline outline-2 outline-offset-2'
														: ''}"
													role="radio"
													aria-checked={$iconTypeField === 'preset' &&
														icon.value === $iconValueField}
													aria-label={icon.label}
													title={icon.label}
												>
													<SubscriptionIcon
														iconType="preset"
														iconValue={icon.value}
														class="size-5"
													/>
												</button>
											{/each}
										</div>
									</div>
									<div class="space-y-2">
										<p class="text-muted-foreground text-xs">
											{formCopy.actions.emoji}
										</p>
										<div class="flex flex-wrap gap-2" role="radiogroup" aria-label={iconFieldLabel}>
											{#each iconOptions as icon (icon)}
												<button
													type="button"
													onclick={() => selectIcon('emoji', icon)}
													class="border-border bg-background hover:bg-muted/60 flex size-11 items-center justify-center rounded-md border text-xl transition-colors {$iconTypeField ===
														'emoji' && icon === $iconValueField
														? 'border-primary bg-primary/10 outline-primary outline outline-2 outline-offset-2'
														: ''}"
													role="radio"
													aria-checked={$iconTypeField === 'emoji' && icon === $iconValueField}
													aria-label={icon}
													title={icon}
												>
													{icon}
												</button>
											{/each}
										</div>
									</div>
									<div class="space-y-2">
										<p class="text-muted-foreground text-xs">
											{formCopy.actions.getFromOfficialWebsite}
										</p>
										<Field {form} name="serviceUrl">
											<Control>
												{#snippet children({ props })}
													<Label class="sr-only">{serviceUrlFieldLabel}</Label>
													<div class="grid gap-2 sm:grid-cols-[1fr_auto]">
														<Input
															{...props}
															type="url"
															inputmode="url"
															placeholder="https://www.netflix.com/"
															bind:value={$serviceUrlField}
														/>
														<Button
															type="button"
															variant="outline"
															disabled={!serviceFaviconUrl}
															onclick={selectOfficialSiteIcon}
														>
															{formCopy.actions.useThisUrl}
														</Button>
													</div>
													<Description class="text-muted-foreground text-xs">
														{serviceUrlFieldDescription}
													</Description>
												{/snippet}
											</Control>
											<FieldErrors class="text-destructive text-sm" />
										</Field>
									</div>
								</div>
								<Description class="text-muted-foreground text-xs"
									>{iconFieldDescription}</Description
								>
							{/snippet}
						</Control>
						<FieldErrors class="text-destructive text-sm" />
					</Field>
				</div>
			</details>

			<Field {form} name="select">
				<Control>
					{#snippet children({ props })}
						<Label class="font-medium">{m.subscription_form_cycle_label()}</Label>
						<select
							{...props}
							class="border-input focus-visible:ring-ring focus-visible:border-ring bg-background flex h-10 w-full rounded-md border px-3 text-sm shadow-sm transition"
							bind:value={$selectField}
						>
							<option value="" disabled>{m.subscription_form_cycle_placeholder()}</option>
							{#each cycleOptions as option (option.value)}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					{/snippet}
				</Control>
				<FieldErrors class="text-destructive text-sm" />
			</Field>

			<Field {form} name="notifyDaysBefore">
				<Control>
					{#snippet children({ props })}
						<Label class="font-medium">{m.subscription_form_notify_label()}</Label>
						<select
							{...props}
							class="border-input focus-visible:ring-ring focus-visible:border-ring bg-background flex h-10 w-full rounded-md border px-3 text-sm shadow-sm transition"
							bind:value={$notifyDaysBeforeField}
						>
							{#each notifyOptions as days (days)}
								<option value={days}>{formatNotifyDays(days, currentLocale)}</option>
							{/each}
						</select>
					{/snippet}
				</Control>
				<FieldErrors class="text-destructive text-sm" />
			</Field>

			<div class="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
				<div class="min-w-0 space-y-2">
					<Field {form} name="number">
						<Control>
							{#snippet children({ props })}
								<Label class="font-medium">{m.subscription_form_amount_label()}</Label>
								<Input
									{...props}
									type="number"
									min="0"
									step="0.01"
									inputmode="decimal"
									placeholder="1000"
									oninput={markPriceEdited}
									bind:value={$numberField}
								/>
								<Description class="text-muted-foreground text-xs">
									{#if selectedTemplate && selectedPlan && selectedPlanPrice}
										{m.subscription_template_reference_price_note({
											date: selectedPlanPriceVerifiedAt
										})}
										<a
											href={selectedPlanPrice.sourceUrl}
											target="_blank"
											rel="noopener noreferrer"
											class="underline underline-offset-2"
										>
											{m.subscription_template_source_link()}
										</a>
									{:else if selectedTemplate}
										{m.subscription_template_reference_price_missing({
											date: selectedTemplateVerifiedAt
										})}
										<a
											href={selectedTemplate.sourceUrl}
											target="_blank"
											rel="noopener noreferrer"
											class="underline underline-offset-2"
										>
											{m.subscription_template_source_link()}
										</a>
									{:else}
										{m.subscription_form_amount_description()}
									{/if}
								</Description>
							{/snippet}
						</Control>
						<FieldErrors class="text-destructive text-sm" />
					</Field>
				</div>

				<div class="min-w-0 space-y-2">
					<Field {form} name="currency">
						<Control>
							{#snippet children({ props })}
								<Label class="font-medium">{currencyFieldLabel}</Label>
								<select
									{...props}
									class="border-input focus-visible:ring-ring focus-visible:border-ring bg-background flex h-10 w-full rounded-md border px-3 text-sm shadow-sm transition"
									bind:value={$currencyField}
								>
									{#each currencyOptions as option (option.value)}
										<option value={option.value}>{option.value}</option>
									{/each}
								</select>
							{/snippet}
						</Control>
						<FieldErrors class="text-destructive text-sm" />
					</Field>
				</div>
			</div>

			<Field {form} name="datepicker">
				<Control>
					{#snippet children({ props })}
						<Label class="font-medium">{m.subscription_form_first_payment_label()}</Label>
						<Input {...props} type="date" bind:value={$datepickerField} />
					{/snippet}
				</Control>
				<FieldErrors class="text-destructive text-sm" />
			</Field>

			<details class="rounded-lg border p-4">
				<summary class="cursor-pointer text-sm font-semibold">
					{m.subscription_form_cancellation_summary()}
				</summary>
				<p class="text-muted-foreground mt-2 text-xs">
					{m.subscription_form_cancellation_description()}
				</p>
				<div class="mt-4 space-y-4">
					<Field {form} name="cancellationUrl">
						<Control>
							{#snippet children({ props })}
								<Label class="font-medium">{m.subscription_form_cancellation_url_label()}</Label>
								<Input
									{...props}
									type="url"
									inputmode="url"
									placeholder={m.subscription_form_cancellation_url_placeholder()}
									bind:value={$cancellationUrlField}
								/>
								<Description class="text-muted-foreground text-xs">
									{m.subscription_form_cancellation_url_description()}
								</Description>
							{/snippet}
						</Control>
						<FieldErrors class="text-destructive text-sm" />
					</Field>

					<Field {form} name="cancellationMethod">
						<Control>
							{#snippet children({ props })}
								<Label class="font-medium">{m.subscription_form_cancellation_method_label()}</Label>
								<select
									{...props}
									class="border-input focus-visible:ring-ring focus-visible:border-ring bg-background flex h-10 w-full rounded-md border px-3 text-sm shadow-sm transition"
									bind:value={$cancellationMethodField}
								>
									<option value="">{m.subscription_form_cancellation_method_placeholder()}</option>
									{#each cancellationMethodOptions as option (option.value)}
										<option value={option.value}>{option.label}</option>
									{/each}
								</select>
							{/snippet}
						</Control>
						<FieldErrors class="text-destructive text-sm" />
					</Field>

					<Field {form} name="cancellationMemo">
						<Control>
							{#snippet children({ props })}
								<Label class="font-medium">{m.subscription_form_cancellation_memo_label()}</Label>
								<textarea
									{...props}
									class="border-input focus-visible:ring-ring focus-visible:border-ring bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm shadow-sm transition outline-none focus-visible:ring-[3px]"
									placeholder={m.subscription_form_cancellation_memo_placeholder()}
									bind:value={$cancellationMemoField}
								></textarea>
							{/snippet}
						</Control>
						<FieldErrors class="text-destructive text-sm" />
					</Field>

					<Field {form} name="cancellationDeadlineMemo">
						<Control>
							{#snippet children({ props })}
								<Label class="font-medium">
									{m.subscription_form_cancellation_deadline_memo_label()}
								</Label>
								<Input
									{...props}
									type="text"
									placeholder={m.subscription_form_cancellation_deadline_memo_placeholder()}
									bind:value={$cancellationDeadlineMemoField}
								/>
							{/snippet}
						</Control>
						<FieldErrors class="text-destructive text-sm" />
					</Field>
				</div>
			</details>

			<Button type="submit" class="h-12 w-full text-base sm:h-10 sm:text-sm"
				>{m.common_save()}</Button
			>
		</form>
	{/if}
</div>
