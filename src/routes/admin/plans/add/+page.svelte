<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import * as Form from '$lib/components/ui/form';
	import { filesProxy, superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { planSchema } from '$lib/formSchema.js';
	import { Loader2 } from 'lucide-svelte';

	let { data } = $props();
	const form = superForm(data.form, {
		validators: zodClient(planSchema),
		validationMethod: 'auto'
	});
	const { form: formData, enhance, delayed, errors } = form;
	function getBillingIntervals(id: number) {
		const planGroup = data.planGroups.find((group) => group.id === id);
		return planGroup?.billingIntervals || [];
	}
	const images = filesProxy(form, 'images');
	let previews = $derived(Array.from($images).map((file) => URL.createObjectURL(file)));
</script>

<div class="flex-1 space-y-4 p-8 pt-6">
	<div class="flex items-center justify-between space-y-2">
		<h2 class="text-3xl font-bold tracking-tight">Add New Plan</h2>
	</div>
	<form enctype="multipart/form-data" method="POST" use:enhance action="/admin/plans/add">
		<Card.Root>
			<Card.Header>
				<Card.Title>Plan Details</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<Form.Field {form} name="name">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Plan Name</Form.Label>
							<Input {...props} bind:value={$formData.name} />
						{/snippet}
					</Form.Control>

					<Form.FieldErrors />
				</Form.Field>
				<Form.Field {form} name="description">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Plan Summary</Form.Label>
							<Input {...props} bind:value={$formData.description} />
						{/snippet}
					</Form.Control>

					<Form.FieldErrors />
				</Form.Field>

				<div class="grid grid-cols-2 gap-4">
					<Form.Field {form} name="price">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>Monthly Price</Form.Label>
								<Input {...props} type="number" bind:value={$formData.price} />
							{/snippet}
						</Form.Control>

						<Form.FieldErrors />
					</Form.Field>

					<Form.Field {form} name="seatLimit">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>Seat Limit</Form.Label>
								<Input {...props} type="number" bind:value={$formData.seatLimit} />
							{/snippet}
						</Form.Control>

						<Form.FieldErrors />
					</Form.Field>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<Form.Field {form} name="planGroupId">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>Plan Group</Form.Label>

								<select
									class="block w-full rounded-md border-2 p-1.5"
									{...props}
									bind:value={$formData.planGroupId}
									onchange={() => {
										formData.update(
											($f) => {
												$f.billingInterval = '';
												return $f;
											},
											{
												taint: true
											}
										);
									}}
								>
									{#each data.planGroups as planGroup (planGroup.id)}
										<option value={planGroup.id}>{planGroup.name}</option>
									{/each}
								</select>
							{/snippet}
						</Form.Control>

						<Form.FieldErrors />
					</Form.Field>

					<Form.Field {form} name="billingInterval">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>Billing Interval</Form.Label>

								<select
									class="block w-full rounded-md border-2 p-1.5"
									{...props}
									bind:value={$formData.billingInterval}
								>
									{#each getBillingIntervals($formData.planGroupId) as billingInterval (billingInterval)}
										<option value={billingInterval}>{billingInterval}</option>
									{/each}
								</select>
							{/snippet}
						</Form.Control>

						<Form.FieldErrors />
					</Form.Field>
				</div>
				<Form.Field {form} name="images">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Plan Badge</Form.Label>
							<input
								{...props}
								accept="image/png, image/jpeg"
								bind:files={$images}
								type="file"
								multiple
							/>
						{/snippet}
					</Form.Control>
					{#if $errors.images}
						{#each $errors.images[0] as error}
							<p class="text-red-600">{error}</p>
						{/each}
					{/if}

					<Form.FieldErrors />
				</Form.Field>
				<div class="grid w-fit grid-cols-3 gap-2">
					{#each previews as preview (preview)}
						<img src={preview} alt="" class="size-20 rounded-md border-2" />
					{/each}
				</div>

				<Button type="submit">
					{#if $delayed}
						<Loader2 class="size-6 animate-spin " />
					{:else}
						Create Plan
					{/if}
				</Button>
			</Card.Content>
		</Card.Root>
	</form>
</div>
