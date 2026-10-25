# KasKelas Design System

Versi 1.0. Dokumen ini adalah sumber kebenaran visual dan interaksi untuk aplikasi KasKelas (lihat PRD Final). Kalau ada konflik antara dokumen ini dan kebiasaan bawaan alat atau pustaka, dokumen ini menang.

Konsep satu kalimat: **buku kas kelas yang dicap**. Kertas kotak-kotak buku tulis, tagihan berbentuk karcis yang disobek, stempel LUNAS yang dibanting ke kertas, dan denah bangku kelas sebagai gambaran siapa yang sudah bayar.

---

## 1. Hubungan dengan Duolingo

Duolingo adalah referensi utama untuk **rasa**, bukan untuk tampilan. Yang dipinjam dan yang ditinggalkan:

| Dipinjam | Cara kita menerapkannya |
|---|---|
| Tombol tebal dengan bibir bawah solid yang ikut turun saat ditekan | Tetap, dengan warna dan proporsi sendiri (bagian 7.1) |
| Warna jenuh dan datar, tanpa gradasi, tanpa bayangan kabur | Tetap. Semua kedalaman memakai offset keras |
| Kemajuan sebagai permainan kecil | Satu minggu = satu langkah. Rangkaian tepat waktu menjadi tumpukan stempel |
| Umpan balik instan dan fisik pada setiap aksi | Stempel, sobekan, getar, bunyi opsional |
| Tugas utama selesai dalam hitungan ketukan | Bayar maksimal 3 ketukan dari layar mana pun |
| Bahasa ramah, pendek, kadang jenaka | Bahasa Indonesia sehari-hari, tidak menghakimi |

| Ditinggalkan | Alasan |
|---|---|
| Maskot dan ilustrasi karakter | Ilustrasi buatan mesin hampir selalu terlihat generik. Kepribadian dibawa oleh benda (stempel, karcis, bangku) dan suara tulisan |
| Font DIN/Feather dan hijau limau khas | Supaya tidak terlihat seperti tiruan |
| Tombol huruf kapital semua | Lebih sulit dibaca, dan termasuk ciri halaman buatan mesin |
| Notifikasi yang membuat bersalah, XP, permata | Kas kelas menyangkut uang teman. Tidak boleh ada tekanan sosial atau rasa malu |

---

## 2. Prinsip

1. **Boldness di satu tempat.** Momen yang diingat adalah stempel. Sisanya tenang dan disiplin. Maksimal satu momen animasi besar per layar.
2. **Fungsi dulu.** Setiap elemen visual harus menjawab: apa statusku, apa yang harus kulakukan, apa yang terjadi setelah ini.
3. **Benda nyata, bukan dekorasi.** Karcis, stempel, bangku, dan kertas kotak adalah informasi, bukan hiasan.
4. **Tidak ada rasa malu.** Telat ditampilkan sebagai fakta dan jalan keluar, bukan hukuman.
5. **Semua gestur punya tombol.** Sobek, seret, dan geser selalu punya alternatif ketuk dan alternatif keyboard.
6. **Warna tidak pernah menjadi satu-satunya petunjuk.** Status selalu punya bentuk, kata, dan warna.
7. **Ringan di HP murah.** Animasi hanya transform dan opacity. Tidak ada filter SVG langsung pada elemen yang bergerak.
8. **Satu hal, satu nama.** Kata di tombol sama dengan kata di toast dan di riwayat.

---

## 3. Warna

Nama token memakai bahasa Indonesia. Warna teks tidak memakai hitam murni atau hitam keabu-abuan, melainkan **Tinta** (biru tinta pekat), supaya seluruh antarmuka terasa seperti ditulis dengan satu pulpen.

### 3.1 Tema Siang (default)

| Token | Hex | Fungsi |
|---|---|---|
| `--kertas` | `#F3F6FB` | Latar halaman (kertas kotak) |
| `--kertas-tebal` | `#FFFFFF` | Permukaan terangkat: karcis, sheet, input |
| `--garis` | `#D8E1EE` | Garis kotak dan pemisah dekoratif saja |
| `--tinta` | `#18225C` | Teks utama, garis tegas |
| `--abu-tinta` | `#55608F` | Teks sekunder, batas input |
| `--hijau` | `#15874D` | Aksi utama, lunas |
| `--hijau-bibir` | `#0E5E34` | Bibir tombol hijau, teks hijau |
| `--merah` | `#D12F33` | Telat, ditolak, bahaya |
| `--merah-bibir` | `#8F1D20` | Bibir tombol merah |
| `--kuning` | `#FFC93C` | Perlu dicek, sorotan, tanpa pemilik |
| `--kuning-bibir` | `#B88A00` | Bibir tombol kuning |
| `--biru` | `#2F5FE0` | Info, fokus, terpilih, dibebaskan |
| `--biru-bibir` | `#1E3EA0` | Bibir tombol biru |
| `--hijau-tint` | `#DDF3E6` | Latar chip lunas |
| `--merah-tint` | `#FCE3E3` | Latar chip telat |
| `--kuning-tint` | `#FFF1C7` | Latar chip menunggu |
| `--biru-tint` | `#DFE7FD` | Latar chip info |

