import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	async gotoHome() {
		await this.goto('/');
	}

	async expectLoaded() {
		await expect(this.heading()).toBeVisible();
	}
}
