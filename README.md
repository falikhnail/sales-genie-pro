# Sales Genie Pro 🧞‍♂️

Sistem Manajemen Penjualan & Order Profesional berbasis web untuk mengelola toko, produk, harga, pesanan, dan laporan penjualan secara efisien.

## ✨ Fitur Utama

- **Manajemen Toko** — Kelola data toko, kontak, dan alamat
- **Manajemen Produk** — Katalog produk dengan SKU, kategori, dan harga default
- **Harga Khusus per Toko** — Atur harga custom untuk setiap toko
- **Perbandingan Harga** — Bandingkan harga produk antar toko
- **Riwayat Harga** — Lacak perubahan harga dari waktu ke waktu
- **Pembuatan Order** — Buat dan kelola pesanan dengan mudah
- **Kirim via WhatsApp** — Kirim detail order langsung ke WhatsApp toko
- **Target Penjualan** — Tetapkan dan pantau target penjualan bulanan
- **Dashboard & Laporan** — Visualisasi data penjualan dan performa
- **Activity Log** — Catat semua aktivitas pengguna dalam sistem
- **Backup Data** — Ekspor dan backup data sistem
- **Multi-User & Role** — Dukungan peran Admin dan Sales
- **Autentikasi Username** — Login menggunakan username dan password

## 🛠️ Teknologi

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **UI Components:** shadcn/ui
- **Backend:** Lovable Cloud (Database, Auth, Edge Functions)
- **State Management:** TanStack React Query
- **Charts:** Recharts
- **Routing:** React Router DOM

## 📁 Struktur Proyek

```
src/
├── components/       # Komponen UI
│   ├── layout/       # Layout utama (Sidebar, MainLayout)
│   └── ui/           # shadcn/ui components
├── contexts/         # React Context (Auth)
├── hooks/            # Custom hooks (orders, products, stores, dll)
├── integrations/     # Integrasi backend
├── lib/              # Utilitas (formatter, export)
├── pages/            # Halaman aplikasi
├── types/            # TypeScript type definitions
supabase/
├── functions/        # Backend edge functions
├── migrations/       # Database migrations
```

## 🚀 Cara Menjalankan

```bash
# Clone repository
git clone <YOUR_GIT_URL>

# Masuk ke direktori proyek
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Jalankan development server
npm run dev
```

## 👤 Setup Awal

Saat pertama kali dijalankan, sistem akan menampilkan halaman **Initial Setup** untuk membuat akun admin pertama. Setelah setup selesai, pengguna akan diarahkan ke halaman login.

## 📄 Lisensi

Hak cipta dilindungi. Seluruh kode dalam repository ini adalah milik pemilik proyek.
