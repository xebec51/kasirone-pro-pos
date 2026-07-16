# KasirOne Pro

KasirOne Pro adalah sistem point-of-sale dan operasional toko manual untuk UMKM seperti warung, toko kelontong, kedai kopi, dan minimarket rumahan. Proyek portofolio ini memodelkan alur bisnis nyata dari pembukaan shift, checkout, pencatatan kas dan stok, restock, utang pelanggan, sampai laporan toko.

Repositori: [github.com/xebec51/kasirone-pro-pos](https://github.com/xebec51/kasirone-pro-pos)

## Fitur Utama

- Autentikasi kredensial, sesi JWT, dan role-based access control (RBAC).
- Dashboard operasional yang menyesuaikan peran pengguna.
- Pengelolaan produk, kategori, pelanggan, supplier, dan pengguna toko.
- Shift kasir: modal awal, kas masuk/keluar, rekonsiliasi, dan penutupan shift.
- POS manual dengan pencarian produk, diskon item/transaksi, pelanggan, dan perhitungan kembalian.
- Held cart, resume/cancel transaksi ditahan, split payment, pembayaran sebagian, dan store credit.
- Struk 58 mm/80 mm, detail transaksi, dan reprint.
- Void/refund penuh berbasis reversal tanpa menghapus transaksi selesai.
- Kartu stok, stok rendah, penyesuaian manual, dan histori perubahan stok.
- Restock supplier dengan status draf, dipesan, diterima sebagian/penuh, dan dibatalkan.
- Utang pelanggan serta pembayaran utang yang terhubung dengan shift dan kas.
- Laporan penjualan, produk, estimasi laba, pembayaran, kasir, shift, stok, dan utang.
- Ekspor XLSX untuk penjualan, produk, shift, pergerakan stok, dan utang pelanggan.
- Pengaturan profil toko, struk, pajak, biaya layanan, stok negatif, dan peringatan stok rendah.
- Activity log untuk aksi bisnis penting.

## Matriks Akses

| Modul | Owner | Manager | Cashier | Inventory Staff |
| --- | :---: | :---: | :---: | :---: |
| Dashboard ringkasan | Ya | Ya | - | - |
| POS dan transaksi ditahan | Ya | Ya | Ya | - |
| Shift kasir | Semua shift | Semua shift | Shift sendiri | - |
| Pelanggan dan pembayaran utang | Ya | Ya | Ya | - |
| Daftar transaksi | Semua | Semua | Transaksi sendiri | - |
| Void/refund | Ya | Ya | - | - |
| Produk dan kategori | Ya | Ya | - | Ya |
| Kartu stok dan penyesuaian | Ya | Ya | - | Ya |
| Supplier dan restock | Ya | Ya | - | Ya |
| Laporan dan ekspor | Ya | Ya | - | - |
| Pengguna toko | Ya | Ya | - | - |
| Pengaturan toko | Ya | - | - | - |
| Detail developer | Ya | Ya | Ya | Ya |

Pemeriksaan peran dan kepemilikan toko dilakukan kembali di server. Penyembunyian menu di client hanya untuk pengalaman pengguna, bukan lapisan keamanan utama.

## Alur Operasional

### POS dan pembayaran

1. Operator membuka shift miliknya dengan modal awal.
2. Produk ditambahkan ke keranjang, lalu diskon, pelanggan, dan metode pembayaran dipilih.
3. Pembayaran dapat berupa tunai, transfer, QRIS manual, kartu, e-wallet manual, store credit, metode lain, atau gabungan beberapa metode.
4. Pembayaran sebagian dan store credit wajib memiliki pelanggan serta tunduk pada credit limit.
5. Saat transaksi selesai, penjualan, snapshot item, pembayaran, stok, pergerakan kas, struk, utang, dan activity log disimpan dalam satu transaksi database.

Transaksi yang ditahan tidak mengurangi stok. Stok baru berubah saat checkout selesai.

### Penutupan shift

Setiap operator POS wajib mempunyai shift `OPEN`. Kas yang diharapkan dihitung sebagai:

```text
modal awal + pembayaran tunai + kas masuk + pembayaran utang tunai
- kas keluar - refund tunai
```

Kas aktual dan selisih disimpan ketika shift ditutup. Cashier hanya melihat shift miliknya; owner dan manager dapat melihat seluruh shift toko.

### Kartu stok dan reversal

Setiap perubahan stok menghasilkan `StockMovement` dengan kuantitas sebelum/sesudah dan referensi bisnisnya. Penjualan selesai tidak dihapus permanen. Void/refund membuat reversal stok, pembayaran, dan kas yang dapat ditelusuri.

### Restock supplier

Restock bergerak melalui `DRAFT` → `ORDERED` → `PARTIALLY_RECEIVED`/`RECEIVED`. Penerimaan stok berjalan transaksional, menambah stok, membuat ledger `RESTOCK`, dan memperbarui harga modal dengan perhitungan tertimbang. Pesanan yang masih relevan dapat dibatalkan tanpa menghapus historinya.

### Utang pelanggan

Sisa pembayaran checkout menambah `Customer.currentDebt`. Pembayaran utang mengurangi saldo tanpa boleh melewati nol, membuat histori `DebtPayment`, dan—untuk pembayaran tunai pada shift terbuka—membuat `CashMovement` bertipe `DEBT_PAYMENT`. Saldo tidak diedit langsung dari form pelanggan.

### Laporan dan ekspor

Owner dan manager dapat memfilter laporan berdasarkan tanggal. Query selalu dibatasi ke toko aktif. File XLSX dibuat di browser setelah data terotorisasi diterima; library `xlsx` dimuat dinamis hanya saat tombol ekspor digunakan. Ekspor dibatasi maksimal 10.000 baris per permintaan.

## Tumpukan Teknologi

- Next.js 16 App Router, React 19, dan TypeScript
- Tailwind CSS 4, shadcn/ui, Base UI, dan Lucide
- Prisma 7 dengan PostgreSQL/Neon
- NextAuth v4 credentials + JWT session
- Zod untuk validasi input
- TanStack Table untuk tabel data
- Recharts untuk visualisasi dan SheetJS (`xlsx`) untuk ekspor
- bcryptjs untuk hashing password

## Ringkasan Database

Schema Prisma mencakup `User`, `Store`, `StoreMember`, `StoreSetting`, `Category`, `Product`, `Customer`, `Supplier`, `Shift`, `CashMovement`, `Sale`, `SaleItem`, `Payment`, `Receipt`, `StockMovement`, `RestockOrder`, `RestockOrderItem`, `DebtPayment`, dan `ActivityLog`.

Nilai uang menggunakan `Decimal` di PostgreSQL. Data yang melewati batas Server Component ke Client Component dipetakan menjadi tipe JSON-safe. Query bisnis selalu membawa `storeId`, sedangkan operasi kritis checkout, shift, stok, restock, utang, void, dan refund menggunakan transaksi Prisma.

## Akun Demo

Semua akun menggunakan password `Password123!`.

| Peran | Email |
| --- | --- |
| Owner | `owner@kasirone.demo` |
| Manager | `manager@kasirone.demo` |
| Cashier | `cashier@kasirone.demo` |
| Inventory Staff | `inventory@kasirone.demo` |

Gunakan akun demo hanya pada database lokal/demo. Ganti atau nonaktifkan kredensial tersebut sebelum penggunaan nyata.

## Menjalankan Secara Lokal

Prasyarat: Node.js 20 LTS atau lebih baru, npm, dan database PostgreSQL (Neon dapat digunakan).

1. Clone dan masuk ke repositori.

   ```bash
   git clone https://github.com/xebec51/kasirone-pro-pos.git
   cd kasirone-pro-pos
   ```

2. Instal dependency.

   ```bash
   npm install
   ```

3. Salin `.env.example` menjadi `.env`, lalu isi nilainya secara lokal. Jangan commit `.env`.

   ```powershell
   Copy-Item .env.example .env
   ```

4. Buat secret acak yang kuat.

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

5. Terapkan migration, generate Prisma Client, dan isi data demo bila database memang khusus development.

   ```bash
   npx prisma migrate deploy
   npx prisma generate
   npm run seed
   ```

   **Peringatan:** seed membangun ulang histori transaksi milik store demo. Jangan menjalankan `npm run seed` pada database produksi atau database yang memiliki data penting.

6. Jalankan aplikasi.

   ```bash
   npm run dev
   ```

Buka [http://localhost:3000](http://localhost:3000).

## Variabel Lingkungan

| Variabel | Keterangan |
| --- | --- |
| `DATABASE_URL` | Connection string PostgreSQL/Neon dengan SSL bila diwajibkan provider. |
| `NEXTAUTH_URL` | URL canonical aplikasi, misalnya `http://localhost:3000` saat lokal. |
| `NEXT_PUBLIC_APP_URL` | URL publik aplikasi yang boleh tersedia pada client bundle. |
| `NEXTAUTH_SECRET` | Secret acak untuk menandatangani JWT/cookie NextAuth. |
| `AUTH_SECRET` | Gunakan nilai secret yang sama untuk kompatibilitas tooling auth. |

Jangan mencetak secret pada log build, memasukkannya ke source code, atau menambahkan `.env` ke Git.

## Prisma dan Validasi

Perintah yang umum digunakan:

```bash
# Memeriksa schema
npx prisma validate

# Menghasilkan client yang diabaikan Git
npx prisma generate

# Membuat migration saat mengubah schema di development
npx prisma migrate dev --name nama_perubahan

# Menerapkan migration yang sudah ada di staging/production
npx prisma migrate deploy

# Data demo development saja
npm run seed

# Pemeriksaan aplikasi
npm run lint
npm run build
```

Generated client berada di `app/generated/prisma` dan tidak boleh dikomit.

## Deployment Vercel + Neon

1. Buat project PostgreSQL di Neon dan salin connection string yang memakai SSL.
2. Import repositori ini ke Vercel.
3. Tambahkan kelima variabel lingkungan di atas untuk Production dan Preview sesuai kebutuhan.
4. Set `NEXTAUTH_URL` dan `NEXT_PUBLIC_APP_URL` ke domain deployment HTTPS final.
5. Jalankan `npx prisma migrate deploy` terhadap database target dari mesin/CI yang terotorisasi sebelum menerima traffic aplikasi.
6. Gunakan build command default `npm run build`; script ini menjalankan `prisma generate` sebelum `next build`.
7. Verifikasi login, role guard, checkout, mutasi stok, struk, ekspor, dan penutupan shift pada deployment.

Repositori sudah memiliki migration, postinstall Prisma, build production, dan konfigurasi header keamanan yang kompatibel dengan Vercel. Deployment belum dianggap live sampai domain produksi nyata dibuat dan smoke test production selesai.

## Catatan Keamanan

- Status user dan membership toko dibaca ulang dari database untuk aksi terproteksi.
- `storeId` dan `userId` diturunkan dari sesi server, bukan dipercaya dari input client.
- Cashier dibatasi ke transaksi dan shift miliknya; modul sensitif memiliki role guard server.
- Record bisnis selesai dipertahankan dan dikoreksi dengan reversal.
- Operasi yang menyentuh beberapa ledger memakai transaksi Prisma dengan validasi ulang.
- Header `nosniff`, anti-frame, referrer policy, dan permissions policy dikirim oleh Next.js.
- `.env` dan `app/generated/prisma` masuk `.gitignore`.

Untuk penggunaan produksi nyata, tambahkan rate limiting, monitoring/alerting, backup teruji, rotasi secret, kebijakan password yang lebih kuat, dan audit keamanan independen.

## Batasan Saat Ini

- Belum ada payment gateway.
- Belum ada integrasi API QRIS nyata.
- Belum ada integrasi hardware barcode scanner khusus.
- Belum mendukung offline-first.
- Belum mendukung multi-branch.
- Belum mempunyai full accounting ledger.
- Belum mempunyai payroll.
- Belum ada automated test suite; validasi saat ini mengandalkan Prisma, lint, build, dan smoke test manual.
- Refund parsial belum tersedia; workflow saat ini berfokus pada full refund/void.

## Pengembangan Berikutnya

- Automated unit, integration, dan end-to-end tests.
- Payment gateway serta integrasi QRIS production.
- Offline queue dan sinkronisasi konflik.
- Multi-branch, transfer stok, dan konsolidasi laporan.
- Barcode scanner, label printing, dan dukungan perangkat kasir.
- Observability, rate limiting, backup/restore drill, dan audit trail yang dapat diekspor.
- Refund parsial serta akuntansi dan perpajakan yang lebih lengkap.

## Developer

**Muh. Rinaldi Ruslan** — Full-Stack Developer

- [GitHub](https://github.com/xebec51/kasirone-pro-pos)
- [LinkedIn](https://www.linkedin.com/in/rinaldiruslan)
- [Email](mailto:rinaldi.ruslan51@gmail.com)

KasirOne Pro adalah proyek portofolio dan bukan layanan pembayaran atau sistem akuntansi tersertifikasi.
