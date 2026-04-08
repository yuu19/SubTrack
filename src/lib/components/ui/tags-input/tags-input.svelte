<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { TagsInputProps } from './types';
	import TagsInputTag from './tags-input-tag.svelte';

	const TAG_SEPARATOR_PATTERN = /[,\n、，]/;
	const TRAILING_TAG_SEPARATOR_PATTERN = /[,\n、，]\s*$/;

	const defaultValidate: TagsInputProps['validate'] = (val, tags) => {
		const transformed = val.trim();

		// disallow empties
		if (transformed.length === 0) return undefined;

		// disallow duplicates
		if (tags.find((t) => transformed === t)) return undefined;

		return transformed;
	};

	let {
		value = $bindable([]),
		placeholder,
		class: className,
		disabled = false,
		validate = defaultValidate,
		...rest
	}: TagsInputProps = $props();

	let inputValue = $state('');
	let tagIndex = $state<number>();
	let invalid = $state(false);
	let isComposing = $state(false);

	const appendValidatedTags = (candidates: string[], currentTags: string[]) => {
		let nextTags = currentTags;
		let attempted = 0;
		let accepted = 0;

		for (const candidate of candidates) {
			const trimmed = candidate.trim();
			if (trimmed.length === 0) continue;

			attempted += 1;

			const validated = validate(trimmed, nextTags);
			if (!validated) continue;

			nextTags = [...nextTags, validated];
			accepted += 1;
		}

		return { nextTags, attempted, accepted };
	};

	const splitCompletedSegments = (raw: string) => {
		const segments = raw.split(TAG_SEPARATOR_PATTERN);
		const trailingSeparator = TRAILING_TAG_SEPARATOR_PATTERN.test(raw);
		const pendingValue = trailingSeparator ? '' : (segments.pop() ?? '');

		return {
			completed: segments,
			pendingValue
		};
	};

	const commitInput = ({
		raw,
		splitCompletedOnly = false,
		markInvalid = false
	}: {
		raw: string;
		splitCompletedOnly?: boolean;
		markInvalid?: boolean;
	}) => {
		if (raw.trim().length === 0) {
			if (!splitCompletedOnly) inputValue = '';
			invalid = false;
			return false;
		}

		const { completed, pendingValue } = splitCompletedOnly
			? splitCompletedSegments(raw)
			: { completed: [raw], pendingValue: '' };
		const { nextTags, attempted, accepted } = appendValidatedTags(completed, value);

		if (accepted > 0) {
			value = nextTags;
		}

		inputValue = pendingValue;
		invalid = markInvalid ? attempted > 0 && accepted === 0 : false;

		return accepted > 0;
	};

	const handleInput = () => {
		invalid = false;

		queueMicrotask(() => {
			if (!TAG_SEPARATOR_PATTERN.test(inputValue)) return;
			commitInput({ raw: inputValue, splitCompletedOnly: true });
		});
	};

	const enter = () => {
		if (isComposing) return;
		commitInput({ raw: inputValue, markInvalid: true });
	};

	const compositionStart = () => {
		isComposing = true;
	};

	const compositionEnd = () => {
		isComposing = false;
	};

	const keydown = (e: KeyboardEvent) => {
		const target = e.target as HTMLInputElement;

		if (e.key === 'Enter') {
			// prevent form submit
			e.preventDefault();

			if (isComposing) return;

			enter();
			return;
		}

		const isAtBeginning = target.selectionStart === 0 && target.selectionEnd === 0;

		let shouldResetIndex = true;

		if (e.key === 'Backspace') {
			if (isAtBeginning) {
				e.preventDefault();

				if (tagIndex !== undefined) {
					deleteIndex(tagIndex);

					// focus previous
					const prev = tagIndex - 1;

					if (prev < 0) {
						tagIndex = undefined;
					} else {
						tagIndex = prev;
					}
				} else {
					tagIndex = value.length - 1;
				}

				shouldResetIndex = false;
			}
		}

		if (e.key === 'Delete') {
			if (isAtBeginning) {
				if (inputValue.length === 0) {
					if (tagIndex !== undefined) {
						e.preventDefault();

						deleteIndex(tagIndex);

						// stay focused on the same index unless value.length === 0
						if (value.length === 0) tagIndex = undefined;

						shouldResetIndex = false;
					}
				}
			}
		}

		// controls for tag selection
		if (isAtBeginning) {
			// left
			if (e.key === 'ArrowLeft') {
				if (tagIndex !== undefined) {
					const prev = tagIndex - 1;

					if (prev < 0) {
						tagIndex = 0;
					} else {
						tagIndex = prev;
					}
				} else {
					// set initial index
					tagIndex = value.length - 1;
				}

				shouldResetIndex = false;
			}

			// right
			// we can only move right if the value is empty
			if (inputValue.length === 0) {
				if (e.key === 'ArrowRight') {
					if (tagIndex !== undefined) {
						const next = tagIndex + 1;

						if (next > value.length - 1) {
							tagIndex = undefined;
						} else {
							tagIndex = next;
						}

						shouldResetIndex = false;
					}
				}
			}
		}

		// reset the tag index to undefined
		if (shouldResetIndex) {
			tagIndex = undefined;
		}
	};

	const deleteValue = (val: string) => {
		const index = value.findIndex((v) => val === v);

		if (index === -1) return;

		deleteIndex(index);
	};

	const deleteIndex = (index: number) => {
		value = [...value.slice(0, index), ...value.slice(index + 1)];
	};

	const blur = () => {
		if (!isComposing) {
			commitInput({ raw: inputValue });
		}

		tagIndex = undefined;
	};
</script>

<div
	class={cn(
		'border-input bg-background selection:bg-primary dark:bg-input/30 flex min-h-11 w-full flex-wrap items-start gap-2 rounded-md border p-2 disabled:opacity-50 aria-disabled:cursor-not-allowed sm:min-h-[36px] sm:items-center sm:gap-1 sm:py-0.5 sm:pr-1 sm:pl-1',
		className
	)}
	aria-disabled={disabled}
>
	<input
		{...rest}
		bind:value={inputValue}
		onblur={blur}
		oncompositionstart={compositionStart}
		oncompositionend={compositionEnd}
		{disabled}
		{placeholder}
		data-invalid={invalid}
		oninput={handleInput}
		onkeydown={keydown}
		class="placeholder:text-muted-foreground order-first min-h-10 w-full min-w-0 shrink grow basis-full border-none bg-transparent px-2 text-base outline-hidden focus:outline-hidden disabled:cursor-not-allowed data-[invalid=true]:text-red-500 sm:order-none sm:min-h-0 sm:min-w-16 sm:basis-0 sm:px-1 sm:text-sm"
	/>
	{#each value as tag, i (tag)}
		<TagsInputTag value={tag} {disabled} onDelete={deleteValue} active={i === tagIndex} />
	{/each}
</div>
