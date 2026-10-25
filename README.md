# KasKelas

Buku kas kelas yang dicap. Aplikasi web (PWA) untuk kas mingguan kelas: tagihan, denda, tabel pembayaran, dan catatan kas yang terbuka untuk seluruh kelas.

Aplikasi punya dua mode yang ditentukan saat build:

| Mode | Syarat | Isi |
|---|---|---|
| **Demo** | Variabel Supabase kosong | Prototipe M1 dengan data fiktif, tanpa backend. Selalu juga tersedia di `/demo` |
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

Lalu di dashboard Supabase:

- Authentication, Sign In / Providers: **matikan Allow new users to sign up**.
- Buat akun bendahara (Authentication, Users, Add user, Auto Confirm), lalu jalankan:
  `insert into public.profil (id, role) select id, 'bendahara' from auth.users where email = 'emailmu';`
- Buat akun siswa dengan skrip `buat_akun.mjs` (dijalankan lokal memakai kunci rahasia, jangan dimasukkan ke repositori).

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
- `supabase/migrations/`: skema dan fungsi database.

## Prinsip keamanan

- Perhitungan uang (total, denda, alokasi) dikerjakan di database lewat fungsi, bukan di browser. Layar hanya menampilkan.
- Kunci rahasia tidak pernah ada di aplikasi. Kunci anon aman karena RLS membatasi baca dan tulis.
- Daftar nama untuk login hanya terbuka lewat kode kelas.

## Belum dibangun

Unggah bukti dengan OCR, pencocokan otomatis dengan laporan GoPay, penetapan "uang tanpa pemilik" dari layar, notifikasi Web Push, pengingat wa.me bertanda, penguncian login per akun, dan sinkronisasi Google Sheets. Layar Bayar saat ini berhenti di QRIS dan meminta siswa memberi tahu bendahara.
