import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("exports/deployment-guide.pdf");
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const doc = new PDFDocument({ size: "A4", margin: 50 });
doc.pipe(fs.createWriteStream(OUT));

const COLORS = {
  primary: "#FF8800",
  dark: "#0a0e1a",
  text: "#1a1a1a",
  muted: "#555555",
  light: "#f5f5f5",
  border: "#e0e0e0",
  code: "#1e1e1e",
  codeText: "#d4d4d4",
};

function h1(text) {
  doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(22).text(text);
  doc.moveDown(0.3);
  const y = doc.y;
  doc.moveTo(50, y).lineTo(545, y).strokeColor(COLORS.primary).lineWidth(2).stroke();
  doc.moveDown(0.6);
}

function h2(text) {
  doc.moveDown(0.5);
  doc.fillColor(COLORS.dark).font("Helvetica-Bold").fontSize(15).text(text);
  doc.moveDown(0.3);
}

function h3(text) {
  doc.moveDown(0.3);
  doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(12).text(text);
  doc.moveDown(0.2);
}

function p(text) {
  doc.fillColor(COLORS.text).font("Helvetica").fontSize(10.5).text(text, { align: "left", lineGap: 2 });
  doc.moveDown(0.3);
}

function bullet(text) {
  doc.fillColor(COLORS.text).font("Helvetica").fontSize(10.5);
  doc.text(`• ${text}`, { indent: 10, lineGap: 2 });
}

function code(lines) {
  doc.moveDown(0.2);
  const startY = doc.y;
  const padding = 8;
  const lineHeight = 12;
  const height = lines.length * lineHeight + padding * 2;
  doc.rect(50, startY, 495, height).fill(COLORS.code);
  doc.fillColor(COLORS.codeText).font("Courier").fontSize(9.5);
  let y = startY + padding;
  for (const line of lines) {
    doc.text(line, 58, y);
    y += lineHeight;
  }
  doc.y = startY + height + 6;
  doc.fillColor(COLORS.text);
}

function envTable(rows) {
  const tableLeft = 50;
  const colWidths = [160, 335];
  const rowHeight = 22;
  doc.moveDown(0.3);
  let y = doc.y;
  doc.rect(tableLeft, y, colWidths[0] + colWidths[1], rowHeight).fill(COLORS.primary);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(10);
  doc.text("Variable", tableLeft + 8, y + 7);
  doc.text("Value", tableLeft + colWidths[0] + 8, y + 7);
  y += rowHeight;
  rows.forEach((row, i) => {
    const bg = i % 2 === 0 ? "#FFFFFF" : COLORS.light;
    doc.rect(tableLeft, y, colWidths[0] + colWidths[1], rowHeight).fill(bg);
    doc.fillColor(COLORS.dark).font("Courier-Bold").fontSize(9.5);
    doc.text(row[0], tableLeft + 8, y + 7);
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(9);
    doc.text(row[1], tableLeft + colWidths[0] + 8, y + 7, { width: colWidths[1] - 16 });
    y += rowHeight;
  });
  doc.rect(tableLeft, doc.y - rows.length * rowHeight - rowHeight, colWidths[0] + colWidths[1], (rows.length + 1) * rowHeight).strokeColor(COLORS.border).lineWidth(0.5).stroke();
  doc.y = y + 8;
}

function step(num, title) {
  doc.moveDown(0.4);
  const y = doc.y;
  doc.circle(60, y + 9, 11).fill(COLORS.primary);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(11).text(String(num), 56, y + 4);
  doc.fillColor(COLORS.dark).font("Helvetica-Bold").fontSize(13).text(title, 80, y + 3);
  doc.moveDown(0.5);
}

function note(text) {
  doc.moveDown(0.3);
  const startY = doc.y;
  const textHeight = doc.heightOfString(text, { width: 475 });
  const height = textHeight + 16;
  doc.rect(50, startY, 495, height).fill("#FFF8E7");
  doc.rect(50, startY, 4, height).fill(COLORS.primary);
  doc.fillColor(COLORS.text).font("Helvetica-Oblique").fontSize(10);
  doc.text(text, 62, startY + 8, { width: 475 });
  doc.y = startY + height + 6;
}

