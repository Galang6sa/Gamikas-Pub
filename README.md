# KasKelas

Buku kas kelas yang dicap. Aplikasi web (PWA) untuk kas mingguan kelas: tagihan, denda, tabel pembayaran, dan catatan kas yang terbuka untuk seluruh kelas.

Aplikasi punya dua mode yang ditentukan saat build:

| Mode | Syarat | Isi |
|---|---|---|
| **Demo** | Variabel Supabase kosong | `/` dan `/bendahara` diarahkan ke prototipe M1 dengan data fiktif, tanpa backend. Prototipe juga selalu ada di `/demo` |
| **Data sungguhan** | `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` terisi | Login kode kelas, pilih nama, PIN, data dari Supabase, aksi bendahara |

## Menjalankan

Gunakan Node.js 20 atau lebih baru.

```sh
npm install
cp .env.example .env.local   # isi variabel Supabase untuk mode data sungguhan
npm run dev
```

## Menyiapkan Supabase (sekali saja)

Jalankan berkas SQL di SQL Editor Supabase secara berurutan dari `supabase/migrations/`:

1. `001_skema_kaskelas.sql`: tabel, fungsi denda, tampilan, dan RLS.
2. Seed data siswa (`003_seed_siswa.sql`, **tidak ada di repositori ini karena memuat nama asli**; simpan di tempat privat).
3. `004_perketat_akses.sql`: hanya anggota kelas yang boleh membaca.
4. `005_daftar_login.sql`, lalu atur kode kelas (petunjuk ada di akhir berkas).
5. `006_impor_riwayat_qris.sql` (untuk riwayat QRIS) dan `007_rpc_aplikasi.sql` (fungsi yang dipanggil aplikasi).
6. `008_klaim_qris_dan_impor.sql`: unggah bukti, pencocokan dengan laporan GoPay, antrean bendahara. Opsional, agar bukti GoPay tanpa kode merchant dikenali: `update public.konfigurasi set merchant_nama = 'NAMA SEPERTI DI BUKTI';`

Lalu di dashboard Supabase:

- Authentication, Sign In / Providers: **matikan Allow new users to sign up**.
- Buat akun bendahara (Authentication, Users, Add user, Auto Confirm), lalu jalankan:
  `insert into public.profil (id, role) select id, 'bendahara' from auth.users where email = 'emailmu';`
- Buat akun siswa dengan skrip `buat_akun.mjs` (dijalankan lokal memakai kunci rahasia, jangan dimasukkan ke repositori).

## Rute

| Rute | Untuk |
|---|---|
| `/` | Masuk dan aplikasi siswa (kode kelas diingat perangkat, lalu pilih nama dan PIN) |
| `/bendahara` | Masuk bendahara (email dan kata sandi). Tidak ditautkan dari halaman siswa |
| `/demo` | Prototipe dengan data fiktif |

## Unggah bukti dan pencocokan

OCR berjalan **di browser siswa** (Tesseract.js). Gambar tidak dikirim ke server; yang dikirim hanya hasil bacaan dan hash gambar. Saat pertama dipakai, browser mengunduh pembaca OCR dan data bahasa dari CDN bawaan Tesseract.js (beberapa megabyte, lalu tersimpan di cache).

Status pembayaran QRIS: `terkonfirmasi` (cocok dengan tepat satu baris laporan GoPay), `lunas_sementara` (laporan belum mencakup waktunya), `perlu_dicek`, `mencurigakan` (laporan sudah mencakup waktunya tetapi tidak ada transaksi yang cocok), `ditolak`. Bendahara mengimpor laporan CSV GoPay Merchant dari tab Laporan QRIS, lalu mencocokkan dan memutuskan klaim dari tab Antrean.

## Perintah pemeriksaan

```sh
npm test          # 30 uji: aturan denda, pemetaan data, PIN, dan alur layar (login, bayar, meja bendahara)
npm run typecheck
npm run build
```

## Struktur

- `app/page.tsx`: memilih mode (data sungguhan atau demo). `app/demo/page.tsx`: demo selalu tersedia.
- `components/live/`: mode data sungguhan. `LiveApp` (sesi dan cangkang), `Masuk`, `GantiPin`, `Beranda`, `Bayar`, `PapanKelas`, `Kas`, `MejaBendahara`, `Pengaturan`, hook `useKelas`.
- `components/Demo.tsx`: prototipe M1 (data contoh). `components/ui.tsx`: Icon, StatusStamp, Button.
- `lib/api.ts`: seluruh akses ke Supabase dan penerjemahan galat. `lib/papan.ts`: pemetaan data ke tampilan. `lib/pin.ts`: aturan PIN. `lib/domain.ts`: denda untuk demo.
- `lib/ocr.ts`: pembaca bukti. `lib/gopay.ts`: pembaca CSV GoPay. `lib/bunyi.ts`: bunyi. `lib/nama.ts`: nama singkat. `lib/csv.ts`: ekspor CSV.
- `components/live/bendahara/`: tab Meja bendahara (Antrean, Catat, Laporan QRIS, Pengingat, Atur).
- `supabase/tests/`: uji SQL (jalankan di PostgreSQL lokal dengan `stub_supabase.sql` dan `stub_ext.sql`).
- `supabase/migrations/`: skema dan fungsi database.

## Prinsip keamanan

- Perhitungan uang (total, denda, alokasi) dikerjakan di database lewat fungsi, bukan di browser. Layar hanya menampilkan.
- Kunci rahasia tidak pernah ada di aplikasi. Kunci anon aman karena RLS membatasi baca dan tulis.
- Daftar nama untuk login hanya terbuka lewat kode kelas.

## Belum dibangun

Notifikasi Web Push, penguncian login per akun (kini hanya batas laju bawaan Supabase), dan sinkronisasi Google Sheets.
