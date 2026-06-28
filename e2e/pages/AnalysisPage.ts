import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class AnalysisPage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	async gotoAnalysis() {
		await this.goto('/analysis');
	}

	async expectLoaded() {
		await expect(this.heading(/^(分析|Analytics)$/)).toBeVisible();
	}

	async expectSubscriptionVisible(serviceName: string) {
		await expect(this.page.getByText(serviceName, { exact: true }).first()).toBeVisible();
	}
}
