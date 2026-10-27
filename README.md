# SubTrack

契約中のサブスク、料金、次回請求日、通知をまとめて管理するアプリです。
日本語・英語に対応しています。

Subscription tracking for costs, upcoming billing dates, and reminders, available in Japanese and English.

- **公式サイト / Official website**: [subtracknotify.com](https://subtracknotify.com/)
- **日本語**: [トップページ](https://subtracknotify.com/ja) · [デモ](https://subtracknotify.com/ja/demo) · [FAQ](https://subtracknotify.com/ja/faq)
- **English**: [Home](https://subtracknotify.com/en) · [Demo](https://subtracknotify.com/en/demo) · [FAQ](https://subtracknotify.com/en/faq)

デモではアカウントを作成せずに操作を試せます。
The demo lets you try SubTrack without creating an account.

## 必要な商品と価格を作成

```
node scripts/create-stripe-products.mjs scripts/stripe-products.json
```

## Stripe Webhook

- サブスク管理: `/api/auth/stripe/webhook`
- 買い切り権限付与: `/api/auth/stripe/webhook` でも処理されます。買い切り専用 endpoint を分ける場合は `/api/stripe/webhook` を追加し、`STRIPE_LIFETIME_WEBHOOK_SECRET` を設定します。

少なくとも `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` を有効にしてください。
