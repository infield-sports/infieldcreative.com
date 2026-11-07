# INFIELD MAGAZINE の記事の書き方

記事は `_magazine/articles/` に Markdown で置く。ファイル名がそのままURLになる。

- `uniform-order-flow.md` → https://infieldcreative.com/magazine/uniform-order-flow/
- ファイル名は半角英小文字・数字・ハイフンだけ。公開後は変えない(検索の評価がリセットされる)

## 記事の先頭

```
---
title: 記事タイトル(検索結果に出る。32文字前後が目安)
description: 120文字前後の要約(検索結果の説明文になる)
date: 2026-11-07
updated: 2026-12-01      ← 内容を直したときだけ
category: uniform        ← uniform / nutrition / creative / field
image: /images/MAGAZINE/xxx.jpg   ← なければ省略(カテゴリ名のカードになる)
draft: true              ← 下書き。書くとページが作られない
---
```

## 公開までの流れ

1. 記事を書いたら `npm install`(初回だけ)→ `npm run build`
2. 別ブランチでコミット・push → 確認用URL `https://{ブランチ名}.infield-site.pages.dev/magazine/` で確認
3. 中田さんの確認後に main へ反映 = 公開

`npm run build` で、記事ページ・一覧・RSS(`/magazine/feed.xml`)・`sitemap.xml`、
トップの新着欄、各サービスページの関連記事欄がまとめて更新される。

## 書くときのルール

- 価格・納期などは公式サイトと商品マスタに合わせ、「◯年◯月時点」と書く
- 実績・数字・お客様の声は事実だけ。未確認のものは書かない
- 栄養の記事は効能を断定しない。数値には出典を書く
- 記事の最後の案内(サービスページへの導線)はカテゴリごとに自動で付く
- 見出しは `##`(大見出し)と `###`(小見出し)。`##` が3つ以上あると目次が付く
