import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { accountsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

/**
 * Dynamic sitemap served from Express so account pages are included.
 * Served at /sitemap.xml — overrides the static file in dist/public.
 *
 * Google requires absolute URLs. The domain comes from:
 * 1. SITE_URL env var (set in Render: https://www.codexstocks.org)
 * 2. Request host header as fallback
 */
router.get("/sitemap.xml", async (req, res) => {
  try {
    const origin =
      process.env.SITE_URL?.replace(/\/$/, "") ||
      `${req.protocol}://${req.headers.host}`;

    const activeAccounts = await db
      .select({ id: accountsTable.id, updatedAt: accountsTable.updatedAt })
      .from(accountsTable)
      .where(eq(accountsTable.status, "active"));

    const staticUrls = [
      { loc: `${origin}/`, changefreq: "daily", priority: "1.0" },
      { loc: `${origin}/faq`, changefreq: "weekly", priority: "0.7" },
      { loc: `${origin}/login`, changefreq: "monthly", priority: "0.4" },
      { loc: `${origin}/signup`, changefreq: "monthly", priority: "0.4" },
    ];

    const accountUrls = activeAccounts.map((a) => ({
      loc: `${origin}/account/${a.id}`,
      lastmod: a.updatedAt
        ? new Date(a.updatedAt).toISOString().split("T")[0]
        : undefined,
      changefreq: "weekly",
      priority: "0.8",
    }));

    const allUrls = [...staticUrls, ...accountUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map((u) =>
    `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (err) {
    req.log.error({ err }, "sitemap generation failed");
    res.status(500).send("<?xml version=\"1.0\"?><error>Sitemap unavailable</error>");
  }
});

export default router;
