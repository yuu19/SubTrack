import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './+server';

afterEach(() => vi.unstubAllEnvs());

describe('deployment health', () => {
	it('reports the deployed commit only after checking the database', async () => {
		vi.stubEnv('DEPLOYMENT_SHA', 'commit-under-test');
		const get = vi.fn().mockResolvedValue({ 1: 1 });
		const response = await GET({ locals: { db: { get } } } as unknown as Parameters<typeof GET>[0]);
		expect(get).toHaveBeenCalledOnce();
		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(await response.json()).toEqual({ status: 'ok', commit: 'commit-under-test' });
	});

	it('returns 503 without database error details', async () => {
		const get = vi.fn().mockRejectedValue(new Error('private database error'));
		const response = await GET({ locals: { db: { get } } } as unknown as Parameters<typeof GET>[0]);
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({ status: 'unavailable' });
	});
});
