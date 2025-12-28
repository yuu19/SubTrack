<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { X } from 'lucide-svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { planGroupSchema } from '$lib/formSchema.js';
	import * as Form from '$lib/components/ui/form';

	let { data } = $props();
	const form = superForm(data.form, {
		validators: zodClient(planGroupSchema),
		dataType: 'json'
	});

	const { form: formData, enhance } = form;
	let subcategoryInput = $state('');

	function handleSubcategoryInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const value = input.value;

		// Add subcategory when space is pressed
		if (value.endsWith(' ')) {
			const trimmedWord = value.trim();

			if (trimmedWord && !$formData.billingIntervals.includes(trimmedWord)) {
				$formData.billingIntervals = [...$formData.billingIntervals, trimmedWord];
				subcategoryInput = '';
			}
		}
	}

	function removeSubcategory(index: number) {
		$formData.billingIntervals = $formData.billingIntervals.filter((_, i) => i !== index);
	}
</script>

<div class="flex-1 space-y-4 p-8 pt-6">
	<div class="flex items-center justify-between space-y-2">
		<h2 class="text-3xl font-bold tracking-tight">Add Plan Group</h2>
	</div>
	<form method="POST" use:enhance action="/admin/plan-groups/add">
		<Card.Root>
			<Card.Header>
				<Card.Title>Plan Group Details</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<Form.Field {form} name="name">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>Group Name</Form.Label>
								<Input {...props} bind:value={$formData.name} />
							{/snippet}
						</Form.Control>

						<Form.FieldErrors />
					</Form.Field>
					<Form.Field {form} name="description">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>Description</Form.Label>
								<Input {...props} bind:value={$formData.description} />
							{/snippet}
						</Form.Control>

						<Form.FieldErrors />
					</Form.Field>
				</div>
				<Form.Field {form} name="billingIntervals">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Billing Intervals</Form.Label>
							{#if $formData.billingIntervals.length > 0}
								<div class="mb-2 flex flex-wrap gap-2">
									{#each $formData.billingIntervals as billingInterval, index (index)}
										<Badge
											>{billingInterval}

											<button
												type="button"
												class="ml-1.5 hover:text-red-500"
												onclick={() => removeSubcategory(index)}
											>
												<X class="size-3" />
											</button>
										</Badge>
									{/each}
								</div>
							{/if}
							<Input
								{...props}
								bind:value={subcategoryInput}
								oninput={handleSubcategoryInput}
								placeholder="Type an interval (monthly, annual) and press space"
							/>
						{/snippet}
					</Form.Control>

					<Form.FieldErrors />
				</Form.Field>

				<Button type="submit">Add Plan Group</Button>
			</Card.Content>
		</Card.Root>
	</form>
</div>
