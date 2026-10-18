# Better Auth 1.6.22 セキュリティ更新

## 変更内容

- `better-auth` と `@better-auth/stripe` を 1.6.22 に揃える。
- Drizzle adapter の peer dependency を満たす `drizzle-orm` 0.45.4 を使用する。
- アプリ側の `zod` も 4.3.6 に揃える。4.1.13 のままでは、Vite の本番バンドルで `z.xor is not a function` が発生する。
- 2FA の `verified`、`failedVerificationCount`、`lockedUntil` を追加する。
- Stripe SDK 20.0.0 と API version `2025-11-17.clover` は維持する。Stripe 用の追加カラムは不要。
- 検証時の外部送信を避けるため、Sentry build plugin と Inlang のビルドテレメトリーを無効にする。アプリのエラー監視設定は変更しない。

元の Renovate PR #22 を含む独立ブランチで検証する。#22 単独には Stripe の依存不整合と 2FA カラム不足があるため、そのままマージしない。

## マージ前に必要な DB 作業

**main への push は自動デプロイされる。DB の確認・バックアップ・マイグレーションを先に完了すること。**

この PR 自体は本番 DB の読み書き、マージ、デプロイを行わない。

`migrations/meta/_journal.json` は 0017 までで、既存の手動マイグレーションを網羅していない。
そのため `pnpm db:migrate:prod` だけでは今回の 0027 は適用されない。
過去の全 SQL を無条件に再適用したり、`db:push:prod` で差分を自動適用したりしない。

本番作業の承認後、担当者が以下を実施する。

1. 対象 D1 データベースとバックアップ・復元手順を確認する。
2. `PRAGMA table_info('twoFactor')` と `PRAGMA table_info('user')` を確認する。旧 2FA テーブルと `user.two_factor_enabled` が存在し、追加する 3 カラムがまだないことを確認する。
3. ステージングまたはローカルの DB コピーで `migrations/0027_better_auth_two_factor_security.sql` を適用・検証する。
4. 本番の対象が `wrangler.toml` の `dishpage-database` であることを再確認し、承認された手順で **一度だけ** 同じ SQL を適用する。

手動適用のコマンド例（この PR では未実行）:

```sh
pnpm exec wrangler d1 execute dishpage-database --remote --file=migrations/0027_better_auth_two_factor_security.sql
```

既にカラムが存在する場合は再実行せず、適用履歴と内容を確認する。
追加カラムは旧アプリから参照されないため、先行適用できる。
既存の有効な 2FA は `verified = true`、未完了の登録は `false` に引き継ぐ。
秘密鍵・バックアップコード・既存の有効/無効フラグは変更しない。

## 回帰テスト

```sh
pnpm install --frozen-lockfile
pnpm test:auth
```

専用 Vitest config は Sentry / Cloudflare / Inlang plugin を起動しない。
毎回独立したインメモリ SQLite を使い、Google と Stripe の外部 API のみをモックする。
Better Auth 本体、Drizzle adapter、アプリの `createAuth`、Stripe webhook の署名検証は実行する。

対象:

- パスワード登録・ログイン・セッションと誤パスワード拒否
- 未検証のローカルアカウントへの Google 自動連携拒否、検証済みアカウントの連携
- Google 初回/再ログイン、OAuth callback・PKCE・state 再利用拒否
- 2FA 登録、TOTP ログイン、バックアップコードの一回限り利用
- 別チャレンジをまたぐ 2FA ロックと期限切れ後の復帰
- 旧 2FA データのマイグレーション（有効/未完了の両方）
- Checkout・試用期間・所有者/return URL 検証・portal・restore
- 継続課金 webhook、署名拒否、買い切り権限付与の冪等性

現在スキーマから作るテスト DB は、既存本番 DB の全マイグレーション履歴を保証しない。
Google 実アカウント・Stripe 実決済・本番ユーザーデータを使うテストは含めない。

## 運用上の注意

- 修正後、未検証のパスワードアカウントと同じメールで初めて Google ログインすると、自動連携は拒否される。安全性を維持するため `requireLocalEmailVerified: false` にしない。
- この更新で、過去に不正連携されたアカウントや発行済みセッションが自動修復されるとは限らない。本番の稼働バージョン・影響の有無は別途確認が必要。
- マージ・デプロイ後は、まずステージング/承認済みテスト環境でログインと課金画面を確認する。セッション失効・アカウント変更・実決済などは別途承認して実施する。

参考:

- [アカウント自動連携の脆弱性 GHSA-g38m-r43w-p2q7](https://github.com/better-auth/better-auth/security/advisories/GHSA-g38m-r43w-p2q7)
- [Better Auth 1.6.22 リリース](https://github.com/better-auth/better-auth/releases/tag/v1.6.22)
- [1.6.22 の 2FA スキーマ](https://github.com/better-auth/better-auth/blob/v1.6.22/packages/better-auth/src/plugins/two-factor/schema.ts)
- [1.6.22 の Stripe スキーマ](https://github.com/better-auth/better-auth/blob/v1.6.22/packages/stripe/src/schema.ts)
