# PRD Final — Aplikasi Kas Kelas “KasKelas”

Versi 1.0 · 23 Oktober 2026 · Disusun oleh: Bendahara Kelas · Status: Final, siap dibangun

## 1. Ringkasan Produk

KasKelas adalah aplikasi web (PWA) untuk mengelola kas mingguan kelas (29 siswa, Rp5.000 per minggu). Siswa membayar mandiri lewat QRIS statis kelas, mengunggah bukti bayar yang dibaca otomatis (OCR), lalu sistem mencocokkannya dengan laporan transaksi GoPay Merchant. Tagihan, denda, pengingat, tabel pembayaran, dan riwayat transaksi tersedia transparan untuk seluruh kelas. Biaya pengembangan dan operasional ditargetkan **Rp0**.

## 2. Latar Belakang dan Masalah

Kas sudah berjalan sekitar 3 bulan dengan QRIS statis dan pencatatan manual. Masalah yang ingin diselesaikan:

1. Bendahara mencatat setiap pembayaran secara manual.
2. Bendahara menagih teman satu per satu.
3. Siswa tidak punya sumber data tunggal untuk melihat status dan saldo.
4. Denda belum otomatis.
5. Pembayaran beberapa minggu sekaligus (Rp10.000–Rp25.000) sulit dialokasikan.
6. Laporan merchant QRIS tidak memuat nama pembayar, sehingga sulit tahu siapa yang membayar.

Fakta dari data nyata (CSV GoPay Merchant, 28 Sep–19 Okt 2026): 15 transaksi sukses senilai Rp135.000, MDR 0 (tidak ada potongan). ID merchant disamarkan pada salinan prototipe.

## 3. Tujuan, Non-Tujuan, dan Metrik

**Tujuan**

- Pencatatan pembayaran otomatis, tanpa input manual untuk pembayaran QRIS.
- Pengingat otomatis dan manual tanpa pengingat ganda.
- Denda dihitung otomatis dan transparan.
- Seluruh kelas dapat melihat tabel pembayaran, transaksi, dan saldo.
- Rekonsiliasi dengan uang yang benar-benar masuk (CSV GoPay).
- Rp0 modal.

**Non-tujuan (versi 1)**

- Payment gateway atau QRIS dinamis (akan menambah biaya dan butuh persetujuan merchant).
- Aplikasi native Android/iOS.
- WhatsApp otomatis (API resmi berbayar, bot tidak resmi berisiko diblokir).
- Banyak kelas atau multi-organisasi.
- Akun bendahara lebih dari satu dan penanda “atas nama” (keputusan: hanya 1 akun bendahara).
- Membaca mutasi rekening/e-wallet lewat kredensial login (melanggar ketentuan penyedia).

**Metrik keberhasilan (target yang divalidasi saat pilot)**

| Metrik | Target |
| --- | --- |
| Waktu kerja bendahara per minggu | di bawah 10 menit |
| Bukti bayar lolos otomatis | minimal 80% |
| Selisih rekonsiliasi (uang masuk vs tercatat lunas) | Rp0 per bulan |
| Pengingat ganda untuk tahap yang sama | 0 |
| Siswa yang membayar lewat aplikasi setelah 4 minggu | minimal 90% |
| Biaya bulanan | Rp0 |

## 4. Pengguna dan Hak Akses

| Role | Jumlah | Hak akses |
| --- | --- | --- |
| **Siswa** | 29 | Lihat tagihan sendiri, bayar dan unggah bukti, lihat tabel pembayaran, transaksi, pengeluaran, dan saldo kelas |
| **Bendahara** | 1 akun | Semua hak siswa, ditambah: kelola minggu/tagihan, impor CSV GoPay, verifikasi manual, input cash, catat pengeluaran, bebaskan denda, hidupkan atau matikan kebijakan denda, kirim pengingat, kelola siswa dan PIN, lihat log |

## 5. Aturan Bisnis

### 5.1 Kas dan tagihan

