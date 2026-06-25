<script lang="ts">
	import { fieldProxy, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { subscriptionSchema } from '$lib/formSchema';
	import { untrack } from 'svelte';
	import { fromAction } from 'svelte/attachments';
	import { Field, Control, Label, Description, FieldErrors } from 'formsnap';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import TagsInput from '$lib/components/ui/tags-input/tags-input.svelte';
	import { payloadFromFormData } from '$lib/offline/subscriptions';
	import {
		formatCurrencyYen,
		formatLongDate,
		formatNotifyDays,
		getCancellationMethodLabel,
		getCycleLabel,
		resolveLocale
	} from '$lib/locale';
	import { CANCELLATION_METHODS } from '$lib/constant';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime';
	import {
		serviceTemplates,
		type ServiceTemplate,
		type ServiceTemplatePlan
	} from '$lib/service-templates';
	import { addSubscriptionModalState } from '$lib/states/modalState.svelte';
	import { UserConfigContext } from '$lib/states/userConfig.svelte';
	import {
		defaultSubscriptionColor,
		getSubscriptionColorLabel,
		getSubscriptionColorSurfaceStyle,
		getSubscriptionColorStyle,
		subscriptionColors
	} from '$lib/subscription-colors';
	import {
		defaultSubscriptionIconType,
		defaultSubscriptionIconValue,
		subscriptionEmojiOptions
	} from '$lib/subscription-icons';

	let { data, onOfflineSubmit, onServerResult } = $props();
	const userConfig = UserConfigContext.get();
	const currentLocale = $derived(resolveLocale(getLocale()));
	const cycleOptions = $derived([
		{ value: 'monthly', label: getCycleLabel('monthly', currentLocale) },
		{ value: 'quarterly', label: getCycleLabel('quarterly', currentLocale) },
		{ value: 'yearly', label: getCycleLabel('yearly', currentLocale) }
	]);
	const colorOptions = $derived(
		subscriptionColors.map((value) => ({
			value,
			label: getSubscriptionColorLabel(value, currentLocale),
			style: getSubscriptionColorStyle(value),
			surface: getSubscriptionColorSurfaceStyle(value)
		}))
	);
	const notifyOptions = $derived([1, 3, 7]);
	const cancellationMethodOptions = $derived(
		CANCELLATION_METHODS.map((value) => ({
			value,
			label: getCancellationMethodLabel(value, currentLocale)
		}))
	);
	const colorFieldLabel = $derived(currentLocale === 'en' ? 'Color' : '色');
	const colorFieldDescription = $derived(
		currentLocale === 'en'
			? 'Used for calendar and analysis views.'
			: 'カレンダーと分析画面で使う表示色です。'
	);
	const iconFieldLabel = $derived(currentLocale === 'en' ? 'Icon' : 'アイコン');
	const iconFieldDescription = $derived(
		currentLocale === 'en'
			? 'Shown in subscription lists and detail views.'
			: '一覧と詳細画面でサービスを見分けるために使います。'
	);
	const iconOptions = $derived(subscriptionEmojiOptions);

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
	const priceEditedByUserField = fieldProxy(form, 'priceEditedByUser');
	const colorField = fieldProxy(form, 'color');
	const iconTypeField = fieldProxy(form, 'iconType');
	const iconValueField = fieldProxy(form, 'iconValue');
	const selectField = fieldProxy(form, 'select');
	const notifyDaysBeforeField = fieldProxy(form, 'notifyDaysBefore');
	const numberField = fieldProxy(form, 'number');
	const datepickerField = fieldProxy(form, 'datepicker');
	const cancellationUrlField = fieldProxy(form, 'cancellationUrl');
	const cancellationMethodField = fieldProxy(form, 'cancellationMethod');
	const cancellationMemoField = fieldProxy(form, 'cancellationMemo');
	const cancellationDeadlineMemoField = fieldProxy(form, 'cancellationDeadlineMemo');
	const tagsField = fieldProxy(form, 'tagsinput');

	const localizedTemplateTags = (template: ServiceTemplate) => template.tags[currentLocale];
	const localizedPlanName = (plan: ServiceTemplatePlan) => plan.name[currentLocale];
	const templateQuery = $derived(templateSearch.trim().toLocaleLowerCase());
	const selectedTemplate = $derived.by(() =>
		serviceTemplates.find((template) => template.id === $serviceTemplateIdField)
	);
	const selectedPlan = $derived.by(() =>
		selectedTemplate?.plans.find((plan) => plan.id === selectedPlanId)
	);
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
	const templateIconByCategory: Record<ServiceTemplate['category'], string> = {
		video: '🎬',
		music: '🎧',
		shopping: '🛒',
		cloud: '☁️',
		ai: '🤖'
	};

	const mergeTemplateTags = (template: ServiceTemplate) => {
		const tags = localizedTemplateTags(template);
		const existingTags = Array.isArray($tagsField) ? $tagsField : [];
		const seen = new Set(tags.map((tag) => tag.trim().toLocaleLowerCase()));
		$tagsField = [
			...tags,
			...existingTags.filter((tag) => !seen.has(tag.trim().toLocaleLowerCase()))
		];
	};

	const applyTemplatePlan = (template: ServiceTemplate, plan: ServiceTemplatePlan) => {
		$serviceTemplateIdField = template.id;
		selectedPlanId = plan.id;
		$planNameField = localizedPlanName(plan);
		$priceEditedByUserField = false;
		$textField = template.name;
		$colorField = template.color;
		$iconTypeField = defaultSubscriptionIconType;
		$iconValueField = templateIconByCategory[template.category] ?? defaultSubscriptionIconValue;
		$selectField = plan.cycle;
		$numberField = plan.price ?? 0;
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
		applyTemplatePlan(selectedTemplate, plan);
	};

	const markPriceEdited = () => {
		if ($serviceTemplateIdField) {
			$priceEditedByUserField = true;
		}
	};

	const enhanceEvents = {
		onSubmit: async (input: any) => {
			if (typeof navigator === 'undefined' || navigator.onLine) return;
			input.cancel();
			const payload = payloadFromFormData(input.formData);
			if (onOfflineSubmit) {
				await onOfflineSubmit(payload);
				form.reset();
				addSubscriptionModalState.setFalse();
			}
		},
		onResult: async (event: any) => {
			const result = event?.result as { data?: { subscriptions?: unknown } } | undefined;
			const subscriptions = result?.data?.subscriptions;
			if (subscriptions && Array.isArray(subscriptions)) {
				await onServerResult?.(subscriptions);
				addSubscriptionModalState.setFalse();
			}
		}
	};

	$effect(() => {
		const isOpen = addSubscriptionModalState.value;
		if (isOpen && !wasOpen) {
			$colorField = defaultSubscriptionColor;
			$iconTypeField = defaultSubscriptionIconType;
			$iconValueField = defaultSubscriptionIconValue;
			$notifyDaysBeforeField = defaultNotifyDaysBefore;
			$serviceTemplateIdField = '';
			$planNameField = '';
			$priceEditedByUserField = false;
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
							<span>
								<span class="block font-medium">{template.name}</span>
								<span class="text-muted-foreground block text-xs">
									{localizedTemplateTags(template).join(', ')}
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
								{localizedPlanName(plan)}
								{#if plan.price !== null}
									- {formatCurrencyYen(plan.price, currentLocale)}
								{/if}
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

		<Field {form} name="color">
			<Control>
				{#snippet children({ props })}
					<Label class="font-medium">{colorFieldLabel}</Label>
					<input {...props} type="hidden" bind:value={$colorField} />
					<div class="flex flex-wrap gap-3" role="radiogroup" aria-label={colorFieldLabel}>
						{#each colorOptions as option (option.value)}
							<button
								type="button"
								onclick={() => ($colorField = option.value)}
								class="flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors {option.value ===
								$colorField
									? 'outline outline-2 outline-offset-2'
									: 'border-border hover:bg-muted/60'}"
								style:border-color={option.value === $colorField ? option.style : undefined}
								style:background-color={option.value === $colorField ? option.surface : undefined}
								style:outline-color={option.value === $colorField ? option.style : undefined}
								role="radio"
								aria-checked={option.value === $colorField}
								aria-label={option.label}
								title={option.label}
							>
								<span
									class="size-4 rounded-full border border-black/10"
									style:background-color={option.style}
								></span>
								<span class:font-semibold={option.value === $colorField}>{option.label}</span>
							</button>
						{/each}
					</div>
					<Description class="text-muted-foreground text-xs">{colorFieldDescription}</Description>
				{/snippet}
			</Control>
			<FieldErrors class="text-destructive text-sm" />
		</Field>

		<Field {form} name="iconValue">
			<Control>
				{#snippet children({ props })}
					<Label class="font-medium">{iconFieldLabel}</Label>
					<input {...props} type="hidden" bind:value={$iconValueField} />
					<div class="flex flex-wrap gap-2" role="radiogroup" aria-label={iconFieldLabel}>
						{#each iconOptions as icon (icon)}
							<button
								type="button"
								onclick={() => ($iconValueField = icon)}
								class="border-border bg-background hover:bg-muted/60 flex size-11 items-center justify-center rounded-md border text-xl transition-colors {icon ===
								$iconValueField
									? 'border-primary bg-primary/10 outline-primary outline outline-2 outline-offset-2'
									: ''}"
								role="radio"
								aria-checked={icon === $iconValueField}
								aria-label={icon}
								title={icon}
							>
								{icon}
							</button>
						{/each}
					</div>
					<Description class="text-muted-foreground text-xs">{iconFieldDescription}</Description>
				{/snippet}
			</Control>
			<FieldErrors class="text-destructive text-sm" />
		</Field>

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
						{#if selectedTemplate && selectedPlan && selectedPlan.price !== null}
							{m.subscription_template_reference_price_note({
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
