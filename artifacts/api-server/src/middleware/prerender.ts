/**
 * Dynamic Rendering Middleware
 *
 * When a known search-engine crawler (Googlebot, Bingbot, etc.) requests a
 * public page, this middleware intercepts the request and returns a fully
 * server-rendered HTML response — complete title, canonical, meta description,
 * Open Graph tags, JSON-LD structured data, and visible body content — so the
 * crawler never has to wait for React to hydrate.
 *
 * Normal browser users are NOT affected: this middleware only fires when the
 * User-Agent matches a known crawler pattern.
 *
 * Covered paths:
 *   /                — Homepage (marketplace)
 *   /accounts        — All accounts hub
 *   /faq             — FAQ page
 *   /account/:slug   — Individual account product pages
 */

import { type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, accountsTable, settingsTable } from "@workspace/db";
import { logger } from "../lib/logger";

// ── Crawler detection ──────────────────────────────────────────────────────────

const BOT_PATTERNS: RegExp[] = [
  /googlebot/i,
  /google-inspectiontool/i,
  /google-site-verification/i,
  /bingbot/i,
  /bingpreview/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebot/i,
  /facebookexternalhit/i,
  /linkedinbot/i,
  /twitterbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /discordbot/i,
  /applebot/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /rogerbot/i,
  /exabot/i,
  /ia_archiver/i,
];

function isCrawler(ua: string): boolean {
  return BOT_PATTERNS.some((p) => p.test(ua));
}

// ── HTML helpers ───────────────────────────────────────────────────────────────

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSiteUrl(req: Request): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "www.codexstocks.org";
  return `${proto}://${host}`;
}

// ── Static page renderers ──────────────────────────────────────────────────────

function renderHomePage(siteUrl: string, siteName: string): string {
  const canonical = `${siteUrl}/`;
  const title = `Buy PUBG Mobile Accounts in Pakistan | Verified & Secure | ${siteName}`;
  const description =
    "Browse 100% verified PUBG Mobile accounts with mythic skins, X-Suits, Glacier weapons & rare items. Instant secure transfer. Pakistan's most trusted PUBG account marketplace.";
  const image = `${siteUrl}/opengraph.jpg`;

  const orgSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    alternateName: ["Code X Stocks", "Codex Stocks"],
    url: siteUrl,
    logo: { "@type": "ImageObject", url: `${siteUrl}/logo.png` },
    areaServed: "PK",
  });

  const websiteSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    description,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:site_name" content="${esc(siteName)}">
<meta property="og:locale" content="en_PK">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<script type="application/ld+json">${orgSchema}</script>
<script type="application/ld+json">${websiteSchema}</script>
</head>
<body>
<header>
  <a href="${esc(siteUrl)}">${esc(siteName)}</a>
  <nav>
    <a href="${esc(siteUrl)}/">Home</a>
    <a href="${esc(siteUrl)}/accounts">All PUBG Accounts</a>
    <a href="${esc(siteUrl)}/faq">FAQ</a>
  </nav>
</header>
<main>
  <h1>Buy Verified PUBG Mobile Accounts in Pakistan</h1>
  <p>Browse Pakistan's most trusted PUBG Mobile account marketplace. We offer 100% verified accounts with mythic skins, X-Suits, Glacier weapons, rare items, and instant secure transfer guaranteed.</p>
  <h2>Why Choose ${esc(siteName)}?</h2>
  <ul>
    <li>Every account is hand-verified by our admin team before listing</li>
    <li>Secure, low-risk credential transfer process</li>
    <li>Full payment or flexible installment plans available</li>
    <li>24/7 support via WhatsApp and Live Chat</li>
  </ul>
  <p><a href="${esc(siteUrl)}/accounts">Browse all PUBG accounts for sale</a> — filter by price, rank, and rare items.</p>
  <p><a href="${esc(siteUrl)}/faq">Frequently Asked Questions</a> — learn how buying works, payment methods, and account safety.</p>
