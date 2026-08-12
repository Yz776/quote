/**
 * Quote fetching & rendering utilities
 * -------------------------------------------------------------
 * Sumber API : https://api.kangwifi.eu.org/info/random-quotes
 * Output     : PNG (via satori + @resvg/resvg-js)
 *
 * Catatan implementasi:
 *   - sharp/librsvg di Vercel Lambda TIDAK bisa merender @font-face
 *     dengan base64 data URL (text tidak muncul).
 *   - Solusi: pakai satori (JSX -> SVG) + @resvg/resvg-js (SVG -> PNG).
 *     Keduanya handle font sebagai ArrayBuffer eksplisit, tidak
 *     bergantung pada fontconfig/librsvg.
 *   - Font di-import sebagai base64 string dari font-data.ts agar
 *     ter-bundle ke serverless function.
 */

import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
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

/** Fetch random quote dari API KangWifi */
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
 * Font preparation (base64 -> ArrayBuffer untuk satori/resvg)
 * ============================================================ */

function base64ToBuffer(b64: string): ArrayBuffer {
  const buf = Buffer.from(b64, "base64");
  // Return ArrayBuffer (not Buffer) untuk kompatibilitas satori
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

interface FontRecord {
  name: string;
  style: "normal" | "italic";
  weight: 400 | 700;
  data: ArrayBuffer;
}

let cachedFonts: FontRecord[] | null = null;

function getFonts(): FontRecord[] {
  if (cachedFonts) return cachedFonts;
  cachedFonts = [
    { name: "QuoteSerif", style: "normal", weight: 400, data: base64ToBuffer(SERIF_REGULAR) },
    { name: "QuoteSerif", style: "normal", weight: 700, data: base64ToBuffer(SERIF_BOLD) },
    { name: "QuoteSerif", style: "italic", weight: 400, data: base64ToBuffer(SERIF_ITALIC) },
    { name: "QuoteSans",  style: "normal", weight: 400, data: base64ToBuffer(SANS_REGULAR) },
    { name: "QuoteSans",  style: "normal", weight: 700, data: base64ToBuffer(SANS_BOLD) },
    { name: "QuoteSans",  style: "italic", weight: 400, data: base64ToBuffer(SANS_ITALIC) },
  ];
  return cachedFonts;
}

/* ============================================================
 * Word wrap helper
 * ============================================================ */

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

/* ============================================================
 * Render quote -> PNG via satori + resvg
 * ============================================================ */

const W = 1200;
const H = 630;

/** Render quote menjadi PNG buffer */
export async function renderQuotePng(q: QuoteData): Promise<Buffer> {
  const fonts = getFonts();
  const maxChars = 40;
  const lines = wrapText(q.quote, maxChars);

  // Skala ukuran font berdasarkan jumlah baris
  let fontSize: number;
  if (lines.length <= 2) fontSize = 56;
  else if (lines.length === 3) fontSize = 46;
  else if (lines.length === 4) fontSize = 38;
  else fontSize = 32;

  // Satori buth React-element-like object. Kita pakai plain object
  // dengan struktur JSX-like (satori menerima ini).
  const lineHeight = fontSize * 1.4;
  const blockHeight = lines.length * lineHeight;
  const startY = Math.round((H - blockHeight) / 2 + lineHeight * 0.8);
  const authorY = Math.round(startY + blockHeight + 28);

  // Build markup yang dipahami satori (display: flex wajib di root)
  const quoteLines = lines.map((line, i) => ({
    type: "div",
    props: {
      style: {
        display: "flex",
        marginTop: i === 0 ? 0 : `${Math.round(lineHeight - fontSize)}px`,
        color: "#ffffff",
        fontSize: `${fontSize}px`,
        fontFamily: "QuoteSerif",
        fontWeight: 400,
        lineHeight: 1.4,
      },
      children: line,
    },
  }));

  const element = {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: `${W}px`,
        height: `${H}px`,
        background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
        fontFamily: "QuoteSans",
        color: "#ffffff",
        position: "relative",
      },
      children: [
        // Accent strip atas
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              position: "absolute",
              top: 0,
              left: 0,
              width: `${W}px`,
              height: "6px",
              background: "linear-gradient(90deg, #f0c674 0%, #e6a817 100%)",
            },
            children: "",
          },
        },
        // Decorative quote mark
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              position: "absolute",
              left: "60px",
              top: `${startY - 110}px`,
              fontSize: "140px",
              fontFamily: "QuoteSerif",
              fontWeight: 700,
              color: "#f0c674",
              opacity: 0.25,
              lineHeight: 1,
            },
            children: "\u201C",
          },
        },
        // Quote lines
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              position: "absolute",
              left: "90px",
              top: `${startY - fontSize}px`,
              width: `${W - 180}px`,
            },
            children: quoteLines,
          },
        },
        // Author
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              position: "absolute",
              left: "90px",
              top: `${authorY - 28}px`,
              fontSize: "28px",
              fontFamily: "QuoteSans",
              fontStyle: "italic",
              color: "#f0c674",
            },
            children: `\u2014 ${q.author}`,
          },
        },
        // Footer kiri: kategori
        ...(q.category
          ? [{
              type: "div",
              props: {
                style: {
                  display: "flex",
                  position: "absolute",
                  left: "90px",
                  bottom: "40px",
                  fontSize: "18px",
                  fontFamily: "QuoteSans",
                  color: "rgba(255,255,255,0.6)",
                },
                children: `Kategori: ${q.category}`,
              },
            }]
          : []),
        // Footer kanan: sumber
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              position: "absolute",
              right: "90px",
              bottom: "40px",
              fontSize: "18px",
              fontFamily: "QuoteSans",
              color: "rgba(255,255,255,0.6)",
            },
            children: `${q.source} \u00B7 api.kangwifi.eu.org`,
          },
        },
      ],
    },
  };

  // Satori: JSX-like object -> SVG
  const svg = await satori(element, {
    width: W,
    height: H,
    fonts,
  });

  // Resvg: SVG -> PNG (Rust-based, handle font dengan baik)
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: W },
    font: {
      // Jangan load system fonts (Vercel tidak punya yg kita butuh)
      loadSystemFonts: false,
      defaultFontFamily: "QuoteSans",
    },
  });
  const rendered = resvg.render();
  return rendered.asPng() as Buffer;
}
