# E2E テスト

このディレクトリは Playwright の E2E テスト基盤です。公開ページの smoke と locale routing に加え、認証付きのサブスク登録ハッピーパスを `vite dev` + E2E 専用 SQLite で確認します。

## コマンド

```bash
pnpm run test:e2e
pnpm run test:e2e:list
pnpm run test:e2e:public
pnpm run test:e2e:auth
pnpm run test:e2e:headed
pnpm run test:e2e:ui
pnpm run test:e2e:debug
```

特定ファイルだけ実行する場合:

```bash
pnpm exec playwright test e2e/public/home.test.ts --project=public
```

## 構成

- `public/`: 認証不要の公開ページ向け spec。
- `auth/`: 認証が必要な主要導線向け spec。
- `pages/`: Page Object。spec から低レベルな locator 操作を分離する。
- `auth.setup.ts`: Better Auth の email/password API でテストユーザーを作成し、`storageState` を保存する。
- `global-setup.ts`: `E2E_DB_PATH` の SQLite を毎回作り直し、Drizzle schema を反映する。

## 認証付き E2E

`auth` project は `E2E_DB_PATH=.tmp/e2e/subtrack-e2e.sqlite` を使います。`global-setup.ts` が `drizzle-kit push --force` で schema を反映し、`auth.setup.ts` が `/api/auth/sign-up/email` を通してテストユーザーとセッションを作成し、`e2e/.auth/user.json` を保存します。

E2E 中は `E2E_AUTH_DISABLE_STRIPE=true` を設定し、Better Auth の Stripe plugin によるサインアップ時の Stripe 顧客作成を止めます。

## 方針

- 公開ページは `getByRole` などの accessible locator を優先する。
- 認証付きフローも Page Object に寄せ、実UIのラベルや role を優先する。
- `waitForTimeout` は使わず、`expect(locator)` の自動待機に寄せる。
- Cloudflare Workers runtime の本番相当確認は後続 Phase で `wrangler dev` project として追加する。
