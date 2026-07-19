# 言語別URLルーティング仕様

- 状態: 実装済み
- 作成日: 2026年6月14日
- 最終更新日: 2026年7月19日

## 目的

SubTrackの表示言語をURLから判別できるようにする。

日本語ページと英語ページには、それぞれ固有のURLを割り当てる。
同じURLがCookieやログイン状態によって別の言語で表示される状態は作らない。
検索エンジンにも、言語ごとに異なるページとして通知する。

## 利用者に見える挙動

表示言語はURLだけで決まる。

```text
/ja/faq  = 日本語
/en/faq  = 英語
/ja/push = 日本語
/en/push = 英語
```

言語を含まないURLは通常の画面遷移には使わない。
アクセスされた場合は、利用者の希望言語を判定して言語付きURLへ一時的にリダイレクトする。

```text
/faq -> /ja/faq または /en/faq
```

対応していない2文字の言語コードは、存在しないページとして扱う。

```text
/fr/faq -> 404
/es     -> 404
```

`/foo`や`/pricing`のような通常のパスは、言語を含まないURLとして扱う。

## 対象

利用者が画面として閲覧するHTMLページを対象にする。

主な対象は次のとおり。

- 公開ページ
- サブスクリプション管理
- カレンダー
- 分析
- 利用者設定
- 管理画面

API、静的ファイル、ファイルダウンロードは対象外とする。
これらには言語判定や言語付きURLへのリダイレクトを適用しない。

主な対象外パスは次のとおり。

- `/api/...`
- `/service-worker.js`
- `/manifest.webmanifest`
- `/robots.txt`
- `/sitemap.xml`
- `/.well-known/...`
- `/_app/...`
- `/images/...`
- `/hero/...`
- `/assets/...`
- 拡張子を含む静的ファイル
- `/subscriptions/export`
- `/subscriptions/import-template`

Stripe、Better Auth、Web PushなどのコールバックやWebhookは、`/api/...`として対象外にする。

## 言語付きURL

URLに含まれる言語を常に優先する。

```text
/ja/faq にアクセスした場合、保存済み言語がenでも日本語で表示する。
/en/faq にアクセスした場合、保存済み言語がjaでも英語で表示する。
```

言語付きURLを閲覧しただけでは、利用者の保存済み言語やCookieを更新しない。
明示的に言語切替を操作した場合だけ保存する。

HTMLの`lang`属性もURLの言語に合わせる。

## 言語を含まないURL

ログイン済みの利用者では、次の順序でリダイレクト先を決める。

1. アカウントに保存された言語
2. Cookieに保存された言語
3. ブラウザの優先言語
4. 既定言語の日本語

未ログインの利用者では、次の順序で決める。

1. Cookieに保存された言語
2. ブラウザの優先言語
3. 既定言語の日本語

ブラウザの優先言語は`Accept-Language`から判定する。
`ja-JP`は`ja`、`en-US`は`en`として扱う。
対応言語が含まれない場合は日本語を使う。

リダイレクトには`302`を使う。
利用者ごとに行き先が異なるため、恒久リダイレクトにはしない。

## 言語設定の保存

ログイン済みの利用者は、希望言語をアカウントとCookieの両方に保存する。
未ログインの利用者はCookieだけに保存する。

実装上のCookie設定は次のとおり。

```text
名前: subtrack_locale
値: ja | en
path: /
sameSite: lax
maxAge: 400日
```

表示言語の判定にはLocal Storageを使わない。
サーバーが最初のHTMLを返す時点で参照できないためである。

## 言語切替

言語切替はヘッダーに配置する。
管理画面では、管理画面用レイアウトの上部に配置する。
設定画面には重複する言語選択UIを置かない。

切り替えると、現在の画面に対応する言語付きURLへ移動する。

```text
/en/faq -> /ja/faq
/ja/faq -> /en/faq
```

保存に失敗した場合はエラーを表示する。
表示言語はURLで決まるため、保存に失敗しても選択した言語のURLへ移動する。

Cookieの保存に成功し、アカウントへの保存だけが失敗した場合も同様に移動する。
この場合、次回の言語なしURLではCookieを候補として利用できる。

## 内部遷移

画面へのリンクとサーバー側リダイレクトは、現在のURLと同じ言語を含める。

```text
日本語表示中: /faq -> /ja/faq
英語表示中:   /faq -> /en/faq
```

現在のURLの言語を優先する。
保存済み言語が日本語でも、英語ページ内の通常遷移によって日本語へ戻さない。

API、ファイルダウンロード、ページ内リンク、外部URLには言語を付加しない。

## 公開ページのSEO

公開ページでは、現在の言語付きURLをcanonical URLとして出力する。
日本語、英語、既定入口を`hreflang`で示す。

```html
<link rel="canonical" href="https://subtracknotify.com/ja/faq" />
<link rel="alternate" hreflang="ja" href="https://subtracknotify.com/ja/faq" />
<link rel="alternate" hreflang="en" href="https://subtracknotify.com/en/faq" />
<link rel="alternate" hreflang="x-default" href="https://subtracknotify.com/ja/faq" />
```

現在は日本語を既定入口としているため、`x-default`は日本語URLを指す。

## PWA、メール、通知

PWAの起動URLは`/`とする。
起動後は通常の言語判定によって、希望言語のトップページへ移動する。

Service Workerと通知APIには言語リダイレクトを適用しない。
Push通知、請求通知メール、トライアル終了通知のリンクには、利用者の保存済み言語を含める。

通知本文とメール本文も利用者の保存済み言語で生成する。
保存済み言語が不正または取得できない場合は日本語を使う。

## 実装メモ

対応言語は`ja`と`en`である。
既定言語は`ja`である。

ParaglideはURLを優先し、最後のフォールバックとして既定言語を使う。

```ts
strategy: ['url', 'baseLocale'];
```

言語ルーティングはParaglideのミドルウェアより前に処理する。
ログイン済み利用者の言語は、言語ルーティング処理の中でセッションを読み取って判定する。

主な実装ファイルは次のとおり。

- `vite.config.ts`
- `src/hooks.ts`
- `src/hooks.server.ts`
- `src/lib/locale-routing.ts`
- `src/lib/components/Header.svelte`
- `src/lib/components/LanguageSwitcher.svelte`
- `src/routes/admin/+layout.svelte`
- `src/routes/api/locale/+server.ts`
- `src/lib/auth.ts`
- `src/lib/server/db/schema.ts`

## 検証

最低限、次を確認する。

- `/ja/...`と`/en/...`で表示言語がURLと一致する
- 言語なしURLで、アカウント、Cookie、`Accept-Language`の優先順位が守られる
- `/fr/...`のような非対応言語が404になる
- 言語切替後も同じ画面に留まる
- 内部リンクとサーバー側リダイレクトが現在の言語を維持する
- API、静的ファイル、CSVダウンロードが言語リダイレクトされない
- canonical URLと`hreflang`が現在のURLに一致する
- Push通知とメールのリンクに利用者の言語が含まれる

関連する自動テストは次のとおり。

- `src/lib/locale-routing.spec.ts`
- `e2e/public/locale-routing.test.ts`
- `e2e/auth-locale/initial-locale.test.ts`

## 将来の検討事項

- 外部流入が安定したURLに限り、`302`から`308`への変更を検討する
- 言語選択専用の入口を用意する場合は、`x-default`の参照先を変更する
