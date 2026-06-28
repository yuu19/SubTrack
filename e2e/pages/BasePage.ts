import { expect, type Locator, type Page } from '@playwright/test';

export class BasePage {
	constructor(protected readonly page: Page) {}

	async goto(path: string) {
		await this.page.goto(path);
	}

	heading(name?: string | RegExp): Locator {
		return name
			? this.page.getByRole('heading', { level: 1, name })
			: this.page.getByRole('heading', { level: 1 });
	}

	languageButton(): Locator {
		return this.page.getByRole('button', { name: /^(言語|Language)$/ });
	}

	async expectPath(pattern: RegExp) {
		await expect(this.page).toHaveURL(pattern);
	}
}
