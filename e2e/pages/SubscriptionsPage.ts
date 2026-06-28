import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

type AddSubscriptionInput = {
	serviceName: string;
	amount: number;
	firstPaymentDate: string;
};

export class SubscriptionsPage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	async gotoSubscriptions() {
		await this.goto('/subscriptions');
	}

	async expectLoaded() {
		await expect(this.heading(/^(サブスク管理|Subscriptions)$/)).toBeVisible();
	}

	async addSubscription(input: AddSubscriptionInput) {
		const addButton = this.page.getByRole('button', {
			name: /^(サブスクを追加|Add subscription)$/
		});
		const addDialogHeading = this.page.getByRole('heading', {
			name: /^(サブスクを追加|Add subscription)$/
		});

		await expect(async () => {
			await addButton.click();
			await expect(addDialogHeading).toBeVisible({ timeout: 1_000 });
		}).toPass();

		await this.page.getByLabel(/^(サービス名|Service name)$/).fill(input.serviceName);
		await this.page.getByLabel(/^(支払い周期|Billing cycle)$/).selectOption('monthly');
		await this.page.getByLabel(/^(何日前に通知しますか？|When should we remind you\?)$/).selectOption('3');
		await this.page.getByLabel(/^(月額料金|Monthly price)$/).fill(String(input.amount));
		await this.page.getByLabel(/^(初回支払日|First payment date)$/).fill(input.firstPaymentDate);
		await this.page.getByRole('button', { name: /^(保存する|Save)$/ }).click();
	}

	async expectSubscriptionVisible(serviceName: string) {
		await expect(this.page.getByText(serviceName, { exact: true })).toBeVisible();
	}
}
