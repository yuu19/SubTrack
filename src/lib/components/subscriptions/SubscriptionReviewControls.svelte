<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import type { AppLocale } from '$lib/constant';
	import { formatLongDate } from '$lib/locale';
	import type { ReviewState } from '$lib/subscription-reviews';
	import { subscriptionReviewCopy, type ReviewFeedback } from '$lib/subscription-review-copy';

	let {
		reviewState,
		locale,
		isOnline = true,
		pending = false,
		blocked = false,
		refreshing = false,
		feedback = null,
		onDecision,
		onRefresh,
		onCancellationDetails
	}: {
		reviewState: ReviewState | null;
		locale: AppLocale;
		isOnline?: boolean;
		pending?: boolean;
		blocked?: boolean;
		refreshing?: boolean;
		feedback?: ReviewFeedback | null;
		onDecision: (decision: 'keep' | 'review' | 'undo') => void;
		onRefresh: () => void;
		onCancellationDetails: () => void;
	} = $props();

	const copy = $derived(subscriptionReviewCopy[locale]);
	const disabled = $derived(!isOnline || blocked || pending || refreshing || !reviewState);
	const decisionLabel = $derived(
		reviewState?.decision === 'keep'
			? copy.kept
			: reviewState?.decision === 'review'
				? copy.reviewing
				: copy.unreviewed
	);
</script>

<section
	class="bg-card space-y-3 rounded-xl border p-4 text-sm"
	aria-label={copy.title}
	aria-busy={pending || refreshing}
	data-testid="subscription-review-controls"
>
	<h2 class="font-semibold">{copy.title}</h2>
	{#if reviewState}
		<p class="text-muted-foreground text-xs">
			{copy.payment}:
			<time datetime={reviewState.billingDate} class="text-foreground font-medium"
				>{formatLongDate(reviewState.billingDate, locale)}</time
			>
		</p>
		<p class="font-medium" data-testid="review-current-decision">{decisionLabel}</p>
	{:else}
		<p class="text-muted-foreground">{copy.unavailableState}</p>
	{/if}
	<p class="text-muted-foreground text-xs">{copy.cycleNote}</p>
	<div class="grid grid-cols-2 gap-2">
		<Button
			variant={reviewState?.decision === 'keep' ? 'default' : 'outline'}
			class="h-12"
			{disabled}
			aria-pressed={reviewState?.decision === 'keep'}
			onclick={() => onDecision('keep')}
			data-testid="review-save-keep">{copy.keep}</Button
		>
		<Button
			variant={reviewState?.decision === 'review' ? 'default' : 'outline'}
			class="h-12"
			{disabled}
			aria-pressed={reviewState?.decision === 'review'}
			onclick={() => onDecision('review')}
			data-testid="review-save-review">{copy.review}</Button
		>
	</div>
	{#if reviewState?.decision}
		<Button
			variant="ghost"
			class="min-h-11 w-full whitespace-normal"
			{disabled}
			onclick={() => onDecision('undo')}
			data-testid="review-undo">{copy.undo}</Button
		>
	{/if}
	<div
		role={feedback?.error && !pending && !refreshing ? 'alert' : 'status'}
		aria-live={feedback?.error ? 'assertive' : 'polite'}
		aria-atomic="true"
		class="min-h-5 text-xs"
	>
		{#if pending}
			{copy.saving}
		{:else if refreshing}
			{copy.refreshing}
		{:else if blocked}
			{copy.waiting}
		{:else if feedback}
			<span class:text-destructive={feedback.error}>{copy.messages[feedback.message]}</span>
		{/if}
	</div>
	{#if !isOnline}
		<p class="text-muted-foreground text-xs">{copy.offline}</p>
	{/if}
	{#if !reviewState || feedback?.error}
		<Button
			variant="outline"
			class="min-h-11 w-full whitespace-normal"
			disabled={!isOnline || blocked || pending || refreshing}
			onclick={onRefresh}
			data-testid="review-refresh">{copy.refresh}</Button
		>
	{/if}
	<p class="text-muted-foreground text-xs">{copy.disclaimer}</p>
	{#if reviewState?.decision === 'review'}
		<Button
			variant="outline"
			class="min-h-11 w-full whitespace-normal"
			onclick={onCancellationDetails}
			data-testid="review-cancellation-details">{copy.cancellation}</Button
		>
	{/if}
</section>
