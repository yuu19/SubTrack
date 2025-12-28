<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { formatCurrency } from '$lib/utils';
	import OrderList from '$lib/components/OrderList.svelte';
	import { page } from '$app/state';
	import { SHIPPING_FEE } from '$lib/constant';

	let cartItems = $derived(page.data.user?.cart?.cartItems ?? []);
	let totalPrice = $derived(cartItems.reduce((total, item) => total + item.quantity * item.plan.price, 0));
</script>

<main>
	<div
		class="relative flex h-[400px] w-full flex-col border-b-2 bg-[url('/hero/hero-3.jpg')] bg-cover bg-fixed bg-no-repeat"
	>
		<div class="absolute top-[314px] z-50 h-3 w-full bg-white/5 backdrop-blur-sm sm:hidden"></div>
		<div class="absolute top-0 left-0 z-0 h-full w-full bg-black/50"></div>

		<div class=" pt-40 md:pt-44 lg:pt-56">
			<div
				class="  z-10 my-0 flex w-full max-w-md flex-col justify-center gap-7 border border-white/20 bg-white/20 px-4 py-3 text-white shadow-md drop-shadow-md backdrop-blur sm:rounded-r-md md:max-w-3xl md:gap-10 md:px-10"
			>
				<div class="drop-shadow-md">
					<h2 class="font-display text-3xl font-bold md:text-6xl">Subscribe</h2>
				</div>
			</div>
		</div>
	</div>

	<section
		class="m-auto my-0 flex h-full w-full max-w-6xl flex-col gap-5 px-2 py-5 sm:px-4 md:px-10 md:py-20 lg:flex-row lg:justify-between xl:px-0"
	>
		<div class="flex w-full flex-col gap-10 md:gap-10 lg:gap-20">
			<div class="flex h-[auto] w-full flex-col gap-4 py-4 lg:max-w-[600px]">
				<h4 class="font-display text-lg font-semibold tracking-wide md:text-2xl lg:text-3xl">
					Selected plans
				</h4>

				<OrderList />
				<div>
					<Button variant="secondary" href="/search">Add more plans</Button>
				</div>
			</div>
		</div>

		<div class="relative z-10 mb-5 w-full lg:mt-[-7.5rem] lg:max-w-[400px]">
			<div class="top-[6rem] left-0 flex w-full flex-col lg:sticky">
				<div
					class="bg-card flex flex-col gap-4 rounded-2xl border border-[#2021251f] p-3 lg:p-[1.5rem] lg:shadow-lg"
				>
					<div class="flex items-center justify-between">
						<p class="text-lg font-semibold lg:text-2xl">Subscription summary</p>
					</div>
					<ul class="flex flex-col gap-3 border-b pt-2 pb-5">
						<li class="flex items-center justify-between">
							<p class="text-sm font-medium lg:text-base">Plans subtotal</p>
							<span
								class="bg-primary/20 text-primary rounded-md px-2 py-1 text-sm font-medium lg:text-base"
							>
								{formatCurrency(totalPrice)}
							</span>
						</li>
						<li class="flex items-center justify-between">
							<p class="text-sm font-medium lg:text-base">Setup fee</p>
							<span
								class="bg-primary/20 text-primary rounded-md px-2 py-1 text-sm font-medium lg:text-base"
							>
								{formatCurrency(SHIPPING_FEE)}
							</span>
						</li>
					</ul>
					<div class="flex items-center justify-between">
						<p class="text-sm font-medium lg:text-base">Total</p>
						<span
							class="bg-primary/20 text-primary rounded-md px-2 py-1 text-sm font-medium lg:text-base"
						>
							{formatCurrency(totalPrice + SHIPPING_FEE)}
						</span>
					</div>
					<Button class="w-full" href="/checkout/payment">Confirm subscription</Button>
				</div>
			</div>
		</div>
	</section>
</main>
