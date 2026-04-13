# 共通UI向け i18n 基盤統一と翻訳欠落解消 仕様書

## Change Summary
Paraglide をアプリ内のユーザー向け共通 UI における主要な翻訳 source of truth とし、`messages/en.json` の不足キーを補完する。今回の変更は、共通ナビ、基本エラー導線、Google 認証導線、カレンダー周辺のユーザー向け補助文言、設定からの言語切り替え結果に絞って整備し、`ja` / `en` の表示一貫性を改善する。法務本文の完全英訳や管理画面全体の多言語化は今回の対象外とする。

## Before
- ストアフロント主要画面の多くは Paraglide を利用しているが、共通 UI に英語固定や `locale === 'en' ? ... : ...` の個別分岐が残っている。
- `messages/ja.json` にある `subscription_tag_filter_active`, `subscription_tag_filter_clear`, `subscription_tag_filter_empty` が `messages/en.json` に存在しない。
- `MobileBottomNav`, `GoogleAuthButton`, `+error.svelte`, `me/personal-info/+page.svelte` に固定文言がある。
- カレンダー共通コンポーネントと `src/lib/locale.ts` に、翻訳 JSON 外で管理されるユーザー向け copy がある。
- `Header` には `LanguageSwitcher` のコメントアウトが残っているが、言語切り替え導線は実質設定画面のみ。

## After

### 翻訳資産
- `messages/en.json` に不足しているタグフィルタ関連キーを追加する。
- 今回対象に含めるユーザー向け文言は、原則として `m.*` から参照する。
- `src/lib/locale.ts` は日付・通貨フォーマット中心の責務に寄せ、UI 文言を持つ helper は最小化する。

### 共通 UI 文言
- `MobileBottomNav` のラベルは固定英語ではなく翻訳キー参照に置き換える。
- `GoogleAuthButton` のデフォルトラベルと失敗時 fallback 文言は翻訳キー参照に置き換える。
- `+error.svelte` の見出し、説明、ホーム導線は `ja` / `en` で切り替わる。
- `me/personal-info/+page.svelte` のリダイレクト文言は翻訳対象にする。

### カレンダー周辺
- `CalendarHeader`, `CalendarGrid`, `EventDetailModal` のユーザー向け補助文言は、locale ternary 直書きではなく翻訳資産から取得する。
- カレンダーの日時フォーマット自体は既存の locale helper を維持する。

### 言語切り替え体験
- 設定画面の `LanguageSwitcher` は既存のまま利用する。
- 言語変更後、ホーム、サブスク管理、分析、カレンダー、設定、および共通 UI で選択ロケールの文言が揃う。
- 今回は `Header` に新しい言語切り替え UI を追加しない。到達性改善は次サイクル候補として残す。

### 対象外
- 管理画面の全画面多言語化
- 利用規約 / プライバシーポリシー本文の英語原文整備
- locale 別サンプルデータ seed の最適化
- 法務ページや FAQ / Push ガイドの copy 管理方式の全面統一

## Components

### New Components
- なし

### Modified Components
- `messages/en.json`
  - 不足しているタグフィルタ関連キーを追加する
- `messages/ja.json`
  - 必要に応じて今回対象文言のキー体系を揃える
- `MobileBottomNav`
  - ナビラベルを翻訳キー参照へ変更する
- `GoogleAuthButton`
  - デフォルトラベルと fallback エラー文言を翻訳対象にする
- `+error.svelte`
  - エラー導線文言を翻訳対応する
- `me/personal-info/+page.svelte`
  - リダイレクト文言を翻訳対応する
- `CalendarHeader`
  - 前月 / 次月 / 今日ラベルを翻訳資産へ寄せる
- `CalendarGrid`
  - セル操作説明や `+n more` 文言を翻訳資産へ寄せる
- `EventDetailModal`
  - 支払い情報ラベル、空状態、閉じる文言を翻訳資産へ寄せる
- `src/lib/locale.ts`
  - UI 文言 helper を必要最小限に絞り、フォーマッタ中心へ寄せる

### Removed Components
- なし

### Unchanged Components
- `LanguageSwitcher` の基本動作
- locale cookie を同期するサーバフック
- 日付 / 通貨フォーマットの基本仕様
- 法務本文レンダリング方式
- 管理画面の構造とルーティング
- DB スキーマ、API 契約、ユーザー設定データモデル

## Responsive Behavior
- モバイル / デスクトップでレイアウト変更は行わず、文言差し替えのみとする。
- `MobileBottomNav` は既存のアイコン中心 UI を維持し、`sr-only` ラベルのみロケール対応する。
- カレンダーは既存グリッド構造を維持し、長い英語文言でも崩れない文言長を選ぶ。
- `+error.svelte` は現在のレイアウトを維持し、長文になりすぎない copy を採用する。

## Acceptance Criteria
- `messages/en.json` に不足キーが追加され、購読一覧のタグフィルタ UI で英語環境でも欠落が起きない。
- `MobileBottomNav`, `GoogleAuthButton`, `+error.svelte`, `me/personal-info/+page.svelte` が `ja` / `en` で適切に表示される。
- カレンダー共通コンポーネント内のユーザー向け補助文言が翻訳資産から取得される。
- 設定画面で言語を切り替えたあと、ホーム、サブスク管理、分析、カレンダー、設定で主要共通 UI の表示言語が揃う。
- DB マイグレーションや API 変更なしで実装できる。
- 管理画面と法務本文は変更されず、今回のスコープ外として維持される。

## Open Edge Cases
- 英語文言は日本語より長くなりやすいため、既存ボタン幅や小さい UI ラベルで省略や折り返しが起きないか確認が必要。
- `locale.ts` の helper をどこまで Paraglide 側へ寄せるかは、Svelte 外の TS 利用箇所との整合を見ながら判断する必要がある。
- `Header` の切り替え導線追加は有効だが、今回は scope creep になるため実装しない。
- 法務ページは head と本文の言語不整合が残るが、これは別サイクルで扱う。