Rasio kontras yang sudah dihitung (WCAG):

| Pasangan | Rasio | Catatan |
|---|---|---|
| Tinta di atas Kertas | 13,63 | Lulus AAA |
| Abu-tinta di atas Kertas | 5,61 | Lulus AA |
| Putih di atas Hijau | 4,56 | Lulus AA |
| Putih di atas Merah | 5,04 | Lulus AA |
| Putih di atas Biru | 5,48 | Lulus AA |
| Tinta di atas Kuning | 9,61 | Teks di atas kuning selalu Tinta |
| Merah sebagai teks di atas Kertas | 4,65 | Lulus AA |
| Biru sebagai teks di atas Kertas | 5,06 | Lulus AA |
| Hijau-bibir sebagai teks di atas Kertas | 7,26 | Pakai ini untuk teks hijau |

Aturan penting:
- `--hijau` (`#15874D`) sebagai teks di atas Kertas hanya 4,21. **Jangan** dipakai sebagai teks kecil. Pakai `--hijau-bibir`.
- `--garis` (`#D8E1EE`) hanya 1,22 terhadap Kertas. Ia dekoratif. Batas komponen interaktif (input, kotak centang) memakai `--abu-tinta` agar mencapai kontras 3:1.
- Teks di atas warna tint memakai Tinta atau warna-bibir. Ukur ulang dengan alat kontras sebelum rilis, karena tint belum diukur di dokumen ini.

### 3.2 Tema Malam

Konsepnya buku kas di bawah lampu belajar. Kertas menjadi biru malam, tinta menjadi terang.

| Token | Hex | Rasio di atas `--kertas` malam |
|---|---|---|
| `--kertas` | `#0F1538` | latar |
| `--kertas-tebal` | `#19204F` | permukaan terangkat |
| `--garis` | `#2A3470` | dekoratif (1,54) |
| `--tinta` | `#EAF0FF` | 15,54 |
| `--abu-tinta` | `#A9B4E3` | 8,72 |
| `--hijau` | `#4ADE80` | 10,17 |
| `--merah` | `#FF7A7D` | 7,03 |
| `--kuning` | `#FFD65C` | 12,68 |
| `--biru` | `#7C9CFF` | 6,80 |

Di tema Malam, teks tombol memakai `#0F1538`. Bibir tombol: hijau `#2A9E5C`, merah `#C94548`, kuning `#C9A02E`, biru `#4C6BD1`. Pengguna bisa memilih Siang, Malam, atau Ikuti perangkat. Default: ikuti perangkat.

### 3.3 Kertas kotak

Latar halaman adalah kertas kotak buku tulis: garis tipis `--garis` setiap 24px, tanpa gradasi dan tanpa tekstur foto. Pada layar lebar (768px ke atas) ada satu **garis margin** vertikal berwarna `--merah` dengan opasitas 14 persen, tempat navigasi dan isi dipisahkan. Garis margin ini berfungsi sebagai pemisah struktural, bukan hiasan. Di area padat teks dan tabel, kotak dimatikan dan dipakai permukaan polos `--kertas-tebal`.

---

## 4. Tipografi

Dua keluarga huruf, keduanya dipasang dari paket sendiri (`@fontsource`), bukan dari CDN, agar cepat, bisa offline, dan tidak mengirim data ke pihak ketiga.

| Peran | Keluarga | Bobot | Alasan |
|---|---|---|---|
| Display, angka uang, teks tombol, cap stempel | **Gabarito** | 700, 800, 900 | Geometris, tebal, ramah. Cocok dengan tombol tebal dan angka besar |
| Isi, label, formulir, tabel | **Atkinson Hyperlegible Next** | 400, 600, 700 | Dirancang untuk keterbacaan maksimum, termasuk di layar kecil dan kondisi sulit |

Catatan implementasi:
- Jika paket Atkinson Hyperlegible Next tidak tersedia, pakai **Atkinson Hyperlegible** (versi pertama).
- Cadangan: display `"Trebuchet MS", system-ui, sans-serif`; isi `"Segoe UI", system-ui, sans-serif`.
- Pasang hanya subset Latin, format woff2, dan maksimal 5 berkas.
- Aktifkan `font-variant-numeric: tabular-nums` untuk semua angka uang dan kolom tabel. **Periksa dulu apakah Gabarito mendukungnya.** Jika tidak, set angka tabel dengan Atkinson dan ratakan kanan.
- Tidak boleh memakai Inter, Roboto, Poppins, Nunito, Montserrat, DM Sans, Space Grotesk, Fredoka, atau font bawaan sistem sebagai pilihan utama.

### Skala (fluid, basis 17px untuk isi)

| Token | Ukuran | Bobot | Tinggi baris | Pemakaian |
|---|---|---|---|---|
| `--t-besar` | `clamp(2.25rem, 1.5rem + 3.2vw, 3.75rem)` | 900 | 1.02 | Total yang harus dibayar, angka saldo |
| `--t-judul` | `clamp(1.625rem, 1.3rem + 1.4vw, 2.25rem)` | 800 | 1.1 | Judul layar |
| `--t-sub` | `1.25rem` | 800 | 1.2 | Judul bagian |
| `--t-isi` | `1.0625rem` (17px) | 400 | 1.5 | Isi |
| `--t-isi-tebal` | `1.0625rem` | 700 | 1.5 | Label penting |
| `--t-kecil` | `0.9375rem` (15px) | 400 | 1.45 | Keterangan. Tidak boleh lebih kecil dari 15px |
| `--t-cap` | `1rem` | 900 | 1 | Teks di dalam stempel, `letter-spacing: 0.04em` |

