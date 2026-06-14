# 言語別URLルーティング仕様案

作成日: 2026年6月14日

## 目的

SubTrack の表示言語を、利用者が見ている URL から常に分かる状態にする。

日本語ページは日本語の URL、英語ページは英語の URL として共有できるようにする。
同じ URL が、利用者の cookie やログイン状態によって別の言語で表示される状態は避ける。
検索エンジンにも、言語ごとに別のページとして扱える URL を示す。

## 結論

表示言語は URL を唯一の表示ソースにする。

```text
/ja/faq  = 日本語
/en/faq  = 英語
/ja/push = 日本語
/en/push = 英語
```

`/faq` や `/push` のような言語なし URL は、通常の表示には使わない。
アクセスされた場合は、希望言語を判定して `/ja/...` または `/en/...` にリダイレクトする。

`baseLocale` は現在どおり `ja` のままにする。
ただし、`baseLocale` は表示 URL の省略形として扱わない。
言語なし URL は、表示前に言語付き URL へ移動させる。
`baseLocale` は、言語解決が失敗した場合の最終 fallback としてだけ使う。

## 対象

この仕様は、利用者が画面として閲覧する HTML ページを対象にする。

対象例:

- `/`
- `/faq`
- `/push`
- `/privacy`
- `/terms`
- `/commercial-transactions`
- `/subscriptions`
- `/calendar`
- `/analysis`
- `/me`
- `/admin`

次のパスは対象外にする。
言語判定やリダイレクトを行わない。

- `/api/...`
- `/service-worker.js`
- `/manifest.webmanifest`
- `/favicon.png`
- `/apple-touch-icon.png`
- `/robots.txt`
- `/sitemap.xml`
- `/.well-known/...`
- `/images/...`
- `/hero/...`
- `/_app/...`
- `/build/...`
- `/assets/...`
- `/@vite/...`
- `/@fs/...`
- `/node_modules/...`
- 拡張子付きの静的ファイル
- Stripe、Better Auth、Web Push などの外部サービスから呼ばれる callback / webhook / API

## URLルール

言語付き URL は、その言語で必ず表示する。

```text
/ja       -> 日本語トップ
/en       -> 英語トップ
/ja/faq   -> 日本語FAQ
/en/faq   -> 英語FAQ
```

言語なし URL は、希望言語へリダイレクトする。

```text
/          -> /ja または /en
/faq       -> /ja/faq または /en/faq
/push      -> /ja/push または /en/push
```

URL に対応していない言語コードが含まれる場合は、通常のページとして扱わない。
例えば `/fr/faq` は、`/ja/fr/faq` へ自動補正しない。
存在しないページとして 404 を返す。

先頭セグメントが 2 文字の英小文字で、対応言語 `ja` / `en` ではない場合は、非対応言語として扱う。
将来も、2 文字の英小文字だけの通常トップレベルパスは作らない。

ただし、2 文字の英小文字ではない通常のパスは、言語なし URL として扱う。

```text
/fr/faq -> 404
/es/push -> 404
/de -> 404
/foo -> /ja/foo または /en/foo
/pricing -> /ja/pricing または /en/pricing
```

言語なし HTML ページから言語付き URL へのリダイレクトは、一時リダイレクトにする。
リダイレクト先はログイン状態、cookie、ブラウザの優先言語によって変わるため、初期段階では恒久リダイレクトにしない。

```text
/faq -> /ja/faq または /en/faq は 302
```

内部リンクがすべて言語付き URL に置き換わり、外部流入の扱いも安定した後で、必要な URL だけ 308 を検討する。

## 表示言語の決定

言語付き URL では、URL の言語を絶対優先にする。

```text
/ja/faq に来たら、DBやcookieがenでも日本語で表示する。
/en/faq に来たら、DBやcookieがjaでも英語で表示する。
```

DB や cookie は、表示言語を裏から変えるためには使わない。
それらは、言語なし URL のリダイレクト先を決めるためにだけ使う。

言語付き URL を閲覧しただけでは、利用者の保存済み言語や cookie は更新しない。
保存済み言語を更新するのは、利用者がヘッダーの言語切替を明示的に操作した場合だけにする。

HTML の `lang` 属性は、URL の言語に合わせる。

```text
/ja/... -> lang="ja"
/en/... -> lang="en"
```

