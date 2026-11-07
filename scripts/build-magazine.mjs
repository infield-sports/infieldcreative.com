// MAGAZINE ビルドスクリプト
// _magazine/articles/*.md から /magazine/ 以下のページを生成し、
// トップページ・サービスページの記事欄と sitemap.xml を更新する。
// 使い方: npm run build
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://infieldcreative.com";
const OUT = join(ROOT, "magazine");
const CSS_V = 1;

// ---------- カテゴリ ----------
export const CATEGORIES = {
  uniform: {
    name: "ユニフォーム・グッズ", en: "UNIFORM & GOODS", division: "TEAM SOLUTIONS",
    lead: "オーダーユニフォームの注文方法や大会規定、チームグッズづくりのポイント。",
    cta: { title: "オーダーユニフォームのご相談", text: "1着から製作できます。枚数を入れるとその場で金額と入金期限の目安がわかります。",
      links: [["見積もりを試す", "/inblaze-estimate.html"], ["INBLAZE UNIFORMを見る", "/inblaze-uniform.html"]] },
    pages: ["inblaze-uniform.html", "team-solutions.html"],
  },
  nutrition: {
    name: "栄養・コンディション", en: "NUTRITION", division: "PERFORMANCE SOLUTIONS",
    lead: "補食やプロテインの選び方など、競技者と保護者のための栄養とコンディショニング。",
    cta: { title: "INBLAZEプロテイン", text: "食事を基本に、足りない分を補うために作ったプロテインです。",
      links: [["INBLAZEプロテインを見る", "/inblaze-protein.html"], ["PERFORMANCE SOLUTIONS", "/performance-solutions.html"]] },
    pages: ["inblaze-protein.html", "performance-solutions.html"],
  },
  creative: {
    name: "撮影・Web", en: "PHOTO & WEB", division: "CREATIVE SOLUTIONS",
    lead: "スポーツ写真の撮り方やチームのホームページづくりなど、発信のためのクリエイティブ。",
    cta: { title: "撮影・Web制作のご相談", text: "試合撮影からチームのホームページ制作まで承ります。",
      links: [["CREATIVE SOLUTIONSを見る", "/creative-solutions.html"], ["お問い合わせ", "/contact.html"]] },
    pages: ["creative-solutions.html"],
  },
  field: {
    name: "コート・施設", en: "COURT & FIELD", division: "FIELD SOLUTIONS",
    lead: "3x3コートの導入やレンタルなど、プレー環境づくりのこと。",
    cta: { title: "コートの販売・レンタルのご相談", text: "バスケットボールコートの販売とレンタルを行っています。",
      links: [["FIELD SOLUTIONSを見る", "/field-solutions.html"], ["お問い合わせ", "/contact.html"]] },
    pages: ["field-solutions.html"],
  },
};

