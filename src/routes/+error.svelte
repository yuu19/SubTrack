<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';

	const title = $derived.by(() => {
		if (page.status === 404) {
			return m.error_title_not_found();
		}

		const message = page.error?.message;
		if (message && message !== 'Internal Error') {
			return message;
		}

		return m.error_title_generic();
	});

	const description = $derived(
		page.status === 404 ? m.error_description_not_found() : m.error_description_generic()
	);
</script>

<main class="mx-auto flex w-full max-w-6xl flex-grow flex-col px-4 sm:px-6 lg:px-8">
	<div class="my-auto flex-shrink-0 py-16 sm:py-32">
		<p class="text-primary-600 text-sm font-semibold tracking-wide uppercase">
			{page.status} {m.error_status_suffix()}
		</p>
		<h1 class="mt-2 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
			{title}
		</h1>
		<p class="mt-2 text-base text-gray-500">{description}</p>
		<div class="mt-6">
			<a href="/" class="text-primary-600 hover:text-primary-500 text-base font-medium">
				{m.error_go_home()}<span aria-hidden="true"> &rarr;</span>
			</a>
		</div>
	</div>
</main>