- Nominal kas: **Rp5.000 per minggu** per siswa (dapat diubah di konfigurasi).
- Satu minggu tagihan: **Senin 00:00 sampai Minggu 23:59:59 WIB**. Siswa boleh membayar kapan saja dalam rentang itu.
- **Jatuh tempo** tagihan: Minggu 23:59:59 WIB pada minggu tagihan tersebut.
- Semua waktu disimpan dalam UTC dan ditampilkan dalam WIB (Asia/Jakarta).
- Bendahara dapat menandai suatu minggu sebagai **libur** (tidak ditagih).

### 5.2 Denda

Denda dihitung **per tagihan** berdasarkan **waktu bayar yang tertera di bukti** (bukan waktu unggah).

- Misalkan *k* = jumlah minggu penuh yang terlewat sejak jatuh tempo, dibulatkan ke atas.
- Bayar sebelum atau tepat pada jatuh tempo: denda **0%**.
- *k* = 1 (telat 1 minggu): denda **20%** dari nominal tagihan (Rp1.000).
- *k* ≥ 2: denda **naik 10 poin persentase** untuk setiap minggu keterlambatan berikutnya: 30% (*k* = 2, Rp1.500), 40% (*k* = 3, Rp2.000), dan seterusnya. Rumus: 20% + 10% × (*k* − 1).
- Persentase awal, kenaikan per minggu, dan batas atas denda (opsional, default tanpa batas) dapat diubah di konfigurasi.
- Denda tidak dikenakan atas denda dan tidak menumpuk antar tagihan.
- **Reset**: karena dihitung per tagihan, setelah tagihan lunas dan siswa menunggak lagi, tagihan baru mulai dari denda awal.
- Pembulatan: ke Rp50 terdekat.
- Bendahara dapat **membebaskan denda** dengan alasan wajib (misalnya sakit atau izin). Setiap pembebasan masuk log.
- Denda yang terbayar dicatat sebagai pemasukan kas dengan kategori **Denda**.

**Saklar kebijakan denda (ON/OFF)**

- Bendahara dapat menghidupkan atau mematikan kebijakan denda lewat satu saklar di pengaturan (default: ON). Setiap perubahan meminta konfirmasi dan masuk log aktivitas.
- Saat **OFF**: denda Rp0 untuk semua pembayaran baru, label dan kolom denda disembunyikan, siswa melihat banner “Denda sedang dinonaktifkan”, dan pengingat “Denda mulai berlaku” tidak dikirim.
- Denda yang sudah terkunci pada pembayaran sebelumnya **tidak berubah** ketika saklar diubah.
- Saat dihidupkan kembali, denda **tidak berlaku surut**: keterlambatan dihitung sejak jatuh tempo atau sejak saklar dinyalakan, mana yang lebih baru.
- Saklar berlaku untuk seluruh kelas; pembebasan denda per tagihan tetap tersedia saat ON.

### 5.3 Pembayaran beberapa minggu sekaligus

- Siswa memilih tagihan yang ingin dibayar (default: yang paling lama dulu). Total yang harus dibayar = jumlah (tagihan + denda yang berlaku pada waktu bayar).
- Satu pembayaran dapat melunasi banyak tagihan (tabel alokasi).
- Bayar di muka diizinkan sampai **4 minggu ke depan** (konfigurasi).
- Jika nominal bukti lebih besar dari total, kelebihan dicatat sebagai **saldo di muka** siswa dan otomatis dipakai untuk tagihan berikutnya. Jika kurang, pembayaran masuk antrean bendahara.

**Contoh.** Siswa membayar pada Rabu, 21 Okt 2026 untuk tiga minggu (kebijakan denda ON):

| Tagihan | Jatuh tempo | Telat | Denda | Total |
| --- | --- | --- | --- | --- |
| 5–11 Okt | 11 Okt | 2 minggu | 30% = Rp1.500 | Rp6.500 |
| 12–18 Okt | 18 Okt | 1 minggu | 20% = Rp1.000 | Rp6.000 |
| 19–25 Okt | 25 Okt | belum jatuh tempo | 0 | Rp5.000 |
| **Total yang dibayar** |  |  |  | **Rp17.500** |

### 5.4 Pembayaran cash dan koreksi

