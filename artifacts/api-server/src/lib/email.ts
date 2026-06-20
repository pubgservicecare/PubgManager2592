import { Resend } from "resend";
import { db, emailLogsTable } from "@workspace/db";

// ─── Resend Setup ─────────────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const resendConfigured = RESEND_API_KEY.length > 0;

const resend: Resend | null = resendConfigured ? new Resend(RESEND_API_KEY) : null;

if (resendConfigured) {
  console.log("[EMAIL] Resend SDK initialised | from=CODExSTOCKS <noreply@codexstocks.org>");
} else {
  console.warn("[EMAIL] RESEND_API_KEY not set — emails will be logged but not sent (dev mode)");
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FROM = "CODExSTOCKS <noreply@codexstocks.org>";
const SITE_URL = "https://www.codexstocks.org";
const SUPPORT_EMAIL = "pubg.service.care@gmail.com";

// ─── Non-blocking DB Log ──────────────────────────────────────────────────────

function logEmail(opts: {
  type: string;
  to: string;
  name?: string | null;
  subject: string;
  status: "sent" | "failed";
  error?: string;
  campaignId?: number;
}): void {
  db.insert(emailLogsTable)
    .values({
      emailType: opts.type,
      recipientEmail: opts.to,
      recipientName: opts.name ?? undefined,
      subject: opts.subject,
      status: opts.status,
      errorMessage: opts.error,
      campaignId: opts.campaignId,
    })
    .catch(() => {});
}

// ─── Base Branded Layout ──────────────────────────────────────────────────────

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>CODE X STOCKS</title>
</head>
<body style="margin:0;padding:0;background-color:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#050505;">
    <tr>
      <td align="center" style="padding:40px 16px 48px;">

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#111111;border-radius:16px;border:1px solid #222222;overflow:hidden;">

          <!-- HEADER -->
          <tr>
            <td style="padding:28px 36px 24px;background:linear-gradient(180deg,#1c1200 0%,#111111 100%);border-bottom:2px solid #FFAA00;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width:48px;height:48px;background-color:#FFAA00;border-radius:12px;text-align:center;vertical-align:middle;font-size:22px;line-height:48px;">
                    🎮
                  </td>
                  <td style="padding-left:14px;vertical-align:middle;">
                    <div style="font-size:19px;font-weight:900;letter-spacing:3px;color:#FFAA00;font-family:Georgia,'Times New Roman',serif;">CODE X STOCKS</div>
                    <div style="font-size:10px;color:#666666;letter-spacing:2px;text-transform:uppercase;margin-top:3px;">PUBG Mobile Accounts · Pakistan</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="padding:36px 36px 8px;">
              ${content}
            </td>
          </tr>

          <!-- SECURITY NOTICE -->
          <tr>
            <td style="padding:0 36px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#0c0c0c;border:1px solid #1e1e1e;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0;font-size:11px;color:#555555;line-height:1.6;">
                      🔒 <strong style="color:#666666;">Security Notice:</strong> CODE X STOCKS will never ask for your password, payment info, or OTP code via phone or email. If you did not request this, you can safely ignore it.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#0a0a0a;border-top:1px solid #1a1a1a;padding:22px 36px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#444444;">
                <a href="${SITE_URL}" style="color:#FFAA00;text-decoration:none;font-weight:600;">codexstocks.org</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="mailto:${SUPPORT_EMAIL}" style="color:#FFAA00;text-decoration:none;font-weight:600;">Contact Support</a>
              </p>
              <p style="margin:0;font-size:11px;color:#2e2e2e;">© 2025 CODE X STOCKS · Pakistan's Trusted PUBG Marketplace</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── OTP Box Helper ────────────────────────────────────────────────────────────

function otpBox(otp: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background-color:#0d0d0d;border:2px solid #FFAA00;border-radius:12px;padding:20px 44px;text-align:center;">
                <p style="margin:0 0 6px;font-size:10px;color:#888888;letter-spacing:3px;text-transform:uppercase;">Verification Code</p>
                <p style="margin:0;font-size:42px;font-weight:900;letter-spacing:14px;color:#FFFFFF;font-family:'Courier New',Courier,monospace;">${otp}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

// ─── CTA Button Helper ────────────────────────────────────────────────────────

function ctaButton(label: string, href: string): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
      <tr>
        <td style="background-color:#FFAA00;border-radius:10px;text-align:center;">
          <a href="${href}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:800;color:#000000;text-decoration:none;letter-spacing:0.5px;">${label}</a>
        </td>
      </tr>
    </table>`;
}

// ─── Heading + Body helpers ───────────────────────────────────────────────────

function h1(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#FFFFFF;line-height:1.2;">${text}</h1>`;
}

function subtitle(text: string): string {
  return `<p style="margin:0 0 24px;font-size:13px;color:#FFAA00;font-weight:600;letter-spacing:1px;text-transform:uppercase;">${text}</p>`;
}

function para(text: string, muted = false): string {
  const color = muted ? "#666666" : "#BBBBBB";
  return `<p style="margin:0 0 16px;font-size:14px;color:${color};line-height:1.7;">${text}</p>`;
}

function divider(): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr><td style="border-top:1px solid #1e1e1e;"></td></tr>
  </table>`;
}

function infoRow(label: string, value: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">
      <tr>
        <td width="44%" style="font-size:12px;color:#666666;padding:10px 0;border-bottom:1px solid #1a1a1a;">${label}</td>
        <td width="56%" style="font-size:13px;color:#FFFFFF;font-weight:600;padding:10px 0;border-bottom:1px solid #1a1a1a;text-align:right;">${value}</td>
      </tr>
    </table>`;
}