## 言語なしURLのリダイレクト先

ログイン済みの利用者では、次の順序で希望言語を決める。

```text
1. 利用者の保存済み言語
2. cookie の保存済み言語
3. ブラウザの優先言語
4. 既定言語 ja
```

未ログインの利用者では、次の順序で希望言語を決める。

```text
1. cookie の保存済み言語
2. ブラウザの優先言語
3. 既定言語 ja
```

ブラウザの優先言語は、HTTP リクエストの `Accept-Language` を使って判定する。
`ja-JP` は `ja`、`en-US` は `en` として扱う。
対応していない言語しかない場合は `ja` にする。

## 言語設定の保存

ログイン済みの利用者は、希望言語をアカウント設定として保存する。
次回以降に言語なし URL へアクセスした場合は、この保存値を優先してリダイレクトする。

未ログインの利用者は、cookie に希望言語を保存する。
次回以降に言語なし URL へアクセスした場合は、cookie の値を優先してリダイレクトする。

cookie 名は `subtrack_locale` にする。
値は `ja` または `en` のみを保存する。
有効範囲はサイト全体にする。

```text
cookie名: subtrack_locale
値: ja | en
path: /
sameSite: lax
maxAge: 400日程度
```

`localStorage` は、言語判定には使わない。
サーバーが初回 HTML を返す時点で `localStorage` は読めないため、初期表示の言語を安定させにくい。

## 言語切替

言語切替は設定画面ではなく、ヘッダーから行えるようにする。

ヘッダーには、日本語と英語を切り替える操作を置く。
公開ページ、ログイン後の画面、管理画面でも、可能な限り同じ位置で切り替えられるようにする。

日本語を選んだ場合は、現在のページに対応する日本語 URL へ移動する。

```text
/en/faq  -> /ja/faq
/en/push -> /ja/push
```

英語を選んだ場合は、現在のページに対応する英語 URL へ移動する。

```text
/ja/faq  -> /en/faq
/ja/push -> /en/push
```

切り替え時には、次の保存も同時に行う。

ログイン済みの場合:

1. 利用者の保存済み言語を更新する。
2. cookie を更新する。
3. 対応する言語付き URL へ移動する。

未ログインの場合:

1. cookie を更新する。
2. 対応する言語付き URL へ移動する。

保存に失敗した場合は、利用者に失敗を知らせる。
ただし、URL 遷移は進める。

表示言語は URL で決めるため、利用者が言語を選んだ時点で対応する言語付き URL へ移動する。
保存は、次回以降の言語なし URL の誘導先を安定させるために行う。

ログイン済みでアカウント設定の保存に失敗した場合でも、cookie が保存できていれば直近の希望言語は維持できる。
この場合は、画面表示は切替先の URL に従い、アカウント設定の保存に失敗したことだけを通知する。

## 設定画面の扱い

設定画面の言語切替は、ヘッダーへ移す。
設定画面には重複する言語選択 UI を置かない。

必要であれば、設定画面には現在の表示言語を示す説明だけを置く。
操作はヘッダーに集約する。

## 内部リンク

HTML ページへの内部リンクは、必ず現在の言語を含む URL として生成する。

```text
現在の言語が ja の場合: /faq -> /ja/faq
現在の言語が en の場合: /faq -> /en/faq
```

HTML ページへのリンクで、`/faq` や `/push` のような言語なし URL を直接出力しない。
言語なし URL は外部流入や古いリンクの受け口として扱い、通常のサイト内遷移では使わない。

## 公開ページのSEO

公開ページでは、現在の言語 URL を canonical として出す。

例:

```html
<link rel="canonical" href="https://subtracknotify.com/ja/faq" />
```

別言語の URL は `hreflang` で示す。

```html
<link rel="alternate" hreflang="ja" href="https://subtracknotify.com/ja/faq" />
<link rel="alternate" hreflang="en" href="https://subtracknotify.com/en/faq" />
<link rel="alternate" hreflang="x-default" href="https://subtracknotify.com/ja/faq" />
```

`x-default` は、既定言語が日本語であるため日本語 URL を指す。
SubTrack は日本語を既定の入口として扱うため、初期方針では日本語 URL を `x-default` にする。
将来、言語選択専用の入口を用意する場合は、`x-default` をその入口へ変更する。

