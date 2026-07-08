# E2E テスト

このディレクトリは Playwright の E2E テスト基盤です。公開ページの smoke と locale routing に加え、認証付きのサブスク登録ハッピーパスを `vite dev` + E2E 専用 SQLite で確認します。

## コマンド

```bash
pnpm run test:e2e
pnpm run test:e2e:list
pnpm run test:e2e:public
pnpm run test:e2e:auth
pnpm run test:e2e:auth-locale
pnpm run test:e2e:billing
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
- `auth-locale/`: 初期 locale を指定した認証状態の spec。
- `pages/`: Page Object。spec から低レベルな locator 操作を分離する。
- `auth.setup.ts`: Better Auth の email/password API でテストユーザーを作成し、`storageState` を保存する。
- `auth-locale.setup.ts`: `subtrack_locale=en` を付けてテストユーザーを作成し、英語初期 locale の `storageState` を保存する。
- `global-setup.ts`: `E2E_DB_PATH` の SQLite を毎回作り直し、Drizzle schema を反映する。

## 認証付き E2E

`auth` project は `E2E_DB_PATH=.tmp/e2e/subtrack-e2e.sqlite` を使います。`global-setup.ts` が `drizzle-kit push --force` で schema を反映し、`auth.setup.ts` が `/api/auth/sign-up/email` を通してテストユーザーとセッションを作成し、`e2e/.auth/user.json` を保存します。

`auth-locale` project は既存の auth 状態とは分けて、`subtrack_locale=en` 付きの新規ユーザーを `e2e/.auth/user-en.json` に保存します。locale-less な保護ルートでも保存済みの英語 locale に従って `/en/...` へ進むことを確認します。

E2E 中は `E2E_AUTH_DISABLE_STRIPE=true` を設定し、Better Auth の Stripe plugin によるサインアップ時の Stripe 顧客作成を止めます。

## 課金 E2E

`pnpm run test:e2e:billing` は Stripe Test Clock を使う月額 Premium 専用の E2E です。通常の `pnpm run test:e2e` には含めません。

- `playwright.billing.config.ts` を使い、E2E DB は `.tmp/e2e/subtrack-billing-e2e.sqlite` に分けます。
- `SECRET_STRIPE_KEY` が `sk_test_` で始まるテストキーでない場合、billing spec は skip します。
- `.env` または `.env.dev` に `SECRET_STRIPE_KEY` / `STRIPE_WEBHOOK_SECRET` がある場合は、billing E2E 起動時に読み込みます。
- E2E 中だけ `E2E_BILLING_TEST_HELPERS=true` になり、`/api/e2e/billing/sync` で Stripe subscription の状態をDBへ反映します。このAPIは通常実行では 404 です。
- Test Clock の時刻で Premium の有効期限判定を確認するため、E2E helper 経由の同期時だけサーバー側の課金判定時刻を Test Clock に合わせます。

初期シナリオは、月額 Premium の `trialing -> active -> cancel_at_period_end -> canceled/Free戻り`、買い切り Premium の `checkout.session.completed -> Premium Lifetime反映`、CSVエクスポート権限の開閉を確認します。あわせて Better Auth Stripe webhook の署名付きpayload受理と不正署名拒否を確認します。

## 方針

- 公開ページは `getByRole` などの accessible locator を優先する。
- 認証付きフローも Page Object に寄せ、実UIのラベルや role を優先する。
- `waitForTimeout` は使わず、`expect(locator)` の自動待機に寄せる。
- Cloudflare Workers runtime の本番相当確認は後続 Phase で `wrangler dev` project として追加する。
