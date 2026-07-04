export const SUBSCRIPTION_ICON_IMAGE_MAX_BYTES = 1024 * 1024;

const imageExtensions = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/webp': 'webp'
} as const;

export type SubscriptionIconImageContentType = keyof typeof imageExtensions;

export const subscriptionIconImageContentTypes = Object.keys(
	imageExtensions
) as SubscriptionIconImageContentType[];

export type SubscriptionIconImageValidationResult =
	| {
			ok: true;
			bytes: Uint8Array;
			contentType: SubscriptionIconImageContentType;
	  }
	| {
			ok: false;
			status: number;
			message: string;
	  };

export type SubscriptionIconImageValidationMessages = {
	imageRequired: string;
	imageEmpty: string;
	imageTooLarge: string;
	imageInvalidType: string;
	imageContentMismatch: string;
};

const defaultValidationMessages: SubscriptionIconImageValidationMessages = {
	imageRequired: 'Image file is required.',
	imageEmpty: 'Image file is empty.',
	imageTooLarge: 'Image file must be 1MB or smaller.',
	imageInvalidType: 'Image file must be PNG, JPEG, or WebP.',
	imageContentMismatch: 'Image file content does not match its type.'
};

export const createSubscriptionIconImageKey = (
	userId: string,
	subscriptionId: number,
	contentType: SubscriptionIconImageContentType
) => {
	const extension = imageExtensions[contentType];
	return `subscription-icons/${userId}/${subscriptionId}/${crypto.randomUUID()}.${extension}`;
};

export const isSubscriptionIconImageKey = (value: unknown): value is string =>
	typeof value === 'string' && value.startsWith('subscription-icons/');

export const isOwnedSubscriptionIconImageKey = (
	value: unknown,
	userId: string,
	subscriptionId: number
): value is string =>
	typeof value === 'string' && value.startsWith(`subscription-icons/${userId}/${subscriptionId}/`);

export const deleteSubscriptionIconImage = async (bucket: R2Bucket | undefined, key: unknown) => {
	if (!bucket || !isSubscriptionIconImageKey(key)) return;
	try {
		await bucket.delete(key);
	} catch (error) {
		console.error('Failed to delete subscription icon image', error);
	}
};

const hasPngSignature = (bytes: Uint8Array) =>
	bytes.length >= 8 &&
	bytes[0] === 0x89 &&
	bytes[1] === 0x50 &&
	bytes[2] === 0x4e &&
	bytes[3] === 0x47 &&
	bytes[4] === 0x0d &&
	bytes[5] === 0x0a &&
	bytes[6] === 0x1a &&
	bytes[7] === 0x0a;

const hasJpegSignature = (bytes: Uint8Array) =>
	bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

const hasWebpSignature = (bytes: Uint8Array) =>
	bytes.length >= 12 &&
	bytes[0] === 0x52 &&
	bytes[1] === 0x49 &&
	bytes[2] === 0x46 &&
	bytes[3] === 0x46 &&
	bytes[8] === 0x57 &&
	bytes[9] === 0x45 &&
	bytes[10] === 0x42 &&
	bytes[11] === 0x50;

const matchesContentType = (bytes: Uint8Array, contentType: SubscriptionIconImageContentType) => {
	if (contentType === 'image/png') return hasPngSignature(bytes);
	if (contentType === 'image/jpeg') return hasJpegSignature(bytes);
	return hasWebpSignature(bytes);
};

export const validateSubscriptionIconImageFile = async (
	value: FormDataEntryValue | null,
	messages: SubscriptionIconImageValidationMessages = defaultValidationMessages
): Promise<SubscriptionIconImageValidationResult> => {
	if (!(value instanceof File)) {
		return { ok: false, status: 400, message: messages.imageRequired };
	}
	if (value.size <= 0) {
		return { ok: false, status: 400, message: messages.imageEmpty };
	}
	if (value.size > SUBSCRIPTION_ICON_IMAGE_MAX_BYTES) {
		return { ok: false, status: 413, message: messages.imageTooLarge };
	}
	if (!subscriptionIconImageContentTypes.includes(value.type as SubscriptionIconImageContentType)) {
		return {
			ok: false,
			status: 415,
			message: messages.imageInvalidType
		};
	}

	const contentType = value.type as SubscriptionIconImageContentType;
	const bytes = new Uint8Array(await value.arrayBuffer());
	if (!matchesContentType(bytes, contentType)) {
		return {
			ok: false,
			status: 415,
			message: messages.imageContentMismatch
		};
	}

	return { ok: true, bytes, contentType };
};
