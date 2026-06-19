import nodemailer from "nodemailer";

const smtpConfigured = !!(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

let transporter: nodemailer.Transporter | null = null;
if (smtpConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

const FROM = process.env.SMTP_FROM || "CodeX Stocks <noreply@codexstocks.org>";

export async function sendOtpEmail(
  to: string,
  otp: string,
  purpose: "signup" | "reset",
): Promise<void> {
  const subject =
    purpose === "signup"
      ? "Your CodeX Stocks verification code"
      : "Reset your CodeX Stocks password";

  const html = `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0a0a0a;padding:32px;border-radius:12px">
  <h2 style="color:#f59e0b;margin-top:0">CodeX Stocks</h2>
  <p style="color:#ccc;margin-bottom:8px">
    ${purpose === "signup" ? "Your account verification code:" : "Your password reset code:"}
  </p>
  <div style="font-size:40px;font-weight:bold;letter-spacing:14px;color:#fff;background:#1a1a1a;border:2px solid #f59e0b;padding:20px;text-align:center;border-radius:8px;margin:20px 0">
    ${otp}
  </div>
  <p style="color:#888;font-size:13px">
    This code expires in ${purpose === "signup" ? "10" : "15"} minutes.
    Do not share it with anyone.
  </p>
  <p style="color:#555;font-size:12px;margin-bottom:0">
    If you did not request this, you can safely ignore this email.
  </p>
</div>`;

  if (!transporter) {
    console.warn(
      `\n[EMAIL — DEV MODE] ──────────────────────────────\n` +
      `  To: ${to}\n` +
      `  OTP: ${otp}  (purpose: ${purpose})\n` +
      `  Configure SMTP_HOST, SMTP_USER, SMTP_PASS to send real emails.\n` +
      `────────────────────────────────────────────────\n`,
    );
    return;
  }

  await transporter.sendMail({ from: FROM, to, subject, html });
}
