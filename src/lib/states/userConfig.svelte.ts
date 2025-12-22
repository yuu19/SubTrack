import { THEMES } from '$lib/constant';
import { Context } from 'runed';
import { z } from 'zod/v4';

const activeTheme = z.enum(THEMES).default('default');

export type ActiveTheme = z.infer<typeof activeTheme>;

export const userConfigSchema = z
	.object({
		activeTheme: activeTheme
	})
	.default({
		activeTheme: 'default'
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
		if (typeof window !== 'undefined' && config.activeTheme) {
			void fetch('/api/user-config', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({ activeTheme: this.#config.activeTheme })
			});
		}
	}
}

export const UserConfigContext = new Context<UserConfig>('UserConfigContext');