Aturan:
- Panjang baris isi maksimal 68 karakter.
- Judul tidak memakai trik satu kata diberi warna atau miring.
- Huruf kapital semua **hanya** untuk teks di dalam stempel, karena memang begitulah stempel. Tidak untuk label, tombol, atau judul.
- Tidak ada label kecil huruf kapital di atas judul.
- Tidak ada penomoran 01, 02, 03 kecuali isinya memang urutan langkah (alur bayar).

---

## 5. Bentuk, Jarak, dan Kedalaman

### 5.1 Jarak
Basis 4px: `4, 8, 12, 16, 24, 32, 48, 72`. Padding halaman: 16px (HP), 24px (tablet), 32px (desktop).

### 5.2 Radius menurut peran
Tidak ada satu radius untuk semuanya. Bentuk mengikuti benda.

| Benda | Radius |
|---|---|
| Tombol | 14px |
| Input | 12px |
| Karcis | 8px, dengan lekukan setengah lingkaran berjari-jari 10px di tepi sobekan |
| Meja di denah | 6px |
| Sel papan | 8px |
| Sheet bawah (HP) | 24px hanya di sudut atas |
| Dialog | 20px |
| Chip status | bentuk stempel (bagian 6.2), bukan kapsul |

### 5.3 Kedalaman
- **Bibir keras** untuk benda yang bisa ditekan: `box-shadow: 0 4px 0 var(--*-bibir)`. Tidak ada blur.
- **Lembar kertas** untuk benda yang diam: border 2px `--garis` dan `box-shadow: 0 3px 0 rgb(24 34 92 / 0.10)`.
- Dilarang: bayangan abu-abu lembut, efek kaca, latar gradasi, bentuk gumpalan (blob).

### 5.4 Garis
Border standar 2px. Fokus 3px.

---

## 6. Benda Khas

### 6.1 Karcis (tagihan mingguan)

Setiap tagihan adalah karcis dengan sobekan perforasi, bukan kartu persegi.

```
 .--------------------------.:.-----------.
 |  19 sampai 25 Okt        |:|  Rp5.000  |
 |  Jatuh tempo Minggu 23.59|:|  [stempel]|
 |  Telat 1 minggu          |:|           |
 '--------------------------':'-----------'
        badan karcis        perforasi  kupon
```

- Badan: rentang minggu, jatuh tempo, dan keterangan telat atau denda dalam kalimat biasa.
- Kupon (kanan atau bawah di HP sempit): nominal dan stempel status.
- Telat: tepi badan diberi garis miring tipis `--merah` (seperti pita peringatan, tidak lebih tebal dari 6px) ditambah kata "Telat 1 minggu". Bukan hanya merah.
- Terpilih untuk dibayar: karcis naik 6px, ada cincin `--biru` 3px, dan muncul tanda centang digambar sendiri (bukan karakter Unicode).
- Beberapa karcis terpilih menumpuk di bar bayar dengan offset 3px dan rotasi kecil yang tetap (deterministik per minggu, bukan acak tiap render).

**Sobek karcis.** Menyeret kupon sepanjang perforasi menyobeknya dan memulai pembayaran. Ini hiasan interaksi, **bukan satu-satunya jalan**: tombol "Bayar" selalu ada dan memicu animasi sobek yang sama secara otomatis. Dengan keyboard, tombol itu cukup.

### 6.2 Stempel (status)

Setiap status punya bentuk, kata, dan warna sendiri. Tidak ada emoji dan tidak ada karakter simbol Unicode.

| Status | Bentuk | Teks | Warna | Isyarat tambahan |
|---|---|---|---|---|
| Terkonfirmasi | Lingkaran, cincin ganda | LUNAS | Hijau | Tepi tinta tidak rata |
| Lunas sementara | Lingkaran, cincin putus-putus | LUNAS | Hijau, opasitas penuh | Ikon jam pasir kecil di bawah teks |
| Perlu dicek | Persegi dengan dua sudut terpotong | DICEK | Kuning, teks Tinta | Ikon kaca pembesar |
| Ditolak | Persegi panjang | DITOLAK | Merah | Dicoret diagonal satu garis |
| Mencurigakan | Segi enam | TINJAU | Merah | Ikon bendera |
| Tanpa pemilik | Lingkaran kosong | tanda tanya digambar | Kuning | Garis putus-putus |
| Dibebaskan | Oval | BEBAS | Biru | |
| Libur | Persegi abu, tanpa tinta | LIBUR | Abu-tinta | Karcis berperforasi putus |
| Belum bayar | Tidak ada stempel | kotak kosong bergaris putus | Tinta 40% | |

Semua stempel adalah **SVG statis** yang sudah jadi, dengan tepi tinta tidak rata yang digambar di dalam berkas SVG-nya. Jangan menerapkan filter SVG langsung pada elemen yang beranimasi.

