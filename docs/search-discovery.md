# 公開ページの検索エンジン登録

SubTrackの公開ページを検索エンジンが見つけられるよう、サイトマップとrobots.txtを配信する。
サイトマップには、画面のcanonical設定と同じ日本語・英語のURLを登録する。

| ページ                   | 日本語                                                | 英語                                                  |
| ------------------------ | ----------------------------------------------------- | ----------------------------------------------------- |
| トップ                   | https://subtracknotify.com/ja                         | https://subtracknotify.com/en                         |
| デモ                     | https://subtracknotify.com/ja/demo                    | https://subtracknotify.com/en/demo                    |
| FAQ                      | https://subtracknotify.com/ja/faq                     | https://subtracknotify.com/en/faq                     |
| 通知案内                 | https://subtracknotify.com/ja/push                    | https://subtracknotify.com/en/push                    |
| 利用規約                 | https://subtracknotify.com/ja/terms                   | https://subtracknotify.com/en/terms                   |
| プライバシーポリシー     | https://subtracknotify.com/ja/privacy                 | https://subtracknotify.com/en/privacy                 |
| 特定商取引法に基づく表記 | https://subtracknotify.com/ja/commercial-transactions | https://subtracknotify.com/en/commercial-transactions |

## サイトマップとクロール許可

- サイトマップ: https://subtracknotify.com/sitemap.xml
- robots.txt: https://subtracknotify.com/robots.txt

サイトマップは公開7ページの2言語、計14 URLを含む。
各URLには日本語、英語、既定言語の対応関係を付ける。
実際の更新日時を管理していないため、形式だけの更新日は付けない。
サブスク管理、個人設定、管理画面、APIは登録対象に含めない。

robots.txtでは一般のクローラーによるアクセスを許可し、サイトマップの絶対URLを案内する。
Cloudflareが配信時に付ける説明文とは別に、アプリ側の宣言を管理する。

サイトマップは `static/sitemap.xml` にある。
固定の公開URLを静的XMLとして配信し、DBや認証処理の状態に依存せず取得できるようにする。
公開ページの追加・削除時にはサイトマップも更新し、対象URLと言語の対応関係をテストする。
robots.txtは `static/robots.txt` にある。

## AI向けの公開情報

https://subtracknotify.com/llms.txt から、アプリの概要、主要機能、通知の利用条件、デモの制約、日英の公開ページへのリンクを配信する。
実ファイルは `static/llms.txt` にあり、DBや認証を通さず取得できる。

料金や件数制限などの固定値を重複して記載せず、最新情報があるトップページやFAQへ案内する。
機能や公開URLを変更した際は、公開ページと合わせて内容を更新する。
llms.txtはAI向けの情報案内であり、robots.txtのアクセス許可やサイトマップの代わりにはしない。

形式は [llms.txtの仕様提案](https://llmstxt.org/) を参照する。

## Search Consoleへの送信

1. subtracknotify.comの所有者または管理権限を持つGoogleアカウントでSearch Consoleにログインする。
2. 対象のドメインプロパティ、または `https://subtracknotify.com/` のURLプレフィックスプロパティを選ぶ。
3. 「サイトマップ」を開き、`https://subtracknotify.com/sitemap.xml` を送信する。入力欄の前に `https://subtracknotify.com/` が表示される場合は、`sitemap.xml` だけを入力する。
4. 送信したURLと処理結果を確認する。

送信できたことと、Googleが取得・インデックス登録したことは別の状態として確認する。
GooglebotのUser-AgentでHTTP応答を確認するテストだけでは、Googleのサーバーによる実際の取得は証明できない。
必要に応じてSearch ConsoleのURL検査で公開URLを確認する。

公式の手順:

- [サイトマップの作成と送信](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=ja)
- [サイトマップレポート](https://support.google.com/webmasters/answer/7451001?hl=ja)
- [言語別ページの対応関係](https://developers.google.com/search/docs/specialty/international/localized-versions?hl=ja)