- Cash diinput bendahara: siswa, minggu, nominal, tanggal bayar. Denda tetap dihitung dari tanggal bayar.
- Bendahara dapat membatalkan atau mengoreksi pembayaran dengan alasan wajib. Data lama tidak dihapus, hanya ditandai dan dicatat di log.

## 6. Alur Utama

**Siswa**

1. Login dengan NRP dan PIN.
2. Beranda menampilkan tagihan aktif, denda berjalan (bila kebijakan denda aktif), dan total.
3. Siswa mencentang minggu yang dibayar, lalu aplikasi menampilkan total.
4. Siswa membayar lewat QRIS statis kelas (kode QR ditampilkan di aplikasi), lalu mengunggah screenshot bukti.
5. Sistem membaca bukti (OCR), memvalidasi, dan menampilkan hasil.
6. Tabel pembayaran dan transaksi ter-update.

**Bendahara**

1. Dashboard menampilkan antrean verifikasi, tunggakan, dan rekonsiliasi.
2. Mengimpor CSV GoPay Merchant (kapan saja, disarankan mingguan).
3. Memproses antrean 🟡, menetapkan pemilik untuk uang tanpa pemilik 💰, input cash, dan pengeluaran.
4. Mengirim pengingat manual (wa.me) bila perlu.

**Status pembayaran**

| Status | Arti |
| --- | --- |
| ⏳ Lunas sementara | Bukti lolos validasi OCR, menunggu konfirmasi CSV |
| ✅ Terkonfirmasi | Bukti cocok dengan satu baris CSV GoPay |
| 🟡 Perlu dicek | OCR ragu, waktu tidak terbaca, atau kandidat ganda |
| ❌ Ditolak | Merchant salah, duplikat, atau status bukan berhasil |
| 🚩 Mencurigakan | Lunas sementara tetapi tidak muncul di CSV setelah 7 hari sejak CSV terbaru diimpor |
| 💰 Tanpa pemilik | Baris CSV tanpa klaim, menunggu ditetapkan bendahara |

## 7. Kebutuhan Fungsional

Prioritas: **P0** wajib untuk rilis pertama, **P1** segera setelahnya, **P2** opsional.

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-01 | Login NRP + PIN 6 digit; bendahara memakai password kuat (≥ 12 karakter); penguncian sementara setelah 5 kali gagal | P0 |
| FR-02 | Siswa wajib mengganti PIN awal saat login pertama; bendahara dapat mereset PIN | P0 |
| FR-03 | Pembuatan minggu dan tagihan otomatis tiap Senin untuk semua siswa aktif; penanda minggu libur | P0 |
| FR-04 | Perhitungan denda sesuai bagian 5.2 (persentase awal, kenaikan per minggu, dan batas atas dapat dikonfigurasi), dilakukan di server, dengan pembebasan oleh bendahara | P0 |
| FR-05 | Pilih beberapa tagihan dan hitung total bayar | P0 |
| FR-06 | Tampilkan QRIS statis kelas dan instruksi unggah per aplikasi | P0 |
| FR-07 | Unggah bukti, OCR, validasi, dan penentuan status | P0 |
| FR-08 | Anti-duplikat bukti (bagian 8.5) | P0 |
| FR-09 | Impor CSV GoPay Merchant dengan pratinjau dan pembuangan duplikat | P0 |
| FR-10 | Pencocokan klaim bukti dengan baris CSV (bagian 8.4) | P0 |
| FR-11 | Daftar uang tanpa pemilik dan penetapan pemilik oleh bendahara | P0 |
| FR-12 | Input pembayaran cash oleh bendahara | P0 |
| FR-13 | Tabel pembayaran: No, NRP, Nama, kolom minggu (dinamis per bulan), ikon metode (💳 QRIS / 💵 Cash), keterangan, total tunggakan | P0 |
| FR-14 | Riwayat transaksi (pemasukan dan pengeluaran) dan saldo kas yang dapat dilihat semua siswa | P0 |
| FR-15 | Pencatatan pengeluaran (tanggal, nominal, kategori, keterangan) | P0 |
| FR-16 | Web Push pengingat terjadwal dengan log anti-ganda | P0 |
| FR-17 | Tombol wa.me per siswa dengan pesan terisi dan status pengingat (Belum / Dibuka / Terkirim) | P0 |
| FR-18 | Saklar kebijakan denda ON/OFF (global) dengan konfirmasi, log aktivitas, dan banner status untuk siswa | P0 |
| FR-19 | Impor data historis 3 bulan dari spreadsheet (CSV/XLSX) dengan dry-run | P0 |
| FR-20 | Panel rekonsiliasi: total masuk di CSV vs total lunas QRIS, selisih | P1 |
| FR-21 | Cermin Google Sheets read-only (rekap, transaksi, pengeluaran) | P1 |
| FR-22 | Ekspor laporan bulanan (CSV) | P1 |
| FR-23 | Mode kode unik pada nominal (nominal + nomor absen) | P2 |
| FR-24 | Mode privasi: OCR lokal di browser tanpa kirim gambar ke layanan AI | P2 |

