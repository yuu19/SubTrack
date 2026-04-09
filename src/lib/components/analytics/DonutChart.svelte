<script lang="ts">
	type Segment = {
		label: string;
		value: number;
		color: string;
	};

	type Props = {
		segments: Segment[];
		total: number;
		totalLabel: string;
		totalDisplay: string;
		hint: string;
	};

	const radius = 54;
	const strokeWidth = 22;
	const circumference = 2 * Math.PI * radius;

	let { segments, total, totalLabel, totalDisplay, hint }: Props = $props();

	const chartSegments = $derived.by(() => {
		let offset = 0;

		return segments.map((segment) => {
			const length = total > 0 ? (segment.value / total) * circumference : 0;
			const computed = {
				...segment,
				dasharray: `${length} ${Math.max(circumference - length, 0)}`,
				dashoffset: -offset
			};

			offset += length;
			return computed;
		});
	});
</script>

<div class="relative mx-auto aspect-square w-full max-w-[320px]">
	<svg viewBox="0 0 160 160" class="h-full w-full -rotate-90" aria-hidden="true">
		<circle
			cx="80"
			cy="80"
			r={radius}
			fill="none"
			stroke="color-mix(in oklab, var(--border) 85%, transparent)"
			stroke-width={strokeWidth}
		/>
		{#each chartSegments as segment (segment.label)}
			<circle
				cx="80"
				cy="80"
				r={radius}
				fill="none"
				stroke={segment.color}
				stroke-width={strokeWidth}
				stroke-linecap="butt"
				stroke-dasharray={segment.dasharray}
				stroke-dashoffset={segment.dashoffset}
			/>
		{/each}
	</svg>

	<div class="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
		<p class="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">{totalLabel}</p>
		<p class="text-foreground mt-2 text-[clamp(1.8rem,7vw,2.5rem)] font-semibold leading-none">
			{totalDisplay}
		</p>
		<p class="text-muted-foreground mt-3 text-xs leading-5">{hint}</p>
	</div>
</div>