### 6.3 Denah kelas (hero beranda)

Gambaran bangku kelas dari atas: 29 meja dalam grid, meja guru sebagai batang di atas. Setiap meja menampilkan **nomor absen** dan stempel kecil bila lunas minggu ini. Nama lengkap tidak tampil di denah, hanya di sheet setelah meja diketuk dan di Papan.

- Jumlah kolom: 5 (di bawah 360px), 6 (360px sampai 767px), 8 (768px ke atas, meja lebih besar).
- Ukuran ketuk minimum 44 x 44px.
- Meja milik pengguna diberi garis 3px `--biru` dan selalu terlihat tanpa harus dicari.
- Meja belum bayar berupa garis putus-putus, tanpa warna merah penuh, agar tidak terkesan mempermalukan.
- Bukan sekadar hiasan: baris ringkasan di atas denah ditulis dalam kalimat, misalnya "27 dari 29 sudah bayar minggu ini."
- Mode bendahara: baris CSV "uang tanpa pemilik" dapat diseret ke meja. Alternatif tanpa seret: pilih baris, lalu pilih siswa dari daftar.
- Tombol penukar tampilan Denah dan Papan harus selalu terlihat.

### 6.4 Papan (tabel pembayaran)

Matriks siswa kali minggu, seperti buku absen.

- Kolom pertama (No dan NRP dan nama singkat) lengket di kiri. Baris judul bulan lengket di atas.
- Sel 44px, berisi stempel mini dan ikon metode (QRIS atau tunai) yang digambar sendiri.
- Baris milik pengguna disematkan di paling atas dan diberi latar `--biru-tint`.
- HP: satu bulan per layar, penukar bulan lewat tombol dan geser. Desktop: dua bulan berdampingan.
- Kolom bulan menyesuaikan 4 atau 5 minggu sesuai PRD.
- Total tunggakan per siswa di kolom terakhir.
- Tabel harus bisa dinavigasi dengan keyboard dan dibaca pembaca layar (`role="grid"` atau `table` semantik, dengan teks tersembunyi untuk status).

### 6.5 Tumpukan stempel (rangkaian tepat waktu)

Rangkaian minggu tepat waktu ditampilkan sebagai tumpukan stempel yang makin tinggi, dengan kalimat "Tepat waktu 6 minggu berturut-turut". Tumpukan ini **hanya terlihat oleh pemiliknya**, tidak di denah atau papan. Bila rangkaian putus, tumpukan tidak dihancurkan dengan animasi dramatis. Tulisannya: "Rangkaian putus di minggu 12. Mulai lagi dari minggu ini."

---

## 7. Komponen

### 7.1 Tombol

Tinggi 52px (minimal 48px), radius 14px, bibir 4px, teks Gabarito 800, 17px, huruf kecil biasa.

| Varian | Muka | Bibir | Teks |
|---|---|---|---|
| Utama | `--hijau` | `--hijau-bibir` | Putih |
| Sekunder | `--kertas-tebal` dengan border 2px `--garis` | `--garis` | Tinta |
| Info | `--biru` | `--biru-bibir` | Putih |
| Hati-hati | `--merah` | `--merah-bibir` | Putih |
| Sorot | `--kuning` | `--kuning-bibir` | Tinta |

Keadaan:
- Tekan: muka turun 4px dan bibir menjadi 0 dalam 80ms. Lepas: kembali dengan sedikit pegas.
- Fokus keyboard: cincin 3px `--biru` dengan jarak 2px dari tepi, tidak boleh dihilangkan.
- Nonaktif: datar, tanpa bibir, abu. **Selalu disertai satu baris alasan di bawahnya**, misalnya "Pilih minimal satu minggu."
- Memuat: teks berubah menjadi kata kerja progresif ("Membaca bukti"), lebar tombol tetap, tombol tidak bisa ditekan dua kali.
- Jarak antar target ketuk minimal 8px.

Satu tombol utama per layar. Tombol utama di HP ditempel di bagian bawah, dalam jangkauan ibu jari, dengan memperhitungkan `env(safe-area-inset-bottom)`.

### 7.2 Input dan PIN

- Label selalu terlihat di atas kolom. Placeholder tidak dipakai sebagai label.
- Tinggi 56px, border 2px `--abu-tinta`, radius 12px.
- Galat muncul di bawah kolom dengan ikon dan kalimat yang menjelaskan cara memperbaiki. Jangan hanya mengubah warna border.
- NRP: `inputmode="numeric"`, 3 digit.
- PIN: satu `input` sungguhan (`type="password"`, `inputmode="numeric"`, `autocomplete="current-password"`) yang tampil sebagai 6 slot. Tombol "Lihat PIN" tersedia. Tempel (paste) diizinkan.
- Kunci sementara setelah 5 kali gagal ditampilkan dengan hitung mundur yang jelas.

### 7.3 Navigasi