## 8. Spesifikasi OCR dan Pencocokan

### 8.1 Hasil bacaan yang diharapkan (per bukti)

`aplikasi`, `status_berhasil` (boolean), `nominal` (angka bulat rupiah), `waktu_bayar` (WIB, boleh kosong), `merchant_id/PAN/nama`, `ref_id` (boleh kosong), `confidence`.

### 8.2 Temuan dari 5 contoh bukti nyata

| Aplikasi | Format nominal | Format waktu | Identitas merchant | ID unik transaksi |
| --- | --- | --- | --- | --- |
| Bank A (BRImo) | Rp15.000 | 19 Oct 2026, 13:12:00 WIB | ID merchant disamarkan | No. Ref terlihat |
| Bank B (BCA) | Rp10.000,00 | 17/10/2026 - 06:08:47 WIB | Merchant PAN | RRN dan Ref terlihat |
| Dompet A (header oranye) | Rp 10.000,00 | 12 Okt 2026 - 13:25:47 | MPAN | Tersembunyi di Detail Transaksi |
| Dompet B (header hijau) | Rp10.000 | 12 Okt 2026 • 08:08:23 WIB | Merchant PAN | Tersembunyi di Lihat Resi |
| GoPay | Rp5.000 | **Tidak ada tanggal** | Hanya nama | Tersembunyi di Rincian lengkap |

Kesimpulan: hanya sebagian bukti memuat ID unik, dan GoPay tidak memuat tanggal. Bukti tanpa waktu otomatis masuk status 🟡.

### 8.3 Aturan parsing

- Nominal dinormalkan dari “Rp 10.000,00”, “Rp10.000”, “Rp5.000” menjadi bilangan bulat.
- Bulan dikenali dalam Indonesia dan Inggris (Okt, Oct, Oktober, Sep, dan seterusnya) serta format DD/MM/YYYY.
- **Abaikan** jam di status bar HP, iklan, banner, dan tombol.
- Identitas merchant dicocokkan lewat angka inti yang disimpan di konfigurasi (nilainya disamarkan pada salinan prototipe), bukan nama, karena nama bervariasi.
- Waktu bayar tidak boleh di masa depan dan tidak lebih lama dari 45 hari (konfigurasi).

### 8.4 Pencocokan dengan CSV GoPay

Struktur CSV yang diverifikasi: `Tipe Pembayaran, Transaksi Dibuat, Status Diperbarui, Status, No. Transaksi, No. Ref, Harga, MDR, Pengeluaran Promo, Pendapatan Bersih, Toko, Merchant ID, Catatan`.

- Kolom yang dipakai: **Transaksi Dibuat** (WIB, cocok dengan screenshot), Harga, Merchant ID, Status, dan **No. Transaksi** sebagai kunci unik.
- Kolom **Status Diperbarui tidak dipakai**: di sebagian baris selisih 7 jam (UTC).
- Format tanggal CSV berbahasa Inggris, misalnya `19 Oct 2026 - 13:12:01`.
- CSV **tidak memuat nama pembayar**, dan No. Ref GoPay tidak sama dengan nomor referensi di aplikasi pembayar. Pencocokan memakai: **merchant sama + nominal persis sama + selisih waktu ≤ 30 detik** (pada 4 contoh nyata selisihnya 0–8 detik).
- **Satu baris CSV hanya boleh dipakai satu klaim.** Jika ada beberapa kandidat, pilih pasangan dengan total selisih waktu terkecil; jika tetap ambigu, status 🟡. Contoh nyata: pada 28 Sep ada tiga transaksi Rp5.000 dalam 78 detik.
- Klaim ganda pada satu baris otomatis di-flag.

