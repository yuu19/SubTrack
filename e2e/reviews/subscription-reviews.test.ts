import { test, expect } from './fixtures';

const reviewRoute = (url: URL) =>
	url.pathname.endsWith('/subscriptions') && url.search === '?/review';

const readDecision = (db: import('better-sqlite3').Database, id: number) =>
	db.prepare('SELECT decision FROM subscription_review WHERE subscription_id = ?').get(id) as
		| { decision: 'keep' | 'review' | null }
		| undefined;

test('[P1] seven-day unreviewed list includes today and day 7, then guides to day 30', async ({
	page,
	appLocale,
	seedSubscription,
	db
}) => {
	const today = seedSubscription({ name: 'Due today', days: 0 });
	const day7 = seedSubscription({ name: 'Due on day seven', days: 7 });
	const day8 = seedSubscription({ name: 'Due on day eight', days: 8 });
	const day30 = seedSubscription({ name: 'Due on day thirty', days: 30 });
	const day31 = seedSubscription({ name: 'Due after thirty days', days: 31 });
	const canceled = seedSubscription({ name: 'Canceled service', status: 'canceled' });
	await page.goto(`/${appLocale}/subscriptions`);
	const list = page.getByTestId('subscription-review-list');
	await expect(list.getByTestId(`review-open-${today}`)).toBeVisible();
	await expect(list.getByTestId(`review-open-${day7}`)).toBeVisible();
	await expect(list.getByTestId(`review-open-${day8}`)).toHaveCount(0);
	await expect(list.getByTestId(`review-open-${canceled}`)).toHaveCount(0);

	for (const id of [today, day7]) {
		await list.getByTestId(`review-open-${id}`).click();
		await page.getByTestId('review-save-keep').click();
		await expect.poll(() => readDecision(db, id)?.decision).toBe('keep');
		await expect(page.getByTestId('review-undo')).toBeEnabled();
		await page.keyboard.press('Escape');
		await expect(page.getByTestId('subscription-review-controls')).toHaveCount(0);
	}
	await expect(list.getByTestId(`review-open-${today}`)).toHaveCount(0);
	await expect(list.getByTestId(`review-open-${day7}`)).toHaveCount(0);
	await list.getByTestId('review-show-30').click();
	await expect(list.getByTestId(`review-open-${day8}`)).toBeVisible();
	await expect(list.getByTestId(`review-open-${day30}`)).toBeVisible();
	await expect(list.getByTestId(`review-open-${day31}`)).toHaveCount(0);
});

test('[P0] notification deep link supports keep, change and undo with reload persistence', async ({
	page,
	appLocale,
	seedSubscription,
	db
}) => {
	const id = seedSubscription({ name: 'Decision persistence' });
	await page.goto(`/${appLocale}/subscriptions?subscription=${id}`);
	const controls = page.getByTestId('subscription-review-controls');
	await expect(controls).toBeVisible();
	await expect(page.getByTestId('review-save-keep')).toHaveText(
		appLocale === 'en' ? 'Keep' : '継続する'
	);
	await page.getByTestId('review-save-keep').click();
	await expect.poll(() => readDecision(db, id)?.decision).toBe('keep');
	await expect(page.getByTestId('review-undo')).toBeEnabled();
	await page.reload();
	await expect(page.getByTestId('review-save-keep')).toHaveAttribute('aria-pressed', 'true');

	await page.getByTestId('review-save-review').click();
	await expect.poll(() => readDecision(db, id)?.decision).toBe('review');
	await page.getByTestId('review-cancellation-details').click();
	await expect(page.getByText('Cancel on the provider website.', { exact: true })).toBeVisible();
	await expect(page.locator('a[href="https://example.test/cancel"]')).toHaveAttribute(
		'rel',
		/noopener/
	);
	await page.reload();
	await expect(page.getByTestId('review-save-review')).toHaveAttribute('aria-pressed', 'true');
	await page.getByTestId('review-undo').click();
	await expect.poll(() => readDecision(db, id)?.decision).toBeNull();
	await page.reload();
	await expect(page.getByTestId('review-save-keep')).toHaveAttribute('aria-pressed', 'false');
	await expect(page.getByTestId('review-save-review')).toHaveAttribute('aria-pressed', 'false');
	await expect(page.getByTestId('review-undo')).toHaveCount(0);
	expect(
		db.prepare('SELECT status, last_notified_date FROM tracked_subscription WHERE id = ?').get(id)
	).toMatchObject({ status: 'active', last_notified_date: null });
});

test('[P0] in-flight operation disables repeated decisions and cannot affect another detail', async ({
	page,
	appLocale,
	seedSubscription,
	db
}) => {
	const id = seedSubscription({ name: 'Repeated clicks' });
	const otherId = seedSubscription({ name: 'Another detail' });
	await page.goto(`/${appLocale}/subscriptions?subscription=${id}`);
	let releaseRequest!: () => void;
	const gate = new Promise<void>((resolve) => {
		releaseRequest = resolve;
	});
	let posts = 0;
	await page.route(reviewRoute, async (route) => {
		posts += 1;
		await gate;
		await route.continue();
	});
	await page.getByTestId('review-save-keep').click();
	await expect.poll(() => posts).toBe(1);
	await expect(page.getByTestId('review-save-keep')).toBeDisabled();
	await expect(page.getByTestId('review-save-review')).toBeDisabled();
	await page
		.getByTestId('review-save-review')
		.evaluate((button: HTMLButtonElement) => button.click());
	expect(posts).toBe(1);
	await page.keyboard.press('Escape');
	await page.getByTestId(`review-open-${otherId}`).click();
	await expect(page.getByTestId('review-save-keep')).toBeDisabled();
	releaseRequest();
	await expect.poll(() => readDecision(db, id)?.decision).toBe('keep');
	await expect(page.getByTestId('review-save-keep')).toBeEnabled();
	await expect(page.getByTestId('review-save-keep')).toHaveAttribute('aria-pressed', 'false');
	await expect(page.getByTestId('review-undo')).toHaveCount(0);
	expect(readDecision(db, otherId)).toBeUndefined();
	expect(
		db
			.prepare('SELECT count(*) AS count FROM subscription_review WHERE subscription_id = ?')
			.get(id)
	).toEqual({ count: 1 });
});

