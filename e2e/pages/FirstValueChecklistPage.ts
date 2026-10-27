import { expect, type Page } from '@playwright/test';
import { SubscriptionsPage } from './SubscriptionsPage';

export class FirstValueChecklistPage extends SubscriptionsPage {
	constructor(page: Page) {
		super(page);
	}

	guide() {
		return this.page.getByRole('region', {
			name: /^(自分のサブスクで始めよう|Get started with your subscriptions)$/
		});
	}

	async expectProgress(count: number) {
		await expect(
			this.guide().getByText(
				new RegExp(`^(${count} / 4 ステップ確認済み|${count} of 4 steps checked)$`)
			)
		).toBeVisible({ timeout: 30_000 });
	}

	async hideAndResume() {
		await this.guide()
			.getByRole('button', { name: /^(あとで続ける|Continue later)$/ })
			.click();
		await expect(this.guide().getByRole('list')).toBeHidden();
		await this.page.reload();
		await this.guide()
			.getByRole('button', { name: /^(ガイドを再開|Resume guide)$/ })
			.click();
		await expect(this.guide().getByRole('list')).toBeVisible({ timeout: 30_000 });
	}
}