### 8.5 Anti-duplikat

Kunci duplikat berurutan: `ref_id` (bila ada) → hash gambar → sidik jari (merchant + waktu sampai detik + nominal). Bukti tanpa waktu dan tanpa `ref_id` tidak bisa lolos otomatis.

### 8.6 Rencana mesin OCR dan kriteria uji

- Utama: model visi (API tingkat gratis), dipanggil dari fungsi server agar kunci API tidak bocor ke browser. Keluaran berupa JSON terstruktur.
- Cadangan: Tesseract.js di browser plus parser regex.
- Sebelum go-live, uji dengan **minimal 30 screenshot dari minimal 5 aplikasi**. Target: nominal dan merchant benar ≥ 90% dan nol bukti salah yang lolos otomatis. Target ini belum terbukti dan harus divalidasi.

## 9. Notifikasi dan Pengingat

| Tahap | Waktu (usulan) | Sasaran |
| --- | --- | --- |
| Tagihan baru | Senin 07:00 | Semua yang belum lunas minggu ini |
| Pengingat H-1 | Sabtu 16:00 | Belum lunas |
| Terakhir sebelum denda | Minggu 18:00 | Belum lunas |
| Denda mulai berlaku | Senin 07:00 | Yang masih menunggak (hanya bila kebijakan denda ON) |

- Web Push dikirim sekali per (siswa, tagihan, tahap, channel); dijaga dengan batasan unik di `log_pengingat`.
- Pada iPhone, Web Push hanya bekerja bila aplikasi ditambahkan ke Layar Utama (iOS 16.4 ke atas). Aplikasi menampilkan panduan pemasangan.
- Pengingat manual: dashboard menampilkan badge **“Sudah diingatkan, Rabu 14.02”** atau **“Belum”**. Membuka wa.me tidak bisa memastikan pesan benar-benar terkirim, jadi statusnya Dibuka, lalu bendahara menandai Terkirim. Mengirim ulang dalam 24 jam menampilkan peringatan.
- Siswa yang sudah lunas tidak masuk daftar pengingat.
- Penjadwal memakai layanan gratis (Supabase pg\_cron atau GitHub Actions). Jadwal bisa terlambat beberapa menit.

## 10. Model Data

| Tabel | Isi utama |
| --- | --- |
| `siswa` | id, nrp (unik), nama, no\_absen, no\_wa (opsional, hanya terlihat bendahara), aktif |
| `minggu` | id, tanggal Senin, tanggal Minggu, jatuh\_tempo, ditagih (boolean), nominal |
| `tagihan` | id, siswa\_id, minggu\_id, nominal\_pokok, status, denda\_dibebaskan, alasan |
| `pembayaran` | id, siswa\_id, metode (qris/cash), nominal\_bukti, waktu\_bayar, status, ref\_id, hash\_bukti, hasil\_ocr, gopay\_txn\_id |
| `alokasi_pembayaran` | pembayaran\_id, tagihan\_id, jumlah\_pokok, jumlah\_denda |
| `gopay_txn` | no\_transaksi (kunci), waktu\_dibuat, nominal, ref, merchant\_id, status, pembayaran\_id, batch\_impor |
| `pengeluaran` | id, tanggal, nominal, kategori, keterangan |
| `log_pengingat` | siswa\_id, tagihan\_id, tahap, channel, waktu, status |
| `log_aktivitas` | waktu, aktor, aksi, sebelum, sesudah, alasan |
| `konfigurasi` | nominal, denda\_aktif (saklar ON/OFF), persen denda awal, kenaikan denda per minggu, batas atas denda (opsional), toleransi waktu, ID merchant, batas bayar di muka, dan sebagainya |