test('[P1] failure is retryable, offline decisions are disabled and never queued', async ({
	page,
	context,
	appLocale,
	seedSubscription,
	db
}) => {
	const id = seedSubscription({ name: 'Interrupted request' });
	await page.goto(`/${appLocale}/subscriptions?subscription=${id}`);
	await page.route(reviewRoute, (route) => route.abort('failed'), { times: 1 });
	await page.getByTestId('review-save-keep').click();
	await expect(page.getByTestId('subscription-review-controls').getByRole('alert')).toBeVisible();
	expect(readDecision(db, id)).toBeUndefined();
	await expect(page.getByTestId('review-save-keep')).toBeEnabled();
	await page.getByTestId('review-save-review').click();
	await expect.poll(() => readDecision(db, id)?.decision).toBe('review');
	await expect(page.getByTestId('review-undo')).toBeEnabled();

	await context.setOffline(true);
	await expect(page.getByTestId('review-save-keep')).toBeDisabled();
	await expect(page.getByTestId('review-undo')).toBeDisabled();
	await expect(page.getByTestId('subscription-review-controls')).toContainText(
		appLocale === 'en' ? 'online-only' : 'オンライン'
	);
	await page
		.getByTestId('review-save-keep')
		.evaluate((button: HTMLButtonElement) => button.click());
	await context.setOffline(false);
	await expect(page.getByTestId('review-undo')).toBeEnabled();
	await page.reload();
	await expect(page.getByTestId('review-save-review')).toHaveAttribute('aria-pressed', 'true');
	expect(readDecision(db, id)?.decision).toBe('review');
});

test('[P0] a stale open detail cannot save after billing terms change; refresh allows retry', async ({
	page,
	appLocale,
	seedSubscription,
	db
}) => {
	const id = seedSubscription({ name: 'Changed billing terms' });
	await page.goto(`/${appLocale}/subscriptions?subscription=${id}`);
	await expect(page.getByTestId('review-save-keep')).toBeEnabled();
	db.prepare(
		'UPDATE tracked_subscription SET amount = 2400, review_revision = review_revision + 1 WHERE id = ?'
	).run(id);
	await page.getByTestId('review-save-keep').click();
	await expect(page.getByTestId('subscription-review-controls').getByRole('alert')).toBeVisible();
	expect(readDecision(db, id)).toBeUndefined();
	await page.getByTestId('review-refresh').click();
	await expect(page.getByTestId('subscription-review-controls').getByRole('alert')).toHaveCount(0);
	await page.getByTestId('review-save-keep').click();
	await expect.poll(() => readDecision(db, id)?.decision).toBe('keep');
});

test('[P1] localized review controls support keyboard use without mobile horizontal overflow', async ({
	page,
	appLocale,
	seedSubscription,
	db
}, testInfo) => {
	const id = seedSubscription({ name: 'Keyboard and mobile' });
	await page.goto(`/${appLocale}/subscriptions`);
	const row = page.getByTestId(`review-open-${id}`);
	await row.focus();
	await page.keyboard.press('Enter');
	const keep = page.getByRole('button', {
		name: appLocale === 'en' ? 'Keep' : '継続する',
		exact: true
	});
	await expect(keep).toBeVisible();
	await keep.focus();
	await page.keyboard.press('Space');
	await expect.poll(() => readDecision(db, id)?.decision).toBe('keep');
	await expect(page.getByTestId('review-undo')).toBeEnabled();
	const dimensions = await page.evaluate(() => ({
		width: document.documentElement.clientWidth,
		scrollWidth: document.documentElement.scrollWidth
	}));
	expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 1);
	await page.screenshot({ path: testInfo.outputPath(`review-${appLocale}.png`), fullPage: true });
	await page.keyboard.press('Escape');
	await expect(page.getByTestId('subscription-review-controls')).toHaveCount(0);
});

test('[P1] empty 7-day and 30-day states do not offer decisions for canceled subscriptions', async ({
	page,
	appLocale,
	seedSubscription
}) => {
	const id = seedSubscription({ name: 'Already canceled', status: 'canceled' });
	await page.goto(`/${appLocale}/subscriptions`);
	const list = page.getByTestId('subscription-review-list');
	await expect(list.getByTestId(`review-open-${id}`)).toHaveCount(0);
	await expect(list).toContainText(
		appLocale === 'en'
			? 'No unreviewed payments in the next 7 days.'
			: '7日以内の請求について、未判断のサブスクはありません。'
	);
	await list.getByTestId('review-show-30').click();
	await expect(list).toContainText(
		appLocale === 'en'
			? 'No unreviewed payments in the next 30 days either.'
			: '30日以内の請求にも、未判断のサブスクはありません。'
	);
	await page.goto(`/${appLocale}/subscriptions?subscription=${id}`);
	await expect(page.getByRole('dialog')).toBeVisible();
	await expect(page.getByTestId('subscription-review-controls')).toHaveCount(0);
});
