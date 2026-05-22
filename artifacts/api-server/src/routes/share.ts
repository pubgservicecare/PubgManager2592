import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, accountsTable, settingsTable } from "@workspace/db";

const router: IRouter = Router();

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function absoluteUrl(req: any, path: string): string {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}${path}`;
}

router.get("/share/account/:idOrSlug", async (req, res): Promise<void> => {
  try {
    const raw = req.params.idOrSlug;
    const numId = parseInt(raw, 10);

    let acc: typeof accountsTable.$inferSelect | undefined;
    if (Number.isFinite(numId)) {
      [acc] = await db.select().from(accountsTable).where(eq(accountsTable.id, numId));
    } else {
      [acc] = await db.select().from(accountsTable).where(eq(accountsTable.slug, raw));
    }

    const [settings] = await db.select().from(settingsTable);

    if (!acc) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    const siteName = settings?.siteName || "CodexStocks";
    // Always use slug URL for canonical — numeric IDs are internal only
    const accountPath = acc.slug ? `/account/${acc.slug}` : `/account/${acc.id}`;
    const canonicalPath = acc.slug ? `/account/${acc.slug}` : accountPath;
    const accountUrl = absoluteUrl(req, accountPath);
    const canonicalUrl = absoluteUrl(req, canonicalPath);

    const title = `${acc.title} — ${siteName}`;
    const price = acc.priceForSale ? `PKR ${parseFloat(acc.priceForSale as string).toLocaleString()}` : "";
    const desc = acc.description
      ? acc.description.slice(0, 200)
      : `Premium PUBG Mobile account available now${price ? ` for ${price}` : ""}. Verified, secure, instant transfer.`;

    let imageUrl: string | null = null;
    if (acc.imageUrls && acc.imageUrls.length > 0) {
      imageUrl = absoluteUrl(req, `/api/storage${acc.imageUrls[0]}`);
    } else if (settings?.logoUrl) {
      imageUrl = absoluteUrl(req, `/api/storage${settings.logoUrl}`);
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(desc)}">
<link rel="canonical" href="${escapeHtml(canonicalUrl)}">
<meta property="og:type" content="product">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:url" content="${escapeHtml(canonicalUrl)}">
<meta property="og:site_name" content="${escapeHtml(siteName)}">
${imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}">` : ""}
${imageUrl ? `<meta property="og:image:width" content="1200">` : ""}
${imageUrl ? `<meta property="og:image:height" content="630">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(desc)}">
${imageUrl ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">` : ""}
<meta http-equiv="refresh" content="0; url=${escapeHtml(accountUrl)}">
</head>
<body>
<p>Redirecting to <a href="${escapeHtml(accountUrl)}">${escapeHtml(title)}</a>…</p>
<script>window.location.replace(${JSON.stringify(accountUrl)});</script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(html);
  } catch (err) {
    req.log.error({ err }, "share/account failed");
    res.status(500).json({ error: "Failed to load share page" });
  }
});

export default router;