- **HP (di bawah 768px):** bar bawah dengan 4 tab: Beranda, Bayar, Papan, Kas. Bendahara mendapat tab kelima "Meja bendahara". Tab aktif memakai ikon isi dan label tebal. Tab Bayar tidak dibesarkan secara berlebihan.
- **Tablet dan desktop (768px ke atas):** pembatas buku (index tab) di tepi kanan area isi, menempel di sisi garis margin, berisi label teks yang selalu terbaca. Bukan ikon saja.
- Posisi dan urutan tab sama di semua ukuran layar.

### 7.4 Sheet, dialog, dan toast

- HP: sheet naik dari bawah dengan pegangan dan tombol tutup. Desktop: panel samping 420px.
- Dialog hanya untuk keputusan yang tidak bisa dibatalkan (misalnya mematikan denda, membatalkan pembayaran). Berisi dua tombol dengan kata kerja spesifik, bukan "Ya" dan "Tidak".
- Toast muncul di atas bar bawah, 5 detik, bisa ditutup, dan menggunakan kata yang sama dengan tombol yang memicunya.

### 7.5 Saklar kebijakan denda

Tuas fisik dua posisi (bukan pil biru-abu bawaan) dengan label tertulis di kedua sisi: "Denda hidup" dan "Denda mati". Mengubahnya membuka dialog konfirmasi yang menyebut dampaknya: "Denda baru tidak dihitung. Denda yang sudah terkunci tidak berubah." Status saat ini juga tampil sebagai kalimat di samping tuas, bukan hanya posisi tuas. Saat mati, siswa melihat spanduk "Denda sedang dinonaktifkan" di beranda.

### 7.6 Unggah bukti bayar

Empat keadaan, semuanya punya teks:

1. **Siap:** zona unggah besar yang bisa diketuk (kamera atau galeri), seret-lepas di desktop. Di bawahnya ada panduan yang bisa dibuka per aplikasi pembayaran ("Di GoPay, buka Rincian lengkap dulu, baru screenshot").
2. **Membaca:** pratinjau gambar dengan garis pemindai satu kali lewat (statis bila gerak dikurangi) dan teks "Membaca bukti".
3. **Lolos:** stempel dibanting (bagian 8.2) dan ringkasan "Rp5.000 dibayar 21 Okt 13.12, minggu 19 sampai 25 Okt."
4. **Tidak lolos atau perlu dicek:** alasan spesifik dan langkah perbaikan. Contoh: "Nominal di bukti Rp5.000, sedangkan pilihanmu Rp10.000. Ganti pilihan minggu atau unggah bukti lain." Draft unggahan tidak hilang bila halaman ditutup.

QRIS statis ditampilkan di latar putih dengan zona tenang cukup, ukuran minimal 240px, dengan tombol "Simpan gambar QR" dan "Salin nominal". Nominal total ditampilkan sangat besar tepat di atas QR.

### 7.7 Keadaan kosong, memuat, dan galat

- **Kosong:** satu kalimat yang mengajak bertindak, misalnya "Belum ada pengeluaran minggu ini." Tidak ada ilustrasi generik.
- **Memuat:** kerangka berupa kertas arsir statis. Tidak memakai kilau (shimmer) gradasi.
- **Galat:** menyebut apa yang terjadi dan cara memperbaikinya. Galat tidak meminta maaf dan tidak samar.
- **Offline:** data terakhir tetap tampil dengan label "Data per 19 Okt 13.12". Aksi yang butuh jaringan dinonaktifkan dengan alasan tertulis.

---

## 8. Gerak dan Umpan Balik

### 8.1 Token

| Token | Nilai | Pemakaian |
|---|---|---|
| `--d-tekan` | 80ms | Tombol ditekan |
| `--d-cepat` | 160ms | Perubahan status kecil |
| `--d-sedang` | 280ms | Sheet, dialog |
| `--d-cap` | 520ms | Stempel |
| `--e-tekan` | `cubic-bezier(0.2, 0, 0, 1)` | Umum |
| `--e-pegas` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Stempel dan tombol lepas |

Hanya `transform` dan `opacity` yang dianimasikan.

### 8.2 Stempel dibanting

Urutan: stempel muncul di atas karcis (skala 1,6, rotasi minus 12 derajat, opasitas 0), jatuh ke posisi akhir dalam 90ms, memantul sedikit (skala 1,04 lalu 1), karcis bergetar 2px ke kiri dan kanan selama 120ms, tinta "meresap" lewat perubahan opasitas lapisan bayangan stempel. Total 520ms.

```css
@keyframes cap {
  0%   { transform: scale(1.6) rotate(-12deg); opacity: 0; }
  18%  { transform: scale(1) rotate(-6deg); opacity: 1; }
  30%  { transform: scale(1.04) rotate(-6deg); }
  45%  { transform: scale(1) rotate(-6deg); }
  100% { transform: scale(1) rotate(-6deg); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .cap { animation: none; }
  .cap--baru { animation: muncul 150ms linear; } /* hanya opacity */
}
```

### 8.3 Sobekan
Kupon ditarik mengikuti jari sepanjang perforasi. Bila melewati 60 persen lebar, kupon terlepas dan jatuh ke bar bayar. Kurang dari itu, ia kembali. Bila gerak dikurangi, tidak ada animasi, hanya perubahan status.

