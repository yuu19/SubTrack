import type { RequestHandler } from '@sveltejs/kit';
import { findServiceTemplate } from '$lib/service-templates';

const cacheControl = 'public, max-age=31536000, immutable';

const getTemplateIconObject = async (bucket: R2Bucket | undefined, id: string | undefined) => {
	if (!bucket || !id) return null;
	const template = findServiceTemplate(id);
	if (!template) return null;
	return bucket.get(`template-icons/${template.id}.png`);
};

const buildResponse = (object: R2ObjectBody) => {
	const headers = new Headers({
		'Content-Type': object.httpMetadata?.contentType ?? 'image/png',
		'Cache-Control': object.httpMetadata?.cacheControl ?? cacheControl
	});
	if (object.httpEtag) {
		headers.set('ETag', object.httpEtag);
	}

	return new Response(object.body, { headers });
};

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.bucket) {
		return new Response('Storage is not available', { status: 500 });
	}

	const object = await getTemplateIconObject(locals.bucket, params.id);
	if (!object) {
		return new Response('Not found', { status: 404 });
	}

	return buildResponse(object);
};

export const HEAD: RequestHandler = async ({ locals, params }) => {
	if (!locals.bucket) {
		return new Response(null, { status: 500 });
	}

	const object = await getTemplateIconObject(locals.bucket, params.id);
	if (!object) {
		return new Response(null, { status: 404 });
	}

	const headers = new Headers({
		'Content-Type': object.httpMetadata?.contentType ?? 'image/png',
		'Cache-Control': object.httpMetadata?.cacheControl ?? cacheControl
	});
	if (object.httpEtag) {
		headers.set('ETag', object.httpEtag);
	}

	return new Response(null, { headers });
};
