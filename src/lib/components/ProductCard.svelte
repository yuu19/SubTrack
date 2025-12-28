<script lang="ts">
	import { formatCurrency } from '$lib/utils';

	interface Props {
		name: string;
		description: string;
		price: number;
		slug?: string;
		preview: string;
	}

	let { name, description, price, slug, preview }: Props = $props();
	console.log('🚀 ~ price:', price);
</script>

<a
	class="group relative w-full cursor-pointer overflow-clip rounded-lg border px-4 text-left transition-[border] hover:shadow-sm md:px-10 lg:px-5"
	href="/plans/{slug}"
>
	<div
		class="bg-primary absolute top-1/2 left-0 h-[90%] w-[3px] -translate-y-1/2 transition-all group-hover:w-1"
	></div>

	<div
		class="flex justify-between gap-5 border border-solid border-[transparent] border-b-[#e4e4e4] py-6 hover:border-transparent"
	>
		<div class="flex flex-1 flex-col gap-6">
			<h4 class="text-sm font-semibold capitalize lg:text-lg">{name}</h4>
			<p class="text-muted-foreground line-clamp-2 text-xs font-medium lg:text-sm">
				{description}
			</p>
			<div>
				<span class="bg-primary/10 text-primary w-fit rounded p-1 text-xs font-semibold lg:text-sm">
					{formatCurrency(price)}
				</span>
			</div>
		</div>

		<div class="relative h-20 w-[7.5rem] md:h-[8.125rem] md:w-[13.125rem]">
			<img
				class="absolute top-0 left-0 h-full w-full overflow-hidden rounded-xl object-cover"
				src={preview || '/noImage.png'}
				alt="planAsset"
			/>
		</div>
	</div>
</a>
