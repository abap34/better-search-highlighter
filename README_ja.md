# Better Search Highlighter

<div align="center">
<p>
Better Search Highlighter は一致した箇所を複数段階で強調表示できるページ内検索が行える Chrome 拡張です．
</p>
</div>

<p align="center">
  <img src="assets/demo.gif" alt="Better Search Highlighter demo" width="600">
</p>

<p align="center">
  <a href="README.md">English README </a>
</p>

<p align="center">
  <a href="docs/store-listing/ja.md"><img alt="Chrome Web Store listing draft" src="https://img.shields.io/badge/store-listing--draft-4285F4?logo=googlechrome&logoColor=white"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-blue"></a>
</p>

## 概要

- 標準のページ内検索と同様に現在のページのテキストを検索できます．
- `ArrowUp` と `ArrowDown` キーにより「強調レベル」を変更できます．
  - Level 1: 標準の検索と同様の黄色のハイライト
  - Level 2: 赤色のハイライト
  - Level 3: 点滅が許可されている場合のみ赤色で点滅するハイライト
  - Level 4: ページ全体を暗くし、現在の一致箇所だけを明るく表示
- 点滅が苦手なユーザー向けに点滅を無効化することも可能です．
  - `prefers-reduced-motion` も尊重します．
- 全ての処理はローカルで行われます．
- 動的に生成されたり非常に大規模なページでもパフォーマンスに影響を及ぼさないよう，読み込むテキストの量を制限しています．全てのコンテンツを検索したいときは「全てのコンテンツを検索」オプションを有効にしてください．
  - ⚠️ 無制限にページ内を検索するため一部のページではパフォーマンスに影響を及ぼす可能性があります．

## 使い方

検索パネルは次の方法で開けます。

- 拡張機能のアクションボタン
- 右クリックメニュー
- キーボードショートカット

デフォルトのショートカット:

- Windows / Linux: `Alt+Shift+F`
- macOS: `Option+Shift+F`

パネル内の操作:

- 上向き矢印ボタン / `Shift+Enter`: 前の一致箇所へ移動
- 下向き矢印ボタン / `Enter`: 次の一致箇所へ移動
- 一致番号フィールド: `40` のような番号を入力して `Enter`
- `ArrowUp` : 強調レベルを上げる
- `ArrowDown` : 強調レベルを下げる
- `Escape`: 閉じる

## 設定

設定は検索パネル内の「設定」から変更できます。

- 点滅の有効 / 無効
- 「全てのコンテンツを検索」の有効 / 無効
- 強調レベルのリセット
- パネル位置のリセット
- Chrome ショートカット設定を開く
- 全ての設定のリセット

## 開発

```sh
npm run check
npm run dev:chrome
```
