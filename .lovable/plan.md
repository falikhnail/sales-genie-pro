

## Plan: Update Aplikasi - Fase Berikutnya

### 1. Dashboard Analytics Lebih Lengkap
- Grafik tren penjualan bulanan (line chart)
- Grafik piutang outstanding vs terbayar per bulan
- Top 5 toko dengan piutang terbesar (bar chart)
- Perbandingan target vs realisasi penjualan (area chart)
- Card ringkasan: total order bulan ini, rata-rata nilai order, growth vs bulan lalu

### 2. Notifikasi WhatsApp Otomatis Terjadwal
- Edge function yang dijalankan via cron job harian
- Cek piutang yang mendekati/melewati jatuh tempo
- Kirim reminder otomatis ke WhatsApp toko via WhatsApp API
- Log pengiriman notifikasi di database
- Pengaturan jadwal & template pesan di UI

### 3. Tampilan Mobile Lebih Responsif
- Optimasi sidebar untuk mobile (drawer/sheet)
- Tabel piutang & order responsive (card view di mobile)
- Form input yang nyaman di layar kecil
- Bottom navigation untuk akses cepat fitur utama
- Touch-friendly buttons dan spacing

### 4. Retur / Pengembalian Barang
- Tabel baru `returns` untuk mencatat retur
- Link ke order & piutang terkait
- Otomatis kurangi piutang saat retur disetujui
- Halaman retur dengan status tracking
- Laporan retur per toko

### 5. Histori Kunjungan Sales
- Tabel baru `visits` untuk mencatat kunjungan
- Form check-in dengan catatan & foto
- Integrasi GPS untuk lokasi kunjungan
- Timeline kunjungan per toko
- Dashboard kunjungan sales

### Urutan Implementasi yang Disarankan
1. Dashboard Analytics (foundation untuk monitoring)
2. Tampilan Mobile Responsif (UX improvement)
3. Retur / Pengembalian Barang (business logic)
4. Histori Kunjungan Sales (field operation)
5. Notifikasi WhatsApp Terjadwal (automation - perlu WhatsApp API)
