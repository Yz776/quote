# Random Quote Image — Next.js

Server web yang saat di-request akan mengembalikan **gambar PNG berisi random quote**
dari [api.kangwifi.eu.org](https://api.kangwifi.eu.org/info/random-quotes).

Konsepnya mirip dengan [ipleak.nixel.dev/image/ip](https://ipleak.nixel.dev/image/ip),
tetapi alih-alih menampilkan info IP, endpoint ini menampilkan quote acak yang berubah
setiap kali di-request.

## Endpoint

| Method | Path              | Keterangan                                            |
|--------|-------------------|-------------------------------------------------------|
| GET    | `/`               | Halaman demo (preview gambar + tombol reload)         |
| GET    | `/api/quote/image`| **PNG 2400×1260 berisi random quote** (utama)         |
| GET    | `/api/quote`      | JSON random quote (dipakai halaman demo)              |

### Contoh pemakaian

```html
<img src="https://your-domain/api/quote/image" alt="Random Quote" />
```

```markdown
![Random Quote](https://your-domain/api/quote/image)
```

```bash
curl -o quote.png https://your-domain/api/quote/image
```

Response header juga menyertakan metadata quote:

```
Content-Type: image/png
Cache-Control: no-store, no-cache, must-revalidate
X-Quote-Id: 358
X-Quote-Author: Anonim
X-Quote-Category: kehidupan
```

## Cara Kerja

```
Client ──GET /api/quote/image──► Next.js Route Handler
                                   │
                                   ├─ fetch https://api.kangwifi.eu.org/info/random-quotes
                                   ├─ buildQuoteSvg(quote)   → string SVG (1200×630)
                                   │     • gradient background
                                   │     • tanda kutip dekoratif
                                   │     • word-wrap otomatis (~40 char/baris)
                                   │     • author italic + badge kategori + footer sumber
                                   └─ sharp(svg, density:144).png() → Buffer PNG (2400×1260)
Client ◄──image/png (no-store)─────┘
```

## Menjalankan Lokal

```bash
# 1. Install dependencies
bun install        # atau: npm install / pnpm install

# 2. Jalankan dev server
bun run dev        # atau: npm run dev
# → http://localhost:3000
```

## Tech Stack

- **Next.js 16** (App Router) + **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui** untuk UI
- **sharp** untuk konversi SVG → PNG
- **lucide-react** untuk ikon

## Struktur Project

```
src/
├── app/
│   ├── api/
│   │   └── quote/
│   │       ├── image/route.ts   # GET → PNG
│   │       └── route.ts         # GET → JSON
│   ├── layout.tsx               # root layout + metadata
│   ├── page.tsx                 # halaman demo
│   └── globals.css
├── lib/
│   └── quotes.ts                # fetch API + builder SVG
└── components/ui/               # shadcn/ui components
```

## Catatan Font untuk Deployment

Pada awalnya gambar "rusak" saat di-deploy ke Vercel — background gradient
terender tapi teks quote tidak muncul. Setelah di-diagnosa, akar masalahnya
adalah:

1. **Font sistem tidak tersedia** di Vercel Lambda (hanya ada font minimal).
2. **`sharp`/`librsvg` di Vercel** tidak bisa render `@font-face` dengan
   base64 `data:` URL (sekalipun SVG sudah berisi font lengkap).

### Solusi yang akhirnya dipakai

Stack: **`satori` + `@resvg/resvg-js`** (bukan `sharp`).

- `satori` (dari Vercel) menerima font sebagai `ArrayBuffer` eksplisit →
  tidak bergantung pada fontconfig/librsvg.
- `@resvg/resvg-js` (Rust-based) render SVG → PNG dengan dukungan font
  yang jauh lebih baik daripada librsvg.

Font di-bundle sebagai **base64 string** di `src/lib/font-data.ts`
(di-generate oleh `scripts/gen-font-base64.js` dari file `.ttf` di
`public/fonts/`). Ini menjamin font ter-bundle ke serverless function
(Vercel Lambda tidak meng-include `public/` ke function bundle).

`next.config.ts` juga menambahkan `serverExternalPackages` agar
package native (`@resvg/resvg-js`, `satori`) di-resolve via Node.js
bukan di-bundle oleh Turbopack.

> Sumber quote: [api.kangwifi.eu.org](https://api.kangwifi.eu.org/info/random-quotes) —
> terima kasih KangWiFi.

## Lisensi

Bebas dipakai untuk keperluan apa pun. Sumber data quote tetap milik KangWiFi.
