import { z } from 'zod';
import { defaultSubscriptionColor, subscriptionColors } from '$lib/subscription-colors';

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

export const subscriptionSchema = z.object({
	select: z
		.string({ error: 'Please select an option.' })
		.min(1, { error: 'Please select an option.' }),
	number: z
		.number({ error: 'Please enter a valid number.' })
		.int({ error: 'Please enter a whole number.' })
		.min(0, { error: 'Value must be at least 0.' })
		.max(1000000, { error: 'Value must not exceed 1000000.' }),
	datepicker: z
		.string({ error: 'Please select a date.' })
		.refine((v) => v, { error: 'Please select a date.' }),
	text: z
		.string({ error: 'Please enter the service name.' })
		.min(1, { error: 'Please enter the service name.' }),
	color: z.enum(subscriptionColors).default(defaultSubscriptionColor),
	tagsinput: z.string().array().default([]),
	notifyDaysBefore: z
		.number({ error: 'Please select notify days.' })
		.int()
		.min(0)
		.max(365)
		.default(1)
});
