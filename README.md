# 酸塩基滴定シミュレーター

酸塩基滴定とpH変化をリアルタイムに観察できるWeb教材です。

## デモ

https://takayuki-minagawa.github.io/acid-base-titration-sim/

## 機能

- 強酸/弱酸 × 強塩基/弱塩基 の4パターンの滴定曲線
- ビュレット・ビーカーのCanvasアニメーション（液滴・指示薬の色変化）
- 滴定曲線SVG（当量点マーカー、指示薬変色域の帯表示、クリックで詳細）
- イオン濃度パネル（対数目盛、緩衝領域ハイライト）
- 学習パネル（状態連動の解説文 + クイズ4問）
- 日本語／英語切替（i18n）
- ライト／ダークテーマ切替
- PC・タブレット・スマホ対応レスポンシブUI

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