// ─── Core Send Function ───────────────────────────────────────────────────────

async function sendEmail(opts: {
  to: string;
  name?: string | null;
  subject: string;
  html: string;
  type: string;
  campaignId?: number;
}): Promise<void> {
  if (!resend) {
    console.warn(
      `[EMAIL] DEV MODE (no Resend client)` +
      ` | type=${opts.type} to=${opts.to} subject="${opts.subject}"` +
      ` | Set RESEND_API_KEY to enable real sending`,
    );
    logEmail({ ...opts, status: "sent" });
    return;
  }

  console.log(
    `[EMAIL] Resend send attempt` +
    ` | type=${opts.type} to=${opts.to} subject="${opts.subject}"`,
  );

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });

    if (error) {
      const errMsg = `name=${error.name} message=${error.message}`;
      console.error(
        `[EMAIL] Resend send FAILED` +
        ` | type=${opts.type} to=${opts.to}` +
        ` | ${errMsg}`,
      );
      logEmail({ ...opts, status: "failed", error: errMsg });
      throw new Error(errMsg);
    }

    const msgId: string = data?.id ?? "(none)";
    console.log(
      `[EMAIL] Resend send OK` +
      ` | type=${opts.type} to=${opts.to}` +
      ` | messageId=${msgId}`,
    );
    logEmail({ ...opts, status: "sent" });
  } catch (err: any) {
    if (err?.message?.startsWith("name=")) throw err;
    const msg: string = err?.message ?? String(err);
    console.error(
      `[EMAIL] Resend send ERROR` +
      ` | type=${opts.type} to=${opts.to}` +
      ` | message="${msg}"`,
    );
    logEmail({ ...opts, status: "failed", error: msg });
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1 — OTP EMAILS
// ═══════════════════════════════════════════════════════════════════════════════

export async function sendOtpEmail(
  to: string,
  otp: string,
  purpose: "signup" | "reset" | "email-change",
): Promise<void> {
  const config = {
    signup: {
      subject: "Verify your CODE X STOCKS account",
      heading: "Verify Your Email",
      sub: "Account Verification",
      intro: `Enter this code to complete your signup. It expires in <strong style="color:#FFAA00;">10 minutes</strong>.`,
      note: "If you didn't try to create an account, ignore this email.",
    },
    reset: {
      subject: "Reset your CODE X STOCKS password",
      heading: "Password Reset",
      sub: "Security Code",
      intro: `Enter this code to reset your password. It expires in <strong style="color:#FFAA00;">15 minutes</strong>.`,
      note: "If you didn't request a password reset, your account is safe — just ignore this email.",
    },
    "email-change": {
      subject: "Verify your new email — CODE X STOCKS",
      heading: "Verify New Email",
      sub: "Email Change",
      intro: `Enter this code to confirm your new email address. It expires in <strong style="color:#FFAA00;">10 minutes</strong>.`,
      note: "If you didn't request an email change, please contact support immediately.",
    },
  }[purpose];

  const html = layout(`
    ${h1(config.heading)}
    ${subtitle(config.sub)}
    ${para(config.intro)}
    ${otpBox(otp)}
    ${para(config.note, true)}
  `);

  await sendEmail({ to, subject: config.subject, html, type: `otp_${purpose}` });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — TRANSACTIONAL EMAILS
// ═══════════════════════════════════════════════════════════════════════════════

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const subject = `Welcome to CODE X STOCKS, ${name}!`;
  const html = layout(`
    ${h1(`Welcome, ${name}! 🎮`)}
    ${subtitle("You're In")}
    ${para("Your CODE X STOCKS account is ready. Pakistan's most trusted PUBG Mobile account marketplace — verified accounts, secure transfers, instant delivery.")}
    ${divider()}
    ${para(`<strong style="color:#FFFFFF;">What you can do:</strong>`)}
    ${para(`✅ &nbsp;Browse premium PUBG Mobile accounts with rare skins & mythic items`)}
    ${para(`💳 &nbsp;Buy on installments — flexible payment plans available`)}
    ${para(`🔒 &nbsp;Every account is verified before listing`)}
    ${para(`💬 &nbsp;Chat directly with our team for support`)}
    ${divider()}
    ${ctaButton("Browse Accounts →", SITE_URL)}
    ${para(`Need help? Reply to this email or visit <a href="${SITE_URL}/faq" style="color:#FFAA00;">our FAQ</a>.`, true)}
  `);

  await sendEmail({ to, name, subject, html, type: "welcome" });
}

export async function sendPasswordChangedEmail(to: string, name: string): Promise<void> {
  const subject = "Your CODE X STOCKS password was changed";
  const html = layout(`
    ${h1("Password Changed")}
    ${subtitle("Security Alert")}
    ${para(`Hi ${name}, your account password was successfully changed.`)}
    ${divider()}
    ${para(`<strong style="color:#FFFFFF;">Not you?</strong>`)}
    ${para(`If you did not change your password, your account may be compromised. Contact our support team immediately at <a href="mailto:${SUPPORT_EMAIL}" style="color:#FFAA00;">${SUPPORT_EMAIL}</a> or use the forgot-password flow to regain access.`)}
    ${divider()}
    ${ctaButton("Go to My Account →", `${SITE_URL}/my`)}
    ${para(`Changed on: ${new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" })} (PKT)`, true)}
  `);

  await sendEmail({ to, name, subject, html, type: "password_changed" });
}

export async function sendPasswordResetDoneEmail(to: string, name: string): Promise<void> {
  const subject = "Your CODE X STOCKS password has been reset";
  const html = layout(`
    ${h1("Password Reset Successful")}
    ${subtitle("Account Secured")}
    ${para(`Hi ${name}, your password has been successfully reset.`)}
    ${para("All previous sessions have been logged out for your security.")}
    ${divider()}
    ${para(`<strong style="color:#FFFFFF;">Wasn't you?</strong>`)}
    ${para(`Contact support immediately: <a href="mailto:${SUPPORT_EMAIL}" style="color:#FFAA00;">${SUPPORT_EMAIL}</a>`)}
    ${divider()}
    ${ctaButton("Login Now →", `${SITE_URL}/login`)}
    ${para(`Reset completed: ${new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" })} (PKT)`, true)}
  `);

  await sendEmail({ to, name, subject, html, type: "password_reset_done" });
}

export async function sendGoogleLinkedEmail(
  to: string,
  name: string,
  googleEmail: string,
): Promise<void> {
  const subject = "Google account linked to CODE X STOCKS";
  const html = layout(`
    ${h1("Google Account Linked")}
    ${subtitle("Login Method Added")}
    ${para(`Hi ${name}, your Google account has been successfully linked.`)}
    ${divider()}
    ${infoRow("Google Email", googleEmail)}
    ${infoRow("Linked At", new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }) + " (PKT)")}
    ${divider()}
    ${para("You can now sign in with either your password or Google — whichever is faster for you.")}
    ${para(`<strong style="color:#FFFFFF;">Wasn't you?</strong> Unlink it from Account Settings or contact <a href="mailto:${SUPPORT_EMAIL}" style="color:#FFAA00;">support</a>.`, false)}
    ${ctaButton("Manage Account →", `${SITE_URL}/my/settings`)}
  `);

  await sendEmail({ to, name, subject, html, type: "google_linked" });
}

export async function sendEmailChangedEmail(
  to: string,
  name: string,
  newEmail: string,
): Promise<void> {
  const subject = "Your CODE X STOCKS email address has been updated";
  const html = layout(`
    ${h1("Email Address Updated")}
    ${subtitle("Account Change")}
    ${para(`Hi ${name}, your account email has been successfully updated.`)}
    ${divider()}
    ${infoRow("New Email", newEmail)}
    ${infoRow("Changed At", new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }) + " (PKT)")}
    ${divider()}
    ${para(`Future emails (including OTP codes) will be sent to <strong style="color:#FFFFFF;">${newEmail}</strong>.`)}
    ${para(`<strong style="color:#FFFFFF;">Wasn't you?</strong> Contact support immediately at <a href="mailto:${SUPPORT_EMAIL}" style="color:#FFAA00;">${SUPPORT_EMAIL}</a>.`)}
    ${ctaButton("Go to My Account →", `${SITE_URL}/my`)}
  `);

  await sendEmail({ to, name, subject, html, type: "email_changed" });
}

export async function sendPurchaseConfirmationEmail(
  to: string,
  name: string,
  accountTitle: string,
  price: string | number,
  paymentType: "full" | "installment" | string,
): Promise<void> {
  const subject = "Purchase Confirmed — CODE X STOCKS";
  const priceFormatted = `PKR ${Number(price).toLocaleString("en-PK")}`;
  const paymentLabel = paymentType === "full" ? "Full Payment" : "Installment Plan";

  const html = layout(`
    ${h1("Purchase Confirmed! 🎮")}
    ${subtitle("Order Summary")}
    ${para(`Congratulations ${name}! Your PUBG Mobile account has been secured. Our team will contact you shortly for the transfer.`)}
    ${divider()}
    ${infoRow("Account", accountTitle)}
    ${infoRow("Price", priceFormatted)}
    ${infoRow("Payment Type", paymentLabel)}
    ${infoRow("Date", new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }) + " (PKT)")}
    ${divider()}
    ${paymentType === "installment" ? para(`<strong style="color:#FFAA00;">Installment Plan:</strong> Your payment schedule has been set up. Check your dashboard to view upcoming payments.`) : ""}
    ${para("Our team will reach out to you within 24 hours for account transfer details.")}
    ${ctaButton("View My Orders →", `${SITE_URL}/my`)}
    ${para(`Questions? Chat with us at <a href="${SITE_URL}/chat" style="color:#FFAA00;">codexstocks.org/chat</a> or email <a href="mailto:${SUPPORT_EMAIL}" style="color:#FFAA00;">${SUPPORT_EMAIL}</a>.`, true)}
  `);

  await sendEmail({ to, name, subject, html, type: "purchase_confirmation" });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3 — CAMPAIGN / ADMIN BULK EMAIL
// ═══════════════════════════════════════════════════════════════════════════════

export async function sendCampaignEmail(
  to: string,
  name: string | null,
  subject: string,
  htmlContent: string,
  campaignId?: number,
): Promise<{ ok: boolean; error?: string }> {
  const html = layout(htmlContent);
  try {
    await sendEmail({ to, name, subject, html, type: "campaign", campaignId });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function sendRawEmail(
  to: string,
  name: string | null,
  subject: string,
  htmlBody: string,
  type = "admin_single",
): Promise<{ ok: boolean; error?: string }> {
  const html = layout(htmlBody);
  try {
    await sendEmail({ to, name, subject, html, type });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