### 8.4 Aturan gerak
- Tidak ada animasi masuk otomatis (fade dan slide naik) pada setiap bagian. Gerak hanya menjawab aksi pengguna, kecuali satu momen: stempel pertama kali muncul setelah pembayaran terkonfirmasi.
- Tidak ada efek melayang saat hover pada setiap kartu.
- `prefers-reduced-motion: reduce` menggantikan semua gerak besar dengan pergantian status langsung atau fade 150ms. Tidak ada pengecualian.

### 8.5 Getar dan bunyi
- Getar: `navigator.vibrate(18)` saat stempel mendarat, hanya bila didukung. Tidak diandalkan (iOS Safari tidak mendukung).
- Bunyi: **mati secara default**, dengan tombol "Bunyi" di pengaturan. Tiga bunyi saja (tekan, sobek, cap), dibuat dengan Web Audio API (semburan derau yang disaring), tanpa berkas audio luar, sehingga tidak ada masalah lisensi dan tidak menambah ukuran.

---

## 9. Responsif

Mobile-first. Lebar minimum yang didukung: 320px. Gunakan `@container` untuk komponen (denah, papan, karcis) sehingga komponen menyesuaikan ruang yang tersedia, bukan hanya lebar jendela.

| Rentang | Tata letak | Navigasi | Denah | Papan |
|---|---|---|---|---|
| 320 sampai 479 | Satu kolom | Bar bawah | 5 atau 6 kolom | 1 bulan, kolom nama lengket |
| 480 sampai 767 | Satu kolom, lega | Bar bawah | 6 kolom | 1 bulan |
| 768 sampai 1023 | Dua panel: daftar dan rincian | Pembatas buku di kanan | 8 kolom | 1 sampai 2 bulan |
| 1024 sampai 1279 | Isi dan denah berdampingan | Pembatas buku | 8 kolom, lengket di kanan | 2 bulan |
| 1280 ke atas | Isi maks. 1120px, margin kertas kotak di sisi | Pembatas buku | 10 kolom | 2 bulan, rincian di panel samping |

Aturan:
- Hindari tata letak yang menyisakan ruang kosong luas di desktop. Gunakan ruang itu untuk panel rincian, bukan memperbesar huruf.
- Orientasi lanskap di HP: bar bawah dipindah ke tepi kiri, tinggi konten dihitung dengan `dvh`.
- Hormati `env(safe-area-inset-*)` di semua sisi (takik dan bilah gestur).
- Zoom 200 persen dan teks diperbesar sistem tidak boleh memotong atau menumpuk konten. Pakai `rem`, bukan `px`, untuk teks.
- Layar sentuh dan tetikus: target ketuk 48px, tetapi tampilan desktop boleh lebih padat hingga 40px bila ada kontrol keyboard dan fokus jelas.
- Perangkat lipat: tata letak ikut `@container`, bukan model perangkat.

Wireframe beranda siswa, HP:

```
+------------------------------+
| Halo, Rani. Saldo kelas Rp... |
+------------------------------+
| Karcis minggu ini (besar)    |
|  [ Bayar Rp5.000 ]           |
+------------------------------+
| Tertunggak: 2 karcis tertumpuk|
+------------------------------+
| 27 dari 29 sudah bayar       |
| [Denah 6 kolom]              |
+------------------------------+
| Tumpukan stempel saya        |
+------------------------------+
| Beranda  Bayar  Papan   Kas  |
+------------------------------+
```

Desktop:

```
+---------------------------+---------------------+|T
| Karcis minggu ini         | 27 dari 29 bayar    ||a
| Karcis tertunggak         | [Denah 8 kolom]     ||b
| Tumpukan stempel saya     | (lengket)           ||
+---------------------------+---------------------+|
```

---

## 10. Kegunaan dan Aksesibilitas

- Tugas utama (bayar minggu ini) selesai dalam **3 ketukan** dari beranda: Bayar, unggah bukti, selesai.
- Aksi utama berada di zona jangkauan ibu jari pada HP.
- Tidak ada informasi yang hanya tersampaikan lewat warna. Setiap status punya bentuk, kata, dan warna.
- Seluruh aksi bisa dilakukan dengan keyboard. Urutan fokus mengikuti urutan visual. Cincin fokus selalu terlihat.
- Gestur (sobek, seret, geser) selalu punya padanan ketuk atau tombol.
- Label formulir, `aria-live` untuk hasil OCR dan toast, dan teks tersembunyi untuk status stempel.
- Target ketuk minimal 48px, jarak 8px.
- Perubahan konfirmasi pembayaran diumumkan kepada pembaca layar, bukan hanya ditampilkan.
- Jangan pernah menghapus masukan pengguna saat galat.
- Dukungan zona waktu WIB dan format Indonesia di seluruh tampilan.
- Anggaran kinerja: LCP di bawah 2,5 detik pada 4G HP kelas menengah; JavaScript awal sekecil mungkin; tidak ada gambar kecuali QRIS dan bukti unggahan; font Latin subset.

---

## 11. Suara Tulisan

Bahasa Indonesia sehari-hari, kalimat pendek, kata kerja biasa, huruf besar hanya di awal kalimat. Hangat, kadang jenaka, tidak menghakimi, tidak memerintah dengan nada marah.

