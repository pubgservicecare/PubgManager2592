import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, chatSessionsTable, chatMessagesTable, accountsTable, sellersTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { requireSeller } from "../middlewares/sellerAuth";

const router: IRouter = Router();

router.get("/chat/sessions", requireAdmin, async (_req, res): Promise<void> => {
  const sessions = await db.select().from(chatSessionsTable).orderBy(desc(chatSessionsTable.lastMessageAt));
  const result = await Promise.all(sessions.map(async (s) => {
    let accountTitle = null;
    if (s.accountId) {
      const [acc] = await db.select().from(accountsTable).where(eq(accountsTable.id, s.accountId));
      accountTitle = acc?.title ?? null;
    }
    let sellerName = null;
    if (s.sellerId) {
      const [sel] = await db.select().from(sellersTable).where(eq(sellersTable.id, s.sellerId));
      sellerName = sel?.name ?? null;
    }
    return {
      ...s,
      accountTitle,
      sellerName,
      kind: s.sellerId ? "seller" : "customer",
      createdAt: s.createdAt.toISOString(),
      lastMessageAt: s.lastMessageAt?.toISOString() ?? null,
    };
  }));
  res.json(result);
});

// Authorization helper for a chat session.
// - admin: full access
// - seller-<id> session: only the matching logged-in seller (or admin)
// - customer-<id> session: only the matching logged-in customer (or admin)
// - any other session id (e.g. guest IDs created by the public chat): open, since
//   the public chat has always allowed guests to access their own opaque session id.
function canAccessChatSession(sessionId: string, sess: any): boolean {
  if (sess?.isAdmin) return true;
  const sellerMatch = /^seller-(\d+)$/.exec(sessionId);
  if (sellerMatch) {
    return !!sess?.sellerId && sess.sellerId === parseInt(sellerMatch[1], 10);
  }
  const customerMatch = /^customer-(\d+)$/.exec(sessionId);
  if (customerMatch) {
    return !!sess?.customerId && sess.customerId === parseInt(customerMatch[1], 10);
  }
  return true;
}

