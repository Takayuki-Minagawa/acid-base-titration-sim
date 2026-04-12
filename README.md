# 酸塩基滴定シミュレーター

酸塩基滴定と pH 変化をリアルタイムに観察できる Web 教材です。

## デモ

https://takayuki-minagawa.github.io/acid-base-titration-sim/

## 機能

- 強酸/弱酸 × 強塩基/弱塩基 の組み合わせによる滴定曲線
- ビュレット・ビーカーの Canvas アニメーション（液滴・指示薬の色変化）
- 滴定曲線 SVG（当量点マーカー、指示薬変色域の帯表示、ホバーで詳細）
- イオン濃度パネル（対数目盛、緩衝領域ハイライト、Henderson–Hasselbalch 式表示）
- 学習パネル（状態連動の解説文 + クイズ 4 問）
- 日本語／英語切替（i18n）
- ライト／ダークテーマ切替
- PC・タブレット・スマホ対応レスポンシブ UI
- CSV エクスポート（現在までの滴定データ）

## 対応化学種

| 種別 | 化学種 | 備考 |
|------|--------|------|
| 酸（試料 or 滴下液） | HCl、H₂SO₄、CH₃COOH、H₃PO₄ | H₂SO₄ は 2 価として計算。H₃PO₄ は第 1 段のみ |
| 塩基（試料 or 滴下液） | NaOH、KOH、NH₃ | |
| 指示薬 | メチルオレンジ（3.1–4.4）、BTB（6.0–7.6）、フェノールフタレイン（8.3–10.0） | |

## 技術スタック

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- i18next / react-i18next
- Canvas 2D（実験アニメーション）
- SVG（滴定曲線）

## ローカル実行

```bash
npm install
npm run dev
```

## デプロイ

`main` ブランチへ push すると GitHub Actions が自動的に GitHub Pages へデプロイします。
