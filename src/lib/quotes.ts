/**
 * Quote fetching & SVG rendering utilities
 * -------------------------------------------------------------
 * Sumber API : https://api.kangwifi.eu.org/info/random-quotes
 * Output     : PNG (via sharp) atau SVG string
 *
 * Catatan font:
 *   Vercel serverless Lambda TIDAK menyertakan font serif/sans Latin
 *   secara default, sehingga librsvg (di dalam sharp) tidak bisa
 *   merender teks. Solusinya: font di-bundle di /public/fonts dan
 *   di-embed sebagai base64 @font-face di dalam SVG → SVG menjadi
 *   self-contained, tidak bergantung font sistem host.
 */

import fs from "node:fs";
import path from "node:path";

export interface QuoteData {
  id: number;
  quote: string;
  author: string;
  category: string;
  source: string;
}

const API_URL = "https://api.kangwifi.eu.org/info/random-quotes";

/** Fetch random quote dari API KangWiFi */
export async function fetchQuote(): Promise<QuoteData> {
  const res = await fetch(API_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "nextjs-quote-image/1.0",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (!data || !data.status || !data.result) {
    throw new Error("Format respons API tidak sesuai");
  }
  return {
    id: data.result.id,
    quote: data.result.quote || "",
    author: data.result.author || "Anonim",
    category: data.result.category || "",
    source: data.author || "KangWifi",
  };
}

/* ============================================================
 * Font loading & caching
 * ============================================================ */

interface FontFile {
  family: string;
  weight: number;
  style: "normal" | "italic";
  path: string;
}

const FONT_FILES: FontFile[] = [
  { family: "QuoteSerif", weight: 400, style: "normal", path: "Tinos-Regular.ttf" },
  { family: "QuoteSerif", weight: 700, style: "normal", path: "Tinos-Bold.ttf" },
  { family: "QuoteSerif", weight: 400, style: "italic", path: "Tinos-Italic.ttf" },
  { family: "QuoteSans", weight: 400, style: "normal", path: "Carlito-Regular.ttf" },
  { family: "QuoteSans", weight: 700, style: "normal", path: "Carlito-Bold.ttf" },
  { family: "QuoteSans", weight: 400, style: "italic", path: "Carlito-Italic.ttf" },
];

let cachedFontFaceCss: string | null = null;

/**
 * Baca file font dari /public/fonts, encode ke base64, dan bangun
 * @font-face CSS yang akan di-embed di <defs> SVG.
 *
 * Di Vercel, current working directory adalah root project, jadi
 * path "public/fonts/..." relatif valid. Di environment lain (sandbox),
 * kita pakai process.cwd() sebagai fallback.
 */
function getFontFaceCss(): string {
  if (cachedFontFaceCss) return cachedFontFaceCss;

  const chunks: string[] = [];
  for (const f of FONT_FILES) {
    // Coba beberapa kemungkinan path
    const candidates = [
      path.join(process.cwd(), "public", "fonts", f.path),
      path.join(process.cwd(), "fonts", f.path),
      path.join(__dirname, "..", "..", "..", "public", "fonts", f.path),
    ];

    let fontBuffer: Buffer | null = null;
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) {
          fontBuffer = fs.readFileSync(p);
          break;
        }
      } catch {
        /* ignore, try next */
      }
    }

    if (!fontBuffer) {
      // Jika font tidak ditemukan, skip — akan fallback ke font sistem
      // (di sandbox ini OK karena font tersedia, di Vercel seharusnya
      //  selalu ketemu karena di-bundle di repo)
      continue;
    }

    const b64 = fontBuffer.toString("base64");
    chunks.push(`@font-face {
  font-family: "${f.family}";
  font-weight: ${f.weight};
  font-style: ${f.style};
  src: url("data:font/ttf;base64,${b64}") format("truetype");
}`);
  }

  cachedFontFaceCss = chunks.join("\n");
  return cachedFontFaceCss;
}

/* ============================================================
 * SVG builder
 * ============================================================ */

/** Escape karakter khusus XML */
function escapeXml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Word-wrap sederhana berdasarkan jumlah karakter per baris */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? current + " " + word : word;

    if (word.length > maxCharsPerLine) {
      if (current) {
        lines.push(current);
        current = "";
      }
      for (let i = 0; i < word.length; i += maxCharsPerLine) {
        lines.push(word.slice(i, i + maxCharsPerLine));
      }
      continue;
    }

    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Bangun string SVG dari data quote (dengan font embedded) */
export function buildQuoteSvg(q: QuoteData): string {
  const W = 1200;
  const H = 630;
  const padX = 90;
  const maxChars = 40;

  const lines = wrapText(q.quote, maxChars);

  let fontSize: number;
  if (lines.length <= 2) fontSize = 56;
  else if (lines.length === 3) fontSize = 46;
  else if (lines.length === 4) fontSize = 38;
  else fontSize = 32;

  const lineHeight = Math.round(fontSize * 1.4);
  const blockHeight = lines.length * lineHeight;
  const startY = Math.round((H - blockHeight) / 2 + lineHeight * 0.8);

  const tspans = lines
    .map((line, i) => {
      const y = startY + i * lineHeight;
      return `<tspan x="${padX}" y="${y}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  const authorY = startY + blockHeight + 28;

  // Font name yang dipakai di SVG — akan resolve via @font-face di <defs>
  const serifFont = "QuoteSerif, 'Tinos', 'Liberation Serif', 'DejaVu Serif', serif";
  const sansFont = "QuoteSans, 'Carlito', 'Liberation Sans', 'DejaVu Sans', sans-serif";

  const fontFaceCss = getFontFaceCss();

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style type="text/css"><![CDATA[
${fontFaceCss}
    ]]></style>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f0c29"/>
      <stop offset="50%" stop-color="#302b63"/>
      <stop offset="100%" stop-color="#24243e"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f0c674"/>
      <stop offset="100%" stop-color="#e6a817"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="6" fill="url(#accent)"/>

  <text x="${padX - 30}" y="${startY - 10}" font-family="${escapeXml(serifFont)}" font-size="140" fill="#f0c674" opacity="0.25" font-weight="700">"</text>

  <text font-family="${escapeXml(serifFont)}" font-size="${fontSize}" fill="#ffffff" font-weight="400">
    ${tspans}
  </text>

  <text x="${padX}" y="${authorY}" font-family="${escapeXml(sansFont)}" font-size="28" fill="#f0c674" font-style="italic">
    — ${escapeXml(q.author)}
  </text>

  ${q.category ? `<text x="${padX}" y="${H - 40}" font-family="${escapeXml(sansFont)}" font-size="18" fill="#9b9b9b" opacity="0.75">Kategori: ${escapeXml(q.category)}</text>` : ""}

  <text x="${W - padX}" y="${H - 40}" font-family="${escapeXml(sansFont)}" font-size="18" fill="#9b9b9b" opacity="0.75" text-anchor="end">${escapeXml(q.source)} · api.kangwifi.eu.org</text>
</svg>`;
}