Format: uang `Rp5.000` (tanpa spasi, titik ribuan), tanggal `19 Okt 2026`, jam `13.12 WIB`, rentang minggu `19 sampai 25 Okt` atau `19–25 Okt`.

Kosakata baku (satu nama, satu benda):

| Dipakai | Hindari |
|---|---|
| Bayar | Checkout, proses pembayaran |
| Unggah bukti | Upload receipt |
| Lunas | Selesai, sukses |
| Telat | Overdue |
| Denda | Penalti |
| Menunggu cek | Pending |
| Saldo kas | Balance |
| Dibebaskan | Waived |

Contoh:

| Situasi | Teks |
|---|---|
| Tagihan baru | Minggu ini Rp5.000. Jatuh tempo Minggu malam. |
| Lunas | Tercatat. Minggu 19 sampai 25 Okt lunas. |
| Telat | Telat 1 minggu. Denda Rp1.000 ikut dibayar. |
| Denda mati | Denda sedang dinonaktifkan. Kamu hanya membayar tagihan pokok. |
| Bukti belum jelas | Tanggal di bukti tidak terbaca. Bendahara akan mengeceknya. |
| Bukti kembar | Bukti ini sudah pernah dipakai. Unggah bukti pembayaran yang baru. |
| Kosong | Belum ada pengeluaran minggu ini. |

Pedoman:
- Tombol memakai kata kerja spesifik: "Bayar Rp5.000", "Unggah bukti", "Simpan perubahan".
- Tidak ada tanda panah di ujung teks tombol atau tautan.
- Tidak ada label berformat "KATA, spasi, tanda hubung panjang, potongan kalimat" dan tidak ada rangkaian keterangan yang dipisah titik tengah ("A · B · C"). Tulis kalimat.
- Tidak ada ucapan sambutan berlebihan dan tidak ada "Oops".
- Tidak mempermalukan: tunggakan siswa tidak disebut di notifikasi publik, hanya kepada yang bersangkutan.

---

## 12. Ikon

**Tidak ada emoji** sebagai ikon atau ekspresi, di mana pun, termasuk di toast, notifikasi, dan catatan kosong. Tidak ada karakter simbol Unicode (centang, silang, bintang) sebagai pengganti ikon.

Spesifikasi set ikon kustom (SVG inline):
- Grid 24px, garis 2,5px, sambungan membulat, ujung garis dipotong miring 45 derajat seperti ujung pena.
- Dua versi: garis (default) dan isi (tab aktif).
- Satu set saja. Boleh memulai dari Phosphor Bold lalu menyesuaikan, jangan mencampur beberapa set.
- Ikon pendamping selalu disertai teks, kecuali tombol tutup dan penutup yang punya `aria-label`.

Ikon yang dibutuhkan: beranda, bayar, papan, kas, bendahara, kamera, galeri, unggah, salin, simpan, tutup, tambah, kurang, centang, peringatan, bendera, kaca pembesar, jam pasir, jam, lonceng, WhatsApp-tautan (teks "WhatsApp" dengan ikon pesan generik, bukan logo merek), QRIS (kotak-kotak), tunai, pengaturan, kunci, mata (lihat PIN), unduh, kalender.

---

## 13. Daftar Larangan (Anti-Generik)

Periksa daftar ini sebelum menyerahkan pekerjaan. Satu saja terlanggar berarti diperbaiki.

- Tidak ada emoji atau karakter simbol sebagai emotikon atau ikon.
- Tidak ada Inter, Roboto, Poppins, Nunito, Montserrat, DM Sans, Space Grotesk, Fredoka, atau font bawaan sistem sebagai font utama.
- Tidak ada latar krem dengan aksen terakota, dan tidak ada latar hitam dengan satu aksen hijau neon.
- Tidak ada gradasi sebagai hiasan, tidak ada efek kaca, tidak ada bentuk gumpalan.
- Tidak ada deretan kartu identik dengan radius dan bayangan abu-abu yang sama.
- Tidak ada label kecil huruf kapital di atas judul, tidak ada penomoran 01, 02, 03 untuk isi yang bukan urutan.
- Tidak ada rangkaian keterangan dengan titik tengah, dan tidak ada tanda panah di ujung tombol.
- Tidak ada animasi masuk fade-and-slide-up pada setiap bagian, tidak ada efek melayang pada setiap kartu.
- Tidak ada ilustrasi stok, maskot buatan mesin, dan tidak ada angka statistik palsu atau testimoni palsu.
- Tidak ada teks isi "lorem ipsum". Seluruh data contoh memakai skenario kas kelas yang nyata (nama siswa fiktif).
- Tidak ada kilau (shimmer) gradasi sebagai kerangka memuat.
- Tidak ada pewarnaan satu kata pada judul sebagai aksen.
- Tidak ada elemen yang hanya bisa dipakai dengan gestur.
- Tidak ada tombol nonaktif tanpa alasan tertulis.

---

## 14. Token CSS

