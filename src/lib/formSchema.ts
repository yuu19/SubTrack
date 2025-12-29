import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const registerSchema = z
	.object({
		email: z.email(),
		name: z.string().min(3).max(20),
		password: z.string().min(8).max(100),
		confirmPassword: z.string().min(8).max(100)
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword']
	});
export type RegisterSchema = typeof registerSchema;

export const loginSchema = z.object({
	email: z.email(),
	password: z.string().min(8).max(100)
});

export type LoginSchema = typeof loginSchema;

export const updateEmailSchema = z.object({
	email: z.email()
});
export const requestPasswordResetSchema = z.object({
	email: z.email()
});

const isValidPhoneNumber = (phone: string): boolean => {
	const regex = /^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/;
	return regex.test(phone);
};

export const resetPasswordSchema = z
	.object({
		password: z.string().min(8),
		confirmPassword: z.string().min(8)
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword']
	});
export const updatePasswordSchema = z
	.object({
		currentPassword: z.string().min(8),
		newPassword: z.string().min(8),
		confirmNewPassword: z.string().min(8)
	})
	.refine((data) => data.newPassword === data.confirmNewPassword, {
		message: 'Passwords do not match',
		path: ['confirmNewPassword']
	});
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
		.min(1, { error: 'Value must be at least 1.' })
		.max(100000, { error: 'Value must not exceed 100000.' }),
	datepicker: z
		.string({ error: 'Please select a date.' })
		.refine((v) => v, { error: 'Please select a date.' }),
	text: z
		.string({ error: 'Please enter the service name.' })
		.min(1, { error: 'Please enter the service name.' }),
	tagsinput: z.string().array().min(1, { error: 'Please add at least one tag.' }),
	notifyDaysBefore: z
		.number({ error: 'Please select notify days.' })
		.int()
		.min(0)
		.max(365)
		.default(1)
});
