# サービス入力補助テンプレート仕様

作成日: 2026年6月23日

## 目的

サブスク登録時に代表的なサービスを選択すると、サービス名、カテゴリタグ、候補価格、支払い周期、解約URL、解約方法、解約メモをフォームへ自動入力する。

この機能は入力補助であり、価格や解約手順をSubTrackが保証するものではない。保存前にユーザーが確認・編集できる状態を前提にする。

## MVPの方針

- テンプレートはDBではなく静的データとして `src/lib/service-templates.ts` に持つ。
- テンプレートアイコンは公式 favicon / app icon 相当を `64x64 PNG` に正規化し、`static/template-icons/*.png` に保持する。
- テンプレートアイコンはR2の `template-icons/{templateId}.png` へ同期し、公開API `/api/template-icons/{templateId}` から配信する。
- テンプレートアイコンは全ユーザー共通の共有資産として扱い、ユーザーアップロード画像とは分ける。
- 保存済みサブスクには `serviceTemplateId` を残し、将来DB管理へ移行しやすくする。
- カテゴリは専用カラムではなく、既存の `tags` に自動入力する。
- 価格は参考値としてフォームに入れる。ユーザーが料金欄を編集したら、以後はユーザーの入力額を正として扱う。
- `planName` は保存し、詳細画面だけに表示する。一覧カードには出さない。
- サービス全体の公式URLと確認日はテンプレート側に残す。価格ごとの参照元がある場合は、新規登録フォームの注意文では価格ごとの参照元を優先する。
- 価格の参照元、確認日、地域は保存済みサブスクにスナップショットしない。
- 解約URLは公式のアカウント管理ページ、メンバーシップ管理ページ、またはサブスクリプション管理ページだけを候補にする。
- テンプレート選択UIは新規登録画面だけに入れる。編集画面での再適用はMVP範囲外。
- テンプレート表示名、プラン名、タグ、解約メモは日本語・英語の両方を持つ。保存後は選択時の表示言語の文字列を保持する。

## 保存データ

`tracked_subscription` に以下を追加する。

| カラム                 | 内容                                               |
| ---------------------- | -------------------------------------------------- |
| `service_template_id`  | 静的テンプレートID。未選択なら `null`              |
| `plan_name`            | 選択した候補プラン名。未選択なら `null`            |
| `price_edited_by_user` | 料金欄をユーザーが編集したか。デフォルトは `false` |

テンプレート選択時は `icon_type='templateImage'`、`icon_value='{templateId}'` をフォームに反映する。利用者がアイコンを手動変更した場合は、手動選択した値を正として保存する。

価格の参照元、確認日、地域は保存しない。保存後はユーザーが確認した `amount`、`currency`、`planName`、`cancellationUrl` を正とする。

## UI

新規登録フォームの先頭に「利用中のサービスを選択」の検索欄を追加する。

1. ユーザーがサービス名を入力する。
2. 候補を表示する。
3. 候補を選ぶ。
4. プラン候補を選ぶ。
5. サービス名、周期、料金、タグ、解約URL、解約方法、解約メモをフォームへ反映する。
6. 料金欄の下に参考価格の注意文を表示する。
7. テンプレートアイコンを初期アイコンとして反映する。

注意文の要点:

- 料金は参考価格である。
- 実際の請求額に合わせて編集する。
- テンプレート情報の確認日を表示する。
- 公式ページを情報元として表示する。

解約セクションには、公式管理ページへ案内するメモを入れる。SubTrackは解約代行をしない。

## 価格候補の扱い

公式ページで確認できた価格だけを候補として扱う。
為替レートによる換算価格は入れない。

価格候補はプランごとに複数持てる。
実装上は `prices` に、金額、通貨、地域、参照元URL、確認日を入れる。
価格がないプランは `prices: []` とする。
公式ページに表示された通常の継続課金額だけを入れる。
無料トライアル、初回割引、期間限定価格、為替レートで換算した価格は入れない。
税やVATの扱いが地域で異なる場合でも、テンプレートでは公式ページに表示された価格をそのまま参考価格として扱う。
実際の請求額は保存前にユーザーが編集できる。

