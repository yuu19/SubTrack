<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import DefaultNotifyModal from '$lib/components/modals/DefaultNotifyModal.svelte';
	import UpdateNameModal from '$lib/components/modals/UpdateNameModal.svelte';
	import ThemeSelectModal from '$lib/components/modals/ThemeSelectModal.svelte';
	import { Button } from '$lib/components/ui/button';
	import { m } from '$lib/paraglide/messages.js';
</script>

<div class="m-auto flex w-full max-w-[900px] flex-col gap-5 px-2 md:px-10">
	<div class="flex w-full justify-between gap-5 border-b pb-3">
		<p class="text-base font-semibold md:text-lg">{m.settings_name()}</p>
		<UpdateNameModal />
	</div>

	<div class="flex w-full justify-between gap-5 border-b pb-3">
		<p class="text-base font-semibold md:text-lg">{m.settings_theme_label()}</p>
		<ThemeSelectModal />
	</div>

	<div class="flex w-full justify-between gap-5 border-b pb-3">
		<p class="text-base font-semibold md:text-lg">デフォルト通知日</p>
		<DefaultNotifyModal />
	</div>

	<div class="flex w-full justify-between gap-5 border-b pb-3">
		<p class="text-base font-semibold md:text-lg">{m.settings_logout_label()}</p>
		<Button
			variant="link"
			onclick={() => {
				authClient.signOut();
				invalidateAll();
			}}>{m.settings_logout_button()}</Button
		>
	</div>
</div>
