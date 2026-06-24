# 国際化と時差対応の通知仕様

## 目的

SubTrack の請求日と通知判定を、表示言語ではなくユーザーごとのタイムゾーンに基づいて扱う。英語UIを日本で使う場合、日本語UIを海外で使う場合、旅行や移住でタイムゾーンが変わる場合でも、ユーザーの生活上の暦日に沿って通知される状態を目指す。

## 対象範囲

第一実装では以下を対象にする。

- ユーザーごとのタイムゾーン保存
- ユーザーごとの既定通知時刻保存
- 請求日の計算と保存形式の正規化
- 通知cronの時差対応
- 重複通知防止の現地日付化
- 設定画面でのタイムゾーンと通知時刻の変更

以下は第一実装の対象外とする。

- サブスクごとの通知時刻
- 複数通知スケジュール
- 旅行中だけの一時タイムゾーン
- 通知送信履歴の専用 outbox テーブル

## 設定値

`user` に以下の設定を持つ。

- `timeZone`: IANA time zone ID。例: `Asia/Tokyo`, `America/Los_Angeles`
- `defaultNotifyTime`: `HH:mm` 形式のローカル時刻。例: `09:00`

初回はブラウザの `Intl.DateTimeFormat().resolvedOptions().timeZone` を使って保存する。取得できない場合、または不正な値の場合は `Asia/Tokyo` を使う。

表示言語の `locale` と `timeZone` は独立して扱う。`ja` だから `Asia/Tokyo`、`en` だから `UTC` のような推定はしない。

## 請求日の扱い

サブスクの請求日は時刻付きの瞬間ではなく、ユーザーの暦日として扱う。

- `firstPaymentDate`: `YYYY-MM-DD`
- `nextBillingAt`: 既存カラム名のまま、今後は `YYYY-MM-DD` に正規化する
- `daysUntilNextBilling`: ユーザーの `timeZone` における現地日付との差分

既存データに `2026-04-01T00:00:00.000Z` のようなISO文字列が入っていても、読み取り・再計算時に `YYYY-MM-DD` へ丸める。

## 通知判定

通知cronは毎時実行される。各ユーザーについて、以下を満たすサブスクだけを通知対象にする。

- サブスクが有効である
- サンプルデータではない
- ユーザーの `timeZone` で見た今日と次回請求日の差が `notifyDaysBefore` と一致する
- ユーザーの `timeZone` で見た現在時刻が `defaultNotifyTime` 以降である
- `lastNotifiedDate` がユーザーの現地日付の今日ではない

送信後は `lastNotifiedAt` に実際の送信時刻を保存し、`lastNotifiedDate` にユーザーの現地日付 `YYYY-MM-DD` を保存する。

`lastNotifiedDate` は現地日付の重複防止用であり、監査用の正確な送信時刻は `lastNotifiedAt` を使う。

## 設定画面

設定画面の通知セクションに以下を追加する。

- タイムゾーン
- 通知時刻

ユーザーは自動検出された値を確認し、必要なら変更できる。

## 互換性

既存ユーザーはマイグレーションにより以下の初期値を持つ。

- `timeZone`: `Asia/Tokyo`
- `defaultNotifyTime`: `09:00`
- `lastNotifiedDate`: `NULL`

初回クライアント表示時にブラウザのタイムゾーンを検出し、DB値が未設定または初期値のまま必要に応じて更新する。

## 検証観点

- `Asia/Tokyo` と `America/Los_Angeles` で同じUTC時刻でも通知対象日が変わること
- `defaultNotifyTime` より前は通知されず、以降に通知されること
- 同じ現地日付で二重通知されないこと
- `nextBillingAt` がISO文字列から `YYYY-MM-DD` に正規化されること
- 設定画面でタイムゾーンと通知時刻を変更できること