// ---------- 記事の読み込み ----------
function parseFrontMatter(src, file) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: 先頭に --- で囲んだ記事情報がありません`);
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^".*"$/.test(v)) v = v.slice(1, -1);
    if (v.startsWith("[") && v.endsWith("]")) v = v.slice(1, -1).split(",").map(s => s.trim().replace(/^"|"$/g, "")).filter(Boolean);
    meta[kv[1]] = v;
  }
  return { meta, body: m[2] };
}

const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmtDate = d => { const [y, mo, da] = d.split("-").map(Number); return `${y}.${String(mo).padStart(2, "0")}.${String(da).padStart(2, "0")}`; };

function loadArticles() {
  const dir = join(ROOT, "_magazine", "articles");
  const list = [];
  for (const f of readdirSync(dir).filter(f => f.endsWith(".md")).sort()) {
    const { meta, body } = parseFrontMatter(readFileSync(join(dir, f), "utf8"), f);
    const slug = f.replace(/\.md$/, "");
    for (const k of ["title", "description", "date", "category"]) if (!meta[k]) throw new Error(`${f}: ${k} がありません`);
    if (!CATEGORIES[meta.category]) throw new Error(`${f}: category は ${Object.keys(CATEGORIES).join(" / ")} のどれか`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) throw new Error(`${f}: date は 2026-11-07 の形式`);
    if (meta.updated && !/^\d{4}-\d{2}-\d{2}$/.test(meta.updated)) throw new Error(`${f}: updated は 2026-11-07 の形式`);
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`${f}: ファイル名は半角英小文字・数字・ハイフンのみ`);
    if (meta.draft === "true") continue;
    list.push({ ...meta, slug, body });
  }
  return list.sort((a, b) => (b.date + b.slug).localeCompare(a.date + a.slug));
}

// 見出しに id を付け、目次を作る
function renderBody(md) {
  const toc = [];
  const slugify = t => "h-" + (toc.length + 1);
  const renderer = new marked.Renderer();
  renderer.heading = ({ tokens, depth }) => {
    const text = marked.Parser.parseInline(tokens);
    if (depth === 2) {
      const id = slugify(text);
      toc.push({ id, text: text.replace(/<[^>]+>/g, "") });
      return `<h2 id="${id}">${text}</h2>\n`;
    }
    return `<h${depth}>${text}</h${depth}>\n`;
  };
  renderer.table = function (token) {
    return `<div class="mg-table">${marked.Renderer.prototype.table.call(this, token)}</div>`;
  };
  renderer.link = function (token) {
    const html = marked.Renderer.prototype.link.call(this, token);
    return /^https?:\/\//.test(token.href) && !token.href.startsWith(SITE) ? html.replace("<a ", '<a target="_blank" rel="noopener" ') : html;
  };
  const html = marked.parse(md, { renderer, gfm: true });
  const chars = md.replace(/[#>*`\-|\[\]()\s]/g, "").length;
  return { html, toc, minutes: Math.max(1, Math.round(chars / 500)) };
}

// ---------- 共通パーツ ----------
const SNS = readFileSync(join(ROOT, "service.html"), "utf8");
const headerSns = SNS.match(/<div class="header-sns">[\s\S]*?<\/div>/)[0];
const footerSns = SNS.match(/<div class="footer-sns">[\s\S]*?<\/div>/)[0];

const head = ({ title, description, path, type = "website", image, extra = "" }) => `<!DOCTYPE html>
<html lang="ja">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-Y2J12Z0KMR"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-Y2J12Z0KMR');
  </script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${SITE}${path}">
  <meta property="og:type" content="${type}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${SITE}${path}">
  <meta property="og:site_name" content="INFIELD">
  <meta property="og:image" content="${SITE}${image || "/images/LOGO/INFIELD_logo_square_wht.png"}">
  <meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
  <link rel="alternate" type="application/rss+xml" title="INFIELD MAGAZINE" href="/magazine/feed.xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,700;0,800;1,700;1,800&family=Caveat:wght@600&family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css?v=16">
  <link rel="stylesheet" href="/css/magazine.css?v=${CSS_V}">
  <link rel="icon" type="image/png" sizes="32x32" href="/images/LOGO/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/images/LOGO/favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/images/LOGO/apple-touch-icon.png">
${extra}</head>`;

const header = () => `<body>

  <!-- ============ Header ============ -->
  <header class="site-header">
    <div class="header-inner">
      <a href="/" class="logo" aria-label="INFIELD ホーム">
        <img src="/images/LOGO/INFIELD_logo_font_wht.png" alt="INFIELD SPORTS BUSINESS PARTNER" class="logo-img">
      </a>

      ${headerSns}

      <button class="menu-toggle" aria-label="メニューを開く" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>

      <nav class="global-nav" id="global-nav">
        <a href="/">HOME</a>
        <div class="nav-item">
          <a href="/service.html">SERVICE</a>
          <button type="button" class="nav-dropdown-toggle" aria-expanded="false" aria-label="SERVICEメニューの開閉"></button>
          <div class="nav-dropdown">
            <div class="nav-dropdown-row">
              <a href="/team-solutions.html">TEAM SOLUTIONS</a>
              <a href="/inblaze-uniform.html" class="nav-dropdown-sub">オーダーユニフォーム</a>
            </div>
            <a href="/field-solutions.html">FIELD SOLUTIONS</a>
            <a href="/creative-solutions.html">CREATIVE SOLUTIONS</a>
            <div class="nav-dropdown-row">
              <a href="/performance-solutions.html">PERFORMANCE SOLUTIONS</a>
              <a href="/inblaze-protein.html" class="nav-dropdown-sub">INBLAZEプロテイン</a>
            </div>
          </div>
        </div>
        <a href="/works.html">WORKS</a>
        <a href="/magazine/" class="is-active">MAGAZINE</a>
        <a href="/about.html">ABOUT</a>
        <a href="/contact.html" class="nav-contact">CONTACT</a>
      </nav>
    </div>
  </header>
`;

