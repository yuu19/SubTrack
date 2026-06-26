<script lang="ts">
	import { base } from '$app/paths';
	import { defaults, fieldProxy, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { subscriptionSchema } from '$lib/formSchema';
	import { fromAction } from 'svelte/attachments';
	import { Field, Control, Label, Description, FieldErrors } from 'formsnap';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import SubscriptionIcon from '$lib/components/subscriptions/SubscriptionIcon.svelte';
	import TagsInput from '$lib/components/ui/tags-input/tags-input.svelte';
	import {
		formatNotifyDays,
		getCancellationMethodLabel,
		getCycleLabel,
		resolveLocale
	} from '$lib/locale';
	import { CANCELLATION_METHODS } from '$lib/constant';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime';
	import { UserConfigContext } from '$lib/states/userConfig.svelte';
	import { defaultSubscriptionColor, resolveSubscriptionColor } from '$lib/subscription-colors';
	import {
		defaultSubscriptionIconType,
		defaultSubscriptionIconValue,
		resolveFaviconUrl,
		resolveSubscriptionIconType,
		resolveSubscriptionIconValue,
		subscriptionEmojiOptions,
		subscriptionPresetIconOptions,
		type SubscriptionIconType
	} from '$lib/subscription-icons';

	let { subscription, isPremium = false, onServerResult, onClose, action = '?/update' } = $props();
	const userConfig = UserConfigContext.get();
	const currentLocale = $derived(resolveLocale(getLocale()));
	const cycleOptions = $derived([
		{ value: 'monthly', label: getCycleLabel('monthly', currentLocale) },
		{ value: 'quarterly', label: getCycleLabel('quarterly', currentLocale) },
		{ value: 'yearly', label: getCycleLabel('yearly', currentLocale) }
	]);
	const notifyOptions = $derived([0, 1, 3, 7]);
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
	const imageFieldLabel = $derived(currentLocale === 'en' ? 'Uploaded image' : 'アップロード画像');
	const imageFieldDescription = $derived(
		currentLocale === 'en'
			? 'Premium users can upload PNG, JPEG, or WebP images up to 1MB.'
			: 'Premiumでは1MBまでのPNG、JPEG、WebP画像をアップロードできます。'
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

	const defaultNotifyDaysBefore = $derived(userConfig.current.defaultNotifyDaysBefore ?? 3);
	const defaultNotifyLabel = $derived(formatNotifyDays(defaultNotifyDaysBefore, currentLocale));
	let imageInput = $state<HTMLInputElement | null>(null);
	let isUploadingImage = $state(false);
	let imageUploadError = $state('');

	function getInitialData() {
		if (subscription) {
			return {
				text: subscription.serviceName ?? '',
				serviceTemplateId: subscription.serviceTemplateId ?? '',
				planName: subscription.planName ?? '',
				serviceUrl: subscription.serviceUrl ?? '',
				priceEditedByUser: subscription.priceEditedByUser ?? false,
				color: resolveSubscriptionColor(subscription.color, defaultSubscriptionColor),
				iconType: resolveSubscriptionIconType(subscription.iconType, defaultSubscriptionIconType),
				iconValue: resolveSubscriptionIconValue(
					subscription.iconValue,
					defaultSubscriptionIconValue
				),
				select: subscription.cycle ?? 'monthly',
				number: subscription.amount ?? 0,
				datepicker: subscription.firstPaymentDate ?? '',
				notifyDaysBefore: subscription.notifyDaysBefore ?? 1,
				cancellationUrl: subscription.cancellationUrl ?? '',
				cancellationMethod: subscription.cancellationMethod ?? '',
				cancellationMemo: subscription.cancellationMemo ?? '',
				cancellationDeadlineMemo: subscription.cancellationDeadlineMemo ?? '',
				tagsinput: Array.isArray(subscription.tags) ? subscription.tags : []
			};
		}

		return {
			text: '',
			serviceTemplateId: '',
			planName: '',
			serviceUrl: '',
			priceEditedByUser: false,
			color: defaultSubscriptionColor,
			iconType: defaultSubscriptionIconType,
			iconValue: defaultSubscriptionIconValue,
			select: 'monthly',
			number: 0,
			datepicker: '',
			notifyDaysBefore: 1,
			cancellationUrl: '',
			cancellationMethod: '',
			cancellationMemo: '',
			cancellationDeadlineMemo: '',
			tagsinput: []
		};
	}

	const form = superForm(defaults(getInitialData(), zod4Client(subscriptionSchema)), {
		validators: zod4Client(subscriptionSchema)
	});

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
	const datepickerField = fieldProxy(form, 'datepicker');
	const cancellationUrlField = fieldProxy(form, 'cancellationUrl');
	const cancellationMethodField = fieldProxy(form, 'cancellationMethod');
	const cancellationMemoField = fieldProxy(form, 'cancellationMemo');
	const cancellationDeadlineMemoField = fieldProxy(form, 'cancellationDeadlineMemo');
	const tagsField = fieldProxy(form, 'tagsinput');

	const enhanceEvents = {
		onResult: async (event: any) => {
			const result = event?.result as { data?: { subscriptions?: unknown } } | undefined;
			const subscriptions = result?.data?.subscriptions;
			if (subscriptions && Array.isArray(subscriptions)) {
				await onServerResult?.(subscriptions);
				onClose?.();
			}
		}
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
	const hasUploadedImage = $derived($iconTypeField === 'image' && Boolean($iconValueField));

	const validateImageFile = (file: File) => {
		const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
		if (!allowedTypes.includes(file.type)) {
			return currentLocale === 'en'
				? 'Please select a PNG, JPEG, or WebP image.'
				: 'PNG、JPEG、WebP画像を選択してください。';
		}
		if (file.size > 1024 * 1024) {
			return currentLocale === 'en'
				? 'Image file must be 1MB or smaller.'
				: '画像ファイルは1MB以下にしてください。';
		}
		return '';
	};

	const handleImageFileChange = async (event: Event) => {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		imageUploadError = '';
		if (!file || !subscription?.id) return;
		if (!isPremium) {
			imageUploadError =
				currentLocale === 'en'
					? 'Image uploads are available on Premium.'
					: '画像アップロードはPremiumで利用できます。';
			input.value = '';
			return;
		}

		const validationError = validateImageFile(file);
		if (validationError) {
			imageUploadError = validationError;
			input.value = '';
			return;
		}

		const formData = new FormData();
		formData.set('image', file);
		isUploadingImage = true;
		try {
			const response = await fetch(`${base}/api/subscription-icons/${subscription.id}`, {
				method: 'POST',
				body: formData,
				headers: {
					accept: 'application/json'
				},
				credentials: 'same-origin'
			});
			const result = (await response.json()) as {
				iconType?: SubscriptionIconType;
				iconValue?: string;
				subscriptions?: unknown;
				error?: string;
			};
			if (!response.ok) {
				imageUploadError =
					result.error ??
					(currentLocale === 'en'
						? 'Failed to upload image.'
						: '画像のアップロードに失敗しました。');
				return;
			}

			if (result.iconType === 'image' && result.iconValue) {
				$iconTypeField = 'image';
				$iconValueField = result.iconValue;
			}
			if (Array.isArray(result.subscriptions)) {
				await onServerResult?.(result.subscriptions);
			}
		} catch (error) {
			console.error('Failed to upload subscription icon image', error);
			imageUploadError =
				currentLocale === 'en' ? 'Failed to upload image.' : '画像のアップロードに失敗しました。';
		} finally {
			isUploadingImage = false;
			input.value = '';
		}
	};

	$effect(() => {
		if ($iconTypeField === 'favicon') {
			$iconValueField = $serviceUrlField ?? '';
		}
	});
</script>

{#if subscription}
	<form method="post" {action} class="space-y-4" {@attach fromAction(enhance, () => enhanceEvents)}>
		<input type="hidden" name="id" value={subscription.id} />
		<input type="hidden" name="serviceTemplateId" value={$serviceTemplateIdField ?? ''} />
		<input type="hidden" name="planName" value={$planNameField ?? ''} />
		<input type="hidden" name="color" value={$colorField ?? defaultSubscriptionColor} />
		<input type="hidden" name="iconType" value={$iconTypeField ?? defaultSubscriptionIconType} />
		<input
			type="hidden"
			name="priceEditedByUser"
			value={$priceEditedByUserField ? 'true' : 'false'}
		/>

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
							subscriptionId={subscription.id}
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
								<div class="space-y-2">
									<p class="text-muted-foreground text-xs">{imageFieldLabel}</p>
									<div class="flex flex-wrap items-center gap-2">
										<button
											type="button"
											onclick={() =>
												$iconValueField ? selectIcon('image', $iconValueField) : undefined}
											disabled={!hasUploadedImage}
											class="border-border bg-background hover:bg-muted/60 flex size-11 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-50 {$iconTypeField ===
											'image'
												? 'border-primary bg-primary/10 outline-primary outline outline-2 outline-offset-2'
												: ''}"
											role="radio"
											aria-checked={$iconTypeField === 'image'}
											aria-label={imageFieldLabel}
											title={imageFieldLabel}
										>
											{#if hasUploadedImage}
												<SubscriptionIcon
													iconType="image"
													iconValue={$iconValueField}
													subscriptionId={subscription.id}
													class="size-8 rounded-sm object-cover"
												/>
											{:else}
												<span class="text-muted-foreground text-xs">IMG</span>
											{/if}
										</button>
										{#if isPremium}
											<input
												bind:this={imageInput}
												type="file"
												accept="image/png,image/jpeg,image/webp"
												class="hidden"
												onchange={handleImageFileChange}
											/>
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={isUploadingImage}
												onclick={() => imageInput?.click()}
											>
												{#if isUploadingImage}
													{currentLocale === 'en' ? 'Uploading...' : 'アップロード中...'}
												{:else if hasUploadedImage}
													{currentLocale === 'en' ? 'Replace image' : '画像を差し替え'}
												{:else}
													{currentLocale === 'en' ? 'Upload image' : '画像をアップロード'}
												{/if}
											</Button>
										{/if}
									</div>
									<Description class="text-muted-foreground text-xs"
										>{imageFieldDescription}</Description
									>
									{#if !isPremium}
										<p class="text-muted-foreground text-xs">
											{currentLocale === 'en'
												? 'Image uploads are available on Premium.'
												: '画像アップロードはPremiumで利用できます。'}
										</p>
									{/if}
									{#if imageUploadError}
										<p class="text-destructive text-xs" aria-live="polite">{imageUploadError}</p>
									{/if}
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
					<Label class="font-medium">{m.subscription_form_custom_notify_label()}</Label>
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
			<Description class="text-muted-foreground text-sm">
				{m.subscription_form_custom_notify_description({ label: defaultNotifyLabel })}
			</Description>
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

		<Button type="submit" class="h-12 w-full text-base sm:h-10 sm:text-sm"
			>{m.common_update()}</Button
		>
	</form>
{:else}
	<div class="text-muted-foreground text-sm">{m.subscription_select_to_edit()}</div>
{/if}
