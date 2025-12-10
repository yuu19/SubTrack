## テスト送信

onboarding@resend.dev = Resend が提供する “テスト用 差出人アドレス”。ドメイン認証前のメール送信に使われる。
delivered@resend.dev = Resend が提供する “テスト用 受信先アドレス”。メールが正しく送信／配信されるかを確認するためのもの。

- 開発モード（`npm run dev`）では `src/lib/server/email.ts` で `from` と `to` を自動的に上記サンドボックスアドレスに差し替えるようにしているため、実ユーザーには送られません。本番では `RESEND_FROM` の値が使われます。

- 例

```
    const data = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: ['delivered@resend.dev'],
      subject: 'Hello world',
      react: EmailTemplate({ firstName: 'John' }),
    });
```
