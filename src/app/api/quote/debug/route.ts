import { NextResponse } from "next/server";
import {
  SERIF_REGULAR,
  SERIF_BOLD,
  SERIF_ITALIC,
  SANS_REGULAR,
  SANS_BOLD,
  SANS_ITALIC,
} from "@/lib/font-data";
import { buildQuoteSvg, fetchQuote } from "@/lib/quotes";

/**
 * GET /api/quote/debug
 * Endpoint sementara untuk debugging di Vercel — mengembalikan info
 * tentang font data & environment.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const fonts = {
    SERIF_REGULAR: SERIF_REGULAR?.length ?? 0,
    SERIF_BOLD: SERIF_BOLD?.length ?? 0,
    SERIF_ITALIC: SERIF_ITALIC?.length ?? 0,
    SANS_REGULAR: SANS_REGULAR?.length ?? 0,
    SANS_BOLD: SANS_BOLD?.length ?? 0,
    SANS_ITALIC: SANS_ITALIC?.length ?? 0,
  };

  let sampleSvg = "";
  let quoteInfo: unknown = null;
  try {
    const q = await fetchQuote();
    quoteInfo = q;
    sampleSvg = buildQuoteSvg(q);
  } catch (e) {
    quoteInfo = { error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json({
    env: {
      cwd: process.cwd(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    fonts: {
      lengths: fonts,
      totalChars: Object.values(fonts).reduce((a, b) => a + b, 0),
    },
    svg: {
      length: sampleSvg.length,
      hasFontFace: sampleSvg.includes("@font-face"),
      hasBase64: sampleSvg.includes("data:font/ttf;base64,"),
      first300: sampleSvg.slice(0, 300),
    },
    quote: quoteInfo,
  });
}
