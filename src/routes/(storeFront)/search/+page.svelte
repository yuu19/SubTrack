<script lang="ts">
	import ProductCard from '$lib/components/ProductCard.svelte';
	import FilterDesktop from '$lib/components/FilterDesktop.svelte';
	import SearchBar2 from '$lib/components/SearchBar2.svelte';
	import { queryParam, ssp } from 'sveltekit-search-params';

	let { data } = $props();
	let term = queryParam('term');
</script>

<div class="mx-auto my-5 max-w-6xl md:my-20 lg:px-10">
	{#if $term}
		<h1 class="text-xl font-bold capitalize md:text-3xl">Search for "{$term}"</h1>
	{/if}
	<div class="my-5 flex items-center justify-between">
		<SearchBar2 />
	</div>
	<section class="  flex w-full flex-col justify-between gap-6 lg:flex-row">
		{#if data}
			{#if data.plans.length > 0}
				<div class="relative hidden basis-[200px] lg:inline-flex">
					<div class="sticky top-[5rem] left-0 flex flex-col gap-5">
						<FilterDesktop planGroups={data.planGroups} />
					</div>
				</div>
				<div class="flex flex-1 flex-col gap-5">
					<div class="category-section space-y-3 md:space-y-5">
						{#each data.plans as plan (plan.id)}
							<div class="grid grid-cols-1 gap-4">
								<ProductCard
									name={plan.name}
									preview={plan.images[0].fileUrl}
									description={plan.description}
									price={plan.price}
									slug={plan.slug}
								/>
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<div class="grid h-[400px] w-full place-content-center place-items-center">
					<p class="text-muted-foreground text-center text-xl font-medium">
						No plan found in the catalog
					</p>
				</div>
			{/if}
		{/if}
	</section>
</div>
