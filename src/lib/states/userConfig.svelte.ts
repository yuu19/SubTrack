import {
	APP_LOCALES,
	DEFAULT_LOCALE,
	NOTIFICATION_METHODS,
	THEMES,
	type AppLocale
} from '$lib/constant';
import { Context } from 'runed';
import { z } from 'zod/v4';

const locale = z.enum(APP_LOCALES).default(DEFAULT_LOCALE);
const activeTheme = z.enum(THEMES).default('rose');
const defaultNotifyDaysBefore = z.number().int().min(0).max(365).default(3);
const notificationMethod = z.enum(NOTIFICATION_METHODS).default('email');

export type ActiveTheme = z.infer<typeof activeTheme>;

export const userConfigSchema = z
	.object({
		locale: locale,
		activeTheme: activeTheme,
		defaultNotifyDaysBefore: defaultNotifyDaysBefore,
		notificationMethod: notificationMethod
	})
	.default({
		locale: DEFAULT_LOCALE,
		activeTheme: 'rose',
		defaultNotifyDaysBefore: 3,
		notificationMethod: 'email'
	});

export type UserConfigType = z.infer<typeof userConfigSchema>;

/**
 * サーバ側をたたく処理が入っているので、この部分はService層を作ったほうがいいかも
 */
export class UserConfig {
	#config: UserConfigType;

	constructor(config: UserConfigType) {
		this.#config = $state.raw(config);
	}

	get current(): UserConfigType {
		return this.#config;
	}

	async #persistConfig(): Promise<boolean> {
		if (typeof window === 'undefined') return true;

		try {
			const response = await fetch('/api/user-config', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					locale: this.#config.locale,
					activeTheme: this.#config.activeTheme,
					defaultNotifyDaysBefore: this.#config.defaultNotifyDaysBefore,
					notificationMethod: this.#config.notificationMethod
				})
			});

			return response.ok;
		} catch {
			return false;
		}
	}

	setConfig(config: Partial<UserConfigType>): void {
		this.#config = { ...this.#config, ...config };
		void this.#persistConfig();
	}

	async updateConfig(config: Partial<UserConfigType>): Promise<boolean> {
		this.#config = { ...this.#config, ...config };
		return this.#persistConfig();
	}

	setLocale(locale: AppLocale): void {
		this.#config = { ...this.#config, locale };
	}
}

export const UserConfigContext = new Context<UserConfig>('UserConfigContext');
