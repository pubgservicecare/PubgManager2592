import PDFDocument from "pdfkit";
import type { Account } from "@workspace/db";

export interface ReceiptPaymentInput {
  id: number;
  receiptNumber: string;
  amount: number;
  note: string | null;
  paidAt: Date;
  dueDate: string | null;
}

export interface ReceiptBusinessInput {
  siteName: string;
  supportEmail: string;
  whatsappNumber: string;
  footerText: string;
  siteUrl: string;
}

export interface ReceiptTotalsInput {
  totalPrice: number;
  totalPaid: number;
  remaining: number;
}

// ─── Colours ────────────────────────────────────────────────────────────────
const AMBER   = "#F59E0B";
const DARK    = "#111827";
const WHITE   = "#FFFFFF";
const MUTED   = "#6B7280";
const LIGHT   = "#F3F4F6";
const BORDER  = "#D1D5DB";
const RED     = "#DC2626";
const GREEN   = "#16A34A";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Main generator ──────────────────────────────────────────────────────────
export function generateReceiptPdf(opts: {
  payment: ReceiptPaymentInput;
  account: Account;
  business: ReceiptBusinessInput;
  totals: ReceiptTotalsInput;
}): NodeJS.ReadableStream {
  const { payment, account, business, totals } = opts;

  // ── Layout constants ──────────────────────────────────────────────────────
  const PW       = 595;          // A4 width in points
  const ML       = 40;           // left margin
  const MR       = 40;           // right margin
  const CW       = PW - ML - MR; // content width = 515
  const HALF     = CW / 2;

  // Section heights (pre-calculated so we can set exact page height)
  const H_HEADER  = 72;
  const H_META    = 54;   // receipt # + date strip below header
  const H_PARTIES = 68;   // buyer / account columns
  const H_DIV     = 18;   // thin divider
  const H_PAY_HDR = 18;
  const H_ROW     = 20;
  const NUM_ROWS  = 4;    // Amount, Date, Due, Note
  const H_PAY     = H_PAY_HDR + NUM_ROWS * H_ROW + 10;
  const H_SUM_HDR = 18;
  const H_SUM_BOX = 80;
  const H_SUM     = H_SUM_HDR + H_SUM_BOX + 10;
  const H_FOOTER  = 56;
  const H_PAD     = 16;   // top padding after header band

  const PAGE_H = H_HEADER + H_META + H_PAD + H_PARTIES + H_DIV + H_PAY + H_SUM + H_FOOTER + 24;

  const doc = new PDFDocument({ size: [PW, PAGE_H], margin: 0, autoFirstPage: true });

  // ── HEADER BAND ───────────────────────────────────────────────────────────
  doc.rect(0, 0, PW, H_HEADER).fill(DARK);

  // Site name (left)
  doc.fillColor(AMBER).font("Helvetica-Bold").fontSize(18)
     .text(business.siteName.toUpperCase(), ML, 18, { width: HALF, lineBreak: false });

  // "PAYMENT RECEIPT" badge (right-aligned)
  const badgeW = 130;
  const badgeX = PW - MR - badgeW;
  doc.rect(badgeX, 14, badgeW, 20).fill(AMBER);
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(8)
     .text("PAYMENT RECEIPT", badgeX, 19, { width: badgeW, align: "center", lineBreak: false });

  // Website URL in header (left, below name)
  doc.fillColor("#9CA3AF").font("Helvetica").fontSize(8)
     .text(business.siteUrl, ML, 44, { lineBreak: false });

  // ── META STRIP (light bg under header) ───────────────────────────────────
  const metaY = H_HEADER;
  doc.rect(0, metaY, PW, H_META).fill(LIGHT);

  // Receipt # (left)
  doc.fillColor(MUTED).font("Helvetica").fontSize(7.5)
     .text("RECEIPT NO.", ML, metaY + 10, { lineBreak: false });
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(12)
     .text(payment.receiptNumber, ML, metaY + 22, { lineBreak: false });

  // Payment date (centre)
  const midX = ML + HALF / 2;
  doc.fillColor(MUTED).font("Helvetica").fontSize(7.5)
     .text("DATE", midX, metaY + 10, { lineBreak: false });
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(11)
     .text(fmtDate(payment.paidAt), midX, metaY + 22, { lineBreak: false });

  // Amount (right)
  doc.fillColor(MUTED).font("Helvetica").fontSize(7.5)
     .text("AMOUNT PAID", ML + HALF, metaY + 10, { width: HALF, align: "right", lineBreak: false });
  doc.fillColor(AMBER).font("Helvetica-Bold").fontSize(14)
     .text(fmt(payment.amount), ML + HALF, metaY + 20, { width: HALF, align: "right", lineBreak: false });

  // ── PARTIES ROW ───────────────────────────────────────────────────────────
  const partiesY = metaY + H_META + H_PAD;

  // Buyer (left col)
  doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(7.5)
     .text("BUYER", ML, partiesY, { lineBreak: false });
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(11)
     .text(account.customerName || "—", ML, partiesY + 12, { width: HALF - 12, lineBreak: false });
  doc.fillColor(MUTED).font("Helvetica").fontSize(9)
     .text(account.customerContact || "—", ML, partiesY + 27, { lineBreak: false });

  // Vertical separator
  const sepX = ML + HALF;
  doc.strokeColor(BORDER).lineWidth(0.5)
     .moveTo(sepX, partiesY).lineTo(sepX, partiesY + H_PARTIES - 12).stroke();

  // Account (right col)
  const rcX = sepX + 14;
  doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(7.5)
     .text("PUBG ACCOUNT", rcX, partiesY, { lineBreak: false });
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(11)
     .text(account.title, rcX, partiesY + 12, { width: HALF - 14, lineBreak: false });
  doc.fillColor(MUTED).font("Helvetica").fontSize(9)
     .text(`ID: ${account.accountId}`, rcX, partiesY + 27, { lineBreak: false });

  // ── THIN DIVIDER ──────────────────────────────────────────────────────────
  const divY = partiesY + H_PARTIES;
  doc.strokeColor(BORDER).lineWidth(0.5)
     .moveTo(ML, divY).lineTo(ML + CW, divY).stroke();

  // ── PAYMENT DETAILS TABLE ─────────────────────────────────────────────────
  const payY = divY + 10;
  doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(7.5)
     .text("PAYMENT DETAILS", ML, payY, { lineBreak: false });

  const rows: Array<[string, string]> = [
    ["Amount Received",  fmt(payment.amount)],
    ["Payment Date",     fmtDate(payment.paidAt)],
    ["Due Date",         fmtDate(payment.dueDate)],
    ["Note",             payment.note || "—"],
  ];

  const tblY  = payY + H_PAY_HDR;
  const valX  = ML + HALF;

  rows.forEach(([label, value], i) => {
    const rowY = tblY + i * H_ROW;
    if (i % 2 === 0) {
      doc.rect(ML, rowY - 2, CW, H_ROW).fill(LIGHT);
    }
    doc.fillColor(MUTED).font("Helvetica").fontSize(9)
       .text(label, ML + 6, rowY + 2, { lineBreak: false });
    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9)
       .text(value, valX, rowY + 2, { width: HALF - 6, align: "right", lineBreak: false });
  });

  // ── INSTALLMENT SUMMARY BOX ───────────────────────────────────────────────
  const sumHeaderY = tblY + NUM_ROWS * H_ROW + 16;
  doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(7.5)
     .text("INSTALLMENT SUMMARY", ML, sumHeaderY, { lineBreak: false });

  const boxY  = sumHeaderY + H_SUM_HDR;
  const boxH  = H_SUM_BOX;
  doc.rect(ML, boxY, CW, boxH).fillAndStroke("#FFFBEB", AMBER);

  const rowSpacing = 22;

  // Total Price
  doc.fillColor(MUTED).font("Helvetica").fontSize(9)
     .text("Total Sale Price", ML + 10, boxY + 10, { lineBreak: false });
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(10)
     .text(fmt(totals.totalPrice), ML + 10, boxY + 10, { width: CW - 20, align: "right", lineBreak: false });

  // Total Paid
  doc.fillColor(MUTED).font("Helvetica").fontSize(9)
     .text("Total Paid (incl. this)", ML + 10, boxY + 10 + rowSpacing, { lineBreak: false });
  doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(10)
     .text(fmt(totals.totalPaid), ML + 10, boxY + 10 + rowSpacing, { width: CW - 20, align: "right", lineBreak: false });

  // Remaining — bold and coloured
  doc.strokeColor(AMBER).lineWidth(0.5)
     .moveTo(ML + 10, boxY + 10 + rowSpacing * 2 - 4)
     .lineTo(ML + CW - 10, boxY + 10 + rowSpacing * 2 - 4).stroke();
  doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(9)
     .text("Remaining Balance", ML + 10, boxY + 10 + rowSpacing * 2 + 2, { lineBreak: false });
  doc.fillColor(totals.remaining > 0 ? RED : GREEN).font("Helvetica-Bold").fontSize(13)
     .text(fmt(totals.remaining), ML + 10, boxY + 6 + rowSpacing * 2, { width: CW - 20, align: "right", lineBreak: false });

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const footerY = boxY + boxH + 14;
  doc.rect(0, footerY, PW, H_FOOTER + 10).fill(DARK);

  // Left: contact info
  doc.fillColor("#9CA3AF").font("Helvetica").fontSize(7.5)
     .text(`Email: ${business.supportEmail}`, ML, footerY + 10, { lineBreak: false });
  if (business.whatsappNumber) {
    doc.fillColor("#9CA3AF").font("Helvetica").fontSize(7.5)
       .text(`WhatsApp: ${business.whatsappNumber}`, ML, footerY + 22, { lineBreak: false });
  }

  // Right: website
  doc.fillColor(AMBER).font("Helvetica-Bold").fontSize(9)
     .text(business.siteUrl, ML, footerY + 10, { width: CW, align: "right", lineBreak: false });

  // Centre: disclaimer
  doc.fillColor("#6B7280").font("Helvetica").fontSize(7)
     .text("This is a computer-generated receipt. No signature required.", ML, footerY + 36, {
       width: CW, align: "center", lineBreak: false,
     });

  doc.end();
  return doc as unknown as NodeJS.ReadableStream;
}
