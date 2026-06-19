import { pool } from "@workspace/db";
import { logger } from "./logger";

export type AuthAction =
  | "login_success"
  | "login_failure"
  | "google_login_success"
  | "google_login_failure"
  | "email_signup_otp_sent"
  | "email_signup_otp_failed"
  | "email_signup_complete"
  | "forgot_password_requested"
  | "password_reset_complete"
  | "password_reset_otp_failed"
  | "password_changed"
  | "google_linked"
  | "google_unlinked"
  | "account_deleted"
  | "email_changed";

/**
 * Records an auth event to the audit log table.
 * Never throws — logging failures must not break the main flow.
 */
export async function logAuthEvent(
  action: AuthAction,
  customerId?: number | null,
  ip?: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO auth_audit_logs (action, customer_user_id, ip, metadata)
       VALUES ($1, $2, $3, $4)`,
      [action, customerId ?? null, ip ?? null, metadata ? JSON.stringify(metadata) : null],
    );
  } catch (err) {
    logger.warn({ err }, "auth-audit: failed to write audit log");
  }
}

/** Extract best-effort client IP from request headers. */
export function getClientIp(req: any): string | null {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0]?.trim() || null;
  return req.socket?.remoteAddress || null;
}
