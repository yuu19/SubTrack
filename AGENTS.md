# AGENTS.md

## プロジェクト概要

このリポジトリは、SvelteKit + Cloudflare Workers を基盤にしたサブスクリプション管理アプリです。主な目的は、ユーザーが契約中のサブスクを記録・可視化し、次回請求日の把握、通知、分析、エクスポート、管理者向け運用を行えるようにすることです。

技術的には以下を中心に構成されています。

- フロントエンド: Svelte 5 / SvelteKit
- 実行基盤: Cloudflare Workers / Wrangler
- DB: D1 相当の SQLite 運用 + Drizzle ORM
- 認証: Better Auth
- 決済: Stripe
- 通知: Web Push
- テスト: Vitest / Playwright

## 主要ディレクトリ構成

### アプリ本体

- `src/`
  アプリ本体。画面、API、サーバーロジック、状態管理、共通 UI を含む中心ディレクトリ。

- `src/routes/`
  SvelteKit のルーティング。
  主な責務:
  - `(storeFront)`: 一般ユーザー向け画面
  - `subscriptions`: サブスク一覧、登録、更新、削除、通知設定
  - `analysis`: サブスク分析表示
  - `calendar`: 請求日や予定の確認 UI
  - `me`: ユーザー設定
  - `admin`: 管理画面
  - `api`: サーバー API エンドポイント

- `src/lib/`
  アプリ共通のライブラリ群。
  主な責務:
  - `components/`: 再利用 UI コンポーネント
  - `server/`: サーバー専用ロジック
  - `server/db/`: DB スキーマや永続化関連
  - `offline/`: オフライン同期やローカル保存
  - `states/`: クライアント状態管理
  - `client/`: ブラウザ側ユーティリティ
  - `content/`: 文言やサイト情報
  - `paraglide/`: 多言語化関連の生成物

- `src/types/`
  型定義の補助。

- `static/`
  静的配信ファイル。画像や PWA 関連アセットを格納。

- `messages/`
  i18n 文言ソース。

### テスト・運用

- `e2e/`
  Playwright の E2E テスト。

- `docs/`
  技術メモ、運用メモ、環境構築補足。

- `scripts/`
  開発・運用用スクリプト。Stripe 商品作成などの補助処理を含む。

- `cron/`
  ビルド後処理や定期処理関連スクリプト。

- `migrations/`
  Drizzle のマイグレーション。

- `infra/`
  Cloudflare リソースやインフラ関連の補足資料。

### 設計・プロセス資料

- `design-process/`
  設計プロセス中の作業資料。

- `design-artifacts/`
  プロダクト設計成果物。

- `_bmad/`
  BMAD ワークフローや支援資料。

- `_bmad-output/`
  BMAD 実行結果や生成物。

### 設定ファイル

- `package.json`
  開発コマンド、依存関係定義。

- `wrangler.toml`
  Cloudflare Workers / D1 / R2 / KV などの実行設定。

- `drizzle.config.ts`
  Drizzle 設定。ローカルは `.wrangler/state` 配下の SQLite を参照し、production は D1 HTTP 接続を利用。

- `playwright.config.ts`
  E2E テスト設定。`build` + `preview` を起動してから `e2e/` を実行。

- `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`
  SvelteKit / Vite / TypeScript / ESLint の基本設定。

## 主要コンポーネント・モジュールの役割

### UI コンポーネント

- `src/lib/components/ui/`
  汎用 UI 部品。ボタン、ダイアログ、入力部品などの基盤。

- `src/lib/components/calendar/`
  カレンダー表示や日付確認 UI。

- `src/lib/components/modals/`
  モーダル関連 UI。

- `src/lib/components/onboarding/`
  初回導線やオンボーディング UI。

- `src/lib/components/analytics/`
  分析画面向けの表示部品。

### サーバーサイド

- `src/lib/server/subscriptions.ts`
  サブスク情報の計算ロジック。請求日関連の算出を担当。

- `src/lib/server/subscription-analytics.ts`
  分析画面向けの集計処理。

- `src/lib/server/subscription-export.ts`
  エクスポート用データ整形。

- `src/lib/server/stripe.ts`
  Stripe 連携処理。

- `src/lib/server/email.ts`
  メール送信関連。開発環境ではテスト送信先へ切り替える前提。

- `src/lib/server/push.ts`, `src/lib/server/notifications.ts`
  Push 通知関連の処理。

- `src/lib/auth.ts`, `src/lib/auth-client.ts`
  Better Auth のサーバー / クライアント設定。

- `src/hooks.server.ts`
  認証・保護ルート・管理者制御の入り口。

### クライアント・状態管理

- `src/lib/offline/subscriptions.ts`
  オフライン時のサブスク保存や同期補助。

- `src/lib/states/`
  Svelte 5 の state を使った UI 状態管理。

- `src/service-worker.ts`
  PWA / Push 通知受信処理。

## 開発コマンド

`package.json` に定義されている主要コマンドは以下です。

### 基本

- `pnpm run dev`
  Vite 開発サーバーを起動。

- `pnpm run build`
  本番ビルドを作成し、後続の `cron/append.js` を実行。

- `pnpm run preview`
  `build` 後に `wrangler dev` でローカル確認。

### 品質確認

- `pnpm run check`
  SvelteKit 同期 + 型チェック。

- `pnpm run check:watch`
  型チェックの watch 実行。

- `pnpm run lint`
  Prettier チェック + ESLint。

- `pnpm run format`
  Prettier で整形。

### テスト

- `pnpm run test:unit`
  Vitest 実行。

- `pnpm run test:e2e`
  Playwright E2E 実行。

- `pnpm run test`
  Unit test を `--run` で実行後、E2E を続けて実行。

### DB / Drizzle

- `pnpm run db:generate`
  マイグレーション生成。

- `pnpm run db:migrate`
  ローカル DB にマイグレーション適用。

- `pnpm run db:push`
  ローカル DB へスキーマ反映。

- `pnpm run db:studio`
  ローカル DB を Drizzle Studio で確認。

- `pnpm run db:migrate:prod`
  production 設定でマイグレーション適用。

- `pnpm run db:push:prod`
  production 設定でスキーマ反映。

- `pnpm run db:studio:prod`
  production 設定で Drizzle Studio 起動。

### Cloudflare / デプロイ

- `pnpm run deploy`
  ビルド後に Cloudflare Workers へデプロイ。

- `pnpm run cf-typegen`
  Wrangler の型定義を生成し、`src/worker-configuration.d.ts` 相当として `src/` 配下へ移動。

### 補助スクリプト

- `node scripts/create-stripe-products.mjs scripts/stripe-products.json`
  Stripe 商品・価格データの作成補助。README に記載あり。

## 開発時の補足

- ローカル DB は `drizzle.config.ts` 上、`.wrangler/state/.../*.sqlite` を参照する構成。
- `wrangler dev` を利用するため、Cloudflare バインディング設定は `wrangler.toml` を確認すること。
- Push 通知、Stripe、Better Auth、Resend など環境変数依存の機能があるため、`.env`, `.env.dev`, `.env.example` を参照して不足がないか確認すること。
- `.svelte-kit/`, `.wrangler/`, `node_modules/` は生成物を含むため、調査時は一次ソースではなく `src/` や設定ファイルを優先すること。
