import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class CalendarPage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	async gotoCalendar() {
		await this.goto('/calendar');
	}

	async expectSubscriptionPaymentVisible(serviceName: string) {
		await expect(
			this.page.getByRole('button', {
				name: new RegExp(`^(支払い予定|Payment): ${serviceName}$`)
			})
		).toBeVisible();
	}
}