</main>
</body>
</html>`;
}

function renderAccountsPage(siteUrl: string, siteName: string): string {
  const canonical = `${siteUrl}/accounts`;
  const title = `All PUBG Mobile Accounts for Sale | ${siteName}`;
  const description =
    "Browse all verified PUBG Mobile accounts available for sale in Pakistan. Filter by price, rank, mythic skins, X-Suits, Glacier weapons, and rare items.";
  const image = `${siteUrl}/opengraph.jpg`;

  const itemListSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "PUBG Mobile Accounts for Sale",
    description,
    url: canonical,
  });

  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "All Accounts", item: canonical },
    ],
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:site_name" content="${esc(siteName)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<script type="application/ld+json">${itemListSchema}</script>
<script type="application/ld+json">${breadcrumbSchema}</script>
</head>
<body>
<header>
  <a href="${esc(siteUrl)}">${esc(siteName)}</a>
  <nav>
    <a href="${esc(siteUrl)}/">Home</a>
    <a href="${esc(siteUrl)}/accounts">All PUBG Accounts</a>
    <a href="${esc(siteUrl)}/faq">FAQ</a>
  </nav>
</header>
<main>
  <nav aria-label="Breadcrumb">
    <ol>
      <li><a href="${esc(siteUrl)}/">Home</a></li>
      <li aria-current="page">All PUBG Accounts</li>
    </ol>
  </nav>
  <h1>All PUBG Mobile Accounts for Sale in Pakistan</h1>
  <p>${esc(description)}</p>
  <p>Each account is hand-verified by our team. Secure transfers guaranteed. Pay in full or use our installment plan.</p>
  <p><a href="${esc(siteUrl)}/">Return to Homepage</a> | <a href="${esc(siteUrl)}/faq">FAQ</a></p>
</main>
</body>
</html>`;
}

const FAQ_ITEMS = [
  {
    q: "How does buying a PUBG account work?",
    a: "Browse the marketplace, pick an account you like, then click 'Buy via WhatsApp' or use Live Chat. Our admin team verifies the account, accepts your payment (full or installment), and securely transfers the credentials to you.",
  },
  {
    q: "Are the accounts safe? Can I get banned?",
    a: "Every listing is hand-checked by our team before going live. We use proven, low-risk transfer methods. As long as you follow the change-password and email steps we share at handover, your account stays safe.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept JazzCash, EasyPaisa, bank transfer, and Crypto for full payments. Installment plans are also available.",
  },
  {
    q: "How long does the transfer take?",
    a: "Most transfers complete within a few hours of payment confirmation. We walk you through every step to make sure you're comfortable before we hand over credentials.",
  },
  {
    q: "Can I sell my PUBG account here?",
    a: "Yes — create a customer account first, then apply to become a verified seller. Once approved by our admin team, you can list accounts and manage sales from your Seller Dashboard.",
  },
  {
    q: "Do you offer installment plans?",
    a: "Yes! We offer flexible installment plans. Contact our support team on WhatsApp to discuss a schedule that works for you.",
  },
];

