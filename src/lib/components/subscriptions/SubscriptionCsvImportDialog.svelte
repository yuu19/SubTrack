<script lang="ts">
	import { base } from '$app/paths';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import Input from '$lib/components/ui/input/input.svelte';
	import {
		csvImportDialogCopy,
		translateCsvImportError,
		type CsvImportError
	} from '$lib/i18n-copy';
	import { formatCurrency, getCycleLabel, resolveLocale } from '$lib/locale';
	import { getLocale } from '$lib/paraglide/runtime';
	import type {
		subscriptionCategoryTable,
		subscriptionPaymentMethodTable,
		trackedSubscriptionTable
	} from '$lib/server/db/schema';
	import { CheckCircle2, Loader2, RotateCcw, Upload } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	type Subscription = typeof trackedSubscriptionTable.$inferSelect;
	type Category = typeof subscriptionCategoryTable.$inferSelect;
	type PaymentMethod = typeof subscriptionPaymentMethodTable.$inferSelect;

	type ImportPreviewRow = {
		line: number;
		serviceName: string;
		categoryName: string | null;
		paymentMethodName: string | null;
		cycle: string;
		amount: number | null;
		currency: string;
		firstPaymentDate: string;
		notifyDaysBefore: number | null;
		status: string;
		canceledAt: string | null;
		cancellationMethod: string | null;
		errors: CsvImportError[];
	};

	type ImportPreview = {
		rows: ImportPreviewRow[];
		summary: {
			totalRows: number;
			validRows: number;
			errorRows: number;
			activeRows: number;
			canceledRows: number;
			newCategories: string[];
			newPaymentMethods: string[];
		};
		errors: CsvImportError[];
	};

	type ImportResult = {
		imported: number;
		createdCategories: number;
		createdPaymentMethods: number;
		preview?: ImportPreview;
		subscriptions?: Subscription[];
		categories?: Category[];
		paymentMethods?: PaymentMethod[];
	};

	let {
		open = $bindable(false),
		onImported = async () => {}
	}: {
		open?: boolean;
		onImported?: (result: ImportResult) => Promise<void> | void;
	} = $props();

	const currentLocale = $derived(resolveLocale(getLocale()));
	const copy = $derived(csvImportDialogCopy[currentLocale]);
	const formatCsvError = (error: CsvImportError) => translateCsvImportError(error, currentLocale);

	let selectedFile = $state<File | null>(null);
	let preview = $state<ImportPreview | null>(null);
	let isPreviewing = $state(false);
	let isImporting = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);

	const canImport = $derived(
		Boolean(preview) &&
			preview?.errors.length === 0 &&
			preview?.summary.errorRows === 0 &&
			preview?.summary.validRows > 0 &&
			Boolean(selectedFile) &&
			!isImporting
	);

	const exampleCells = $derived([
		'Netflix',
		copy.exampleCategory,
		copy.examplePaymentMethod,
		'monthly',
		'1490',
		'JPY',
		'2026-07-01',
		'',
		'',
		'3',
		'active',
		'',
		''
	]);

	const resetImport = () => {
		selectedFile = null;
		preview = null;
		if (fileInput) fileInput.value = '';
	};

	const getFormData = () => {
		if (!selectedFile) return null;
		const formData = new FormData();
		formData.set('file', selectedFile);
		return formData;
	};

	const readErrorMessage = async (response: Response, fallback: string) => {
		if (response.status === 403) return copy.premiumRequired;
		try {
			const payload = (await response.json()) as unknown;
			if (
				payload &&
				typeof payload === 'object' &&
				'message' in payload &&
				typeof payload.message === 'string'
			) {
				return payload.message;
			}
		} catch {
			// ignore non-JSON error responses
		}
		return fallback;
	};

	const previewFile = async () => {
		const formData = getFormData();
		if (!formData) {
			toast.error(copy.noFile);
			return;
		}
		isPreviewing = true;
		try {
			const response = await fetch(`${base}/api/subscriptions/import/preview`, {
				method: 'POST',
				body: formData
			});
			if (!response.ok) {
				toast.error(await readErrorMessage(response, copy.previewFailed));
				return;
			}
			const payload = (await response.json()) as { preview: ImportPreview };
			preview = payload.preview;
			if (payload.preview.errors.length > 0 || payload.preview.summary.errorRows > 0) {
				toast.error(copy.allRowsMustBeValid);
			}
		} catch (error) {
			console.error('Failed to preview CSV import', error);
			toast.error(copy.previewFailed);
		} finally {
			isPreviewing = false;
		}
	};

	const importFile = async () => {
		if (!canImport) {
			toast.error(copy.allRowsMustBeValid);
			return;
		}
		const formData = getFormData();
		if (!formData) {
			toast.error(copy.noFile);
			return;
		}
		isImporting = true;
		try {
			const response = await fetch(`${base}/api/subscriptions/import`, {
				method: 'POST',
				body: formData
			});
			const payload = (await response.json().catch(() => ({}))) as ImportResult;
			if (!response.ok) {
				if (payload.preview) preview = payload.preview;
				toast.error(response.status === 403 ? copy.premiumRequired : copy.importFailed);
				return;
			}
			await onImported(payload);
			toast.success(copy.importSuccess(payload.imported));
			open = false;
			resetImport();
		} catch (error) {
			console.error('Failed to import CSV', error);
			toast.error(copy.importFailed);
		} finally {
			isImporting = false;
		}
	};

	const handleFileChange = (event: Event) => {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0] ?? null;
		if (file && !file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
			toast.error(copy.unsupportedFile);
			input.value = '';
			selectedFile = null;
			preview = null;
			return;
		}
		selectedFile = file;
		preview = null;
	};
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="flex max-h-[min(92dvh,calc(100dvh-1rem))] w-full max-w-[calc(100vw-1rem)] flex-col overflow-hidden p-0 sm:max-w-2xl"
	>
		<Dialog.Header class="shrink-0 border-b px-4 py-4 pr-12 sm:px-6">
			<Dialog.Title class="text-xl font-semibold">{copy.title}</Dialog.Title>
			<Dialog.Description class="text-muted-foreground text-sm">
				{copy.description}
			</Dialog.Description>
		</Dialog.Header>

		<div class="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6">
			<section class="space-y-2">
				<label class="text-sm font-medium" for="subscription-csv-import-file">
					{copy.fileLabel}
				</label>
				<Input
					id="subscription-csv-import-file"
					bind:ref={fileInput}
					type="file"
					accept=".csv,text/csv"
					onchange={handleFileChange}
				/>
				<p class="text-muted-foreground text-xs">{copy.fileDescription}</p>
			</section>

			<section class="bg-muted/30 rounded-md border p-3">
				<div class="space-y-1">
					<h3 class="text-sm font-semibold">{copy.exampleTitle}</h3>
					<p class="text-muted-foreground text-xs">{copy.exampleDescription}</p>
				</div>
				<div class="bg-background mt-3 overflow-x-auto rounded-md border">
					<table class="w-full min-w-[760px] text-left text-xs">
						<thead class="bg-muted text-muted-foreground">
							<tr>
								{#each ['service_name', 'category', 'payment_method', 'billing_cycle', 'amount', 'currency', 'first_payment_date', 'next_billing_at', 'days_until_next_billing', 'notify_days_before', 'status', 'canceled_at', 'cancellation_method'] as header (header)}
									<th class="px-2 py-2 font-medium">{header}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							<tr>
								{#each exampleCells as cell, index (index)}
									<td class="border-t px-2 py-2 font-mono">{cell || '-'}</td>
								{/each}
							</tr>
						</tbody>
					</table>
				</div>
			</section>

			{#if preview}
				<section class="space-y-3 rounded-md border p-3">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h3 class="text-sm font-semibold">{copy.summary}</h3>
						<span class="text-muted-foreground text-xs">
							{preview.summary.totalRows}
							{copy.rowsUnit}
						</span>
					</div>
					<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
						<div class="bg-muted/40 rounded-md p-2">
							<p class="text-muted-foreground text-xs">{copy.validRows}</p>
							<p class="text-lg font-semibold">{preview.summary.validRows}</p>
						</div>
						<div class="bg-muted/40 rounded-md p-2">
							<p class="text-muted-foreground text-xs">{copy.errorRows}</p>
							<p class="text-lg font-semibold">{preview.summary.errorRows}</p>
						</div>
						<div class="bg-muted/40 rounded-md p-2">
							<p class="text-muted-foreground text-xs">{copy.activeRows}</p>
							<p class="text-lg font-semibold">{preview.summary.activeRows}</p>
						</div>
						<div class="bg-muted/40 rounded-md p-2">
							<p class="text-muted-foreground text-xs">{copy.canceledRows}</p>
							<p class="text-lg font-semibold">{preview.summary.canceledRows}</p>
						</div>
					</div>

					<div class="bg-muted/30 rounded-md p-3 text-sm">
						<p class="font-medium">{copy.newItems}</p>
						{#if preview.summary.newCategories.length === 0 && preview.summary.newPaymentMethods.length === 0}
							<p class="text-muted-foreground mt-1 text-xs">{copy.noNewItems}</p>
						{:else}
							<div class="text-muted-foreground mt-2 space-y-1 text-xs">
								{#if preview.summary.newCategories.length > 0}
									<p>{copy.categoryLabel}: {preview.summary.newCategories.join(', ')}</p>
								{/if}
								{#if preview.summary.newPaymentMethods.length > 0}
									<p>{copy.paymentMethodLabel}: {preview.summary.newPaymentMethods.join(', ')}</p>
								{/if}
							</div>
						{/if}
					</div>
				</section>

				{#if preview.errors.length > 0}
					<section
						class="border-destructive/40 bg-destructive/5 text-destructive rounded-md border p-3"
					>
						<h3 class="text-sm font-semibold">{copy.globalErrors}</h3>
						<ul class="mt-2 list-disc space-y-1 pl-5 text-sm">
							{#each preview.errors as error (error)}
								<li>{formatCsvError(error)}</li>
							{/each}
						</ul>
					</section>
				{/if}

				{#if preview.rows.some((row) => row.errors.length > 0)}
					<section class="border-destructive/40 rounded-md border p-3">
						<h3 class="text-destructive text-sm font-semibold">{copy.rowErrors}</h3>
						<div class="mt-2 max-h-44 space-y-2 overflow-y-auto">
							{#each preview.rows.filter((row) => row.errors.length > 0) as row (row.line)}
								<div class="bg-destructive/5 rounded-md p-2 text-sm">
									<p class="font-medium">{copy.lineLabel(row.line)}: {row.serviceName || '-'}</p>
									<ul class="text-destructive mt-1 list-disc space-y-1 pl-5 text-xs">
										{#each row.errors as error (error)}
											<li>{formatCsvError(error)}</li>
										{/each}
									</ul>
								</div>
							{/each}
						</div>
					</section>
				{/if}

				{#if preview.summary.validRows > 0}
					<section class="space-y-2">
						<h3 class="text-sm font-semibold">{copy.previewRows}</h3>
						<div class="overflow-hidden rounded-md border">
							<div class="max-h-64 overflow-y-auto">
								{#each preview.rows
									.filter((row) => row.errors.length === 0)
									.slice(0, 20) as row (row.line)}
									<div
										class="flex items-start justify-between gap-3 border-b px-3 py-2 last:border-b-0"
									>
										<div class="min-w-0">
											<p class="truncate text-sm font-medium">{row.serviceName}</p>
											<p class="text-muted-foreground text-xs">
												{getCycleLabel(row.cycle, currentLocale)} ·
												{row.amount !== null
													? formatCurrency(row.amount, row.currency, currentLocale)
													: '-'}
											</p>
										</div>
										<div class="text-muted-foreground shrink-0 text-right text-xs">
											<p>{row.firstPaymentDate}</p>
											<p>{row.status}</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</section>
				{/if}
			{/if}
		</div>

		<div
			class="flex shrink-0 flex-col-reverse gap-2 border-t px-4 py-3 sm:flex-row sm:justify-end sm:px-6"
		>
			<Button
				type="button"
				variant="outline"
				onclick={resetImport}
				disabled={isPreviewing || isImporting}
			>
				<RotateCcw class="size-4" />
				{copy.reset}
			</Button>
			<Button
				type="button"
				variant="outline"
				onclick={previewFile}
				disabled={!selectedFile || isPreviewing || isImporting}
			>
				{#if isPreviewing}
					<Loader2 class="size-4 animate-spin" />
					{copy.previewing}
				{:else}
					<Upload class="size-4" />
					{copy.preview}
				{/if}
			</Button>
			<Button type="button" onclick={importFile} disabled={!canImport}>
				{#if isImporting}
					<Loader2 class="size-4 animate-spin" />
					{copy.importing}
				{:else}
					<CheckCircle2 class="size-4" />
					{copy.import}
				{/if}
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
