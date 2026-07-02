import { and, eq } from 'drizzle-orm';
import {
	CANCELLATION_METHODS,
	DEFAULT_SUBSCRIPTION_CURRENCY,
	PAYMENT_METHOD_TYPES,
	SUPPORTED_CURRENCIES,
	TRACKED_SUBSCRIPTION_STATUSES,
	type CancellationMethod,
	type PaymentMethodType,
	type SubscriptionCurrency,
	type TrackedSubscriptionStatus
} from '$lib/constant';
import {
	subscriptionCategoryTable,
	subscriptionPaymentMethodTable,
	trackedSubscriptionTable
} from '$lib/server/db/schema';
import { computeNextBilling } from '$lib/server/subscriptions';
import { SUBSCRIPTION_EXPORT_HEADERS } from '$lib/server/subscription-export';
import { getFallbackSubscriptionColor } from '$lib/subscription-colors';
import { defaultSubscriptionIconType, defaultSubscriptionIconValue } from '$lib/subscription-icons';

type Db = NonNullable<App.Locals['db']>;

const IMPORT_CYCLES = ['monthly', 'quarterly', 'yearly'] as const;

type ImportCycle = (typeof IMPORT_CYCLES)[number];

export type SubscriptionImportPreviewRow = {
	line: number;
	serviceName: string;
	categoryName: string | null;
	paymentMethodName: string | null;
	cycle: ImportCycle | '';
	amount: number | null;
	currency: SubscriptionCurrency | '';
	firstPaymentDate: string;
	notifyDaysBefore: number | null;
	status: TrackedSubscriptionStatus | '';
	canceledAt: string | null;
	cancellationMethod: CancellationMethod | null;
	errors: string[];
};

export type SubscriptionImportPreview = {
	headers: string[];
	rows: SubscriptionImportPreviewRow[];
	summary: {
		totalRows: number;
		validRows: number;
		errorRows: number;
		activeRows: number;
		canceledRows: number;
		newCategories: string[];
		newPaymentMethods: string[];
	};
	errors: string[];
};

export type ParsedSubscriptionImportRow = SubscriptionImportPreviewRow & {
	cycle: ImportCycle;
	amount: number;
	currency: SubscriptionCurrency;
	notifyDaysBefore: number;
	status: TrackedSubscriptionStatus;
};

type CsvParseResult = {
	headers: string[];
	records: {
		line: number;
		cells: string[];
	}[];
	errors: string[];
};

const HEADER_SET = new Set<string>(SUBSCRIPTION_EXPORT_HEADERS);

const hasAtMostTwoDecimalPlaces = (value: number): boolean =>
	Math.abs(Math.round(value * 100) - value * 100) < 1e-8;

const normalizeCell = (value: string | undefined) => (value ?? '').trim();

const parseCsv = (input: string): CsvParseResult => {
	const text = input.replace(/^\uFEFF/, '');
	const rows: string[][] = [];
	const errors: string[] = [];
	let current = '';
	let row: string[] = [];
	let inQuotes = false;

	for (let index = 0; index < text.length; index += 1) {
		const char = text[index];
		const next = text[index + 1];

		if (inQuotes) {
			if (char === '"' && next === '"') {
				current += '"';
				index += 1;
				continue;
			}
			if (char === '"') {
				inQuotes = false;
				continue;
			}
			current += char;
			continue;
		}

		if (char === '"') {
			inQuotes = true;
			continue;
		}
		if (char === ',') {
			row.push(current);
			current = '';
			continue;
		}
		if (char === '\n') {
			row.push(current.replace(/\r$/, ''));
			rows.push(row);
			row = [];
			current = '';
			continue;
		}
		current += char;
	}

	if (inQuotes) {
		errors.push('CSVの引用符が閉じられていません。');
	}

	if (current.length > 0 || row.length > 0) {
		row.push(current.replace(/\r$/, ''));
		rows.push(row);
	}

	const meaningfulRows = rows.filter((cells) => cells.some((cell) => cell.trim().length > 0));
	const headers = meaningfulRows[0]?.map(normalizeCell) ?? [];
	const records = meaningfulRows.slice(1).map((cells, index) => ({
		line: index + 2,
		cells
	}));

	return { headers, records, errors };
};

