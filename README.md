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

Render SVG → PNG menggunakan **librsvg** (di dalam `sharp`) yang bergantung pada
**fontconfig** untuk menemukan font di sistem.

Font yang dipakai di SVG:
- Serif: `'Noto Serif SC', 'Tinos', 'Liberation Serif', 'DejaVu Serif'`
- Sans:  `'Noto Sans SC', 'Carlito', 'Liberation Sans', 'DejaVu Sans'`

### Di lokal / sandbox (sudah berjalan)

Font tersebut sudah terinstall di sistem (`/usr/share/fonts/truetype/...`), sehingga
gambar langsung tampil dengan benar.

### Di Vercel / platform serverless lainnya

Vercel menggunakan **AWS Lambda** sebagai runtime yang **tidak menyertakan font CJK
atau serif额外 secara default**. Akibatnya gambar mungkin saja tampil "rusak" /
teks tidak ter-render jika di-deploy tanpa konfigurasi font tambahan.

**Solusi (pilih salah satu):**

1. **Bundle font ke dalam project** — taruh file `.ttf` di `public/fonts/` lalu
   install saat startup. Contoh: gunakan `@fontsource` package atau salin manual.

2. **Embed font sebagai base64 di SVG** — bikin SVG self-contained, tidak bergantung
   font sistem. Trade-off: SVG jadi lebih besar (~200-500KB per font).

3. **Gunakan Satori** (`@vercel/satori`) — library dari Vercel yang dirancang khusus
   untuk render teks di serverless dengan dukungan font yang lebih baik.

4. **Self-host di VPS** — paling mudah: install package font di OS
   (`apt install fonts-noto-cjk fonts-liberation`), lalu jalankan Next.js di sana.

> Sumber quote: [api.kangwifi.eu.org](https://api.kangwifi.eu.org/info/random-quotes) —
> terima kasih KangWiFi.

## Lisensi

Bebas dipakai untuk keperluan apa pun. Sumber data quote tetap milik KangWiFi.
