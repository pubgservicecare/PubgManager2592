import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, reviewsTable, customerUsersTable } from "@workspace/db";
import { accountsTable } from "@workspace/db/schema";
import { requireAdmin } from "../middlewares/auth";
import { requireCustomer, getCustomerSession } from "../middlewares/customerAuth";

const router: IRouter = Router();

function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .map((p) => p.length <= 1 ? p : p[0] + "*".repeat(Math.min(p.length - 1, 3)))
    .join(" ");
}

// ── Public: Platform reviews (for /reviews page) ──────────────────────────
router.get("/reviews", async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select({
        id: reviewsTable.id,
        rating: reviewsTable.rating,
        reviewText: reviewsTable.reviewText,
        createdAt: reviewsTable.createdAt,
        featuredOnHome: reviewsTable.featuredOnHome,
        customerName: customerUsersTable.name,
      })
      .from(reviewsTable)
      .leftJoin(customerUsersTable, eq(reviewsTable.customerUserId, customerUsersTable.id))
      .where(and(eq(reviewsTable.approved, true), eq(reviewsTable.reviewType, "platform")))
      .orderBy(desc(reviewsTable.createdAt));

    const reviews = rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      reviewText: r.reviewText ?? null,
      featuredOnHome: r.featuredOnHome,
      reviewerName: maskName(r.customerName || "Anonymous"),
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    }));

    const avgRating = reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : null;

    res.json({ reviews, avgRating, totalCount: reviews.length });
  } catch (err) {
    req.log.error({ err }, "public reviews: failed to fetch");
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// ── Public: Home page featured reviews (platform only) ────────────────────
router.get("/home-reviews", async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select({
        id: reviewsTable.id,
        rating: reviewsTable.rating,
        reviewText: reviewsTable.reviewText,
        createdAt: reviewsTable.createdAt,
        customerName: customerUsersTable.name,
      })
      .from(reviewsTable)
      .leftJoin(customerUsersTable, eq(reviewsTable.customerUserId, customerUsersTable.id))
      .where(
        and(
          eq(reviewsTable.approved, true),
          eq(reviewsTable.featuredOnHome, true),
          eq(reviewsTable.reviewType, "platform")
        )
      )
      .orderBy(desc(reviewsTable.createdAt));

    const reviews = rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      reviewText: r.reviewText ?? null,
      reviewerName: maskName(r.customerName || "Anonymous"),
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    }));

    res.json({ reviews });
  } catch (err) {
    req.log.error({ err }, "home-reviews: failed to fetch");
    res.status(500).json({ error: "Failed to fetch home reviews" });
  }
});

