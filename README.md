# サブスク管理アプリ

## 必要な商品と価格を作成

```
node scripts/create-stripe-products.mjs scripts/stripe-products.json
```

## Stripe Webhook

- サブスク管理: `/api/auth/stripe/webhook`
- 買い切り権限付与: `/api/auth/stripe/webhook` でも処理されます。買い切り専用 endpoint を分ける場合は `/api/stripe/webhook` を追加し、`STRIPE_LIFETIME_WEBHOOK_SECRET` を設定します。

少なくとも `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` を有効にしてください。
