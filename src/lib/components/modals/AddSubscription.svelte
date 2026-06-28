<script lang="ts">
	import { fieldProxy, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { subscriptionSchema } from '$lib/formSchema';
	import { untrack } from 'svelte';
	import { fromAction } from 'svelte/attachments';
	import { Field, Control, Label, Description, FieldErrors } from 'formsnap';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import SubscriptionIcon from '$lib/components/subscriptions/SubscriptionIcon.svelte';
	import TagsInput from '$lib/components/ui/tags-input/tags-input.svelte';
	import { payloadFromFormData } from '$lib/offline/subscriptions';
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
		type ServiceTemplatePlan,
		type ServiceTemplatePlanPrice
	} from '$lib/service-templates';
	import { UserConfigContext } from '$lib/states/userConfig.svelte';
	import { defaultSubscriptionColor } from '$lib/subscription-colors';
	import {
		defaultSubscriptionIconType,
		defaultSubscriptionIconValue,
		resolveFaviconUrl,
		subscriptionEmojiOptions,
		subscriptionPresetIconOptions,
		type SubscriptionIconType
	} from '$lib/subscription-icons';

	let { data, open = false, onClose = () => {}, onOfflineSubmit, onServerResult } = $props();
	const userConfig = UserConfigContext.get();
	const currentLocale = $derived(resolveLocale(getLocale()));
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
	const iconFieldLabel = $derived(currentLocale === 'en' ? 'Icon' : 'アイコン');
	const iconFieldDescription = $derived(
		currentLocale === 'en'
			? 'Shown in subscription lists and detail views.'
			: '一覧と詳細画面でサービスを見分けるために使います。'
	);
	const iconOptions = $derived(subscriptionEmojiOptions);
	const serviceUrlFieldLabel = $derived(
		currentLocale === 'en' ? 'Official website URL' : '公式サイトURL'
	);
	const serviceUrlFieldDescription = $derived(
		currentLocale === 'en'
			? 'The icon is retrieved automatically from this official website URL.'
			: 'この公式サイトURLからアイコンを自動取得します。'
	);
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
	const currencyFieldLabel = $derived(currentLocale === 'en' ? 'Currency' : '通貨');
	const currencyOptions = $derived(SUPPORTED_CURRENCIES.map((currency) => ({ value: currency })));

	const defaultNotifyDaysBefore = $derived(userConfig.current.defaultNotifyDaysBefore ?? 3);
	const now = new Date();
	const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
		now.getDate()
	).padStart(2, '0')}`;
	let wasOpen = false;
	let templateSearch = $state('');
	let selectedPlanId = $state('');

	const form = superForm(
		untrack(() => data.form),
		{
			validators: zod4Client(subscriptionSchema)
		}
	);

	const { enhance } = form;

	const textField = fieldProxy(form, 'text');
	const serviceTemplateIdField = fieldProxy(form, 'serviceTemplateId');
	const planNameField = fieldProxy(form, 'planName');
	const serviceUrlField = fieldProxy(form, 'serviceUrl');
	const priceEditedByUserField = fieldProxy(form, 'priceEditedByUser');
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
	const tagsField = fieldProxy(form, 'tagsinput');

	const localizedTemplateTags = (template: ServiceTemplate) => template.tags[currentLocale];
	const localizedPlanName = (plan: ServiceTemplatePlan) => plan.name[currentLocale];
	const resolvePlanPrice = (
		plan: ServiceTemplatePlan | null | undefined,
		currency: string | null | undefined
	): ServiceTemplatePlanPrice | null =>
		plan?.prices.find((price) => price.currency === currency) ?? null;
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
	const templateQuery = $derived(templateSearch.trim().toLocaleLowerCase());
	const selectedTemplate = $derived.by(() =>
		serviceTemplates.find((template) => template.id === $serviceTemplateIdField)
	);
	const selectedPlan = $derived.by(() =>
		selectedTemplate?.plans.find((plan) => plan.id === selectedPlanId)
	);
	const selectedPlanPrice = $derived(resolvePlanPrice(selectedPlan, $currencyField));
	const matchingTemplates = $derived.by(() => {
		if (!templateQuery) return serviceTemplates.slice(0, 5);

		return serviceTemplates
			.filter((template) => {
				const haystack = [
					template.name,
					...template.tags.ja,
					...template.tags.en,
					...template.plans.flatMap((plan) => [plan.name.ja, plan.name.en])
				]
					.join(' ')
					.toLocaleLowerCase();
				return haystack.includes(templateQuery);
			})
			.slice(0, 5);
	});
	const selectedTemplateVerifiedAt = $derived(
		selectedTemplate ? formatLongDate(selectedTemplate.lastVerifiedAt, currentLocale) : ''
	);
	const selectedPlanPriceVerifiedAt = $derived(
		selectedPlanPrice ? formatLongDate(selectedPlanPrice.verifiedAt, currentLocale) : ''
	);
	const mergeTemplateTags = (template: ServiceTemplate) => {
		const tags = localizedTemplateTags(template);
		const existingTags = Array.isArray($tagsField) ? $tagsField : [];
		const seen = new Set(tags.map((tag) => tag.trim().toLocaleLowerCase()));
		$tagsField = [
			...tags,
			...existingTags.filter((tag) => !seen.has(tag.trim().toLocaleLowerCase()))
		];
	};

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
		$numberField = resolvePlanPrice(plan, $currencyField)?.amount ?? 0;
		$cancellationUrlField = template.cancellation.url ?? '';
		$cancellationMethodField = template.cancellation.method;
		$cancellationMemoField = template.cancellation.memo[currentLocale];
		$cancellationDeadlineMemoField = template.cancellation.deadlineMemo?.[currentLocale] ?? '';
		mergeTemplateTags(template);
	};

	const selectTemplate = (template: ServiceTemplate) => {
		applyTemplatePlan(template, template.plans[0]);
		templateSearch = template.name;
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
			$colorField = defaultSubscriptionColor;
			$iconTypeField = defaultSubscriptionIconType;
			$iconValueField = defaultSubscriptionIconValue;
			$notifyDaysBeforeField = defaultNotifyDaysBefore;
			$serviceTemplateIdField = '';
			$planNameField = '';
			$serviceUrlField = '';
			$priceEditedByUserField = false;
			$currencyField = resolveStoredCurrency();
			$cancellationUrlField = '';
			$cancellationMethodField = '';
			$cancellationMemoField = '';
			$cancellationDeadlineMemoField = '';
			if (!$datepickerField) {
				$datepickerField = todayISO;
			}
			templateSearch = '';
			selectedPlanId = '';
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
		$numberField = selectedPlanPrice?.amount ?? 0;
	});

	$effect(() => {
		if ($iconTypeField === 'favicon') {
			$iconValueField = $serviceUrlField ?? '';
		}
	});
</script>

<div class="space-y-6 p-6">
	<h2 class="text-2xl font-bold">{m.add_subscription_title()}</h2>
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

		<div class="space-y-3 rounded-lg border p-4">
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
			{#if matchingTemplates.length > 0}
				<div class="grid gap-2 sm:grid-cols-2">
					{#each matchingTemplates as template (template.id)}
						<button
							type="button"
							class="hover:bg-muted/60 flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition {template.id ===
							$serviceTemplateIdField
								? 'border-primary'
								: ''}"
							onclick={() => selectTemplate(template)}
						>
							<span class="flex min-w-0 items-start gap-3">
								<span
									class="border-border bg-muted/50 flex size-9 shrink-0 items-center justify-center rounded-md border"
									aria-hidden="true"
								>
									<SubscriptionIcon
										iconType="templateImage"
										iconValue={template.id}
										class="size-6"
									/>
								</span>
								<span class="min-w-0">
									<span class="block truncate font-medium">{template.name}</span>
									<span class="text-muted-foreground block text-xs">
										{localizedTemplateTags(template).join(', ')}
									</span>
								</span>
							</span>
							{#if template.id === $serviceTemplateIdField}
								<span class="text-primary text-xs font-medium">
									{m.subscription_template_selected()}
								</span>
							{/if}
						</button>
					{/each}
				</div>
			{:else if templateQuery}
				<p class="text-muted-foreground text-sm">{m.subscription_template_empty()}</p>
			{/if}

			{#if selectedTemplate}
				<div class="space-y-2">
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
		</div>

		<Field {form} name="text">
			<Control>
				{#snippet children({ props })}
					<Label class="font-medium">{m.subscription_form_service_name_label()}</Label>
					<Input {...props} type="text" placeholder="Netflix" bind:value={$textField} />
				{/snippet}
			</Control>
			<FieldErrors class="text-destructive text-sm" />
		</Field>

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
						{currentLocale === 'en' ? 'Change' : '変更する'}
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
										{currentLocale === 'en' ? 'Recommended' : 'おすすめ'}
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
												aria-checked={$iconTypeField === 'preset' && icon.value === $iconValueField}
												aria-label={icon.label}
												title={icon.label}
											>
												<SubscriptionIcon iconType="preset" iconValue={icon.value} class="size-5" />
											</button>
										{/each}
									</div>
								</div>
								<div class="space-y-2">
									<p class="text-muted-foreground text-xs">
										{currentLocale === 'en' ? 'Emoji' : '絵文字'}
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
										{currentLocale === 'en' ? 'Get from official website' : '公式サイトから取得'}
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
														{currentLocale === 'en' ? 'Use this URL' : 'このURLから取得'}
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
							<Description class="text-muted-foreground text-xs">{iconFieldDescription}</Description
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

		<div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
			<Field {form} name="number">
				<Control>
					{#snippet children({ props })}
						<Label class="font-medium">{m.subscription_form_amount_label()}</Label>
						<Input
							{...props}
							type="number"
							min="0"
							step="1"
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

		<Field {form} name="datepicker">
			<Control>
				{#snippet children({ props })}
					<Label class="font-medium">{m.subscription_form_first_payment_label()}</Label>
					<Input {...props} type="date" bind:value={$datepickerField} />
				{/snippet}
			</Control>
			<FieldErrors class="text-destructive text-sm" />
		</Field>

		<Field {form} name="tagsinput">
			<Control>
				{#snippet children({ props })}
					<Label class="font-medium">{m.subscription_form_tags_label()}</Label>
					<TagsInput bind:value={$tagsField} placeholder={m.subscription_form_tags_placeholder()} />
					{#each $tagsField as tag, i (i)}
						<input {...props} type="hidden" value={tag} name="tagsinput" />
					{/each}
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

		<Button type="submit" class="h-12 w-full text-base sm:h-10 sm:text-sm">{m.common_save()}</Button
		>
	</form>
</div>
