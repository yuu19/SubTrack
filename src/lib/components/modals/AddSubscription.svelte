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
	import { formatNotifyDays, getCycleLabel, resolveLocale } from '$lib/locale';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime';
	import { addSubscriptionModalState } from '$lib/states/modalState.svelte';
	import { UserConfigContext } from '$lib/states/userConfig.svelte';
	import {
		defaultSubscriptionColor,
		getSubscriptionColorLabel,
		getSubscriptionColorStyle,
		subscriptionColors
	} from '$lib/subscription-colors';

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
			style: getSubscriptionColorStyle(value)
		}))
	);
	const notifyOptions = $derived([1, 3, 7]);
	const colorFieldLabel = $derived(currentLocale === 'en' ? 'Color' : '色');
	const colorFieldDescription = $derived(
		currentLocale === 'en'
			? 'Used for calendar and analysis views.'
			: 'カレンダーと分析画面で使う表示色です。'
	);

	const defaultNotifyDaysBefore = $derived(userConfig.current.defaultNotifyDaysBefore ?? 3);
	const now = new Date();
	const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
		now.getDate()
	).padStart(2, '0')}`;
	let wasOpen = false;

	const form = superForm(
		untrack(() => data.form),
		{
			validators: zod4Client(subscriptionSchema)
		}
	);

	const { enhance } = form;

	const textField = fieldProxy(form, 'text');
	const colorField = fieldProxy(form, 'color');
	const selectField = fieldProxy(form, 'select');
	const notifyDaysBeforeField = fieldProxy(form, 'notifyDaysBefore');
	const numberField = fieldProxy(form, 'number');
	const datepickerField = fieldProxy(form, 'datepicker');
	const tagsField = fieldProxy(form, 'tagsinput');

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
			$notifyDaysBeforeField = defaultNotifyDaysBefore;
			if (!$datepickerField) {
				$datepickerField = todayISO;
			}
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
									? 'border-primary bg-primary/5 ring-primary/30 ring-2'
									: 'border-border hover:bg-muted/60'}"
								role="radio"
								aria-checked={option.value === $colorField}
								aria-label={option.label}
								title={option.label}
							>
								<span
									class="size-4 rounded-full border border-black/10"
									style:background-color={option.style}
								></span>
								<span>{option.label}</span>
							</button>
						{/each}
					</div>
					<Description class="text-muted-foreground text-xs">{colorFieldDescription}</Description>
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
						bind:value={$numberField}
					/>
					<Description class="text-muted-foreground text-xs">
						{m.subscription_form_amount_description()}
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

		<Button type="submit" class="h-12 w-full text-base sm:h-10 sm:text-sm">{m.common_save()}</Button
		>
	</form>
</div>
