<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import type { TPlanGroups } from '$lib/types';
	import { cn } from '$lib/utils';
	import { queryParam, ssp } from 'sveltekit-search-params';

	type TProps = {
		planGroups: TPlanGroups[];
	};
	let { planGroups }: TProps = $props();
	let planGroupId = queryParam('planGroupId', ssp.number());
	let selectedBillingIntervals = queryParam('billingIntervals', ssp.array(['']), {
		showDefaults: false
	});

	function toggleBillingInterval(billingInterval: string) {
		selectedBillingIntervals.update((currentList) => {
			if (currentList.includes(billingInterval)) {
				// Remove the billing interval if it's already in the list
				return currentList.filter((entry) => entry !== billingInterval);
			} else {
				// Add the billing interval if it's not in the list
				return [...currentList, billingInterval];
			}
		});
	}

	function isBillingIntervalSelected(billingInterval: string): boolean {
		return $selectedBillingIntervals.includes(billingInterval) || false;
	}
</script>

<div class="lawal">
	{#each planGroups as { name, id, billingIntervals } (id)}
		<button
			class={cn(' mt-5 text-lg font-semibold capitalize', {
				'activeMenu sideMenu-active': $planGroupId === id
			})}
			onclick={() => {
				$planGroupId = id;
			}}
		>
			{name}
		</button>
		<div class="mt-7 space-y-5 pl-5">
			{#each billingIntervals as billingInterval (billingInterval)}
				<div class="flex items-center space-x-4">
					<Checkbox
						id="term-{billingInterval}"
						checked={isBillingIntervalSelected(billingInterval)}
						aria-labelledby="terms-label"
						onCheckedChange={() => toggleBillingInterval(billingInterval)}
					/>
					<Label
						id="terms-label"
						for="term-{billingInterval}"
						class="  cursor-pointer text-sm font-medium"
					>
						{billingInterval}
					</Label>
				</div>
			{/each}
		</div>
	{/each}
</div>

<style lang="postcss">
	.sideMenu {
		position: relative;
		width: max-content;
		transition: width 0.3s cubic-bezier(0.075, 0.82, 0.165, 1);
	}

	.sideMenu-active {
		position: relative;
		width: max-content;
		transition: width 0.3s cubic-bezier(0.075, 0.82, 0.165, 1);
	}

	.sideMenu:hover.sideMenu::after {
		content: '';
		height: 2px;
		width: 100%;
		position: absolute;
		background-color: #f6b01e;
		bottom: -5px;
		left: 0;
		animation: activeMenu ease 0.5s;
	}
	.sideMenu-active::after {
		content: '';
		height: 2px;
		width: 100%;
		position: absolute;
		background-color: #f6b01e;
		bottom: -5px;
		left: 0;

		animation: activeMenu ease 0.5s;
	}
	@keyframes activeMenu {
		0% {
			width: 0;
		}
		100% {
			width: 100%;
		}
	}
</style>
