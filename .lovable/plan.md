

## Plan: Notifikasi Otomatis Piutang 30+ Hari & Perbaikan Tampilan Piutang

### 1. Notifikasi Otomatis untuk Piutang Jatuh Tempo > 30 Hari

**Pendekatan:** Menambahkan tab/section khusus di notifikasi header yang menampilkan piutang kritis (> 30 hari overdue) dengan highlight merah dan opsi kirim WhatsApp langsung dari notifikasi. Juga menambahkan banner peringatan di halaman Piutang.

- **ReceivableNotifications.tsx**: Tambahkan kategori baru "Kritis (> 30 hari)" dengan warna dan ikon berbeda (AlertOctagon). Notifikasi ini akan tampil terpisah di bagian atas popover dengan background merah muda. Tambahkan tombol WhatsApp langsung dari item notifikasi.
- **Receivables.tsx**: Tambahkan banner alert di atas halaman jika ada piutang > 30 hari overdue, menampilkan jumlah dan total nominal. Tambahkan summary card baru "Jatuh Tempo > 30 Hari" di baris summary.

### 2. Perbaikan Tampilan Halaman Piutang

Redesign visual untuk tampilan lebih modern dan nyaman:

- **Summary Cards**: Tambahkan gradient subtle pada ikon, spacing lebih baik, dan animasi hover ringan
- **Tabel Piutang**: 
  - Baris dengan piutang overdue diberi background merah muda tipis
  - Baris overdue > 30 hari diberi highlight lebih kuat
  - Tombol aksi diberi tooltip dan spacing lebih baik
  - Tambahkan progress bar kecil di setiap baris (paid vs total)
- **Tab Ringkasan Toko**: Perbaiki card layout dengan visual yang lebih clean, tambahkan badge untuk jumlah overdue per toko
- **Filter**: Tambahkan search input untuk cari invoice/toko, perbaiki layout filter agar lebih compact
- **Detail Dialog**: Perbaiki layout detail dengan card-style sections yang lebih rapi
- **Empty State**: Tambahkan ilustrasi/ikon besar untuk empty state

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/components/ReceivableNotifications.tsx` | Tambah kategori kritis 30+ hari, tombol WhatsApp di notifikasi, visual update |
| `src/pages/Receivables.tsx` | Banner alert overdue 30+, redesign summary cards, perbaikan tabel & filter, search input, progress bar per row, highlight overdue rows |

### Detail Teknis

- Perhitungan overdue 30+ hari menggunakan `differenceInDays(today, dueDate) > 30`
- Tidak perlu perubahan database - semua kalkulasi client-side
- WhatsApp reminder di notifikasi menggunakan fungsi `generateReminderMessage` yang sudah ada
- Styling menggunakan Tailwind classes yang konsisten dengan design system (primary green, destructive red)