const footer = () => `
  <!-- ============ Footer ============ -->
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-logo">
          <img src="/images/LOGO/INFIELD_logo_square_wht.png" alt="INFIELD" class="footer-logo-mark">
          <p class="footer-logo-text">INFIELD</p>
        </div>
        <nav class="footer-nav">
          <a href="/">HOME</a>
          <a href="/service.html">SERVICE</a>
          <a href="/works.html">WORKS</a>
          <a href="/magazine/">MAGAZINE</a>
          <a href="/about.html">ABOUT</a>
          <a href="/contact.html">CONTACT</a>
        </nav>
        <div class="footer-sub">
          ${footerSns}
          <a href="/privacy.html" class="footer-privacy">PRIVACY POLICY</a>
        </div>
      </div>
      <p class="footer-copy">&copy;2024 INFIELD</p>
    </div>
  </footer>

  <script src="/js/main.js?v=3"></script>
</body>
</html>
`;

// 記事カード(一覧・トップ・サービスページで共通)
export const card = (a, { headingTag = "h3" } = {}) => {
  const c = CATEGORIES[a.category];
  const visual = a.image
    ? `<img class="mg-card-img" src="${esc(a.image)}" alt="" loading="lazy">`
    : `<div class="mg-card-img mg-card-type" aria-hidden="true"><span>${c.en}</span></div>`;
  return `<a class="mg-card" href="/magazine/${a.slug}/">
        ${visual}
        <div class="mg-card-body">
          <p class="mg-card-meta"><span class="mg-cat">${esc(c.name)}</span><time datetime="${a.date}">${fmtDate(a.date)}</time></p>
          <${headingTag} class="mg-card-title">${esc(a.title)}</${headingTag}>
        </div>
      </a>`;
};

const catNav = active => `<nav class="mg-cats" aria-label="カテゴリ">
          <a href="/magazine/"${active ? "" : ' class="is-active" aria-current="page"'}>すべて</a>
${Object.entries(CATEGORIES).map(([k, c]) => `          <a href="/magazine/${k}/"${active === k ? ' class="is-active" aria-current="page"' : ""}>${esc(c.name)}</a>`).join("\n")}
        </nav>`;

const breadcrumbLd = items => JSON.stringify({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + path })),
});

// ---------- ページ生成 ----------
function listPage(articles, catKey) {
  const c = catKey && CATEGORIES[catKey];
  const path = catKey ? `/magazine/${catKey}/` : "/magazine/";
  const title = c ? `${c.name}の記事一覧 | INFIELD MAGAZINE` : "INFIELD MAGAZINE | スポーツチームと競技者のためのコラム";
  const description = c ? c.lead : "ユニフォームの注文方法、スポーツ栄養、スポーツ写真の撮り方など、スポーツの現場に役立つ情報をINFIELDがお届けします。";
  const crumbs = [["HOME", "/"], ["MAGAZINE", "/magazine/"], ...(c ? [[c.name, path]] : [])];
  return head({ title, description, path, extra: `  <script type="application/ld+json">${breadcrumbLd(crumbs)}</script>\n` }) + header() + `
  <main class="mg">
    <section class="page-hero">
      <div class="container">
        <div class="section-title">
          <span class="en">MAGAZINE</span>
          <span class="jp">${c ? esc(c.name) : "コラム"}</span>
        </div>
        <p class="mg-lead">${esc(description)}</p>
        ${catNav(catKey)}
      </div>
    </section>

    <section class="section mg-list-section">
      <div class="container">
${articles.length ? `        <div class="mg-grid">\n      ${articles.map(a => card(a, { headingTag: "h2" })).join("\n      ")}\n        </div>` : `        <p class="mg-empty">このカテゴリの記事は準備中です。</p>`}
      </div>
    </section>
  </main>
` + footer();
}

