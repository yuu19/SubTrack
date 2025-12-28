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
	import { addSubscriptionModalState } from '$lib/states/modalState.svelte';

	const cycleOptions = [
		{ value: 'monthly', label: '毎月' },
		{ value: 'quarterly', label: '3ヶ月ごと' },
		{ value: 'yearly', label: '毎年' }
	];

	let { data, onOfflineSubmit, onServerResult } = $props();

	const form = superForm(
		untrack(() => data.form),
		{
			validators: zod4Client(subscriptionSchema)
		}
	);

	const { enhance } = form;

	const textField = fieldProxy(form, 'text');
	const selectField = fieldProxy(form, 'select');
	const notifyDaysBeforeField = fieldProxy(form, 'notifyDaysBefore');
	const numberField = fieldProxy(form, 'number');
	const datepickerField = fieldProxy(form, 'datepicker');
	const tagsField = fieldProxy(form, 'tagsinput');

	const enhanceEvents = {
		onSubmit: async (input) => {
			if (typeof navigator === 'undefined' || navigator.onLine) return;
			input.cancel();
			const payload = payloadFromFormData(input.formData);
			if (onOfflineSubmit) {
				await onOfflineSubmit(payload);
				form.reset();
				addSubscriptionModalState.setFalse();
			}
		},
		onResult: async (event) => {
			const result = event?.result as { data?: { subscriptions?: unknown } } | undefined;
			const subscriptions = result?.data?.subscriptions;
			if (subscriptions && Array.isArray(subscriptions)) {
				await onServerResult?.(subscriptions);
				addSubscriptionModalState.setFalse();
			}
		}
	};

</script>

<div class="space-y-6 p-6">
	<h2 class="text-2xl font-bold">サブスクを追加</h2>
	<form method="post" action="?/create" class="space-y-4" {@attach fromAction(enhance, () => enhanceEvents)}>
		<Field {form} name="text">
			<Control>
				{#snippet children({ props })}
					<Label class="font-medium">サービス名</Label>
					<Input {...props} type="text" placeholder="Netflix" bind:value={$textField} />
				{/snippet}
			</Control>
			<FieldErrors class="text-destructive text-sm" />
		</Field>

		<Field {form} name="select">
			<Control>
				{#snippet children({ props })}
					<Label class="font-medium">支払い周期</Label>
					<select
						{...props}
						class="border-input focus-visible:ring-ring focus-visible:border-ring bg-background flex h-10 w-full rounded-md border px-3 text-sm shadow-sm transition"
						bind:value={$selectField}
					>
						<option value="" disabled>選択してください</option>
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
					<Label class="font-medium">何日前に通知しますか？</Label>
					<select
						{...props}
						class="border-input focus-visible:ring-ring focus-visible:border-ring bg-background flex h-10 w-full rounded-md border px-3 text-sm shadow-sm transition"
						bind:value={$notifyDaysBeforeField}
					>
						<option value={1}>1日前</option>
						<option value={3}>3日前</option>
						<option value={7}>7日前</option>
					</select>
				{/snippet}
			</Control>
			<Description class="text-muted-foreground text-sm">プレミアムプランでは通知日を設定できます</Description>
			<FieldErrors class="text-destructive text-sm" />
		</Field>

		<Field {form} name="number">
			<Control>
				{#snippet children({ props })}
					<Label class="font-medium">月額料金</Label>
					<Input
						{...props}
						type="number"
						min="0"
						step="1"
						placeholder="1000"
						bind:value={$numberField}
					/>
					<Description class="text-muted-foreground text-xs">
						税込の支払額を入力してください。
					</Description>
				{/snippet}
			</Control>
			<FieldErrors class="text-destructive text-sm" />
		</Field>

		<Field {form} name="datepicker">
			<Control>
				{#snippet children({ props })}
					<Label class="font-medium">初回支払日</Label>
					<Input {...props} type="date" bind:value={$datepickerField} />
				{/snippet}
			</Control>
			<FieldErrors class="text-destructive text-sm" />
		</Field>

		<Field {form} name="tagsinput">
			<Control>
				{#snippet children({ props })}
					<Label class="font-medium">タグ</Label>
					<TagsInput bind:value={$tagsField} placeholder="動画, 音楽 など" />
					{#each $tagsField as tag, i (i)}
						<input {...props} type="hidden" value={tag} name="tagsinput" />
					{/each}
				{/snippet}
			</Control>
			<FieldErrors class="text-destructive text-sm" />
		</Field>

		<Button size="sm" type="submit" class="w-full">保存する</Button>
	</form>
</div>