`amount` は表示通貨の通常単位で保存する。
JPY は `1080`、USD は `12.99` のように扱う。
DB 上の `tracked_subscription.amount` は小数を保持できる型にする。
分析では保存額を小数のまま扱い、月額・年額への周期換算後に小数第2位へ丸める。
CSV エクスポートでは保存額そのものを出力する。

標準の地域は次の通り。

| 通貨 | 地域 |
| ---- | ---- |
| JPY  | JP   |
| USD  | US   |
| EUR  | DE   |
| GBP  | GB   |

フォームでは、現在選ばれている通貨に一致する確認済み価格だけを表示する。
一致する価格がある場合は、その金額を料金欄に入れる。
一致する価格がない場合は、料金欄に `0` を入れる。

テンプレート選択後に通貨を変更した場合、料金欄が未編集であれば選択中プランの該当通貨価格へ更新する。
該当通貨価格がない場合は `0` に戻す。
ユーザーが料金欄を編集済みの場合は、通貨を変更しても金額を自動変更しない。

外貨価格は、公式ページでプラン名と通常価格が明確に確認できたものだけを `prices` に追加する。
公式ページが地域やログイン状態で価格を動的に出し分け、安定した価格テキストを確認できない場合は追加しない。
調査対象は、Netflix、YouTube Premium、Spotify、Apple Music、Disney+、iCloud+、Google One、ChatGPT とする。
仕事系SaaSの席単位プランは、1ユーザーまたは1席あたりの参考価格として扱う。
その場合はプラン名に単位を入れる。
実際の請求額は、席数、契約条件、税の扱いで変わる。

`0` は「自分で入力」の意味として扱う。保存前にユーザーが実際の請求額へ編集する前提。

## 初期テンプレート

初期テンプレートは20件とする。
カテゴリはテンプレート一覧の絞り込み用に `ServiceTemplateCategory` として保持する。
登録フォームへ保存する補助タグとは分け、テンプレートカードでは正式カテゴリを表示する。
カテゴリは `video / music / ai / tools / storage / development / design / business / card / shopping / other` とする。

追加モーダルの初期画面はテンプレート選択を主導線にする。
検索欄、手動入力ボタン、カテゴリチップ、全テンプレートカードを表示する。
テンプレートカードを選択した場合は、最初のプランを自動適用して入力フォームへ進む。
手動入力を選択した場合は、テンプレート未選択の空フォームへ進む。
入力フォームからテンプレート一覧へ戻る場合は、編集中のフォーム内容を破棄する。

| サービス             | カテゴリタグ                                   | 価格候補                            | 解約URL方針                   |
| -------------------- | ---------------------------------------------- | ----------------------------------- | ----------------------------- |
| Netflix              | 動画 / Video                                   | 公式ページで確認できる範囲のみ      | Netflixアカウント管理         |
| YouTube Premium      | 動画, 音楽 / Video, Music                      | 現時点では価格なし                  | YouTube有料メンバーシップ管理 |
| Amazon Prime         | 買い物, 動画 / Shopping, Video                 | 現時点では価格なし                  | Amazon Prime会員情報管理      |
| Spotify              | 音楽 / Music                                   | 公式ページで確認できるプラン        | Spotifyアカウント管理         |
| Apple Music          | 音楽 / Music                                   | 公式ページで確認できるプラン        | Appleサブスクリプション管理   |
| Disney+              | 動画 / Video                                   | 公式ページで確認できるプラン        | Disney+アカウント管理         |
| U-NEXT               | 動画 / Video                                   | 現時点では価格なし                  | U-NEXTアカウント管理          |
| iCloud+              | クラウド / Cloud                               | Apple公式サポートで確認できるプラン | Appleサブスクリプション管理   |
| Google One           | クラウド / Cloud                               | 現時点では価格なし                  | Google One設定                |
| Notion               | 仕事, ツール / Work, Tools                     | 公式ページで確認できるプラン        | Notionワークスペース設定      |
| Figma                | デザイン, 仕事 / Design, Work                  | 公式ページで確認できる範囲のみ      | Figma管理画面                 |
| Adobe Creative Cloud | 制作, デザイン / Creative, Design              | 現時点では価格なし                  | Adobeアカウント管理           |
| Canva                | デザイン, 制作 / Design, Creative              | 現時点では価格なし                  | Canva請求設定                 |
| Dropbox              | クラウド, 仕事 / Cloud, Work                   | 公式ページで確認できるプラン        | Dropbox請求設定               |
| Microsoft 365        | 仕事, ツール / Work, Tools                     | 公式ページで確認できるプラン        | Microsoftアカウント管理       |
| Google Workspace     | 仕事, ツール / Work, Tools                     | 公式ページで確認できるプラン        | Google管理コンソール請求      |
| Slack                | 仕事, コミュニケーション / Work, Communication | 公式ページで確認できるプラン        | Slackワークスペース請求       |
| Zoom                 | 仕事, 会議 / Work, Meetings                    | 現時点では価格なし                  | Zoom請求設定                  |
| GitHub               | 開発, 仕事 / Development, Work                 | 公式ページで確認できるプラン        | GitHub請求設定                |
| ChatGPT              | AI, 仕事 / AI, Work                            | 現時点では価格なし                  | ChatGPTサブスクリプション設定 |