function articlePage(a, all) {
  const c = CATEGORIES[a.category];
  const { html, toc, minutes } = renderBody(a.body);
  const path = `/magazine/${a.slug}/`;
  const related = all.filter(x => x.category === a.category && x.slug !== a.slug).slice(0, 3);
  const ld = {
    "@context": "https://schema.org", "@type": "BlogPosting",
    headline: a.title, description: a.description,
    datePublished: a.date, dateModified: a.updated || a.date,
    mainEntityOfPage: SITE + path,
    image: SITE + (a.image || "/images/LOGO/INFIELD_logo_square_wht.png"),
    author: { "@type": "Organization", name: a.author || "INFIELD", url: SITE + "/" },
    publisher: { "@type": "Organization", name: "合同会社INFIELD", url: SITE + "/", logo: { "@type": "ImageObject", url: SITE + "/images/LOGO/INFIELD_logo_square_wht.png" } },
    articleSection: c.name,
  };
  const crumbs = [["HOME", "/"], ["MAGAZINE", "/magazine/"], [c.name, `/magazine/${a.category}/`], [a.title, path]];
  return head({
    title: `${a.title} | INFIELD MAGAZINE`, description: a.description, path, type: "article", image: a.image,
    extra: `  <meta property="article:published_time" content="${a.date}">
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
  <script type="application/ld+json">${breadcrumbLd(crumbs)}</script>
`,
  }) + header() + `
  <main class="mg">
    <article class="mg-article">
      <header class="mg-article-head">
        <nav class="mg-crumbs" aria-label="パンくずリスト">
          <a href="/magazine/">MAGAZINE</a><span aria-hidden="true">/</span><a href="/magazine/${a.category}/">${esc(c.name)}</a>
        </nav>
        <h1 class="mg-title">${esc(a.title)}</h1>
        <p class="mg-article-meta">
          <time datetime="${a.date}">${fmtDate(a.date)}</time>${a.updated && a.updated !== a.date ? `<span>更新 <time datetime="${a.updated}">${fmtDate(a.updated)}</time></span>` : ""}<span>約${minutes}分で読めます</span>
        </p>
        ${a.image ? `<img class="mg-hero-img" src="${esc(a.image)}" alt="">` : ""}
        <p class="mg-summary">${esc(a.description)}</p>
      </header>
${toc.length >= 3 ? `
      <nav class="mg-toc" aria-labelledby="toc-title">
        <p id="toc-title" class="mg-toc-title">目次</p>
        <ol>
${toc.map(t => `          <li><a href="#${t.id}">${esc(t.text)}</a></li>`).join("\n")}
        </ol>
      </nav>
` : ""}
      <div class="mg-body">
${html}
      </div>

      <aside class="mg-cta">
        <p class="mg-cta-eyebrow">${esc(c.division)}</p>
        <p class="mg-cta-title">${esc(c.cta.title)}</p>
        <p class="mg-cta-text">${esc(c.cta.text)}</p>
        <div class="mg-cta-links">
${c.cta.links.map(([t, h], i) => `          <a class="${i === 0 ? "mg-btn mg-btn-primary" : "mg-btn"}" href="${h}">${esc(t)}</a>`).join("\n")}
        </div>
      </aside>
    </article>
${related.length ? `
    <section class="section mg-related">
      <div class="container">
        <p class="mg-related-title">${esc(c.name)}の記事</p>
        <div class="mg-grid">
      ${related.map(r => card(r)).join("\n      ")}
        </div>
      </div>
    </section>
` : ""}
    <div class="mg-back"><a class="btn-outline" href="/magazine/">記事一覧へ</a></div>
  </main>
` + footer();
}