## PWAと通知導線

PWA の起動 URL が `/` の場合は、起動時に希望言語へリダイレクトする。
そのため、ホーム画面から起動した場合も `/ja/...` または `/en/...` のページに着地する。

Service Worker、Web Push の購読 API、通知配信 API は言語リダイレクトの対象外にする。
Push 通知の本文に含める URL は、送信時点で利用者の希望言語を反映した言語付き URL にする。

## API・メール・Push通知

API は原則として表示言語に依存しない。
API レスポンスで利用者向け文言が必要な場合は、URL から暗黙に判断しない。
利用者の保存済み言語、または明示的に渡された言語を使う。

メールと Push 通知の本文は、利用者の保存済み言語を使って生成する。
保存済み言語がない場合は、既定言語 `ja` を使う。

## 移行方針

まず、言語付き URL の表示を安定させる。
その後、言語なし URL をリダイレクト専用にする。

推奨する進め方:

1. `/ja/...` と `/en/...` の URL をどちらも表示できる状態にする。
2. ヘッダーに言語切替を移す。
3. 言語切替時に、保存と URL 遷移を同時に行う。
4. HTML ページの言語なし URL を、希望言語へリダイレクトする。
5. 公開ページに canonical と hreflang を追加する。
6. 既存の `/faq` や `/push` への内部リンクを、言語付き URL に置き換える。
7. HTML の `lang` 属性が URL の言語と一致することを確認する。
8. 必要に応じて旧 URL への外部流入を確認する。

## 実装メモ

現在の対応言語は `ja` と `en`。
既定言語は `DEFAULT_LOCALE` と `baseLocale` のどちらも `ja` のままにする。
`baseLocale` は最終 fallback としてだけ使う。
`/faq` を日本語として表示するためには使わない。
`/faq` は必ず `/ja/faq` または `/en/faq` にリダイレクトする。

Paraglide の表示言語判定は、最終的に URL を最優先にする。
表示言語を cookie や `localStorage` で決めない。
`subtrack_locale` は、言語なし URL のリダイレクト先を決めるために使う。
Paraglide の表示判定用 cookie には依存しない。

設定例:

```ts
strategy: ['url', 'baseLocale'];
```

リダイレクト先の判定は、SvelteKit の hooks 側で行う。
この処理は Paraglide の middleware より前に実行する。

hooks の処理順序は、次を基本にする。

```text
1. DB や実行環境の準備
2. 静的ファイル、API、外部callbackの除外
3. 認証情報と利用者の保存済み言語の読み込み
4. localeなしHTMLページのリダイレクト
5. Paraglide middleware
6. 通常の画面解決、保護ルート判定、テーマ反映
```

ログイン済み利用者の保存済み言語をリダイレクト先に使うため、認証情報の読み込みは locale リダイレクトより前に行う。

内部の canonical route は、これまでどおり `/faq` や `/push` として扱う。
外向きの URL だけを `/ja/faq` や `/en/faq` にする。

実装時に確認する主なファイル:

- `vite.config.ts`
- `project.inlang/settings.json`
- `src/hooks.ts`
- `src/hooks.server.ts`
- `src/lib/components/Header.svelte`
- `src/lib/components/LanguageSwitcher.svelte`
- `src/routes/(storeFront)/me/settings/+page.svelte`
- `src/routes/api/user-config/+server.ts`
- `src/lib/server/db/schema.ts`

## 採用する詳細方針

保存に失敗しても URL 遷移は進める。
画面表示は URL に従い、保存失敗は通知で伝える。

言語付き URL を閲覧しただけでは、保存済み言語や cookie は更新しない。
保存するのは、ヘッダーの言語切替を操作した場合だけにする。

cookie 名は `subtrack_locale` にする。
Paraglide の内部 cookie に依存せず、SubTrack のリダイレクト判定用 cookie として扱う。

先頭セグメントが 2 文字の英小文字で、対応言語 `ja` / `en` ではない URL は 404 にする。
`/foo` や `/pricing` のような通常の言語なし URL は、希望言語へリダイレクトする。

言語なし HTML ページから言語付き URL へのリダイレクトは 302 にする。
恒久リダイレクトは、移行後に必要な URL だけ検討する。

HTML ページへの内部リンクは、必ず言語付き URL として生成する。