// ============ HEADER ============
doc.rect(0, 0, 595, 90).fill(COLORS.dark);
doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(24).text("PUBG ACCOUNT MANAGER", 50, 28);
doc.fillColor("#FFFFFF").font("Helvetica").fontSize(11).text("Deployment Guide  ·  Render (Backend) + Vercel (Frontend)", 50, 58);
doc.y = 110;

// ============ OVERVIEW ============
h1("Overview");
p("Yeh project pnpm monorepo hai. Backend Render pe deploy hoga, Frontend Vercel pe. Code restructure ki zaroorat NAHI hai — current structure deployment-ready hai.");

doc.moveDown(0.2);
h3("Architecture");
bullet("Backend  →  artifacts/api-server/  →  Render (Node + Express + TypeScript)");
bullet("Frontend →  artifacts/pubg-manager/ →  Vercel (Vite + React + TypeScript)");
bullet("Shared  →  lib/ packages (auto-linked via pnpm workspace)");
bullet("Database →  PostgreSQL (Neon / Supabase / Render Postgres)");

// ============ STEP 1 ============
h1("Step 1 — GitHub Push");
p("Sabse pehle project ko GitHub pe push karein.");
step(1, "Replit mein Git pane kholein");
p("Left sidebar > Tools > Git > Connect to GitHub.");
step(2, "Naya repository banayein");
p("Naam dein (e.g. pubg-account-manager), Public/Private choose karein.");
step(3, "Commit & Push");
p('Commit message likhein aur "Commit & Push" dabayein.');

note("Push karne se pehle confirm karein .gitignore mein .env aur node_modules included hain (already added).");

// ============ STEP 2 ============
doc.addPage();
h1("Step 2 — Database Setup");
p("Backend deploy karne se PEHLE PostgreSQL database chahiye.");

h3("Recommended Providers (Free Tier)");
bullet("Neon (neon.tech) — serverless Postgres, recommended");
bullet("Supabase (supabase.com) — Postgres + extras");
bullet("Render Postgres — Render dashboard ke andar");

h3("Schema Push (one-time)");
p("Database banane ke baad, connection string copy karein aur local terminal se schema push karein:");
code([
  'DATABASE_URL="postgresql://user:pass@host:5432/dbname" \\',
  "  pnpm --filter @workspace/db run push",
]);

// ============ STEP 3 ============
h1("Step 3 — Backend → Render");

h3("Method A: One-Click Blueprint (Recommended)");
step(1, "Render Dashboard");
p("dashboard.render.com kholein > New > Blueprint");
step(2, "GitHub Connect");
p("Apna repo select karein. Render automatic render.yaml detect karega.");
step(3, "Env Vars Fill");
p("Prompt par DATABASE_URL aur FRONTEND_URL fill karein (FRONTEND_URL temporarily * rakh sakte hain).");
step(4, "Apply");
p("Click Apply — backend build & deploy ho jayega.");

h3("Backend Configuration (manual ke liye)");
code([
  "Build:  corepack enable && pnpm install --frozen-lockfile=false &&",
  "        pnpm --filter @workspace/api-server run build",
  "Start:  node --enable-source-maps artifacts/api-server/dist/index.mjs",
  "Health: /api/healthz",
]);

h3("Required Environment Variables");
envTable([
  ["DATABASE_URL", "Postgres connection string"],
  ["SESSION_SECRET", "Long random string (auto-gen)"],
  ["PORT", "8080"],
  ["NODE_ENV", "production"],
  ["FRONTEND_URL", "https://your-app.vercel.app"],
]);

p("Deploy ke baad URL milega: https://pubg-account-manager-api.onrender.com");
p("Test: us URL pe /api/healthz hit karein — {\"status\":\"ok\"} milna chahiye.");

// ============ STEP 4 ============
doc.addPage();
h1("Step 4 — Frontend → Vercel");

step(1, "Vercel Dashboard");
p("vercel.com/new kholein > Add New Project > GitHub repo import karein.");

step(2, "Configure Project");
p('Framework Preset: "Other" select karein. Root Directory: "." rakhein. Build Command, Output Directory, Install Command — sab khaali rakhein (vercel.json automatic handle karega).');

