/**
 * quote-image-server
 * -------------------------------------------------------------
 * Server Node.js yang saat di-request akan:
 *   1. Memanggil API random quote dari https://api.kangwifi.eu.org/info/random-quotes
 *   2. Me-render quote tersebut menjadi SVG
 *   3. Mengkonversi SVG -> PNG menggunakan sharp
 *   4. Mengembalikan PNG sebagai response (Content-Type: image/png)
 *
 * Endpoint utama:  GET /image/quote
 * Halaman demo   : GET /
 */

const express = require('express');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = 'https://api.kangwifi.eu.org/info/random-quotes';

/* ============================================================
 * Helper: escape karakter XML
 * ============================================================ */
function escapeXml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/* ============================================================
 * Helper: word-wrap sederhana
 * Memecah teks menjadi beberapa baris agar muat di lebar SVG.
 * ============================================================ */
function wrapText(text, maxCharsPerLine) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? current + ' ' + word : word;

    // Jika kata tunggal lebih panjang dari batas, potong paksa per maxCharsPerLine
    if (word.length > maxCharsPerLine) {
      if (current) {
        lines.push(current);
        current = '';
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
 * Helper: ambil quote dari API KangWifi
 * ============================================================ */
async function fetchQuote() {
  const res = await fetch(API_URL, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'quote-image-server/1.0' },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (!data || !data.status || !data.result) {
    throw new Error('Format respons API tidak sesuai');
  }
  return {
    id: data.result.id,
    quote: data.result.quote || '',
    author: data.result.author || 'Anonim',
    category: data.result.category || '',
    source: data.author || 'KangWifi', // "KangWifi" di level root
  };
}

/* ============================================================
 * Helper: bangun SVG dari quote
 * ============================================================ */
function buildSvg({ quote, author, category, source }) {
  const W = 1200;
  const H = 630;
  const padX = 90;
  const maxChars = 40;

  const lines = wrapText(quote, maxChars);

  // Skala ukuran font berdasarkan jumlah baris
  let fontSize;
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
    .join('');

  const authorY = startY + blockHeight + 28;

  const serifFont = "'Noto Serif SC', 'Tinos', 'Liberation Serif', 'DejaVu Serif', serif";
  const sansFont = "'Noto Sans SC', 'Carlito', 'Liberation Sans', 'DejaVu Sans', sans-serif";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
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

  <!-- Garis aksen atas -->
  <rect x="0" y="0" width="${W}" height="6" fill="url(#accent)"/>

  <!-- Tanda kutip dekoratif -->
  <text x="${padX - 30}" y="${startY - 10}" font-family=${JSON.stringify(serifFont)} font-size="140" fill="#f0c674" opacity="0.25" font-weight="700">"</text>

  <!-- Quote -->
  <text font-family=${JSON.stringify(serifFont)} font-size="${fontSize}" fill="#ffffff" font-weight="500">
    ${tspans}
  </text>

  <!-- Author -->
  <text x="${padX}" y="${authorY}" font-family=${JSON.stringify(sansFont)} font-size="28" fill="#f0c674" font-style="italic">
    — ${escapeXml(author)}
  </text>

  <!-- Footer kiri: kategori -->
  ${category ? `<text x="${padX}" y="${H - 40}" font-family=${JSON.stringify(sansFont)} font-size="18" fill="#9b9b9b" opacity="0.75">Kategori: ${escapeXml(category)}</text>` : ''}

  <!-- Footer kanan: sumber -->
  <text x="${W - padX}" y="${H - 40}" font-family=${JSON.stringify(sansFont)} font-size="18" fill="#9b9b9b" opacity="0.75" text-anchor="end">${escapeXml(source)} · api.kangwifi.eu.org</text>
</svg>`;
}

/* ============================================================
 * Helper: render SVG -> PNG buffer
 * ============================================================ */
async function renderQuotePng(quoteData) {
  const svg = buildSvg(quoteData);
  return sharp(Buffer.from(svg), { density: 144 })
    .png()
    .toBuffer();
}

/* ============================================================
 * Routes
 * ============================================================ */

// Halaman demo yang menampilkan gambar
app.get('/', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Random Quote Image — KangWifi</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      gap: 20px;
    }
    h1 { margin: 0; font-size: 1.6rem; text-align: center; }
    .img-wrap {
      max-width: 100%;
      width: 1200px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 24px 60px rgba(0,0,0,0.55);
    }
    img { display: block; width: 100%; height: auto; }
    .meta {
      font-size: 0.95rem;
      color: #c7c7d1;
      text-align: center;
      max-width: 720px;
      line-height: 1.6;
    }
    code {
      background: rgba(255,255,255,0.08);
      padding: 3px 8px;
      border-radius: 6px;
      font-family: "JetBrains Mono", "Fira Code", monospace;
      font-size: 0.9em;
    }
    a.btn {
      display: inline-block;
      color: #f0c674;
      text-decoration: none;
      padding: 10px 22px;
      border: 1px solid #f0c674;
      border-radius: 8px;
      transition: all 0.2s ease;
      font-weight: 500;
    }
    a.btn:hover { background: #f0c674; color: #0f0c29; }
    .endpoints {
      display: grid;
      gap: 6px;
      background: rgba(255,255,255,0.05);
      padding: 14px 18px;
      border-radius: 10px;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <h1>Random Quote Image</h1>
  <div class="img-wrap">
    <img src="/image/quote" alt="Random Quote" />
  </div>
  <a class="btn" href="/">↻ Muat quote lain</a>
  <div class="endpoints">
    <div><code>GET /image/quote</code> — mengembalikan PNG berisi random quote</div>
    <div><code>GET /</code> — halaman demo ini</div>
    <div>Sumber: <code>https://api.kangwifi.eu.org/info/random-quotes</code></div>
  </div>
</body>
</html>`);
});

// Endpoint gambar utama (mirip ipleak.nixel.dev/image/ip)
app.get(['/image/quote', '/image/quotes', '/quote.png'], async (req, res) => {
  try {
    const quoteData = await fetchQuote();
    const png = await renderQuotePng(quoteData);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Quote-Id', String(quoteData.id));
    res.setHeader('X-Quote-Author', quoteData.author);
    res.send(png);
  } catch (err) {
    console.error('[ERROR]', err);
    res.status(502).type('text/plain').send('Gagal mengambil / me-render quote: ' + err.message);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

/* ============================================================
 * Start server
 * ============================================================ */
app.listen(PORT, () => {
  console.log(`\n  Quote Image Server berjalan di:`);
  console.log(`  • http://localhost:${PORT}/            (halaman demo)`);
  console.log(`  • http://localhost:${PORT}/image/quote (PNG endpoint)\n`);
});
