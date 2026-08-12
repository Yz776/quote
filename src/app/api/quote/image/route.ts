import { NextResponse } from "next/server";
import sharp from "sharp";
import { fetchQuote, buildQuoteSvg } from "@/lib/quotes";

/**
 * GET /api/quote/image
 * Mengembalikan PNG berisi random quote dari API KangWifi.
 * Mirip konsep ipleak.nixel.dev/image/ip, tapi isinya quote.
 *
 * Response:
 *   - Content-Type: image/png
 *   - Cache-Control: no-store
 *   - X-Quote-Id / X-Quote-Author / X-Quote-Category  (metadata)
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const quote = await fetchQuote();
    const svg = buildQuoteSvg(quote);
    const png = await sharp(Buffer.from(svg), { density: 144 })
      .png()
      .toBuffer();

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