// ── Customer: Submit a PLATFORM review ────────────────────────────────────
router.post("/platform-reviews", requireCustomer, async (req, res): Promise<void> => {
  const customerSess = getCustomerSession(req)!;
  const { rating, reviewText } = req.body;

  if (typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
    return;
  }
  if (reviewText !== undefined && reviewText !== null) {
    if (typeof reviewText !== "string") {
      res.status(400).json({ error: "Review text must be a string" });
      return;
    }
    if (reviewText.length > 1000) {
      res.status(400).json({ error: "Review text must be 1000 characters or less" });
      return;
    }
  }

  try {
    // One platform review per customer
    const [existing] = await db
      .select({ id: reviewsTable.id })
      .from(reviewsTable)
      .where(
        and(
          eq(reviewsTable.customerUserId, customerSess.customerUserId),
          eq(reviewsTable.reviewType, "platform")
        )
      );

    if (existing) {
      res.status(409).json({ error: "You have already submitted a platform review" });
      return;
    }

    const [review] = await db
      .insert(reviewsTable)
      .values({
        accountId: null,
        reviewType: "platform",
        customerUserId: customerSess.customerUserId,
        customerDbId: customerSess.customerDbId,
        rating,
        reviewText: typeof reviewText === "string" ? reviewText.trim() || null : null,
        approved: false,
      })
      .returning();

    req.log.info({ reviewId: review.id, customerUserId: customerSess.customerUserId }, "platform review submitted");

    res.status(201).json({
      id: review.id,
      rating: review.rating,
      reviewText: review.reviewText ?? null,
      approved: review.approved,
      createdAt: review.createdAt instanceof Date ? review.createdAt.toISOString() : review.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "platform review: failed to submit");
    res.status(500).json({ error: "Failed to submit review" });
  }
});

// ── Public: Account reviews (approved only) ───────────────────────────────
router.get("/accounts/:accountId/reviews", async (req, res): Promise<void> => {
  const accountId = parseInt(req.params.accountId, 10);
  if (isNaN(accountId)) { res.status(400).json({ error: "Invalid account ID" }); return; }

  try {
    const customerSess = getCustomerSession(req);

    const rows = await db
      .select({
        id: reviewsTable.id,
        accountId: reviewsTable.accountId,
        rating: reviewsTable.rating,
        reviewText: reviewsTable.reviewText,
        createdAt: reviewsTable.createdAt,
        customerUserId: reviewsTable.customerUserId,
        customerName: customerUsersTable.name,
      })
      .from(reviewsTable)
      .leftJoin(customerUsersTable, eq(reviewsTable.customerUserId, customerUsersTable.id))
      .where(
        and(
          eq(reviewsTable.accountId, accountId),
          eq(reviewsTable.approved, true),
          eq(reviewsTable.reviewType, "account")
        )
      )
      .orderBy(desc(reviewsTable.createdAt));

    const reviews = rows.map((r) => ({
      id: r.id,
      accountId: r.accountId,
      rating: r.rating,
      reviewText: r.reviewText ?? null,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      reviewerName: maskName(r.customerName || "Anonymous"),
    }));

    let aggregateRating: { avgRating: number; count: number } | null = null;
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      aggregateRating = { avgRating: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
    }

    let canReview = false;
    let hasReviewed = false;
    let myReview: any = null;

    if (customerSess) {
      const [existing] = await db
        .select()
        .from(reviewsTable)
        .where(
          and(
            eq(reviewsTable.accountId, accountId),
            eq(reviewsTable.customerUserId, customerSess.customerUserId),
            eq(reviewsTable.reviewType, "account")
          )
        );

      hasReviewed = !!existing;
      canReview = !existing;
      if (existing) {
        myReview = {
          id: existing.id,
          rating: existing.rating,
          reviewText: existing.reviewText ?? null,
          approved: existing.approved,
          createdAt: existing.createdAt instanceof Date ? existing.createdAt.toISOString() : existing.createdAt,
        };
      }
    }

    res.json({ reviews, aggregateRating, canReview, hasReviewed, myReview, isLoggedIn: !!customerSess });
  } catch (err) {
    req.log.error({ err }, "reviews: failed to fetch");
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// ── Customer: Submit an ACCOUNT review ────────────────────────────────────
router.post("/accounts/:accountId/reviews", requireCustomer, async (req, res): Promise<void> => {
  const accountId = parseInt(req.params.accountId, 10);
  if (isNaN(accountId)) { res.status(400).json({ error: "Invalid account ID" }); return; }

  const customerSess = getCustomerSession(req)!;
  const { rating, reviewText } = req.body;

  if (typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
    return;
  }
  if (reviewText !== undefined && reviewText !== null) {
    if (typeof reviewText !== "string") { res.status(400).json({ error: "Review text must be a string" }); return; }
    if (reviewText.length > 1000) { res.status(400).json({ error: "Review text must be 1000 characters or less" }); return; }
  }

  try {
    const [existing] = await db
      .select({ id: reviewsTable.id })
      .from(reviewsTable)
      .where(
        and(
          eq(reviewsTable.accountId, accountId),
          eq(reviewsTable.customerUserId, customerSess.customerUserId),
          eq(reviewsTable.reviewType, "account")
        )
      );

    if (existing) { res.status(409).json({ error: "You have already reviewed this account" }); return; }

    const [review] = await db
      .insert(reviewsTable)
      .values({
        accountId,
        reviewType: "account",
        customerUserId: customerSess.customerUserId,
        customerDbId: customerSess.customerDbId,
        rating,
        reviewText: typeof reviewText === "string" ? reviewText.trim() || null : null,
        approved: false,
      })
      .returning();

    req.log.info({ reviewId: review.id, accountId, customerUserId: customerSess.customerUserId }, "account review submitted");

    res.status(201).json({
      id: review.id,
      rating: review.rating,
      reviewText: review.reviewText ?? null,
      approved: review.approved,
      createdAt: review.createdAt instanceof Date ? review.createdAt.toISOString() : review.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "reviews: failed to submit");
    res.status(500).json({ error: "Failed to submit review" });
  }
});

// ── Admin: List all reviews (both types) ──────────────────────────────────
router.get("/admin/reviews", requireAdmin, async (req, res): Promise<void> => {
  const status = req.query.status as string | undefined;
  const type = req.query.type as string | undefined;

  try {
    const rows = await db
      .select({
        id: reviewsTable.id,
        accountId: reviewsTable.accountId,
        reviewType: reviewsTable.reviewType,
        customerUserId: reviewsTable.customerUserId,
        rating: reviewsTable.rating,
        reviewText: reviewsTable.reviewText,
        approved: reviewsTable.approved,
        featuredOnHome: reviewsTable.featuredOnHome,
        createdAt: reviewsTable.createdAt,
        customerName: customerUsersTable.name,
        customerPhone: customerUsersTable.phone,
        accountTitle: accountsTable.title,
      })
      .from(reviewsTable)
      .leftJoin(customerUsersTable, eq(reviewsTable.customerUserId, customerUsersTable.id))
      .leftJoin(accountsTable, eq(reviewsTable.accountId, accountsTable.id))
      .orderBy(desc(reviewsTable.createdAt));

    let filtered = rows;
    if (status === "pending") filtered = filtered.filter((r) => !r.approved);
    else if (status === "approved") filtered = filtered.filter((r) => r.approved);
    if (type === "account") filtered = filtered.filter((r) => r.reviewType === "account");
    else if (type === "platform") filtered = filtered.filter((r) => r.reviewType === "platform");

    res.json(filtered.map((r) => ({
      id: r.id,
      accountId: r.accountId,
      accountTitle: r.accountTitle ?? null,
      reviewType: r.reviewType,
      customerUserId: r.customerUserId,
      customerName: r.customerName ?? "Unknown",
      customerPhone: r.customerPhone ?? "",
      rating: r.rating,
      reviewText: r.reviewText ?? null,
      approved: r.approved,
      featuredOnHome: r.featuredOnHome,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    })));
  } catch (err) {
    req.log.error({ err }, "admin reviews: failed to list");
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// ── Admin: Patch (approve / feature) ─────────────────────────────────────
router.patch("/admin/reviews/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid review ID" }); return; }

  const { approved, featuredOnHome } = req.body;
  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (typeof approved === "boolean") updateData.approved = approved;
  if (typeof featuredOnHome === "boolean") updateData.featuredOnHome = featuredOnHome;
  if (Object.keys(updateData).length === 1) { res.status(400).json({ error: "No valid fields to update" }); return; }

  try {
    const [updated] = await db.update(reviewsTable).set(updateData).where(eq(reviewsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Review not found" }); return; }
    res.json({ id: updated.id, approved: updated.approved, featuredOnHome: updated.featuredOnHome });
  } catch (err) {
    req.log.error({ err }, "admin reviews: failed to update");
    res.status(500).json({ error: "Failed to update review" });
  }
});

// ── Admin: Delete ─────────────────────────────────────────────────────────
router.delete("/admin/reviews/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid review ID" }); return; }

  try {
    const [deleted] = await db.delete(reviewsTable).where(eq(reviewsTable.id, id)).returning({ id: reviewsTable.id });
    if (!deleted) { res.status(404).json({ error: "Review not found" }); return; }
    res.json({ success: true, id: deleted.id });
  } catch (err) {
    req.log.error({ err }, "admin reviews: failed to delete");
    res.status(500).json({ error: "Failed to delete review" });
  }
});

export default router;
