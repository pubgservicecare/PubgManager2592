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
 *   /account/:slug   — individual account product pages (highest priority)
 *   /accounts        — marketplace hub  (low-effort; static content enough)
 */

import { type Request, type Response, type NextFunction } from "express";
import { eq, and, isNull, ne } from "drizzle-orm";
import { db, accountsTable, settingsTable } from "@workspace/db";
import { logger } from "../lib/logger";

// ── Crawler detection ─────────────────────────────────────────────────────────

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

// ── HTML helpers ──────────────────────────────────────────────────────────────

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function absoluteUrl(req: Request, urlPath: string): string {
  const proto =
    (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host =
    (req.headers["x-forwarded-host"] as string) || req.headers.host || "";
  return `${proto}://${host}${urlPath}`;
}

// ── HTML renderer ─────────────────────────────────────────────────────────────

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

  const priceRaw = acc.priceForSale
    ? parseFloat(acc.priceForSale as string)
    : null;
  const priceFormatted = priceRaw
    ? `PKR ${priceRaw.toLocaleString("en-PK")}`
    : null;

  const rawDesc = acc.description?.trim() || "";
  const metaDesc = rawDesc
    ? rawDesc.slice(0, 200).replace(/[\r\n]+/g, " ")
    : `Premium PUBG Mobile account available on ${siteName}${priceFormatted ? ` for ${priceFormatted}` : ""}. Verified, secure, instant transfer.`;

  const pageTitle = `${acc.title} — Buy PUBG Account | ${siteName}`;

  // ── JSON-LD: Product ───────────────────────────────────────────────────────
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
  if (imageUrl) {
    productSchema["image"] = imageUrl;
  }

  // ── JSON-LD: BreadcrumbList ────────────────────────────────────────────────
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "All Accounts",
        item: `${siteUrl}/accounts`,
      },
      { "@type": "ListItem", position: 3, name: acc.title, item: canonicalUrl },
    ],
  };

  // ── Visible body content ───────────────────────────────────────────────────
  // Googlebot needs real content in the body, not just meta tags.
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
  // Only intercept GET requests
  if (req.method !== "GET") {
    next();
    return;
  }

  const ua = (req.headers["user-agent"] as string) || "";
  if (!isCrawler(ua)) {
    next();
    return;
  }

  const match = ACCOUNT_PATH_RE.exec(req.path);
  if (!match) {
    // Not an account page — let it pass through (static files / SPA fallback)
    next();
    return;
  }

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
      res.status(404).send("<!DOCTYPE html><html><body><h1>Account Not Found</h1><p><a href=\"/accounts\">Browse all accounts</a></p></body></html>");
      return;
    }

    // Treat non-public or non-active accounts as 404 for crawlers
    const isVisible =
      acc.status === "active" &&
      acc.visibility === "public" &&
      !acc.deletedAt;

    if (!isVisible) {
      res.status(404).send("<!DOCTYPE html><html><body><h1>Account Not Found</h1><p><a href=\"/accounts\">Browse all accounts</a></p></body></html>");
      return;
    }

    // If accessed via numeric ID but account has a slug → 301 to canonical slug URL
    if (Number.isFinite(numId) && acc.slug) {
      res.redirect(301, `/account/${acc.slug}`);
      return;
    }

    const siteName = settings?.siteName || "CodexStocks";
    const proto =
      (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const host =
      (req.headers["x-forwarded-host"] as string) ||
      req.headers.host ||
      "www.codexstocks.org";
    const siteUrl = `${proto}://${host}`;

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
