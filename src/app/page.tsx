"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Copy, Check, ExternalLink, Quote as QuoteIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

interface QuoteInfo {
  id: number;
  quote: string;
  author: string;
  category: string;
  source: string;
}

export default function Home() {
  const [quote, setQuote] = useState<QuoteInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [imgLoading, setImgLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [reloadNonce, setReloadNonce] = useState<number>(0);

  // URL gambar di-derive dari reloadNonce — tidak perlu setState di effect
  const imageUrl = useMemo(
    () => `/api/quote/image?t=${reloadNonce}`,
    [reloadNonce],
  );

  // Saat reloadNonce berubah: fetch JSON quote untuk panel info
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    fetch(`/api/quote?t=${reloadNonce}`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("Gagal mengambil quote");
        const data = await r.json();
        if (!data.ok) throw new Error(data.error || "Format respons tidak sesuai");
        if (!cancelled) setQuote(data.quote);
      })
      .catch((err) => {
        if (cancelled || err.name === "AbortError") return;
        toast({
          title: "Gagal memuat quote",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [reloadNonce]);

  /** Pemicu reload berikutnya */
  const reload = useCallback(() => {
    setLoading(true);
    setImgLoading(true);
    setReloadNonce((n) => n + 1);
  }, []);

  /** Salin URL endpoint gambar ke clipboard */
  const copyImageUrl = useCallback(async () => {
    const absolute = `${window.location.origin}/api/quote/image`;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      toast({ title: "URL gambar disalin", description: absolute });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({
        title: "Gagal menyalin",
        description: "Browser memblokir clipboard. Salin manual.",
        variant: "destructive",
      });
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white">
      <Toaster />

      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 to-amber-600 text-black font-bold shadow-lg">
              <QuoteIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight truncate">
                Random Quote Image
              </h1>
              <p className="text-xs sm:text-sm text-white/60 truncate">
                Powered by api.kangwifi.eu.org
              </p>
            </div>
          </div>
          <Button
            onClick={reload}
            disabled={loading}
            variant="outline"
            className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            <span className="hidden sm:inline">Quote Lain</span>
            <span className="sm:hidden">Reload</span>
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Image preview */}
          <Card className="bg-black/30 border-white/10 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-white/80">
                Preview Gambar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10 aspect-[1200/630] bg-black/40">
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt={quote ? `Quote dari ${quote.author}` : "Random Quote"}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      imgLoading ? "opacity-0" : "opacity-100"
                    }`}
                    onLoad={() => setImgLoading(false)}
                    onError={() => setImgLoading(false)}
                  />
                )}
                {imgLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-amber-300 animate-spin" />
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={copyImageUrl}
                  variant="outline"
                  className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white"
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-2 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Salin URL Gambar
                </Button>
                <a href="/api/quote/image" target="_blank" rel="noreferrer">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Buka tab baru
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Info panel */}
          <div className="flex flex-col gap-6">
            <Card className="bg-black/30 border-white/10 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-white/80">
                  Quote Saat Ini
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!quote ? (
                  <div className="space-y-2">
                    <div className="h-4 w-3/4 rounded bg-white/10 animate-pulse" />
                    <div className="h-4 w-1/2 rounded bg-white/10 animate-pulse" />
                    <div className="h-4 w-2/3 rounded bg-white/10 animate-pulse" />
                  </div>
                ) : (
                  <>
                    <blockquote className="text-lg leading-relaxed text-white/95 border-l-2 border-amber-300 pl-4 italic">
                      &ldquo;{quote.quote}&rdquo;
                    </blockquote>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-amber-300/15 text-amber-200 border-amber-300/30 hover:bg-amber-300/20">
                        — {quote.author}
                      </Badge>
                      {quote.category && (
                        <Badge
                          variant="outline"
                          className="border-white/20 text-white/70 bg-white/5"
                        >
                          {quote.category}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="border-white/20 text-white/50 bg-white/5 font-mono"
                      >
                        #{quote.id}
                      </Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-black/30 border-white/10 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-white/80">
                  Endpoint
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <EndpointRow
                  method="GET"
                  path="/api/quote/image"
                  desc="Mengembalikan PNG berisi random quote"
                />
                <EndpointRow
                  method="GET"
                  path="/api/quote"
                  desc="Mengembalikan JSON random quote"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20 backdrop-blur-sm mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 text-center text-xs sm:text-sm text-white/50">
          Dibuat dengan Next.js 16 + sharp · Sumber quote:{" "}
          <a
            href="https://api.kangwifi.eu.org/info/random-quotes"
            target="_blank"
            rel="noreferrer"
            className="text-amber-300/80 hover:text-amber-200 underline underline-offset-2"
          >
            api.kangwifi.eu.org
          </a>
        </div>
      </footer>
    </div>
  );
}

function EndpointRow({
  method,
  path,
  desc,
}: {
  method: string;
  path: string;
  desc: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-black/30 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20 font-mono text-[10px]">
          {method}
        </Badge>
        <code className="text-xs sm:text-sm font-mono text-amber-200/90 break-all">
          {path}
        </code>
      </div>
      <p className="text-xs text-white/60">{desc}</p>
    </div>
  );
}