function feed(articles) {
  const items = articles.slice(0, 20).map(a => `    <item>
      <title>${esc(a.title)}</title>
      <link>${SITE}/magazine/${a.slug}/</link>
      <guid>${SITE}/magazine/${a.slug}/</guid>
      <description>${esc(a.description)}</description>
      <category>${esc(CATEGORIES[a.category].name)}</category>
      <pubDate>${new Date(a.date + "T09:00:00+09:00").toUTCString()}</pubDate>
    </item>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>INFIELD MAGAZINE</title>
    <link>${SITE}/magazine/</link>
    <description>スポーツの現場に役立つ情報をINFIELDがお届けします。</description>
    <language>ja</language>
${items}
  </channel>
</rss>
`;
}

// ---------- 既存ページへの差し込み ----------
function inject(file, key, html) {
  const p = join(ROOT, file);
  const src = readFileSync(p, "utf8");
  const re = new RegExp(`(<!-- MAGAZINE:${key}:START -->)[\\s\\S]*?(<!-- MAGAZINE:${key}:END -->)`);
  if (!re.test(src)) throw new Error(`${file}: <!-- MAGAZINE:${key}:START --> がありません`);
  writeFileSync(p, src.replace(re, `$1\n${html}\n    $2`));
}

const blockSection = (articles, { en, jp, more, moreLabel }) => !articles.length ? "" : `    <section class="section mg-pick">
      <div class="container">
        <div class="section-title reveal">
          <span class="en">${en}</span>
          <span class="jp">${esc(jp)}</span>
        </div>
        <div class="mg-grid">
      ${articles.map(a => card(a)).join("\n      ")}
        </div>
        <div style="text-align:center; margin-top:40px;">
          <a class="btn-outline" href="${more}" style="font-size:16px; padding:14px 48px;">${moreLabel}</a>
        </div>
      </div>
    </section>`;

// ---------- 実行 ----------
const articles = loadArticles();
rmSync(OUT, { recursive: true, force: true });
const write = (rel, html) => { const p = join(OUT, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, html); };

write("index.html", listPage(articles));
for (const k of Object.keys(CATEGORIES)) write(`${k}/index.html`, listPage(articles.filter(a => a.category === k), k));
for (const a of articles) {
  if (CATEGORIES[a.slug]) throw new Error(`${a.slug}: カテゴリ名と同じファイル名は使えません`);
  write(`${a.slug}/index.html`, articlePage(a, articles));
}
write("feed.xml", feed(articles));

inject("index.html", "LATEST", blockSection(articles.slice(0, 3), { en: "MAGAZINE", jp: "コラム", more: "magazine/", moreLabel: "MORE" }));
for (const [k, c] of Object.entries(CATEGORIES)) {
  for (const page of c.pages) {
    inject(page, "RELATED", blockSection(articles.filter(a => a.category === k).slice(0, 3), {
      en: "MAGAZINE", jp: `${c.name}のコラム`, more: `magazine/${k}/`, moreLabel: "記事一覧へ",
    }));
  }
}

// sitemap.xml の MAGAZINE 部分を差し替え
const smPath = join(ROOT, "sitemap.xml");
const urls = [
  { loc: "/magazine/", lastmod: articles[0]?.updated || articles[0]?.date },
  ...Object.keys(CATEGORIES).filter(k => articles.some(a => a.category === k)).map(k => ({ loc: `/magazine/${k}/` })),
  ...articles.map(a => ({ loc: `/magazine/${a.slug}/`, lastmod: a.updated || a.date })),
];
const smBlock = urls.map(u => `  <url>\n    <loc>${SITE}${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}\n  </url>`).join("\n");
const sm = readFileSync(smPath, "utf8");
const smRe = /  <!-- MAGAZINE:START -->[\s\S]*?<!-- MAGAZINE:END -->\n/;
const smNew = `  <!-- MAGAZINE:START -->\n${smBlock}\n  <!-- MAGAZINE:END -->\n`;
writeFileSync(smPath, smRe.test(sm) ? sm.replace(smRe, smNew) : sm.replace("</urlset>", smNew + "</urlset>"));

console.log(`MAGAZINE: ${articles.length}本の記事を生成しました`);
