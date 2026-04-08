<script lang="ts">
	import type { MarkdownDocument } from '$lib/content/site-content';

	let { document } = $props<{
		document: MarkdownDocument;
	}>();
</script>

<div class="space-y-8">
	{#each document.sections as section (section.heading)}
		<section class="space-y-4">
			<h2 class="text-xl font-semibold md:text-2xl">{section.heading}</h2>
			<div class="space-y-4">
				{#each section.blocks as block, index (`${section.heading}-${index}`)}
					{#if block.type === 'paragraph'}
						<p class="text-muted-foreground leading-7">{block.text}</p>
					{:else if block.ordered}
						<ol class="text-muted-foreground list-decimal space-y-2 pl-5 leading-7">
							{#each block.items as item (`${section.heading}-${item}`)}
								<li>{item}</li>
							{/each}
						</ol>
					{:else}
						<ul class="text-muted-foreground list-disc space-y-2 pl-5 leading-7">
							{#each block.items as item (`${section.heading}-${item}`)}
								<li>{item}</li>
							{/each}
						</ul>
					{/if}
				{/each}
			</div>
		</section>
	{/each}
</div>
