import { NextResponse } from "next/server";
import { fetchQuote, renderQuotePng } from "@/lib/quotes";

/**
 * GET /api/quote/image
 * Mengembalikan PNG berisi random quote dari API KangWifi.
 *
 * Implementasi: satori (JSX -> SVG) + @resvg/resvg-js (SVG -> PNG).
 * Font di-bundle sebagai ArrayBuffer (di-import dari font-data.ts).
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  try {
    const quote = await fetchQuote();
    const png = await renderQuotePng(quote);

    return new NextResponse(png, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(png.length),
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "X-Quote-Id": String(quote.id),
        "X-Quote-Author": quote.author,
        "X-Quote-Category": quote.category,
        "Access-Control-Expose-Headers":
          "X-Quote-Id, X-Quote-Author, X-Quote-Category",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: "Gagal mengambil / me-render quote", detail: message },
      { status: 502 },
    );
  }
}