const validateHeaders = (headers: string[]) => {
	const errors: string[] = [];
	const expected = [...SUBSCRIPTION_EXPORT_HEADERS];

	if (headers.length === 0) {
		return ['CSVヘッダーがありません。'];
	}

	if (headers.length !== expected.length) {
		errors.push(`CSVヘッダーの列数が違います。${expected.length}列にしてください。`);
	}

	for (const [index, expectedHeader] of expected.entries()) {
		if (headers[index] !== expectedHeader) {
			errors.push(`列${index + 1}は ${expectedHeader} にしてください。`);
		}
	}

	const unknownHeaders = headers.filter((header) => !HEADER_SET.has(header));
	if (unknownHeaders.length > 0) {
		errors.push(`未対応の列があります: ${unknownHeaders.join(', ')}`);
	}

	return errors;
};

const isDateOnly = (value: string) => {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const date = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const normalizeCanceledAt = (value: string, errors: string[]) => {
	if (!value) return null;
	const normalized = isDateOnly(value) ? `${value}T00:00:00.000Z` : value;
	const date = new Date(normalized);
	if (Number.isNaN(date.getTime())) {
		errors.push('canceled_at は有効な日付にしてください。');
		return null;
	}
	return date.toISOString();
};

const parseAmount = (value: string, errors: string[]) => {
	if (!value) {
		errors.push('amount は必須です。');
		return null;
	}
	const amount = Number(value);
	if (!Number.isFinite(amount)) {
		errors.push('amount は数値で入力してください。');
		return null;
	}
	if (amount < 0 || amount > 1_000_000) {
		errors.push('amount は0以上1000000以下にしてください。');
	}
	if (!hasAtMostTwoDecimalPlaces(amount)) {
		errors.push('amount は小数2桁までにしてください。');
	}
	return amount;
};

const parseNotifyDays = (value: string, defaultNotifyDaysBefore: number, errors: string[]) => {
	if (!value) return defaultNotifyDaysBefore;
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 0 || parsed > 365) {
		errors.push('notify_days_before は0から365の整数にしてください。');
		return null;
	}
	return parsed;
};

const parseRow = (
	headers: string[],
	cells: string[],
	line: number,
	defaultNotifyDaysBefore: number
): SubscriptionImportPreviewRow => {
	const values = new Map<string, string>();
	const rowErrors: string[] = [];

	if (cells.length !== headers.length) {
		rowErrors.push(`列数が違います。${headers.length}列にしてください。`);
	}

	for (const [index, header] of headers.entries()) {
		values.set(header, normalizeCell(cells[index]));
	}

	const serviceName = values.get('service_name') ?? '';
	if (!serviceName) rowErrors.push('service_name は必須です。');
	if (serviceName.length > 120) rowErrors.push('service_name は120文字以内にしてください。');

	const categoryName = values.get('category') ?? '';
	if (categoryName.length > 40) rowErrors.push('category は40文字以内にしてください。');

	const paymentMethodName = values.get('payment_method') ?? '';
	if (paymentMethodName.length > 40) {
		rowErrors.push('payment_method は40文字以内にしてください。');
	}

	const cycleValue = values.get('billing_cycle') ?? '';
	const cycle = IMPORT_CYCLES.includes(cycleValue as ImportCycle)
		? (cycleValue as ImportCycle)
		: '';
	if (!cycle)
		rowErrors.push('billing_cycle は monthly / quarterly / yearly のいずれかにしてください。');

	const amount = parseAmount(values.get('amount') ?? '', rowErrors);

	const currencyValue = (values.get('currency') ?? '').toUpperCase();
	const currency = SUPPORTED_CURRENCIES.includes(currencyValue as SubscriptionCurrency)
		? (currencyValue as SubscriptionCurrency)
		: '';
	if (!currency) rowErrors.push('currency は JPY / USD / EUR / GBP のいずれかにしてください。');

	const firstPaymentDate = values.get('first_payment_date') ?? '';
	if (!firstPaymentDate) {
		rowErrors.push('first_payment_date は必須です。');
	} else if (!isDateOnly(firstPaymentDate)) {
		rowErrors.push('first_payment_date は YYYY-MM-DD 形式にしてください。');
	}

	const notifyDaysBefore = parseNotifyDays(
		values.get('notify_days_before') ?? '',
		defaultNotifyDaysBefore,
		rowErrors
	);

	const statusValue = values.get('status') || 'active';
	const status = TRACKED_SUBSCRIPTION_STATUSES.includes(statusValue as TrackedSubscriptionStatus)
		? (statusValue as TrackedSubscriptionStatus)
		: '';
	if (!status) rowErrors.push('status は active / canceled のいずれかにしてください。');

	const canceledAt = normalizeCanceledAt(values.get('canceled_at') ?? '', rowErrors);
	const cancellationMethodValue = values.get('cancellation_method') ?? '';
	const cancellationMethod = CANCELLATION_METHODS.includes(
		cancellationMethodValue as CancellationMethod
	)
		? (cancellationMethodValue as CancellationMethod)
		: null;
	if (cancellationMethodValue && !cancellationMethod) {
		rowErrors.push('cancellation_method が未対応です。');
	}

	return {
		line,
		serviceName,
		categoryName: categoryName || null,
		paymentMethodName: paymentMethodName || null,
		cycle,
		amount,
		currency,
		firstPaymentDate,
		notifyDaysBefore,
		status,
		canceledAt,
		cancellationMethod,
		errors: rowErrors
	};
};