router.get("/chat/sessions/:sessionId/messages", async (req, res): Promise<void> => {
  const { sessionId } = req.params;
  const sess = req.session as any;

  if (!canAccessChatSession(sessionId, sess)) {
    res.status(403).json({ error: "Not allowed" });
    return;
  }

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.sessionId, sessionId))
    .orderBy(chatMessagesTable.createdAt);

  // If logged-in customer is viewing their own session, reset their unread count
  if (sess.customerId && sessionId === `customer-${sess.customerId}`) {
    await db
      .update(chatSessionsTable)
      .set({ customerUnreadCount: 0 })
      .where(eq(chatSessionsTable.sessionId, sessionId));
  }
  // If logged-in seller is viewing their own session, reset seller-facing unread (customerUnreadCount column reused)
  if (sess.sellerId && sessionId === `seller-${sess.sellerId}`) {
    await db
      .update(chatSessionsTable)
      .set({ customerUnreadCount: 0 })
      .where(eq(chatSessionsTable.sessionId, sessionId));
  }

  res.json(messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

router.post("/chat/sessions/:sessionId/messages", async (req, res): Promise<void> => {
  const { sessionId } = req.params;
  const { message, sender, guestName, accountId } = req.body;
  const sess = req.session as any;

  if (!message || !sender) {
    res.status(400).json({ error: "message and sender are required" });
    return;
  }
  if (!["customer", "admin", "seller"].includes(sender)) {
    res.status(400).json({ error: "Invalid sender" });
    return;
  }

  // --- Authorization: prevent impersonation and cross-channel posting ---
  // Admin senders must be admins.
  if (sender === "admin" && !sess.isAdmin) {
    res.status(403).json({ error: "Not allowed" });
    return;
  }
  // Sellers can only post as "seller" to their own session.
  if (sender === "seller") {
    if (!sess.sellerId || sessionId !== `seller-${sess.sellerId}`) {
      res.status(403).json({ error: "Not allowed" });
      return;
    }
  }
  // Customers (logged-in or guest) must NEVER post into a seller-* session;
  // they can only contact the admin.
  if (sender === "customer" && /^seller-\d+$/.test(sessionId)) {
    res.status(403).json({ error: "Not allowed" });
    return;
  }
  // Logged-in customers must use their own customer-<id> session.
  if (sender === "customer" && /^customer-\d+$/.test(sessionId)) {
    const customerMatch = /^customer-(\d+)$/.exec(sessionId)!;
    if (!sess.customerId || sess.customerId !== parseInt(customerMatch[1], 10)) {
      res.status(403).json({ error: "Not allowed" });
      return;
    }
  }

  let session = (await db.select().from(chatSessionsTable).where(eq(chatSessionsTable.sessionId, sessionId)))[0];
  const now = new Date();

  // Determine sellerId for new/existing sessions:
  // - if seller is sending: use their session id
  // - else infer from session id prefix `seller-<id>` (e.g. admin initiating contact)
  const parsedSellerIdMatch = /^seller-(\d+)$/.exec(sessionId);
  const parsedSellerId = parsedSellerIdMatch ? parseInt(parsedSellerIdMatch[1], 10) : null;
  const newSellerId = sender === "seller" ? sess.sellerId : parsedSellerId;

  if (!session) {
    [session] = await db.insert(chatSessionsTable).values({
      sessionId,
      accountId: accountId ?? null,
      guestName: guestName ?? null,
      sellerId: newSellerId,
      lastMessage: message,
      lastMessageAt: now,
      unreadCount: sender === "customer" || sender === "seller" ? 1 : 0,
      customerUnreadCount: sender === "admin" ? 1 : 0,
    }).returning();
  } else {
    await db.update(chatSessionsTable).set({
      lastMessage: message,
      lastMessageAt: now,
      guestName: guestName ?? session.guestName,
      sellerId: session.sellerId ?? newSellerId,
      unreadCount: sender === "customer" || sender === "seller" ? session.unreadCount + 1 : session.unreadCount,
      customerUnreadCount: sender === "admin" ? session.customerUnreadCount + 1 : session.customerUnreadCount,
    }).where(eq(chatSessionsTable.sessionId, sessionId));
  }

  const [msg] = await db.insert(chatMessagesTable).values({ sessionId, sender, message }).returning();

  // Notify customer when admin replies to a customer chat session
  if (sender === "admin") {
    const customerMatchNotif = /^customer-(\d+)$/.exec(sessionId);
    if (customerMatchNotif) {
      const customerUserId = parseInt(customerMatchNotif[1], 10);
      try {
        const { createNotification } = await import("../lib/notify");
        await createNotification({
          customerUserId,
          type: "chat",
          title: "New message from support",
          message: message.length > 120 ? message.slice(0, 120) + "…" : message,
          link: "/chat/me",
        });
      } catch {}
    }
  }

  res.status(201).json({ ...msg, createdAt: msg.createdAt.toISOString() });
});

router.post("/chat/sessions/:sessionId/read", requireAdmin, async (req, res): Promise<void> => {
  const sessionId = String(req.params.sessionId);
  await db.update(chatSessionsTable).set({ unreadCount: 0 }).where(eq(chatSessionsTable.sessionId, sessionId));
  res.json({ success: true });
});

// Seller: get/update their chat status (unread admin replies)
router.get("/seller/chat-status", requireSeller, async (req, res): Promise<void> => {
  const sess = req.session as any;
  const sessionId = `seller-${sess.sellerId}`;
  const [session] = await db.select().from(chatSessionsTable).where(eq(chatSessionsTable.sessionId, sessionId));
  res.json({
    sessionId,
    sellerUnreadCount: session?.customerUnreadCount ?? 0,
    hasChat: !!session,
    lastMessage: session?.lastMessage ?? null,
    lastMessageAt: session?.lastMessageAt?.toISOString() ?? null,
  });
});

// Customer: get their own chat status (unread replies from admin)
router.get("/customer/chat-status", async (req, res): Promise<void> => {
  const sess = req.session as any;
  if (!sess.customerId) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }

  const sessionId = `customer-${sess.customerId}`;
  const [session] = await db.select().from(chatSessionsTable).where(eq(chatSessionsTable.sessionId, sessionId));

  res.json({
    sessionId,
    customerUnreadCount: session?.customerUnreadCount ?? 0,
    hasChat: !!session,
    lastMessage: session?.lastMessage ?? null,
    lastMessageAt: session?.lastMessageAt?.toISOString() ?? null,
  });
});

export default router;
