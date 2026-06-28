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

今回は既存の日本円価格を `prices` に移行する。
外貨価格は後続の価格調査で追加する。
調査対象は、Netflix、YouTube Premium、Spotify、Apple Music、Disney+、iCloud+、Google One、ChatGPT とする。

`0` は「自分で入力」の意味として扱う。保存前にユーザーが実際の請求額へ編集する前提。

## 初期テンプレート

初期テンプレートは10件に限定する。

| サービス        | カテゴリタグ                   | 価格候補                            | 解約URL方針                   |
| --------------- | ------------------------------ | ----------------------------------- | ----------------------------- |
| Netflix         | 動画 / Video                   | 公式ページで確認できる範囲のみ      | Netflixアカウント管理         |
| YouTube Premium | 動画, 音楽 / Video, Music      | 現時点では価格なし                  | YouTube有料メンバーシップ管理 |
| Amazon Prime    | 買い物, 動画 / Shopping, Video | 現時点では価格なし                  | Amazon Prime会員情報管理      |
| Spotify         | 音楽 / Music                   | 公式ページで確認できるプラン        | Spotifyアカウント管理         |
| Apple Music     | 音楽 / Music                   | 公式ページで確認できるプラン        | Appleサブスクリプション管理   |
| Disney+         | 動画 / Video                   | 現時点では価格なし                  | Disney+アカウント管理         |
| U-NEXT          | 動画 / Video                   | 現時点では価格なし                  | U-NEXTアカウント管理          |
| iCloud+         | クラウド / Cloud               | Apple公式サポートで確認できるプラン | Appleサブスクリプション管理   |
| Google One      | クラウド / Cloud               | 現時点では価格なし                  | Google One設定                |
| ChatGPT         | AI, 仕事 / AI, Work            | 現時点では価格なし                  | ChatGPTサブスクリプション設定 |

## テンプレートアイコン運用

- 外部取得と正規化は `pnpm run fetch:template-icons` で明示的に行う。
- R2への同期は `pnpm run sync:template-icons -- --remote` で行う。
- ローカル検証時は `pnpm run sync:template-icons -- --local` を使う。必要に応じて `--persist-to <dir>` を併用する。
- 通常デプロイでは外部サイトからアイコンを取得し直さない。レビュー済みの `static/template-icons/*.png` をR2へ同期する。

## 今回確認した公式情報

- Netflix: `https://www.netflix.com/jp/`
- Netflix解約ヘルプ: `https://help.netflix.com/ja/node/407`
- YouTube Premium: `https://www.youtube.com/premium?gl=JP&hl=ja`
- YouTube有料メンバーシップ管理ヘルプ: `https://support.google.com/youtube/answer/6305537?hl=ja`
- Amazon Prime: `https://www.amazon.co.jp/amazonprime`
- Spotify Premium: `https://www.spotify.com/jp/premium/`
- Apple Music: `https://www.apple.com/jp/apple-music/`
- Appleサブスクリプション解約: `https://support.apple.com/ja-jp/118428`
- Disney+: `https://www.disneyplus.com/ja-jp`
- U-NEXT: `https://video.unext.jp/`
- iCloud+価格: `https://support.apple.com/ja-jp/108047`
- Google One: `https://one.google.com/about/plans`
- ChatGPT料金: `https://openai.com/chatgpt/pricing/`

## MVP範囲外

- テンプレート管理画面
- テンプレートDB化
- 既存サブスクへのテンプレート再適用
- 価格の自動更新
- 解約の自動実行
- 公式価格のクローリング
- サービスロゴの自動設定