const isParsedRow = (row: SubscriptionImportPreviewRow): row is ParsedSubscriptionImportRow =>
	row.errors.length === 0 &&
	row.cycle !== '' &&
	row.amount !== null &&
	row.currency !== '' &&
	row.notifyDaysBefore !== null &&
	row.status !== '';

export const parseSubscriptionImportCsv = (
	csv: string,
	options: { defaultNotifyDaysBefore?: number } = {}
): SubscriptionImportPreview => {
	const defaultNotifyDaysBefore = options.defaultNotifyDaysBefore ?? 3;
	const parsed = parseCsv(csv);
	const headerErrors = validateHeaders(parsed.headers);
	const allErrors = [...parsed.errors, ...headerErrors];

	const rows =
		headerErrors.length === 0
			? parsed.records.map((record) =>
					parseRow(parsed.headers, record.cells, record.line, defaultNotifyDaysBefore)
				)
			: [];

	if (rows.length === 0 && allErrors.length === 0) {
		allErrors.push('取り込む行がありません。');
	}

	const validRows = rows.filter(isParsedRow);
	const errorRows = rows.length - validRows.length;
	const existingCategoryNames = new Set<string>();
	const existingPaymentMethodNames = new Set<string>();
	const newCategories = new Set<string>();
	const newPaymentMethods = new Set<string>();

	for (const row of validRows) {
		if (row.categoryName && !existingCategoryNames.has(row.categoryName)) {
			newCategories.add(row.categoryName);
			existingCategoryNames.add(row.categoryName);
		}
		if (row.paymentMethodName && !existingPaymentMethodNames.has(row.paymentMethodName)) {
			newPaymentMethods.add(row.paymentMethodName);
			existingPaymentMethodNames.add(row.paymentMethodName);
		}
	}

	return {
		headers: parsed.headers,
		rows,
		summary: {
			totalRows: rows.length,
			validRows: validRows.length,
			errorRows,
			activeRows: validRows.filter((row) => row.status === 'active').length,
			canceledRows: validRows.filter((row) => row.status === 'canceled').length,
			newCategories: [...newCategories],
			newPaymentMethods: [...newPaymentMethods]
		},
		errors: allErrors
	};
};

export const getValidSubscriptionImportRows = (
	preview: SubscriptionImportPreview
): ParsedSubscriptionImportRow[] | null => {
	if (preview.errors.length > 0) return null;
	if (preview.summary.errorRows > 0) return null;
	const rows = preview.rows.filter(isParsedRow);
	return rows.length === preview.rows.length && rows.length > 0 ? rows : null;
};