step(3, "Environment Variable Add Karein");
envTable([
  ["VITE_API_URL", "https://your-backend.onrender.com"],
]);
note("VITE_API_URL ke aakhir mein trailing slash NA dein. Sahi: https://api.example.com  |  Galat: https://api.example.com/");

step(4, "Deploy");
p('"Deploy" button click karein. 1-2 minute mein live URL mil jayega: https://your-app.vercel.app');

// ============ STEP 5 ============
h1("Step 5 — Connect Both (CORS)");
p("Frontend deploy hone ke baad, backend ka FRONTEND_URL update karna zaroori hai warna CORS errors aayenge.");

step(1, "Render Dashboard pe wapas jayein");
p("Aapki backend service > Environment tab kholein.");

step(2, "FRONTEND_URL Update Karein");
p("Value mein apna Vercel URL paste karein — bilkul exact (no trailing slash).");
code([
  "FRONTEND_URL = https://your-app.vercel.app",
]);

step(3, "Save & Redeploy");
p("Render automatically backend redeploy kar dega.");

// ============ VERIFICATION ============
h1("Step 6 — Verify Everything");
bullet("Frontend URL kholein: https://your-app.vercel.app — marketplace load ho.");
bullet("Browser DevTools > Network tab > API calls Render URL pe ja rahi hon.");
bullet("Console mein koi CORS error NA ho.");
bullet("Backend health: https://your-backend.onrender.com/api/healthz returns OK.");

// ============ TROUBLESHOOTING ============
doc.addPage();
h1("Troubleshooting");

h3("Build fails on Vercel: 'PORT environment variable required'");
p("Solution: vercel.json mein build.env.PORT already set hai. Confirm karein file commit ho gayi hai.");

h3("CORS error in browser console");
p("Solution: Render pe FRONTEND_URL exactly Vercel URL match kare (scheme, no trailing slash). Update karke redeploy.");

h3("API se 500 error")
p("Solution: Database schema push nahi hui. Run karein:");
code([
  'DATABASE_URL="<prod-url>" pnpm --filter @workspace/db run push',
]);

h3("401 Unauthorized after login");
p("Cookies cross-site work nahi karti default settings se. Production ke liye session config mein cookie.sameSite='none' aur cookie.secure=true set karein artifacts/api-server/src/app.ts mein.");

h3("Render free tier sleep");
p("Free tier 15 min idle ke baad sleep ho jata hai. Pehli request thodi slow hogi (cold start ~30s). Paid tier ya UptimeRobot use karein keeping alive ke liye.");

// ============ QUICK CHECKLIST ============
h1("Quick Checklist");
const checks = [
  "GitHub repo banaya aur code push kiya",
  "PostgreSQL database create kiya (Neon/Supabase/Render)",
  "Schema push ki: pnpm --filter @workspace/db run push",
  "Render pe Blueprint deploy kiya (render.yaml use karke)",
  "DATABASE_URL aur SESSION_SECRET set kiye Render pe",
  "Backend /api/healthz test kiya — OK",
  "Vercel pe project import kiya (root directory = .)",
  "VITE_API_URL set kiya Vercel pe (Render URL)",
  "Frontend deploy hua aur URL mila",
  "Render pe FRONTEND_URL update kiya (Vercel URL)",
  "Frontend kholke marketplace verify kiya — no CORS errors",
];
checks.forEach((item) => {
  const y = doc.y;
  doc.rect(52, y + 2, 10, 10).strokeColor(COLORS.primary).lineWidth(1).stroke();
  doc.fillColor(COLORS.text).font("Helvetica").fontSize(10.5).text(item, 70, y, { width: 470 });
  doc.moveDown(0.4);
});

// ============ FOOTER ============
doc.moveDown(1);
const footY = doc.y;
doc.moveTo(50, footY).lineTo(545, footY).strokeColor(COLORS.border).lineWidth(0.5).stroke();
doc.moveDown(0.5);
doc.fillColor(COLORS.muted).font("Helvetica-Oblique").fontSize(9);
doc.text("PUBG Account Manager · Deployment Guide · Generated " + new Date().toLocaleDateString("en-GB"), { align: "center" });
doc.text("Detailed guide: DEPLOYMENT.md  |  Local dev: README in repo root", { align: "center" });

doc.end();

await new Promise((resolve) => doc.on("end", resolve));
console.log("PDF generated:", OUT);
