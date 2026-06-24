import { DEFAULT_NOTIFY_TIME, DEFAULT_TIME_ZONE } from '$lib/constant';

export const TIME_ZONE_OPTIONS = [
	'Asia/Tokyo',
	'UTC',
	'America/Los_Angeles',
	'America/New_York',
	'Europe/London',
	'Europe/Paris',
	'Asia/Singapore',
	'Asia/Seoul',
	'Australia/Sydney'
] as const;

export const isValidTimeZone = (value: string | null | undefined): value is string => {
	if (!value) return false;
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
		return true;
	} catch {
		return false;
	}
};

export const resolveTimeZone = (value: string | null | undefined): string =>
	isValidTimeZone(value) ? value : DEFAULT_TIME_ZONE;

export const isValidNotifyTime = (value: string | null | undefined): value is string =>
	typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export const resolveNotifyTime = (value: string | null | undefined): string =>
	isValidNotifyTime(value) ? value : DEFAULT_NOTIFY_TIME;

const localDateParts = (date: Date, timeZone: string) => {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: resolveTimeZone(timeZone),
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	}).formatToParts(date);
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((item) => item.type === type)?.value ?? '00';

	return {
		year: Number(part('year')),
		month: Number(part('month')),
		day: Number(part('day')),
		hour: Number(part('hour')),
		minute: Number(part('minute'))
	};
};

const pad2 = (value: number) => String(value).padStart(2, '0');

export const getLocalDateString = (date: Date, timeZone: string): string => {
	const parts = localDateParts(date, timeZone);
	return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
};

export const hasLocalTimeReached = (date: Date, timeZone: string, notifyTime: string): boolean => {
	const parts = localDateParts(date, timeZone);
	const [targetHour, targetMinute] = resolveNotifyTime(notifyTime).split(':').map(Number);
	return parts.hour > targetHour || (parts.hour === targetHour && parts.minute >= targetMinute);
};

export const normalizeDateString = (value: string | Date | null | undefined): string => {
	if (!value) return '';
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	const trimmed = value.trim();
	const direct = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
	if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`;
	const parsed = new Date(trimmed);
	return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : trimmed;
};

const dateToUtcMs = (value: string) => {
	const [year, month, day] = normalizeDateString(value).split('-').map(Number);
	if (!year || !month || !day) return NaN;
	return Date.UTC(year, month - 1, day);
};

export const diffCalendarDays = (left: string, right: string): number => {
	const leftMs = dateToUtcMs(left);
	const rightMs = dateToUtcMs(right);
	if (!Number.isFinite(leftMs) || !Number.isFinite(rightMs)) return 0;
	return Math.round((leftMs - rightMs) / 86_400_000);
};

const daysInMonth = (year: number, month: number) =>
	new Date(Date.UTC(year, month, 0)).getUTCDate();

export const addCalendarMonths = (value: string, monthsToAdd: number): string => {
	const [year, month, day] = normalizeDateString(value).split('-').map(Number);
	if (!year || !month || !day) return value;
	const zeroBasedMonth = month - 1 + monthsToAdd;
	const targetYear = year + Math.floor(zeroBasedMonth / 12);
	const targetMonthIndex = ((zeroBasedMonth % 12) + 12) % 12;
	const targetMonth = targetMonthIndex + 1;
	const targetDay = Math.min(day, daysInMonth(targetYear, targetMonth));
	return `${targetYear}-${pad2(targetMonth)}-${pad2(targetDay)}`;
};