## テンプレートアイコン運用

- 外部取得と正規化は `pnpm run fetch:template-icons` で明示的に行う。
- R2への同期は `pnpm run sync:template-icons -- --remote` で行う。
- ローカル検証時は `pnpm run sync:template-icons -- --local` を使う。必要に応じて `--persist-to <dir>` を併用する。
- 通常デプロイでは外部サイトからアイコンを取得し直さない。レビュー済みの `static/template-icons/*.png` をR2へ同期する。

## 今回確認した公式情報

- Netflix: `https://www.netflix.com/jp/`, `https://www.netflix.com/de-en/`, `https://www.netflix.com/gb/`
- Netflix解約ヘルプ: `https://help.netflix.com/ja/node/407`
- YouTube Premium: `https://www.youtube.com/premium?gl=JP&hl=ja`
- YouTube有料メンバーシップ管理ヘルプ: `https://support.google.com/youtube/answer/6305537?hl=ja`
- Amazon Prime: `https://www.amazon.co.jp/amazonprime`
- Spotify Premium: `https://www.spotify.com/jp/premium/`, `https://www.spotify.com/us/premium/`, `https://www.spotify.com/de-en/premium/`, `https://www.spotify.com/uk/premium/`
- Apple Music: `https://www.apple.com/jp/apple-music/`, `https://www.apple.com/apple-music/`, `https://www.apple.com/de/apple-music/`, `https://www.apple.com/uk/apple-music/`
- Appleサブスクリプション解約: `https://support.apple.com/ja-jp/118428`
- Disney+: `https://www.disneyplus.com/ja-jp`, `https://www.disneyplus.com/en-us`, `https://www.disneyplus.com/de-de`, `https://www.disneyplus.com/en-gb`
- U-NEXT: `https://video.unext.jp/`
- iCloud+価格: `https://support.apple.com/ja-jp/108047`, `https://support.apple.com/en-us/108047`, `https://support.apple.com/de-de/108047`, `https://support.apple.com/en-gb/108047`
- Google One: `https://one.google.com/about/plans`
- Notion: `https://www.notion.com/pricing`
- Figma: `https://www.figma.com/pricing/`
- Adobe Creative Cloud: `https://www.adobe.com/creativecloud/plans.html`, `https://www.adobe.com/jp/creativecloud/plans.html`
- Canva: `https://www.canva.com/pricing/`
- Dropbox: `https://www.dropbox.com/plans`
- Microsoft 365: `https://www.microsoft.com/ja-jp/microsoft-365/buy/compare-all-microsoft-365-products`, `https://www.microsoft.com/en-us/microsoft-365/buy/compare-all-microsoft-365-products`, `https://www.microsoft.com/ja-jp/microsoft-365/business/compare-all-microsoft-365-business-products`, `https://www.microsoft.com/en-us/microsoft-365/business/compare-all-microsoft-365-business-products`
- Google Workspace: `https://workspace.google.com/intl/ja/pricing.html`
- Slack: `https://slack.com/intl/ja-jp/pricing`
- Zoom: `https://www.zoom.com/pricing`
- GitHub: `https://github.com/pricing`
- ChatGPT料金: `https://openai.com/chatgpt/pricing/`

## 2026年6月28日の外貨価格調査結果

採用した価格は、公式ページで通常の継続課金額として確認できたものに限る。
年額プランは月額換算せず、公式表示の年額をそのまま保存する。