function renderFaqPage(siteUrl: string, siteName: string): string {
  const canonical = `${siteUrl}/faq`;
  const title = `FAQ — Buying & Selling PUBG Accounts | ${siteName}`;
  const description =
    "Frequently asked questions about buying and selling PUBG Mobile accounts on CodexStocks. Learn about payment methods, account safety, transfers, and installment plans.";
  const image = `${siteUrl}/opengraph.jpg`;

  const faqSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  });

  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "FAQ", item: canonical },
    ],
  });

  const faqHtml = FAQ_ITEMS.map(
    (f) => `<div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
  <h2 itemprop="name">${esc(f.q)}</h2>
  <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
    <p itemprop="text">${esc(f.a)}</p>
  </div>
</div>`,
  ).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:site_name" content="${esc(siteName)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<script type="application/ld+json">${faqSchema}</script>
<script type="application/ld+json">${breadcrumbSchema}</script>
</head>
<body>
<header>
  <a href="${esc(siteUrl)}">${esc(siteName)}</a>
  <nav>
    <a href="${esc(siteUrl)}/">Home</a>
    <a href="${esc(siteUrl)}/accounts">All PUBG Accounts</a>
    <a href="${esc(siteUrl)}/faq">FAQ</a>
  </nav>
</header>
<main itemscope itemtype="https://schema.org/FAQPage">
  <nav aria-label="Breadcrumb">
    <ol>
      <li><a href="${esc(siteUrl)}/">Home</a></li>
      <li aria-current="page">FAQ</li>
    </ol>
  </nav>
  <h1>Frequently Asked Questions</h1>
  <p>${esc(description)}</p>
  ${faqHtml}
  <p><a href="${esc(siteUrl)}/accounts">Browse all PUBG accounts for sale</a></p>
</main>
</body>
</html>`;
}

// ── Account page renderer ──────────────────────────────────────────────────────

interface AccountPageData {
  acc: typeof accountsTable.$inferSelect;
  siteName: string;
  siteUrl: string;
  imageUrl: string | null;
}

function renderAccountHtml(req: Request, data: AccountPageData): string {
  const { acc, siteName, siteUrl, imageUrl } = data;

  const accountPath = acc.slug ? `/account/${acc.slug}` : `/account/${acc.id}`;
  const canonicalUrl = `${siteUrl}${accountPath}`;

  const priceRaw = acc.priceForSale ? parseFloat(acc.priceForSale as string) : null;
  const priceFormatted = priceRaw ? `PKR ${priceRaw.toLocaleString("en-PK")}` : null;

  const rawDesc = acc.description?.trim() || "";
  const metaDesc = rawDesc
    ? rawDesc.slice(0, 200).replace(/[\r\n]+/g, " ")
    : `Premium PUBG Mobile account available on ${siteName}${priceFormatted ? ` for ${priceFormatted}` : ""}. Verified, secure, instant transfer.`;

  const pageTitle = `${acc.title} — Buy PUBG Account | ${siteName}`;

  const productSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: acc.title,
    description: metaDesc,
    url: canonicalUrl,
    brand: { "@type": "Organization", name: siteName },
    offers: {
      "@type": "Offer",
      priceCurrency: "PKR",
      price: priceRaw?.toFixed(2) ?? "0",
      availability: "https://schema.org/InStock",
      url: canonicalUrl,
      seller: { "@type": "Organization", name: siteName, url: siteUrl },
    },
  };
  if (imageUrl) productSchema["image"] = imageUrl;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "All Accounts", item: `${siteUrl}/accounts` },
      { "@type": "ListItem", position: 3, name: acc.title, item: canonicalUrl },
    ],
  };

  const bodyDescription = rawDesc || metaDesc;
  const imageHtml = imageUrl
    ? `<img src="${esc(imageUrl)}" alt="${esc(acc.title)}" style="max-width:600px;width:100%;height:auto;" loading="eager">`
    : "";
  const priceHtml = priceFormatted
    ? `<p><strong>Price: ${esc(priceFormatted)}</strong></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(metaDesc)}">
<link rel="canonical" href="${esc(canonicalUrl)}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="product">
<meta property="og:title" content="${esc(pageTitle)}">
<meta property="og:description" content="${esc(metaDesc)}">
<meta property="og:url" content="${esc(canonicalUrl)}">
<meta property="og:site_name" content="${esc(siteName)}">
${imageUrl ? `<meta property="og:image" content="${esc(imageUrl)}">` : ""}
${imageUrl ? `<meta property="og:image:width" content="1200">` : ""}
${imageUrl ? `<meta property="og:image:height" content="630">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(pageTitle)}">
<meta name="twitter:description" content="${esc(metaDesc)}">
${imageUrl ? `<meta name="twitter:image" content="${esc(imageUrl)}">` : ""}
<script type="application/ld+json">${JSON.stringify(productSchema)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
</head>
<body>
<header>
  <a href="${esc(siteUrl)}">${esc(siteName)}</a>
  <nav>
    <a href="${esc(siteUrl)}/">Home</a>
    <a href="${esc(siteUrl)}/accounts">All PUBG Accounts</a>
    <a href="${esc(siteUrl)}/faq">FAQ</a>
  </nav>
</header>
<main>
  <nav aria-label="Breadcrumb">
    <ol>
      <li><a href="${esc(siteUrl)}/">Home</a></li>
      <li><a href="${esc(siteUrl)}/accounts">All Accounts</a></li>
      <li aria-current="page">${esc(acc.title)}</li>
    </ol>
  </nav>
  <article itemscope itemtype="https://schema.org/Product">
    <h1 itemprop="name">${esc(acc.title)}</h1>
    ${imageHtml}
    ${priceHtml}
    <div itemprop="description"><p>${esc(bodyDescription)}</p></div>
    <div itemprop="offers" itemscope itemtype="https://schema.org/Offer">
      <meta itemprop="priceCurrency" content="PKR">
      ${priceRaw ? `<meta itemprop="price" content="${priceRaw.toFixed(2)}">` : ""}
      <meta itemprop="availability" content="https://schema.org/InStock">
      <link itemprop="url" href="${esc(canonicalUrl)}">
    </div>
    <div itemprop="brand" itemscope itemtype="https://schema.org/Organization">
      <meta itemprop="name" content="${esc(siteName)}">
    </div>
  </article>
  <section>
    <h2>Browse More PUBG Accounts</h2>
    <p><a href="${esc(siteUrl)}/accounts">View all available PUBG Mobile accounts for sale</a></p>
  </section>
</main>
</body>
</html>`;
}

