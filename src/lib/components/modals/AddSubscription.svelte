<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { subscriptionSchema } from '$lib/formSchema';
	import { untrack } from 'svelte';
	import { Field, Control, Label, Description, FieldErrors } from 'formsnap';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import TagsInput from '$lib/components/ui/tags-input/tags-input.svelte';
	import { addSubscriptionModalState } from '$lib/states/modalState.svelte';

	const cycleOptions = [
		{ value: 'monthly', label: '毎月' },
		{ value: 'quarterly', label: '3ヶ月ごと' },
		{ value: 'yearly', label: '毎年' }
	];

	let { data } = $props<{ data: { form: unknown } }>();

	const form = superForm(
		untrack(() => data.form),
		{
			validators: zod4Client(subscriptionSchema)
		}
	);

	const { form: formData, enhance, message } = form;
	let tagsinput_value = $state<string[]>([]);

	$effect(() => {
		$formData.tagsinput = tagsinput_value;
	});

	$effect(() => {
		const msg = $message;
		const success = typeof msg === 'string' ? Boolean(msg) : msg?.type === 'success';
		if (success) {
			addSubscriptionModalState.setFalse();
		}
	});
</script>

<div class="space-y-6 p-6">
	<h2 class="text-2xl font-bold">サブスクを追加</h2>
	{#if $message}
		<p class="text-sm text-emerald-500">
			{typeof $message === 'string' ? $message : $message.text}
		</p>
	{/if}

	<form method="post" class="space-y-4" use:enhance>
		<Field {form} name="text">
			<Control>
				{#snippet children({ props })}
					<Label class="font-medium">サービス名</Label>
					<Input {...props} type="text" placeholder="Netflix" bind:value={$formData.text} />
					<Description class="text-muted-foreground text-xs">
						契約しているサービス名を入力してください。
					</Description>
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
						bind:value={$formData.select}
					>
						<option value="" disabled>選択してください</option>
						{#each cycleOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				{/snippet}
			</Control>
			<Description class="text-muted-foreground text-sm">
				更新サイクルを選択してください。
			</Description>
			<FieldErrors class="text-destructive text-sm" />
		</Field>

		<Field {form} name="notifyDaysBefore">
			<Control>
				{#snippet children({ props })}
					<Label class="font-medium">何日前に通知しますか？</Label>
					<select
						{...props}
						class="border-input focus-visible:ring-ring focus-visible:border-ring bg-background flex h-10 w-full rounded-md border px-3 text-sm shadow-sm transition"
						bind:value={$formData.notifyDaysBefore}
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
						bind:value={$formData.number}
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
					<Input {...props} type="date" bind:value={$formData.datepicker} />
				{/snippet}
			</Control>
			<FieldErrors class="text-destructive text-sm" />
		</Field>

		<Field {form} name="tagsinput">
			<Control>
				{#snippet children({ props })}
					<Label class="font-medium">タグ</Label>
					<TagsInput bind:value={tagsinput_value} placeholder="動画, 音楽 など" />
					{#each $formData.tagsinput as item, i}
						<input {...props} type="hidden" bind:value={$formData.tagsinput[i]} name="tagsinput" />
					{/each}
				{/snippet}
			</Control>
			<Description class="text-muted-foreground text-sm">
				カテゴリ分けに使うタグを追加できます。
			</Description>
			<FieldErrors class="text-destructive text-sm" />
		</Field>

		<Button size="sm" type="submit" class="w-full">保存する</Button>
	</form>
</div>