| サービス        | 採用した価格                                                                                                                                                    | 未採用理由                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Netflix         | JP: 広告つき 890 JPY/月。DE: 最低価格 4.99 EUR/月。GB: 最低価格 5.99 GBP/月。                                                                                   | US は取得時に地域固定できず、公式価格として扱わない。                                                                |
| YouTube Premium | なし。                                                                                                                                                          | 公式ページの取得結果から、地域別の通常価格を安定して確認できなかった。                                               |
| Spotify         | JP/US/DE/GB の Individual、Student、Duo、Family 月額。                                                                                                          | なし。                                                                                                               |
| Apple Music     | JP/US/DE/GB の Individual、Family、Student 月額。                                                                                                               | なし。                                                                                                               |
| Disney+         | JP の Standard/Premium 月額・年額。US の Standard with Ads 月額、Premium 月額・年額。DE/GB の Standard with Ads 月額、Standard 月額・年額、Premium 月額・年額。 | US の広告なし Standard は今回の公式取得結果で明確に確認できなかったため入れない。6カ月割引などの一時価格は入れない。 |
| iCloud+         | JP/US/DE/GB の 50GB、200GB、2TB、6TB、12TB 月額。                                                                                                               | なし。                                                                                                               |
| Google One      | なし。                                                                                                                                                          | 地域別価格が動的に出し分けられ、今回の取得結果では対象地域の価格を安定して確認できなかった。                         |
| ChatGPT         | なし。                                                                                                                                                          | 公式料金ページの取得結果から、テンプレートへ入れる地域別価格を安定して確認できなかった。                             |

## 2026年6月29日の仕事系テンプレート追加調査結果

採用した価格は、公式ページで通常の継続課金額として確認できたものに限る。
月払い価格を優先する。
年払いの月額表示だけが確認できた場合は、月額料金として自動入力しない。

| サービス             | 採用した価格                                                                                                                         | 未採用理由                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Notion               | JP: Plus 1,650 JPY/月/メンバー、Business 3,150 JPY/月/メンバー。                                                                     | USD/EUR/GBP は今回の取得結果で安定した地域別価格を確認できなかった。                               |
| Figma                | US: Professional Full seat 16 USD/月。                                                                                               | Organization は年払いの月額表示として確認したため、自動入力価格には入れない。JP/EUR/GBP は未確認。 |
| Adobe Creative Cloud | なし。                                                                                                                               | 公式ページの取得結果から、地域別の通常価格を安定して確認できなかった。                             |
| Canva                | なし。                                                                                                                               | 公式ページが取得時に価格本文を返さず、通常価格を確認できなかった。                                 |
| Dropbox              | JP: Plus 1,200 JPY/月、Standard 1,500 JPY/月/ユーザー。                                                                              | USD/EUR/GBP は今回の取得結果で安定した地域別価格を確認できなかった。                               |
| Microsoft 365        | JP: Personal 2,130 JPY/月、Business Standard 2,249 JPY/月/ユーザー。US: Personal 9.99 USD/月、Business Standard 15 USD/月/ユーザー。 | EUR/GBP は月払い価格として明確に確認できなかった。                                                 |
| Google Workspace     | JP: Business Starter 800 JPY/月/ユーザー、Business Standard 1,600 JPY/月/ユーザー。                                                  | USD/EUR/GBP は取得時にJPY表示へ寄ったため採用しない。                                              |
| Slack                | JP: プロ 1,050 JPY/月/ユーザー、ビジネスプラス 2,160 JPY/月/ユーザー。                                                               | USD/EUR/GBP は今回の取得結果で安定した地域別価格を確認できなかった。                               |
| Zoom                 | なし。                                                                                                                               | 公式ページの取得結果から、地域別の通常価格を安定して確認できなかった。                             |
| GitHub               | US: Team 4 USD/月/ユーザー、Enterprise 21 USD/月/ユーザー。                                                                          | JP/EUR/GBP は今回の取得結果で確認できなかった。                                                    |

## MVP範囲外

- テンプレート管理画面
- テンプレートDB化
- 既存サブスクへのテンプレート再適用
- 価格の自動更新
- 解約の自動実行
- 公式価格のクローリング
- サービスロゴの自動設定
