# サービス入力補助テンプレート仕様

作成日: 2026年6月23日

## 目的

サブスク登録時に代表的なサービスを選択すると、サービス名、カテゴリタグ、候補価格、支払い周期、解約URL、解約方法、解約メモをフォームへ自動入力する。

この機能は入力補助であり、価格や解約手順をSubTrackが保証するものではない。保存前にユーザーが確認・編集できる状態を前提にする。

## MVPの方針

- テンプレートはDBではなく静的データとして `src/lib/service-templates.ts` に持つ。
- 保存済みサブスクには `serviceTemplateId` を残し、将来DB管理へ移行しやすくする。
- カテゴリは専用カラムではなく、既存の `tags` に自動入力する。
- 価格は参考値としてフォームに入れる。ユーザーが料金欄を編集したら `priceEditedByUser=true` で保存する。
- `planName` は保存し、詳細画面だけに表示する。一覧カードには出さない。
- `lastVerifiedAt` と `sourceUrl` はテンプレート側にだけ持ち、新規登録フォームの注意文に表示する。保存済みサブスクにはスナップショットしない。
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

`lastVerifiedAt` と `sourceUrl` は保存しない。保存後はユーザーが確認した `amount`、`planName`、`cancellationUrl` を正とする。

## UI

新規登録フォームの先頭に「利用中のサービスを選択」の検索欄を追加する。

1. ユーザーがサービス名を入力する。
2. 候補を表示する。
3. 候補を選ぶ。
4. プラン候補を選ぶ。
5. サービス名、周期、料金、タグ、解約URL、解約方法、解約メモをフォームへ反映する。
6. 料金欄の下に参考価格の注意文を表示する。

注意文の要点:

- 料金は参考価格である。
- 実際の請求額に合わせて編集する。
- テンプレート情報の確認日を表示する。
- 公式ページを情報元として表示する。

解約セクションには、公式管理ページへ案内するメモを入れる。SubTrackは解約代行をしない。

## 価格候補の扱い

公式ページ本文でJPY価格を確認できるプランだけ候補価格を入れる。確認しにくいサービスや外貨価格のみのサービスは、価格を `null` とし、フォーム反映時は `0` にする。

`0` は「自分で入力」の意味として扱う。保存前にユーザーが実際の請求額へ編集する前提。

## 初期テンプレート

初期テンプレートは10件に限定する。

| サービス        | カテゴリタグ                   | 価格候補                            | 解約URL方針                   |
| --------------- | ------------------------------ | ----------------------------------- | ----------------------------- |
| Netflix         | 動画 / Video                   | 公式ページで確認できる範囲のみ      | Netflixアカウント管理         |
| YouTube Premium | 動画, 音楽 / Video, Music      | 価格なし                            | YouTube有料メンバーシップ管理 |
| Amazon Prime    | 買い物, 動画 / Shopping, Video | 価格なし                            | Amazon Prime会員情報管理      |
| Spotify         | 音楽 / Music                   | 公式ページで確認できるプラン        | Spotifyアカウント管理         |
| Apple Music     | 音楽 / Music                   | 公式ページで確認できるプラン        | Appleサブスクリプション管理   |
| Disney+         | 動画 / Video                   | 価格なし                            | Disney+アカウント管理         |
| U-NEXT          | 動画 / Video                   | 価格なし                            | U-NEXTアカウント管理          |
| iCloud+         | クラウド / Cloud               | Apple公式サポートで確認できるプラン | Appleサブスクリプション管理   |
| Google One      | クラウド / Cloud               | 価格なし                            | Google One設定                |
| ChatGPT         | AI, 仕事 / AI, Work            | 価格なし                            | ChatGPTサブスクリプション設定 |

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