export const importSubscriptionsFromCsv = async ({
	db,
	userId,
	csv,
	defaultNotifyDaysBefore,
	timeZone
}: {
	db: Db;
	userId: string;
	csv: string;
	defaultNotifyDaysBefore: number;
	timeZone: string;
}) => {
	const preview = parseSubscriptionImportCsv(csv, { defaultNotifyDaysBefore });
	const rows = getValidSubscriptionImportRows(preview);
	if (!rows) return { preview, imported: 0, createdCategories: 0, createdPaymentMethods: 0 };

	const [existingCategories, existingPaymentMethods, existingSubscriptions] = await Promise.all([
		db.query.subscriptionCategoryTable.findMany({
			where: (category, { eq }) => eq(category.userId, userId)
		}),
		db.query.subscriptionPaymentMethodTable.findMany({
			where: (paymentMethod, { eq }) => eq(paymentMethod.userId, userId)
		}),
		db.query.trackedSubscriptionTable.findMany({
			columns: { id: true },
			where: (subscription, { eq }) => eq(subscription.userId, userId)
		})
	]);

	const categoryByName = new Map(
		existingCategories.map((category) => [category.name, category.id])
	);
	const paymentMethodByName = new Map(
		existingPaymentMethods.map((paymentMethod) => [paymentMethod.name, paymentMethod.id])
	);
	let createdCategories = 0;
	let createdPaymentMethods = 0;

	await db
		.delete(trackedSubscriptionTable)
		.where(
			and(eq(trackedSubscriptionTable.userId, userId), eq(trackedSubscriptionTable.isSample, true))
		);

	for (const row of rows) {
		if (row.categoryName && !categoryByName.has(row.categoryName)) {
			await db.insert(subscriptionCategoryTable).values({
				userId,
				name: row.categoryName,
				color: getFallbackSubscriptionColor(existingCategories.length + createdCategories)
			});
			const category = await db.query.subscriptionCategoryTable.findFirst({
				columns: { id: true },
				where: (category, { and, eq }) =>
					and(eq(category.userId, userId), eq(category.name, row.categoryName ?? ''))
			});
			if (category) categoryByName.set(row.categoryName, category.id);
			createdCategories += 1;
		}

		if (row.paymentMethodName && !paymentMethodByName.has(row.paymentMethodName)) {
			await db.insert(subscriptionPaymentMethodTable).values({
				userId,
				name: row.paymentMethodName,
				type: resolveImportedPaymentMethodType(row.paymentMethodName)
			});
			const paymentMethod = await db.query.subscriptionPaymentMethodTable.findFirst({
				columns: { id: true },
				where: (paymentMethod, { and, eq }) =>
					and(eq(paymentMethod.userId, userId), eq(paymentMethod.name, row.paymentMethodName ?? ''))
			});
			if (paymentMethod) paymentMethodByName.set(row.paymentMethodName, paymentMethod.id);
			createdPaymentMethods += 1;
		}
	}

	let imported = 0;
	for (const [index, row] of rows.entries()) {
		const { nextBillingAt, daysUntilNextBilling } = computeNextBilling(
			row.firstPaymentDate,
			row.cycle,
			{ timeZone }
		);
		const canceledAt =
			row.status === 'canceled' ? (row.canceledAt ? new Date(row.canceledAt) : new Date()) : null;

		await db.insert(trackedSubscriptionTable).values({
			userId,
			categoryId: row.categoryName ? (categoryByName.get(row.categoryName) ?? null) : null,
			paymentMethodId: row.paymentMethodName
				? (paymentMethodByName.get(row.paymentMethodName) ?? null)
				: null,
			serviceName: row.serviceName,
			serviceTemplateId: null,
			planName: null,
			serviceUrl: null,
			priceEditedByUser: true,
			status: row.status,
			color: getFallbackSubscriptionColor(existingSubscriptions.length + index),
			iconType: defaultSubscriptionIconType,
			iconValue: defaultSubscriptionIconValue,
			cycle: row.cycle,
			amount: row.amount,
			currency: row.currency || DEFAULT_SUBSCRIPTION_CURRENCY,
			firstPaymentDate: row.firstPaymentDate,
			nextBillingAt,
			daysUntilNextBilling,
			notifyDaysBefore: row.notifyDaysBefore,
			canceledAt,
			cancellationUrl: null,
			cancellationMethod: row.cancellationMethod,
			cancellationMemo: null,
			cancellationDeadlineMemo: null,
			tags: [],
			isSample: false
		});
		imported += 1;
	}

	return { preview, imported, createdCategories, createdPaymentMethods };
};

const resolveImportedPaymentMethodType = (name: string): PaymentMethodType => {
	const normalized = name.trim().toLowerCase();
	if (PAYMENT_METHOD_TYPES.includes(normalized as PaymentMethodType)) {
		return normalized as PaymentMethodType;
	}
	if (
		normalized.includes('card') ||
		normalized.includes('カード') ||
		normalized.includes('visa') ||
		normalized.includes('master')
	) {
		return 'credit_card';
	}
	if (
		normalized.includes('apple') ||
		normalized.includes('google') ||
		normalized.includes('app store') ||
		normalized.includes('play')
	) {
		return 'app_store';
	}
	return 'other';
};
