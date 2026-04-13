# トップページとサブスク一覧への買い切り導線追加 仕様書

## Change Summary

設定画面に限定されている Premium 買い切り導線を、トップページとサブスク一覧にも追加する。既存の `POST /api/stripe/lifetime-checkout` と entitlement ベースのプラン判定を再利用し、DB・Stripe カタログ・Webhook の変更は行わない。今回の変更は「気づける場所を増やすこと」が目的であり、料金体系や checkout の実装方式は維持する。

## Before

- 買い切り CTA は設定画面の Premium モーダルにしかない。
- トップページはログイン済みユーザー向けに「サブスクを開く」「カレンダーを見る」のみ表示する。
- サブスク一覧は Premium 制限時の upgrade 導線はあるが、買い切りオプションは見えない。
- `CurrentPlan` には買い切り判定が入っているが、その情報をトップページやサブスク一覧では活用していない。

## After

### トップページ

- ログイン済みかつ非 Premium のユーザーに、既存 Hero CTA の近くで買い切り訴求を表示する。
- CTA 文言は「6,000円で買い切る」とし、補助文で「一度の支払いで Premium を継続利用できる」ことを伝える。
- ログイン前ユーザーには直接 checkout CTA を出さず、既存の Google サインイン導線を優先する。
- 既に Premium 中、または lifetime 購入済みのユーザーにはこの upsell を表示しない。

### サブスク一覧

- 非 Premium ユーザー向けに、既存の export / premium 訴求の近傍へ買い切り CTA を追加する。
- 既存の「Premium で CSV」導線と並べて、月額プラン誘導ではなく買い切り選択肢があることを明示する。
- すでに lifetime 購入済みのユーザーには CTA を出さず、必要なら購入済みラベルのみ表示する。
- すでにサブスク Premium 中のユーザーには買い切り CTA を出さない。

### Checkout 起動方式

- 画面ごとに別 API は作らない。
- 既存の settings 画面が使っている `lifetime-checkout` 呼び出しロジックを、共通関数または再利用可能な handler に寄せる。
- API 呼び出し時の `returnPath` は各画面のパスを使い、決済完了後に元の導線へ戻れるようにする。

### 状態分岐

- 表示条件は以下に統一する。
  - 未ログイン: 買い切り CTA 非表示
  - ログイン済み / 非 Premium: 買い切り CTA 表示
  - ログイン済み / subscription Premium: 買い切り CTA 非表示
  - ログイン済み / lifetime 購入済み: 買い切り CTA 非表示、必要に応じて購入済み表示
- 判定には既存の `currentPlan.isPremium`, `currentPlan.hasSubscriptionAccess`, `currentPlan.hasLifetimeEntitlement` を使う。

### 文言と見た目

- 既存の Premium 訴求トーンに合わせる。
- トップページでは Hero 配下に小さめの upsell セクション、サブスク一覧ではカードまたは横並び CTA とする。
- ボタンは既存 UI システムの `Button` を使い、設定画面と同じ loading / error ハンドリングを踏襲する。
- 必要な新規文言は i18n メッセージに追加する。

## Components

### New Components

- 必須ではない
- ただし重複が増える場合は、`LifetimePurchaseCta` のような小さな共通コンポーネント化を検討してよい

### Modified Components

- `src/routes/(storeFront)/+page.svelte`
  - ログイン済み無料ユーザー向けの買い切り CTA を追加する
- `src/routes/(storeFront)/subscriptions/+page.svelte`
  - 非 Premium ユーザー向けの買い切り訴求ブロックを追加する
- 必要に応じて共通 helper
  - 既存の lifetime checkout 呼び出しを他画面でも使えるように整理する
- `messages/ja.json`, `messages/en.json`
  - トップページ / サブスク一覧用の CTA と補助文を追加する

### Removed Components

- なし

### Unchanged Components

- Stripe webhook
- entitlement 付与処理
- settings 画面の買い切り導線
- DB schema / migration
- Stripe catalog と product 定義

## Responsive Behavior

- トップページでは既存 Hero の余白と CTA 群を壊さず、モバイルで縦積みになるようにする。
- サブスク一覧の買い切り訴求は、既存カードレイアウトの中で情報量を増やしすぎない。
- 長い日本語文言でもボタンが極端に高くならないようにする。

## Acceptance Criteria

- ログイン済み非 Premium ユーザーがトップページで買い切り CTA を確認できる。
- ログイン済み非 Premium ユーザーがサブスク一覧でも買い切り CTA を確認できる。
- どちらの CTA も同じ `lifetime-checkout` API を利用する。
- checkout 成功後、戻り先の画面で Premium 状態として扱われる。
- subscription Premium または lifetime 購入済みのユーザーには不要な upsell が出ない。
- 未ログイン時は既存のサインイン導線を維持し、直接 checkout へは進ませない。

## Open Edge Cases

- ログイン直後に plan 情報が stale な場合、一瞬 upsell が見える可能性があるため、サーバー load の plan 判定を優先する。
- settings 画面と他画面で loading / toast 文言がずれると体験が分裂するため、可能なら共通化する。
- トップページで買い切りを強く出しすぎると、サブスク管理アプリ自体の主導線より前に出るため、見た目の優先順位に注意する。
