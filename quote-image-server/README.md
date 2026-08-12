# Quote Image Server

Server Node.js yang mirip dengan konsep `ipleak.nixel.dev/image/ip`, tetapi
alih-alih menampilkan info IP, server ini **me-render random quote dari
[API KangWifi](https://api.kangwifi.eu.org/info/random-quotes) menjadi
gambar PNG** setiap kali di-request.

## Cara Kerja

```
Client ──GET /image/quote──► Server
                               │
                               ├─ fetch https://api.kangwifi.eu.org/info/random-quotes
                               ├─ render quote → SVG  (gradient bg, word-wrap, author)
                               └─ sharp: SVG → PNG 144 DPI (2400×1260)
Client ◄──image/png────────────┘
```

## Menjalankan

```bash
cd /home/z/my-project/quote-image-server
npm install
npm start
# atau: PORT=8080 npm start
```

Server berjalan di `http://localhost:3000`.

## Endpoint

| Method | Path             | Keterangan                                              |
|--------|------------------|--------------------------------------------------------|
| GET    | `/image/quote`   | Mengembalikan PNG berisi random quote (utama)          |
| GET    | `/image/quotes`  | Alias `/image/quote`                                    |
| GET    | `/quote.png`     | Alias `/image/quote`                                    |
| GET    | `/`              | Halaman demo yang menampilkan gambar + tombol reload   |
| GET    | `/health`        | Health check `{ ok: true, ts: ... }`                   |

## Response Headers

Setiap response PNG menyertakan header non-caching + metadata quote:

```
Content-Type: image/png
Cache-Control: no-store, no-cache, must-revalidate
X-Quote-Id: 358
X-Quote-Author: Anonim
```

## Contoh Penggunaan

**HTML:**
```html
<img src="http://localhost:3000/image/quote" alt="Random Quote" />
```

**Markdown:**
```markdown
![Random Quote](http://localhost:3000/image/quote)
```

**cURL (simpan ke file):**
```bash
curl -o quote.png http://localhost:3000/image/quote
```

## Desain Gambar

- Ukuran: 1200×630 (viewport SVG), di-render ke 2400×1260 PNG @ 144 DPI
- Background: gradient diagonal `#0f0c29 → #302b63 → #24243e`
- Tanda kutip dekoratif besar di kiri atas (60% transparent gold)
- Quote: serif font, putih, auto-wrap ~40 karakter/baris
- Author: italic gold
- Footer: kategori (kiri) + sumber API (kanan)

## Struktur Project

```
quote-image-server/
├── package.json
├── index.js          # server + SVG builder + sharp converter
└── README.md
```

## Customisasi Cepat

- **Ukuran gambar**: ubah `W` dan `H` di fungsi `buildSvg()`.
- **Tema warna**: ubah `<linearGradient id="bg">` di SVG.
- **Font**: sesuaikan `serifFont` / `sansFont` (sistem sudah punya Noto Serif/Sans SC, Tinos, Carlito, DejaVu, Liberation).
- **Jumlah karakter per baris**: ubah `maxChars` di `buildSvg()`.