Saldo kas = pemasukan (kas + denda + lainnya) dikurangi pengeluaran. Baris CSV tanpa pemilik ditampilkan terpisah sebagai “belum teridentifikasi”, bukan bagian saldo resmi.

## 11. Arsitektur dan Biaya

| Komponen | Pilihan | Catatan |
| --- | --- | --- |
| Frontend | React/Next.js sebagai PWA | Mobile-first, bahasa Indonesia |
| Hosting | Vercel, Cloudflare Pages, atau Netlify (tier gratis) | Pilih satu |
| Database dan auth | Supabase (tier gratis) | Row-level security |
| Fungsi server | Supabase Edge Functions | OCR, denda, impor CSV |
| Penjadwal | pg\_cron atau GitHub Actions | Pengingat dan pembuatan tagihan |
| Penyimpanan bukti | Supabase Storage | Gambar dihapus setelah verifikasi |
| Cermin spreadsheet | Google Sheets API (akun layanan) | Satu arah, read-only |

Batas tier gratis Supabase menurut pengecekan Juli–Agustus 2026: database 500 MB, storage 1 GB, bandwidth 5 GB, 50.000 pengguna aktif bulanan, 2 project. **Project gratis di-pause setelah sekitar seminggu tanpa aktivitas**, sehingga perlu job ping ringan. Batas dan harga dapat berubah, jadi harus dicek ulang sebelum go-live. Untuk 29 siswa, kebutuhan jauh di bawah batas ini.

QRIS tetap **statis** (tanpa biaya, MDR 0 pada data saat ini). Payment gateway ditunda ke versi berikutnya dan hanya dipertimbangkan bila verifikasi otomatis penuh menjadi kebutuhan.

## 12. Keamanan dan Privasi

- Kunci API dan rahasia hanya di server; tidak ada di kode frontend.
- Row-level security: siswa hanya dapat menulis data miliknya; aksi bendahara hanya untuk role bendahara.
- Perhitungan denda, status, dan alokasi dilakukan di server; klien tidak dipercaya.
- PIN disimpan sebagai hash, bukan teks biasa.
- **Minimisasi data bukti**: simpan hasil bacaan (nominal, waktu, ID, hash); hapus gambar setelah terverifikasi atau maksimal 7 hari. Bukti dari bank dapat memuat nomor kartu/akun pembayar.
- Gambar bukti diproses layanan AI pihak ketiga; siswa diberi pemberitahuan di halaman unggah. Mode privasi (FR-24) menjadi alternatif.
- Transparansi: seluruh siswa yang **sudah login** melihat tabel lengkap. Tidak ada halaman publik tanpa login. Cermin Google Sheets dibagikan hanya ke kelas; siapa pun yang memegang tautan dapat melihatnya.
- Nomor WhatsApp siswa hanya terlihat bendahara.
- Backup: salinan data berkala ke Sheets/CSV.

## 13. Kebutuhan Non-Fungsional

- Mobile-first; berjalan di Chrome dan Safari versi terbaru.
- Halaman utama termuat di bawah 3 detik pada jaringan 4G.
- Seluruh teks dalam bahasa Indonesia; zona waktu WIB.
- Dapat dipasang sebagai PWA.
- Kegagalan OCR atau layanan AI tidak boleh menghentikan pembayaran: bukti otomatis masuk antrean bendahara.
- Biaya operasional Rp0 per bulan.

## 14. Rencana Rilis

| Tahap | Cakupan | Kriteria selesai |
| --- | --- | --- |
| M0 Persiapan | Siapkan akun Supabase, hosting, GitHub; kumpulkan ≥ 30 sampel bukti; sepakati aturan denda dengan kelas | Akun siap, sampel terkumpul |
| M1 Prototipe | Antarmuka dengan data contoh | Bendahara menyetujui tampilan |
| M2 Inti | Login, minggu, tagihan, denda, tabel, transaksi, pengeluaran, impor data historis | Data 3 bulan terimpor dan sesuai |
| M3 Pembayaran | Unggah bukti, OCR, impor CSV, pencocokan, antrean bendahara | Uji 30 bukti memenuhi target 8.6 |
| M4 Notifikasi | Web Push, wa.me, log pengingat | Tidak ada pengingat ganda |
| M5 Pilot | Dipakai paralel dengan pencatatan lama selama 2 minggu | Selisih rekonsiliasi Rp0 |
| M6 Go-live | Pencatatan lama dihentikan | Semua kelas memakai aplikasi |

