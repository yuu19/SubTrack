# Cloudflare resources for wrangler.toml

手順:

1. `cd infra`
2. API トークンを環境変数で渡す: `export TF_VAR_cloudflare_api_token=...` (もしくは `terraform.tfvars` を複製して値を入れる)
3. 初期化: `terraform init`
4. 確認: `terraform plan -out plan.tfplan`
5. 反映: `terraform apply plan.tfplan`
6. `terraform output wrangler_bindings` で値を確認。自動生成された `../wrangler.generated.toml` を `wrangler.toml` として利用するか、差分をコピーする。

必要な Cloudflare API トークン権限:

- Account: `Workers R2 Storage - Edit`
- Account: `Workers KV Storage - Edit`
- Account: `D1 - Edit`

ローカル状態ファイルは `infra/` 配下に作成されます（`.gitignore` 済み）。チームで共有する場合はリモートバックエンドの設定を追加してください。
