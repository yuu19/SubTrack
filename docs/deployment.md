# 本番デプロイ

本番への配布は main の更新時、または GitHub Actions の「Deploy to Cloudflare Workers」の手動実行で行います。手動実行も main に限定しています。PR 作成だけでは本番へ配布されません。

## 配布までの検証

PR と本番配布前に、同じ CI で型チェック、サーバーの lint、サーバー・ブラウザーの単体テスト、課金以外の E2E、ビルドを実行します。CI は本番の認証情報を使いません。リポジトリ全体の整形・lint と Stripe の課金 E2E はこの CI の対象外です。

本番配布は直列に実行し、後続の更新で実行中の配布をキャンセルしません。検証後に main の先頭コミットを確認するため、古い実行の再実行は失敗します。最新の main を選んで手動実行してください。

配布後は DB 接続と配布したコミットを `/api/health` で確認し、日本語・英語のトップとデモの HTTP 応答を確認します。疎通確認が失敗しても配布そのものは取り消されません。ログを確認し、復旧を判断してください。画面内の操作や通知の実配送は、この疎通確認には含みません。

## 初回配布前の設定

1. GitHub のリポジトリまたは production 環境に必要な Secret を登録します。必須の名前は `scripts/deploy-preflight.sh` にあります。値はログへ出力しません。
2. 管理画面用の `ADMIN_BASIC_AUTH_USER` と `ADMIN_BASIC_AUTH_PASSWORD` も登録します。以前のワークフローでは Worker への送信対象から漏れていました。未登録の状態では、本番配布を開始する前に停止します。既存の Worker に直接設定した値は読み出せないため、管理元の認証情報から登録してください。
3. production 環境の配布可能ブランチを main のみに設定します。
4. main の保護ルールで PR と `Validate` の成功を必須にします。実際のチェック名は初回 PR の Checks で確認してください。ワークフローの追加だけでは GitHub 側の保護設定は変わりません。

Cloudflare の配布認証には `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を使います。Worker の公開設定は `wrangler.toml`、秘密情報は GitHub Secrets を管理元とします。production 環境の変数と Cloudflare の環境設定は別の仕組みです。

Sentry のリリースとソースマップも送信する場合は、Secret に `SENTRY_AUTH_TOKEN`、production 環境の Variables に `SENTRY_ORG` と `SENTRY_PROJECT` を登録します。リリース名にはコミット SHA を使います。未設定の場合も配布できますが、リリース作成・ソースマップ送信はスキップされます。

## DB 変更を含む場合

現状は SQL ファイルと Drizzle の管理台帳が一致していません。台帳は `0017` までで、後続の SQL や同じ番号を持つ SQL が別に存在します。`db:migrate:prod` を追加するだけでは、すべての変更が適用される保証がありません。このワークフローでは本番 DB を自動変更しません。

DB 変更を含む PR は、以下を完了してから main にマージしてください。通常の E2E はスキーマからテスト DB を作るため、移行履歴の正しさを検証しません。ヘルス確認も DB 接続のみで、全テーブルの整合性は検証しません。

1. 本番 DB のテーブル・列と、既存の移行管理テーブルを読み取りで確認します。Drizzle と Wrangler のどちらで適用していたかも照合します。
2. 未登録 SQL を含む履歴を整理し、採用する移行方式を一つに決めます。適用済みの SQL を再実行しないようにします。
3. 本番相当のコピーで既存データを保持したまま移行できることを確認します。
4. D1 の復元可能時点を記録し、旧版アプリと互換性を保つ追加変更を先に適用します。
5. 本番への DB 反映と確認を終えてから、新しいアプリを配布します。列の削除など互換性を壊す変更は別の配布に分けます。

本番 DB の適用履歴を照合するまでは、自動マイグレーションを有効にしないでください。

## 配布失敗時の復旧

1. Actions の実行結果と疎通確認の失敗箇所を確認します。実行サマリーには対象コミットと結果、配布ログには Worker の `Current Version ID` が記録されます。
2. 直前に正常だった実行の Worker バージョンを確認します。
3. DB と秘密情報の変更に旧版が対応できることを確認したうえで、Cloudflare ダッシュボード、または `pnpm exec wrangler rollback <正常なバージョンID>` で復旧します。この操作は本番を変更します。
4. `/api/health` のコミット、主要ページ、ログイン、契約一覧を確認します。`scripts/deploy-smoke.sh <旧版のコミットSHA>` も利用できます。ヘルス API 導入前の版は画面・ログで確認してください。

Worker のロールバックでは DB データは元に戻りません。DB の復元は別に判断し、復元時点以降の更新への影響を確認してください。

参考: [GitHub の環境保護設定](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)、[Cloudflare のロールバック](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)、[D1 の移行管理](https://developers.cloudflare.com/d1/reference/migrations/)。
