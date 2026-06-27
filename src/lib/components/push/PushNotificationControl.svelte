<script lang="ts">
	import BellIcon from '@lucide/svelte/icons/bell';
	import SmartphoneIcon from '@lucide/svelte/icons/smartphone';
	import { base } from '$app/paths';
	import { browser, dev } from '$app/environment';
	import { Badge } from '$lib/components/ui/badge';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { m } from '$lib/paraglide/messages.js';
	import { UserConfigContext } from '$lib/states/userConfig.svelte';
	import { cn } from '$lib/utils';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	type Variant = 'banner' | 'settings';

	const autoPromptSuppressedUntilKey = 'subtrack:push-opt-in-prompt-suppressed-until';
	const dayMs = 24 * 60 * 60 * 1000;
	const laterSnoozeMs = 7 * dayMs;
	const emailOnlySnoozeMs = 30 * dayMs;

	let {
		vapidPublicKey = '',
		initialSubscribed = false,
		guideHref = '',
		promptKey = 0,
		variant = 'banner',
		class: className
	}: {
		vapidPublicKey?: string;
		initialSubscribed?: boolean;
		guideHref?: string;
		promptKey?: number;
		variant?: Variant;
		class?: string;
	} = $props();

	const userConfig = UserConfigContext.get();
	let pushInitialized = $state(false);
	let pushSupported = $state(false);
	let pushSubscribed = $state(false);
	let pushPermission = $state<NotificationPermission>('default');
	let pushBusy = $state(false);
	let pushError = $state<string | null>(null);
	let optInOpen = $state(false);
	let lastPromptKey = $state(0);
	let pendingPostCreatePrompt = $state(false);

	const pushEndpoint = `${base}/api/push-subscriptions`;
	const canUsePush = $derived(pushSupported && Boolean(vapidPublicKey));
	const statusLabel = $derived.by(() => {
		if (!pushSupported || !vapidPublicKey) return m.push_status_unavailable();
		if (pushSubscribed) return m.push_status_enabled();
		if (pushPermission === 'denied') return m.push_status_blocked();
		return m.push_status_not_requested();
	});
	const statusBadgeVariant = $derived(pushSubscribed ? 'default' : 'secondary');
	const shouldRenderBanner = $derived(pushInitialized && canUsePush);
	const bannerTitle = $derived(
		pushSubscribed ? m.subscription_push_banner_enabled_title() : m.subscription_push_banner_title()
	);
	const bannerDescription = $derived(
		pushSubscribed
			? m.subscription_push_banner_enabled_description()
			: m.subscription_push_banner_description()
	);

	const urlBase64ToUint8Array = (base64String: string) => {
		const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
		const base64Value = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
		const rawData = atob(base64Value);
		const outputArray = new Uint8Array(rawData.length);
		for (let i = 0; i < rawData.length; i += 1) {
			outputArray[i] = rawData.charCodeAt(i);
		}
		return outputArray;
	};

	const persistNotificationMethod = async (method: 'email' | 'both') => {
		await userConfig.updateConfig({ notificationMethod: method });
	};

	const ensureNotificationMethodBoth = () => {
		if (userConfig.current.notificationMethod === 'both') return;
		void persistNotificationMethod('both');
	};

	const getAutoPromptSuppressedUntil = () => {
		if (!browser) return 0;
		try {
			const value = Number(window.localStorage.getItem(autoPromptSuppressedUntilKey));
			if (!Number.isFinite(value) || value <= 0) return 0;
			if (value <= Date.now()) {
				window.localStorage.removeItem(autoPromptSuppressedUntilKey);
				return 0;
			}
			return value;
		} catch {
			return 0;
		}
	};

	const isAutoPromptSuppressed = () => getAutoPromptSuppressedUntil() > Date.now();

	const suppressAutoPromptFor = (durationMs: number) => {
		if (!browser) return;
		try {
			window.localStorage.setItem(autoPromptSuppressedUntilKey, String(Date.now() + durationMs));
		} catch {
			// Ignore storage failures; the prompt can still be dismissed for this render.
		}
	};

	const clearAutoPromptSuppression = () => {
		if (!browser) return;
		try {
			window.localStorage.removeItem(autoPromptSuppressedUntilKey);
		} catch {
			// Ignore storage failures.
		}
	};

	const getServiceWorkerRegistration = async () => {
		if (!('serviceWorker' in navigator)) return null;
		try {
			const existing = await navigator.serviceWorker.getRegistration();
			const registration =
				existing ??
				(await navigator.serviceWorker.register(`${base}/service-worker.js`, {
					type: dev ? 'module' : 'classic'
				}));
			const ready = await navigator.serviceWorker.ready;
			return ready ?? registration;
		} catch {
			return null;
		}
	};

	const syncPushSubscription = async (subscription: PushSubscription) => {
		const response = await fetch(pushEndpoint, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			credentials: 'same-origin',
			body: JSON.stringify(subscription)
		});
		if (!response.ok) {
			throw new Error('Failed to save push subscription');
		}
	};

	const removePushSubscription = async (endpoint: string) => {
		const response = await fetch(pushEndpoint, {
			method: 'DELETE',
			headers: { 'content-type': 'application/json' },
			credentials: 'same-origin',
			body: JSON.stringify({ endpoint })
		});
		if (!response.ok) {
			throw new Error('Failed to remove push subscription');
		}
	};

	const initPush = async () => {
		if (!browser) return;
		pushSupported =
			'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
		if (!pushSupported) {
			pushInitialized = true;
			return;
		}

		pushPermission = Notification.permission;
		if (!vapidPublicKey) {
			pushInitialized = true;
			return;
		}

		const registration = await getServiceWorkerRegistration();
		if (registration) {
			const subscription = await registration.pushManager.getSubscription();
			if (subscription) {
				pushSubscribed = true;
				void syncPushSubscription(subscription).catch((error) => {
					console.error('Failed to sync push subscription', error);
				});
				ensureNotificationMethodBoth();
			} else {
				pushSubscribed = false;
			}
		}
		pushInitialized = true;
	};

	const enablePush = async () => {
		if (!canUsePush) return;
		pushBusy = true;
		pushError = null;
		try {
			const permission = await Notification.requestPermission();
			pushPermission = permission;
			if (permission !== 'granted') {
				pushError = m.subscription_push_permission_denied();
				await persistNotificationMethod('email');
				toast.message(m.subscription_push_email_only_toast());
				return;
			}

			const registration = await getServiceWorkerRegistration();
			if (!registration) {
				pushError = m.subscription_push_service_worker_unavailable();
				return;
			}

			let subscription = await registration.pushManager.getSubscription();
			if (!subscription) {
				subscription = await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
				});
			}

			await syncPushSubscription(subscription);
			await persistNotificationMethod('both');
			pushSubscribed = true;
			optInOpen = false;
			clearAutoPromptSuppression();
			toast.success(m.subscription_push_enabled_toast());
		} catch (error) {
			console.error('Failed to enable push notifications', error);
			pushError = m.subscription_push_enable_failed();
		} finally {
			pushBusy = false;
		}
	};

	const disablePush = async () => {
		if (!pushSupported) return;
		pushBusy = true;
		pushError = null;
		try {
			const registration = await getServiceWorkerRegistration();
			if (!registration) return;
			const subscription = await registration.pushManager.getSubscription();
			if (subscription) {
				await subscription.unsubscribe();
				await removePushSubscription(subscription.endpoint);
			}
			await persistNotificationMethod('email');
			pushSubscribed = false;
			toast.success(m.subscription_push_disabled_toast());
		} catch (error) {
			console.error('Failed to disable push notifications', error);
			pushError = m.subscription_push_disable_failed();
		} finally {
			pushBusy = false;
		}
	};

	const keepEmailOnly = async () => {
		await persistNotificationMethod('email');
		suppressAutoPromptFor(emailOnlySnoozeMs);
		optInOpen = false;
		toast.message(m.subscription_push_email_only_toast());
	};

	const setUpLater = () => {
		suppressAutoPromptFor(laterSnoozeMs);
		optInOpen = false;
	};

	$effect(() => {
		pushSubscribed = initialSubscribed;
	});

	$effect(() => {
		if (promptKey === lastPromptKey) return;
		lastPromptKey = promptKey;
		pendingPostCreatePrompt = true;
	});

	$effect(() => {
		if (!pendingPostCreatePrompt || !pushInitialized) return;
		pendingPostCreatePrompt = false;
		if (pushSubscribed) {
			ensureNotificationMethodBoth();
			return;
		}
		if (!canUsePush || pushPermission === 'denied') return;
		if (variant === 'banner' && isAutoPromptSuppressed()) return;
		optInOpen = true;
	});

	onMount(() => {
		void initPush();
	});
