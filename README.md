# MeowLibrary — Perpustakaan Digital

Platform perpustakaan digital berbasis web dengan fitur peminjaman buku, manajemen koleksi, sistem pelaporan otomatis, dan sinkronisasi aktivitas transaksi secara *real-time* antara Dashboard Admin dan Dashboard Member.

## Fitur Utama

- **Katalog Digital & Peminjaman**: Pencarian cerdas (judul, penulis, ISBN, rak), filter kategori, pratinjau kutipan buku, peminjaman langsung, dan antrean reservasi.
- **Dashboard Member Real-Time**: Pemantauan buku dipinjam, hitung mundur tenggat pengembalian, perpanjangan masa pinjam, pengembalian mandiri, kartu anggota digital, dan riwayat denda.
- **Dashboard Admin Real-Time**: Monitor transaksi langsung lintas tab (`BroadcastChannel` + `localStorage`), manajemen koleksi (CRUD), loket sirkulasi, manajemen anggota, dan konfigurasi aturan pinjam.
- **Sistem Pelaporan Otomatis**: Generator laporan periodik (Harian, Mingguan, Bulanan, Audit Keterlambatan) dengan arsip snapshot otomatis, ekspor CSV (UTF-8), dan cetak PDF.

## Deploy ke GitHub & Vercel

1. **Push ke GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit MeowLibrary"
   git branch -M main
   git remote add origin https://github.com/<username>/meowlibrary.git
   git push -u origin main
   ```
2. **Deploy di Vercel**
   - Buka [vercel.com](https://vercel.com) dan klik **Add New Project**.
   - Pilih repositori GitHub `meowlibrary`.
   - Framework Preset akan terdeteksi otomatis sebagai **Vite** (`npm run build`, Output Directory: `dist`).
   - Klik **Deploy**. File `vercel.json` sudah disertakan untuk menangani *routing* SPA.