Estimasi durasi diisi setelah prototipe disetujui.

## 15. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Bukti dipalsukan atau dipakai ulang | Pembayaran tidak sah | Anti-duplikat, pencocokan CSV, status mencurigakan, rekonsiliasi |
| OCR salah baca | Salah status | Ambang keyakinan, antrean 🟡, uji sebelum go-live |
| Bukti tanpa tanggal atau ID | Tidak bisa lolos otomatis | Panduan unggah per aplikasi, antrean bendahara |
| Transaksi nominal sama berdempetan | Bukti tertukar | Pencocokan satu-ke-satu; opsi kode unik (FR-23) |
| Pembayar tak teridentifikasi di CSV | Siswa tidak tercatat | Daftar uang tanpa pemilik |
| Free tier berubah atau di-pause | Aplikasi tidak tersedia | Job ping, backup berkala, pantau batas |
| Layanan AI gratis berubah atau dibatasi | OCR gagal | Cadangan Tesseract.js, antrean manual |
| Akun bendahara tunggal bocor | Data dimanipulasi | Password kuat, penguncian setelah gagal login, log semua aksi (tidak dapat membedakan siapa yang memakai akun) |
| Privasi data siswa | Keluhan atau penyalahgunaan | Akses wajib login, minimisasi data, notifikasi pemrosesan AI |
| Ketergantungan pada satu orang | Aplikasi mati saat bendahara berganti | Dokumentasi serah-terima, akun dan kredensial milik kelas |

## 16. Keputusan Default dan Hal yang Masih Terbuka

Semua poin berikut sudah memiliki nilai default sehingga pengembangan dapat berjalan. Bila ada yang ingin diubah, cukup ubah di konfigurasi atau revisi PRD.

| Topik | Default |
| --- | --- |
| Batas atas denda | Tidak ada batas (sesuai ketentuan bendahara); bila diisi, denda berhenti naik di angka itu. Tanpa batas, denda mencapai 100% pada keterlambatan minggu ke-9 |
| Denda masuk kas | Ya, kategori Denda |
| Bayar di muka | Maksimal 4 minggu ke depan |
| Kode unik nominal | Nonaktif (opsional, FR-23) |
| Tanggal mulai kas dan tagihan historis | Diisi saat impor data; **tidak ada denda retroaktif** untuk minggu sebelum go-live |
| Toleransi waktu pencocokan | 30 detik |
| Retensi gambar bukti | Dihapus setelah verifikasi, maksimal 7 hari |
| Jam pengingat | Sesuai bagian 9 (dapat diubah) |
| Nama aplikasi | KasKelas (nama kerja) |
| Akun bendahara | Hanya 1 akun bendahara, tanpa penanda “atas nama” |
| Kenaikan denda | +10 poin persentase per minggu keterlambatan (20%, 30%, 40%, dan seterusnya), bukan 10% dari nilai sebelumnya |
| Saklar kebijakan denda | Default ON; saat dihidupkan kembali tidak berlaku surut |

## 17. Lampiran: Contoh Data Pencocokan (data nyata, dipersingkat)

| Bukti siswa | Baris CSV GoPay | Selisih | Hasil |
| --- | --- | --- | --- |
| 19 Okt 13:12:00, Rp15.000 | 19 Okt 13:12:01, Rp15.000 | 1 dtk | ✅ |
| 17 Okt 06:08:47, Rp10.000 | 17 Okt 06:08:47, Rp10.000 | 0 dtk | ✅ |
| 12 Okt 13:25:47, Rp10.000 | 12 Okt 13:25:47, Rp10.000 | 0 dtk | ✅ |
| 12 Okt 08:08:23, Rp10.000 | 12 Okt 08:08:31, Rp10.000 | 8 dtk | ✅ |
| Rp5.000, tanpa tanggal | Kandidat: 13 Okt 18:56:04, Rp5.000 | tidak diketahui | 🟡 |