// ── Middleware ─────────────────────────────────────────────────────────────────

const ACCOUNT_PATH_RE = /^\/account\/([^/?#]+)/;

export async function prerenderMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (req.method !== "GET") { next(); return; }

  const ua = (req.headers["user-agent"] as string) || "";
  if (!isCrawler(ua)) { next(); return; }

  const path = req.path;
  const siteUrl = getSiteUrl(req);

  // ── Static pages ────────────────────────────────────────────────────────────
  const isStaticPage = path === "/" || path === "" || path === "/accounts" || path === "/faq";
  if (isStaticPage) {
    try {
      const [[settings]] = await Promise.all([
        db.select().from(settingsTable),
      ]);
      const siteName = settings?.siteName || "CodexStocks";

      let html: string;
      if (path === "/" || path === "") {
        html = renderHomePage(siteUrl, siteName);
      } else if (path === "/accounts") {
        html = renderAccountsPage(siteUrl, siteName);
      } else {
        html = renderFaqPage(siteUrl, siteName);
      }

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=600, stale-while-revalidate=3600");
      res.setHeader("X-Prerendered", "1");
      res.status(200).send(html);
    } catch (err) {
      logger.error({ err, path }, "prerender static page failed");
      next();
    }
    return;
  }

  // ── Account pages ────────────────────────────────────────────────────────────
  const match = ACCOUNT_PATH_RE.exec(path);
  if (!match) { next(); return; }

  const idOrSlug = match[1];
  const numId = parseInt(idOrSlug, 10);

  try {
    const [[acc], [settings]] = await Promise.all([
      Number.isFinite(numId)
        ? db.select().from(accountsTable).where(eq(accountsTable.id, numId))
        : db.select().from(accountsTable).where(eq(accountsTable.slug, idOrSlug)),
      db.select().from(settingsTable),
    ]);

    if (!acc) {
      res.status(404).send('<!DOCTYPE html><html><body><h1>Account Not Found</h1><p><a href="/accounts">Browse all accounts</a></p></body></html>');
      return;
    }

    const isVisible =
      acc.status === "active" &&
      acc.visibility === "public" &&
      !acc.deletedAt;

    if (!isVisible) {
      res.status(404).send('<!DOCTYPE html><html><body><h1>Account Not Found</h1><p><a href="/accounts">Browse all accounts</a></p></body></html>');
      return;
    }

    // Numeric ID → 301 to canonical slug URL
    if (Number.isFinite(numId) && acc.slug) {
      res.redirect(301, `/account/${acc.slug}`);
      return;
    }

    const siteName = settings?.siteName || "CodexStocks";

    let imageUrl: string | null = null;
    if (acc.imageUrls && acc.imageUrls.length > 0) {
      imageUrl = `${siteUrl}/api/storage${acc.imageUrls[0]}`;
    } else if (settings?.logoUrl) {
      imageUrl = `${siteUrl}/api/storage${settings.logoUrl}`;
    }

    const html = renderAccountHtml(req, { acc, siteName, siteUrl, imageUrl });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
    res.setHeader("X-Prerendered", "1");
    res.status(200).send(html);
  } catch (err) {
    logger.error({ err, path: req.path }, "prerender failed");
    next();
  }
}
