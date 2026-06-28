import { z } from 'zod';
import {
	CANCELLATION_METHODS,
	DEFAULT_SUBSCRIPTION_CURRENCY,
	SUPPORTED_CURRENCIES
} from '$lib/constant';
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

export const subscriptionSchema = z
	.object({
		select: z
			.string({ error: 'Please select an option.' })
			.min(1, { error: 'Please select an option.' }),
		number: z
			.number({ error: 'Please enter a valid number.' })
			.min(0, { error: 'Value must be at least 0.' })
			.max(1000000, { error: 'Value must not exceed 1000000.' })
			.refine(hasAtMostTwoDecimalPlaces, {
				error: 'Please enter up to two decimal places.'
			}),
		currency: z.enum(SUPPORTED_CURRENCIES).default(DEFAULT_SUBSCRIPTION_CURRENCY),
		datepicker: z
			.string({ error: 'Please select a date.' })
			.refine((v) => v, { error: 'Please select a date.' }),
		text: z
			.string({ error: 'Please enter the service name.' })
			.min(1, { error: 'Please enter the service name.' }),
		serviceTemplateId: optionalText(100),
		planName: optionalText(120),
		serviceUrl: optionalText(2048).refine(isHttpsUrl, {
			message: 'Please enter a URL that starts with https://.'
		}),
		priceEditedByUser: booleanFromForm,
		color: z.enum(subscriptionColors).default(defaultSubscriptionColor),
		iconType: z.enum(subscriptionIconTypes).default(defaultSubscriptionIconType),
		iconValue: z
			.string({ error: 'Please select an icon.' })
			.trim()
			.min(1, { error: 'Please select an icon.' })
			.max(2048, { error: 'Icon value must be 2048 characters or fewer.' })
			.default(defaultSubscriptionIconValue),
		tagsinput: z.string().array().default([]),
		notifyDaysBefore: z
			.number({ error: 'Please select notify days.' })
			.int()
			.min(0)
			.max(365)
			.default(1),
		cancellationUrl: optionalText(2048).refine(isHttpsUrl, {
			message: 'Please enter a URL that starts with https://.'
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
			message: 'Please select a valid service icon.'
		});
	});
