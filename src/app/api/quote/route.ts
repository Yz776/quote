import { NextResponse } from "next/server";
import { fetchQuote } from "@/lib/quotes";

/**
 * GET /api/quote
 * Mengembalikan JSON random quote (tanpa gambar) — dipakai halaman demo
 * untuk menampilkan teks quote sekaligus dengan preview image.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const quote = await fetchQuote();
    return NextResponse.json({ ok: true, quote });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: "Gagal mengambil quote", detail: message },
      { status: 502 },
    );
  }
}