</script>

{#if variant === 'banner'}
	{#if shouldRenderBanner}
		<div
			class={cn(
				'border-border/60 bg-muted/40 flex flex-col gap-3 rounded-lg border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between',
				className
			)}
		>
			<div class="flex min-w-0 gap-3">
				<BellIcon class="text-primary mt-0.5 size-4 shrink-0" />
				<div class="min-w-0 space-y-1">
					<div class="flex flex-wrap items-center gap-2">
						<p class="font-medium">{bannerTitle}</p>
						<Badge variant={statusBadgeVariant} class="text-[10px]">{statusLabel}</Badge>
					</div>
					<p class="text-muted-foreground text-xs">{bannerDescription}</p>
					<div class="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
						<span>{m.subscription_push_hint()}</span>
						{#if guideHref}
							<a href={guideHref} class="text-primary underline-offset-4 hover:underline">
								{m.subscription_push_details_link()}
							</a>
						{/if}
						{#if pushPermission === 'denied'}
							<span class="text-destructive">{m.subscription_push_permission_denied()}</span>
						{/if}
						{#if pushError}
							<span class="text-destructive">{pushError}</span>
						{/if}
					</div>
				</div>
			</div>
			<Button
				size="sm"
				variant={pushSubscribed ? 'outline' : 'default'}
				disabled={pushBusy || pushPermission === 'denied'}
				onclick={pushSubscribed ? disablePush : enablePush}
				class="self-start sm:self-center"
			>
				{pushSubscribed ? m.subscription_push_disable() : m.subscription_push_enable()}
			</Button>
		</div>
	{/if}
{:else}
	<div class={cn('space-y-4', className)}>
		<div class="grid gap-3 sm:grid-cols-2">
			<div class="rounded-md border px-3 py-3">
				<div class="flex items-center justify-between gap-3">
					<span class="text-sm font-medium">{m.settings_push_status_label()}</span>
					<Badge variant={statusBadgeVariant} class="text-[10px]">{statusLabel}</Badge>
				</div>
				<p class="text-muted-foreground mt-2 text-xs">{m.settings_push_status_description()}</p>
			</div>
			<div class="rounded-md border px-3 py-3">
				<div class="flex items-center justify-between gap-3">
					<span class="text-sm font-medium">{m.settings_email_status_label()}</span>
					<Badge variant="secondary" class="text-[10px]">{m.settings_email_status_enabled()}</Badge>
				</div>
				<p class="text-muted-foreground mt-2 text-xs">{m.settings_email_status_description()}</p>
			</div>
		</div>
		<div class="bg-muted/40 rounded-md border px-3 py-3">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div class="space-y-1">
					<p class="text-sm font-medium">{m.settings_notification_recommendation_title()}</p>
					<p class="text-muted-foreground text-xs">
						{m.settings_notification_recommendation_description()}
					</p>
				</div>
				<Button
					size="sm"
					variant={pushSubscribed ? 'outline' : 'default'}
					disabled={!canUsePush || pushBusy || pushPermission === 'denied'}
					onclick={pushSubscribed ? disablePush : enablePush}
					class="self-start sm:self-center"
				>
					{pushSubscribed ? m.subscription_push_disable() : m.subscription_push_enable()}
				</Button>
			</div>
			{#if pushPermission === 'denied'}
				<p class="text-destructive mt-3 text-xs">{m.settings_push_blocked_description()}</p>
			{/if}
			{#if pushError}
				<p class="text-destructive mt-3 text-xs">{pushError}</p>
			{/if}
			{#if guideHref}
				<a
					href={guideHref}
					class="text-primary mt-3 inline-flex text-xs underline-offset-4 hover:underline"
				>
					{m.subscription_push_details_link()}
				</a>
			{/if}
		</div>
	</div>
{/if}

<Dialog.Root bind:open={optInOpen}>
	<Dialog.Content class="w-full max-w-md">
		<Dialog.Header>
			<div
				class="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-full"
			>
				<SmartphoneIcon class="size-5" />
			</div>
			<Dialog.Title>{m.subscription_push_opt_in_title()}</Dialog.Title>
			<Dialog.Description class="text-muted-foreground text-sm">
				{m.subscription_push_opt_in_description()}
			</Dialog.Description>
		</Dialog.Header>
		<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
			<Button onclick={enablePush} disabled={pushBusy}>{m.subscription_push_enable()}</Button>
			<Button variant="outline" onclick={keepEmailOnly} disabled={pushBusy}>
				{m.subscription_push_email_only()}
			</Button>
			<Button variant="ghost" onclick={setUpLater} disabled={pushBusy}>
				{m.subscription_push_later()}
			</Button>
		</div>
		{#if pushError}
			<p class="text-destructive text-sm">{pushError}</p>
		{/if}
	</Dialog.Content>
</Dialog.Root>
