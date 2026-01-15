import { NOTIFICATION_METHODS, THEMES } from '$lib/constant';
import { Context } from 'runed';
import { z } from 'zod/v4';

const activeTheme = z.enum(THEMES).default('rose');
const defaultNotifyDaysBefore = z.number().int().min(0).max(365).default(3);
const notificationMethod = z.enum(NOTIFICATION_METHODS).default('push');

export type ActiveTheme = z.infer<typeof activeTheme>;

export const userConfigSchema = z
	.object({
		activeTheme: activeTheme,
		defaultNotifyDaysBefore: defaultNotifyDaysBefore,
		notificationMethod: notificationMethod
	})
	.default({
		activeTheme: 'rose',
		defaultNotifyDaysBefore: 3,
		notificationMethod: 'push'
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

	setConfig(config: Partial<UserConfigType>): void {
		this.#config = { ...this.#config, ...config };
		if (typeof window !== 'undefined') {
			void fetch('/api/user-config', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					activeTheme: this.#config.activeTheme,
					defaultNotifyDaysBefore: this.#config.defaultNotifyDaysBefore,
					notificationMethod: this.#config.notificationMethod
				})
			});
		}
	}
}

export const UserConfigContext = new Context<UserConfig>('UserConfigContext');