```css
:root {
  --kertas: #F3F6FB;
  --kertas-tebal: #FFFFFF;
  --garis: #D8E1EE;
  --tinta: #18225C;
  --abu-tinta: #55608F;

  --hijau: #15874D;  --hijau-bibir: #0E5E34;  --hijau-tint: #DDF3E6;
  --merah: #D12F33;  --merah-bibir: #8F1D20;  --merah-tint: #FCE3E3;
  --kuning: #FFC93C; --kuning-bibir: #B88A00; --kuning-tint: #FFF1C7;
  --biru: #2F5FE0;   --biru-bibir: #1E3EA0;   --biru-tint: #DFE7FD;

  --font-display: "Gabarito", "Trebuchet MS", system-ui, sans-serif;
  --font-isi: "Atkinson Hyperlegible Next", "Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif;

  --t-besar: clamp(2.25rem, 1.5rem + 3.2vw, 3.75rem);
  --t-judul: clamp(1.625rem, 1.3rem + 1.4vw, 2.25rem);
  --t-sub: 1.25rem;
  --t-isi: 1.0625rem;
  --t-kecil: 0.9375rem;

  --r-tombol: 14px; --r-input: 12px; --r-karcis: 8px; --r-meja: 6px; --r-dialog: 20px;

  --d-tekan: 80ms; --d-cepat: 160ms; --d-sedang: 280ms; --d-cap: 520ms;
  --e-tekan: cubic-bezier(0.2, 0, 0, 1);
  --e-pegas: cubic-bezier(0.34, 1.56, 0.64, 1);

  --kotak: 24px;
}

/* Tema Malam: otomatis mengikuti perangkat, kecuali pengguna memilih Siang */
@media (prefers-color-scheme: dark) {
  :root:not([data-tema="siang"]) {
    --kertas: #0F1538; --kertas-tebal: #19204F; --garis: #2A3470;
    --tinta: #EAF0FF; --abu-tinta: #A9B4E3;
    --hijau: #4ADE80; --hijau-bibir: #2A9E5C;
    --merah: #FF7A7D; --merah-bibir: #C94548;
    --kuning: #FFD65C; --kuning-bibir: #C9A02E;
    --biru: #7C9CFF; --biru-bibir: #4C6BD1;
  }
}
:root[data-tema="malam"] {
  --kertas: #0F1538; --kertas-tebal: #19204F; --garis: #2A3470;
  --tinta: #EAF0FF; --abu-tinta: #A9B4E3;
  --hijau: #4ADE80; --hijau-bibir: #2A9E5C;
  --merah: #FF7A7D; --merah-bibir: #C94548;
  --kuning: #FFD65C; --kuning-bibir: #C9A02E;
  --biru: #7C9CFF; --biru-bibir: #4C6BD1;
}

body {
  background-color: var(--kertas);
  background-image:
    linear-gradient(var(--garis) 1px, transparent 1px),
    linear-gradient(90deg, var(--garis) 1px, transparent 1px);
  background-size: var(--kotak) var(--kotak);
  color: var(--tinta);
  font-family: var(--font-isi);
  font-size: var(--t-isi);
  line-height: 1.5;
}

.tombol {
  min-height: 52px; padding: 0 24px;
  border: 0; border-radius: var(--r-tombol);
  font: 800 1.0625rem var(--font-display);
  background: var(--hijau); color: #fff;
  box-shadow: 0 4px 0 var(--hijau-bibir);
  transition: transform var(--d-tekan) var(--e-tekan), box-shadow var(--d-tekan) var(--e-tekan);
}
.tombol:active { transform: translateY(4px); box-shadow: 0 0 0 var(--hijau-bibir); }
.tombol:focus-visible { outline: 3px solid var(--biru); outline-offset: 2px; }
.tombol[aria-disabled="true"] { background: var(--garis); color: var(--abu-tinta); box-shadow: none; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

Catatan: pada `body` dengan latar kotak, teks isi yang padat sebaiknya diletakkan di atas permukaan `--kertas-tebal` agar garis kotak tidak mengganggu keterbacaan. Pada tema Malam, putih di atas tombol hijau diganti `#0F1538` sesuai bagian 3.2.

---

## 15. Inventaris Layar

| Layar | Isi utama | Catatan responsif |
|---|---|---|
| Masuk | NRP dan PIN, tombol Masuk | Satu kolom di semua ukuran, maksimal 420px |
| Ganti PIN awal | PIN baru dua kali | Tidak bisa dilewati |
| Beranda siswa | Karcis minggu ini, tertunggak, denah, tumpukan stempel | Lihat wireframe bagian 9 |
| Bayar | Pilih minggu, total, QRIS, unggah bukti, hasil | Empat langkah bernomor (ini memang urutan) |
| Papan | Matriks pembayaran, penukar Denah dan Papan | Bagian 6.4 |
| Kas | Saldo, riwayat transaksi, pengeluaran | Daftar dengan pemisah per hari, bukan kartu identik |
| Meja bendahara | Antrean cek, impor CSV, uang tanpa pemilik, input tunai, pengeluaran, pengaturan denda, pengingat | Antrean berupa tumpukan slip kertas; satu aksi utama per slip |
| Pengaturan | Tema, bunyi, notifikasi, ganti PIN | |
| Pengingat bendahara | Daftar siswa, lencana "Sudah diingatkan", tombol wa.me | Lencana berisi teks waktu, bukan warna saja |

Setiap layar harus punya keadaan: memuat, kosong, galat, dan offline.
