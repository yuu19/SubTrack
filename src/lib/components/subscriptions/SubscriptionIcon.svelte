<script lang="ts">
	import { base } from '$app/paths';
	import {
		Bot,
		BookOpen,
		Box,
		BriefcaseBusiness,
		Clapperboard,
		Cloud,
		CreditCard,
		Dumbbell,
		Gamepad2,
		Headphones,
		Newspaper,
		ShoppingCart
	} from 'lucide-svelte';
	import {
		defaultSubscriptionIconType,
		defaultSubscriptionIconValue,
		resolveFaviconUrl,
		resolveSubscriptionIconType,
		resolveSubscriptionIconValue,
		resolveSubscriptionPresetIconValue,
		type SubscriptionIconType,
		type SubscriptionPresetIconValue
	} from '$lib/subscription-icons';

	const presetIconComponents = {
		box: Box,
		video: Clapperboard,
		music: Headphones,
		cloud: Cloud,
		ai: Bot,
		learning: BookOpen,
		fitness: Dumbbell,
		work: BriefcaseBusiness,
		game: Gamepad2,
		shopping: ShoppingCart,
		news: Newspaper,
		payment: CreditCard
	};

	let {
		iconType = defaultSubscriptionIconType,
		iconValue = defaultSubscriptionIconValue,
		subscriptionId = null,
		class: className = 'size-5'
	} = $props<{
		iconType?: SubscriptionIconType | string | null;
		iconValue?: string | null;
		subscriptionId?: number | string | null;
		class?: string;
	}>();

	const resolvedIconType = $derived(resolveSubscriptionIconType(iconType));
	const resolvedPresetValue = $derived(resolveSubscriptionPresetIconValue(iconValue));
	const resolvedEmojiValue = $derived(resolveSubscriptionIconValue(iconValue));
	const resolvedFaviconUrl = $derived(resolveFaviconUrl(iconValue));
	const imageUrl = $derived(
		resolvedIconType === 'image' && subscriptionId !== null && subscriptionId !== undefined
			? `${base}/api/subscription-icons/${subscriptionId}`
			: ''
	);
	const PresetIcon = $derived(
		presetIconComponents[resolvedPresetValue as SubscriptionPresetIconValue] ?? Box
	);
</script>

{#if resolvedIconType === 'preset'}
	<PresetIcon class={className} aria-hidden="true" />
{:else if resolvedIconType === 'image' && imageUrl}
	<img src={imageUrl} alt="" class={`${className} object-cover`} loading="lazy" />
{:else if resolvedIconType === 'favicon' && resolvedFaviconUrl}
	<img
		src={resolvedFaviconUrl}
		alt=""
		class={className}
		loading="lazy"
		referrerpolicy="no-referrer"
	/>
{:else}
	<span class={className} aria-hidden="true">{resolvedEmojiValue}</span>
{/if}
