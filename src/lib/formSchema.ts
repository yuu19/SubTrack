import { z } from 'zod';
import {
	CANCELLATION_METHODS,
	DEFAULT_LOCALE,
	DEFAULT_SUBSCRIPTION_CURRENCY,
	SUPPORTED_CURRENCIES,
	type AppLocale
} from '$lib/constant';
import { subscriptionFormCopy } from '$lib/i18n-copy';
import { defaultSubscriptionColor, subscriptionColors } from '$lib/subscription-colors';
import {
	defaultSubscriptionIconType,
	defaultSubscriptionIconValue,
	subscriptionIconTypes
} from '$lib/subscription-icons';
import { findServiceTemplate } from '$lib/service-templates';

const isValidPhoneNumber = (phone: string): boolean => {
	const regex = /^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/;
	return regex.test(phone);
};

export const updateNumberSchema = z.object({
	number: z.string().refine(isValidPhoneNumber, {
		message: 'Please enter a valid phone number'
	})
});

export const updateNameSchema = z.object({
	name: z.string().min(3)
});

const optionalText = (maxLength: number) => z.string().trim().max(maxLength).default('');

const optionalId = z
	.preprocess((value) => {
		if (value === '' || value === null || value === undefined) return null;
		const parsed = Number(value);
		return Number.isInteger(parsed) && parsed > 0 ? parsed : value;
	}, z.number().int().positive().nullable())
	.default(null);

const booleanFromForm = z
	.preprocess((value) => {
		if (value === true || value === 'true' || value === '1' || value === 'on') return true;
		if (
			value === false ||
			value === 'false' ||
			value === '0' ||
			value === '' ||
			value === null ||
			value === undefined
		) {
			return false;
		}
		return value;
	}, z.boolean())
	.default(false);

const isHttpsUrl = (value: string): boolean => {
	if (value === '') return true;
	try {
		return new URL(value).protocol === 'https:';
	} catch {
		return false;
	}
};

const hasAtMostTwoDecimalPlaces = (value: number): boolean =>
	Math.abs(Math.round(value * 100) - value * 100) < 1e-8;

export const createSubscriptionSchema = (locale: AppLocale = DEFAULT_LOCALE) => {
	const errors = subscriptionFormCopy[locale].errors;

	return z
		.object({
			select: z.string({ error: errors.selectRequired }).min(1, { error: errors.selectRequired }),
			number: z
				.number({ error: errors.numberRequired })
				.min(0, { error: errors.numberMin })
				.max(1000000, { error: errors.numberMax })
				.refine(hasAtMostTwoDecimalPlaces, {
					error: errors.numberDecimals
				}),
			currency: z.enum(SUPPORTED_CURRENCIES).default(DEFAULT_SUBSCRIPTION_CURRENCY),
			datepicker: z
				.string({ error: errors.dateRequired })
				.refine((v) => v, { error: errors.dateRequired }),
			text: z
				.string({ error: errors.serviceNameRequired })
				.min(1, { error: errors.serviceNameRequired }),
			serviceTemplateId: optionalText(100),
			planName: optionalText(120),
			serviceUrl: optionalText(2048).refine(isHttpsUrl, {
				message: errors.httpsUrl
			}),
			categoryId: optionalId,
			paymentMethodId: optionalId,
			priceEditedByUser: booleanFromForm,
			color: z.enum(subscriptionColors).default(defaultSubscriptionColor),
			iconType: z.enum(subscriptionIconTypes).default(defaultSubscriptionIconType),
			iconValue: z
				.string({ error: errors.iconRequired })
				.trim()
				.min(1, { error: errors.iconRequired })
				.max(2048, { error: errors.iconMax })
				.default(defaultSubscriptionIconValue),
			tagsinput: z.string().array().default([]),
			notifyDaysBefore: z
				.number({ error: errors.notifyDaysRequired })
				.int()
				.min(0)
				.max(365)
				.default(1),
			cancellationUrl: optionalText(2048).refine(isHttpsUrl, {
				message: errors.httpsUrl
			}),
			cancellationMethod: z.enum(CANCELLATION_METHODS).or(z.literal('')).default(''),
			cancellationMemo: optionalText(1000),
			cancellationDeadlineMemo: optionalText(500)
		})
		.superRefine((value, ctx) => {
			if (value.iconType !== 'templateImage') return;
			if (findServiceTemplate(value.iconValue)) return;

			ctx.addIssue({
				code: 'custom',
				path: ['iconValue'],
				message: errors.validServiceIcon
			});
		});
};

export const subscriptionSchema = createSubscriptionSchema(DEFAULT_LOCALE);
