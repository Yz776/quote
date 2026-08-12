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

import {
  SERIF_REGULAR,
  SERIF_BOLD,
  SERIF_ITALIC,
  SANS_REGULAR,
  SANS_BOLD,
  SANS_ITALIC,
} from "./font-data";

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
 * ============================================================
 * Font di-import sebagai base64 string dari font-data.ts (yang
 * di-generate dari public/fonts/*.ttf). Pendekatan ini menjamin
 * font ter-bundle ke serverless function (Vercel Lambda) tanpa
 * bergantung pada akses filesystem ke direktori public/.
 */

interface FontDef {
  family: string;
  weight: number;
  style: "normal" | "italic";
  data: string; // base64 string
}

const FONT_DEFS: FontDef[] = [
  { family: "QuoteSerif", weight: 400, style: "normal", data: SERIF_REGULAR },
  { family: "QuoteSerif", weight: 700, style: "normal", data: SERIF_BOLD },
  { family: "QuoteSerif", weight: 400, style: "italic", data: SERIF_ITALIC },
  { family: "QuoteSans", weight: 400, style: "normal", data: SANS_REGULAR },
  { family: "QuoteSans", weight: 700, style: "normal", data: SANS_BOLD },
  { family: "QuoteSans", weight: 400, style: "italic", data: SANS_ITALIC },
];

let cachedFontFaceCss: string | null = null;

/** Bangun @font-face CSS dengan base64 data URLs (self-contained) */
function getFontFaceCss(): string {
  if (cachedFontFaceCss) return cachedFontFaceCss;

  const chunks: string[] = [];
  for (const f of FONT_DEFS) {
    if (!f.data) continue;
    chunks.push(`@font-face {
  font-family: "${f.family}";
  font-weight: ${f.weight};
  font-style: ${f.style};
  src: url("data:font/ttf;base64,${f.data}") format("truetype");
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
