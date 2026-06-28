# E2E テスト

このディレクトリは Playwright の E2E テスト基盤です。Phase 1 では公開ページの smoke と locale routing を高速に確認するため、`vite dev` を `webServer` として起動します。

## コマンド

```bash
pnpm run test:e2e
pnpm run test:e2e:list
pnpm run test:e2e:headed
pnpm run test:e2e:ui
pnpm run test:e2e:debug
```

特定ファイルだけ実行する場合:

```bash
pnpm exec playwright test e2e/public/home.test.ts --project=chromium
```

## 構成

- `public/`: 認証不要の公開ページ向け spec。
- `pages/`: Page Object。spec から低レベルな locator 操作を分離する。

## 方針

- 公開ページは `getByRole` などの accessible locator を優先する。
- `waitForTimeout` は使わず、`expect(locator)` の自動待機に寄せる。
- 認証付きフロー、DB isolation、Cloudflare Workers runtime の本番相当確認は Phase 2 で追加する。
- Phase 2 では `wrangler dev` project、test user/session helper、DB seed/isolation を別途設計する。
