import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class FaqPage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	async gotoJapanese() {
		await this.goto('/ja/faq');
	}

	async switchToEnglish() {
		const languageButton = this.languageButton();
		const englishOption = this.page.getByRole('menuitemradio', { name: 'en' });

		await expect(async () => {
			await languageButton.click();
			await languageButton.press('ArrowDown');
			await expect(englishOption).toBeVisible({ timeout: 1_000 });
		}).toPass();
		await englishOption.click();
	}

	async expectJapaneseLoaded() {
		await expect(this.heading('よくある質問')).toBeVisible();
	}

	async expectEnglishLoaded() {
		await this.expectPath(/\/en\/faq$/);
		await expect(this.heading('Frequently asked questions')).toBeVisible();
		await expect(this.languageButton()).toContainText('en');
	}
}
