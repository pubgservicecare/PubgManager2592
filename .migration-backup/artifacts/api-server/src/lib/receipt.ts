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
}

export interface ReceiptTotalsInput {
  totalPrice: number;
  totalPaid: number;
  remaining: number;
}

const ORANGE = "#F59E0B";
const DARK = "#0B0B0F";
const MUTED = "#6B7280";
const BORDER = "#E5E7EB";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDate(d: Date | string | null): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}

export function generateReceiptPdf(opts: {
  payment: ReceiptPaymentInput;
  account: Account;
  business: ReceiptBusinessInput;
  totals: ReceiptTotalsInput;
}): NodeJS.ReadableStream {
  const { payment, account, business, totals } = opts;
  const doc = new PDFDocument({ size: "A4", margin: 48 });

  const pageWidth = doc.page.width - 96;

  // Header band
  doc.rect(0, 0, doc.page.width, 96).fill(DARK);
  doc.fillColor(ORANGE).fontSize(22).font("Helvetica-Bold").text(business.siteName.toUpperCase(), 48, 32);
  doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica").text("PAYMENT RECEIPT", 48, 62);

  // Receipt number on right
  doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica").text(`Receipt #`, 48, 32, { align: "right", width: pageWidth });
  doc.fillColor(ORANGE).fontSize(14).font("Helvetica-Bold").text(payment.receiptNumber, 48, 46, {
    align: "right",
    width: pageWidth,
  });
  doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica").text(formatDate(payment.paidAt), 48, 66, {
    align: "right",
    width: pageWidth,
  });

  doc.fillColor("#000000").moveDown(4);

  // Buyer + Account info two columns
  const colTop = 128;
  doc.fontSize(9).fillColor(MUTED).font("Helvetica-Bold").text("BUYER", 48, colTop);
  doc.fontSize(11).fillColor("#000000").font("Helvetica-Bold").text(account.customerName || "—", 48, colTop + 14);
  doc.fontSize(9).fillColor(MUTED).font("Helvetica").text(account.customerContact || "—", 48, colTop + 30);

  const rightColX = 48 + pageWidth / 2;
  doc.fontSize(9).fillColor(MUTED).font("Helvetica-Bold").text("ACCOUNT", rightColX, colTop);
  doc.fontSize(11).fillColor("#000000").font("Helvetica-Bold").text(account.title, rightColX, colTop + 14, { width: pageWidth / 2 - 8 });
  doc.fontSize(9).fillColor(MUTED).font("Helvetica").text(`ID: ${account.accountId}`, rightColX, colTop + 30);

  // Divider
  const dividerY = colTop + 70;
  doc.strokeColor(BORDER).lineWidth(1).moveTo(48, dividerY).lineTo(48 + pageWidth, dividerY).stroke();

  // Payment details box
  const boxY = dividerY + 24;
  doc.fontSize(9).fillColor(MUTED).font("Helvetica-Bold").text("PAYMENT DETAILS", 48, boxY);

  const tableY = boxY + 22;
  const rowHeight = 22;
  const labelX = 48;
  const valueX = 48 + pageWidth / 2;

  const rows: Array<[string, string]> = [
    ["Amount Received", formatCurrency(payment.amount)],
    ["Payment Date", formatDate(payment.paidAt)],
    ["Due Date", formatDate(payment.dueDate)],
    ["Note", payment.note || "—"],
  ];

  rows.forEach((row, i) => {
    const y = tableY + i * rowHeight;
    if (i % 2 === 0) {
      doc.rect(48, y - 4, pageWidth, rowHeight).fill("#F9FAFB");
    }
    doc.fillColor(MUTED).font("Helvetica").fontSize(10).text(row[0], labelX + 8, y);
    doc.fillColor("#000000").font("Helvetica-Bold").fontSize(10).text(row[1], valueX, y, { width: pageWidth / 2 - 8 });
  });

  // Totals summary
  const totalsY = tableY + rows.length * rowHeight + 24;
  doc.fontSize(9).fillColor(MUTED).font("Helvetica-Bold").text("INSTALLMENT SUMMARY", 48, totalsY);

  const summaryY = totalsY + 22;
  doc.rect(48, summaryY - 6, pageWidth, 86).fillAndStroke("#FFFBEB", ORANGE);

  doc.fillColor(MUTED).font("Helvetica").fontSize(10).text("Total Sale Price", 60, summaryY + 4);
  doc.fillColor("#000000").font("Helvetica-Bold").fontSize(11).text(formatCurrency(totals.totalPrice), 60, summaryY + 4, { align: "right", width: pageWidth - 24 });

  doc.fillColor(MUTED).font("Helvetica").fontSize(10).text("Total Paid (incl. this)", 60, summaryY + 26);
  doc.fillColor("#000000").font("Helvetica-Bold").fontSize(11).text(formatCurrency(totals.totalPaid), 60, summaryY + 26, { align: "right", width: pageWidth - 24 });

  doc.fillColor(MUTED).font("Helvetica").fontSize(10).text("Remaining Balance", 60, summaryY + 52);
  doc.fillColor(totals.remaining > 0 ? "#DC2626" : "#16A34A").font("Helvetica-Bold").fontSize(13).text(formatCurrency(totals.remaining), 60, summaryY + 50, { align: "right", width: pageWidth - 24 });

  // Footer
  const footerY = doc.page.height - 100;
  doc.strokeColor(BORDER).lineWidth(1).moveTo(48, footerY).lineTo(48 + pageWidth, footerY).stroke();
  doc.fillColor(MUTED).font("Helvetica").fontSize(8).text(
    "This is a computer-generated receipt. No signature required.",
    48,
    footerY + 12,
    { align: "center", width: pageWidth }
  );
  doc.fillColor(MUTED).font("Helvetica").fontSize(8).text(
    `Support: ${business.supportEmail}  •  WhatsApp: ${business.whatsappNumber}`,
    48,
    footerY + 28,
    { align: "center", width: pageWidth }
  );
  doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(7).text(business.footerText, 48, footerY + 50, {
    align: "center",
    width: pageWidth,
  });

  doc.end();
  return doc as unknown as NodeJS.ReadableStream;
}
