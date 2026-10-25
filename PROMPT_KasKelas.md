# Prompt: Bangun Prototipe Antarmuka KasKelas

Cara memakai: lampirkan tiga berkas ke alat pembangun (Claude Code, Cursor, atau sejenisnya): **PRD Final KasKelas**, **DESIGN_SYSTEM_KasKelas.md**, dan prompt ini. Tempel prompt di bawah garis sebagai pesan pertama.

---

## Peran

Kamu adalah desainer sekaligus pengembang front-end senior di studio yang dikenal memberi setiap klien identitas visual yang tidak tertukar dengan milik orang lain. Klien ini sudah menolak banyak proposal yang terasa generik, dan membayar untuk sudut pandang yang berani namun tetap mudah dipakai.

## Konteks

KasKelas adalah aplikasi web (PWA) untuk kas mingguan satu kelas: 29 siswa, Rp5.000 per minggu, dibayar lewat QRIS statis dengan unggah bukti bayar. Spesifikasi produk lengkap ada di PRD. Spesifikasi visual dan interaksi ada di DESIGN_SYSTEM_KasKelas.md. **Design system itu mengikat.** Kalau ada konflik dengan kebiasaan bawaan pustaka atau templat, design system menang.

Referensi rasa adalah Duolingo (tombol tebal berbibir, warna datar jenuh, kemajuan sebagai permainan kecil, umpan balik fisik), tetapi dunia visualnya sepenuhnya milik KasKelas: buku kas kelas yang dicap, dengan kertas kotak, karcis sobek, stempel, dan denah bangku.

## Tujuan tahap ini (M1: prototipe)

Bangun **prototipe antarmuka yang bisa diklik** dengan data contoh, tanpa backend. Tujuannya agar bendahara dan teman sekelas bisa merasakan alur dan tampilannya sebelum disambungkan ke database dan OCR sungguhan.

## Teknologi

- Next.js (App Router) + TypeScript, PWA-ready (manifest dan ikon, service worker boleh ditunda).
- Gaya: CSS variables dari design system dengan CSS Modules atau CSS biasa. **Jangan** memakai pustaka komponen siap pakai (shadcn, MUI, Chakra, dan sejenisnya) karena akan menghasilkan tampilan generik. Tailwind boleh dipakai hanya jika token tema dipetakan penuh dari design system.
- Font dari `@fontsource` (Gabarito, dan Atkinson Hyperlegible Next, atau Atkinson Hyperlegible bila paket pertama tidak ada). Tanpa CDN font.
- Ikon: set SVG inline kustom sesuai bagian 12 design system.
- State dengan React state atau Zustand, disimpan ke `localStorage` agar demo bertahan saat dimuat ulang.
- Uji unit untuk logika denda dengan Vitest.
- Dependensi seminimal mungkin. Sebutkan setiap dependensi tambahan beserta alasannya di README.

## Data contoh

- Waktu "hari ini" dikunci pada **Jumat, 23 Okt 2026**, dengan panel pengembang tersembunyi (hanya mode dev) untuk memajukan waktu supaya denda bisa diuji.
- 29 siswa dengan nama **fiktif** yang beragam, NRP 3 digit (101 sampai 129), nomor absen 1 sampai 29. Pengguna demo siswa: NRP 107, nama "Rani". Pengguna demo bendahara: akun bendahara tunggal.
- Riwayat sejak awal Agustus 2026 dengan campuran status: lunas tepat waktu, lunas telat berdenda, tertunggak, pembayaran gabungan beberapa minggu (Rp10.000, Rp15.000, Rp20.000), tunai, libur, dibebaskan, dan beberapa pembayaran berstatus menunggu cek.
- Pengeluaran contoh (misalnya spidol, fotokopi) dan baris "uang tanpa pemilik" contoh untuk bendahara.
- Jangan ada nama atau data nyata siapa pun. Jangan ada "lorem ipsum".

## Layar yang harus ada

Rinci di PRD dan bagian 15 design system. Minimal:

1. Masuk dan ganti PIN awal.
2. Beranda siswa: karcis minggu ini, karcis tertunggak, denah kelas, tumpukan stempel.
3. Bayar: pilih minggu (beberapa sekaligus), total live, tampilan QRIS (gunakan placeholder kotak QR yang jelas bertanda contoh), unggah bukti, dan hasil. Simulasikan **semua hasil OCR**: lolos, perlu dicek, ditolak (nominal tidak cocok, bukti kembar, merchant salah), dan galat jaringan.
4. Papan pembayaran dan penukar tampilan Denah/Papan.
5. Kas: saldo, riwayat transaksi, pengeluaran.
6. Meja bendahara: antrean cek, impor CSV (dengan pratinjau contoh), uang tanpa pemilik (seret ke meja di denah **dan** alternatif pilih dari daftar), input tunai, catat pengeluaran, saklar kebijakan denda, pengingat dengan lencana "sudah diingatkan" dan tombol wa.me.
7. Pengaturan: tema Siang, Malam, atau ikuti perangkat; bunyi; notifikasi.

Setiap layar harus punya keadaan memuat, kosong, galat, dan offline.

## Interaksi yang wajib

- Tombol tebal berbibir (bagian 7.1) di seluruh aplikasi.
- Stempel dibanting saat pembayaran terkonfirmasi (bagian 8.2), dengan versi gerak-dikurangi.
- Sobek karcis **dengan** tombol pengganti (bagian 6.1).
- Denah kelas yang responsif dan bisa diketuk (bagian 6.3).
- Papan dengan kolom lengket dan baris milik pengguna disematkan (bagian 6.4).
- Pemilihan beberapa minggu dengan karcis menumpuk dan total yang berubah langsung.
- Saklar denda dengan dialog konfirmasi dan spanduk status untuk siswa (bagian 7.5).
- Getar dan bunyi opsional (bagian 8.5), bunyi mati secara default.

## Logika denda (fungsi murni dengan uji)

Aturan: nominal pokok Rp5.000. Jatuh tempo tagihan adalah Minggu 23.59.59 WIB pada minggu tagihan. Misalkan k = jumlah minggu penuh yang terlewat sejak jatuh tempo, dibulatkan ke atas. k = 0: denda 0%. k = 1: 20%. k ≥ 2: 20% ditambah 10 poin persentase untuk setiap minggu tambahan, jadi 20% + 10% × (k − 1). Pembulatan ke Rp50 terdekat. Batas atas denda opsional (default tanpa batas). Saklar denda: bila mati, denda 0 dan tidak dihitung; bila dihidupkan kembali, denda tidak berlaku surut, yaitu k dihitung sejak jatuh tempo atau sejak saklar dinyalakan, mana yang lebih baru. Denda dihitung dari waktu bayar, bukan waktu unggah.

Kasus uji yang harus lulus:

| Kasus | Hasil |
|---|---|
| Tagihan 5–11 Okt dibayar Rabu 21 Okt 2026 10.00 WIB, denda hidup | denda Rp1.500, total Rp6.500 |
| Tagihan 12–18 Okt, waktu bayar sama | denda Rp1.000, total Rp6.000 |
| Tagihan 19–25 Okt, waktu bayar sama | denda 0, total Rp5.000 |
| Ketiganya dibayar sekaligus, denda hidup | total Rp17.500 |
| Ketiganya dibayar sekaligus, denda mati | total Rp15.000 |
| Tagihan 19–25 Okt dibayar Minggu 25 Okt 23.59.59 | denda 0 |
| Tagihan 19–25 Okt dibayar Senin 26 Okt 00.00.00 | denda Rp1.000 |
| Tagihan 5–11 Okt dibayar 1 Nov 2026 10.00 (k = 3), denda hidup | denda Rp2.000 |
| Tagihan 5–11 Okt, saklar dinyalakan 20 Okt 12.00, dibayar 21 Okt 10.00 | denda Rp1.000 (k = 1 sejak saklar menyala) |

## Proses kerja

1. **Rencana dulu.** Tulis ringkasan singkat berisi palet, peran huruf, konsep tata letak (kalimat dan wireframe ASCII), dan prinsip. Periksa rencana itu terhadap daftar larangan di bagian 13 design system. Kalau ada bagian yang terasa seperti hasil default untuk aplikasi sejenis, ubah dan sebutkan apa yang diubah dan alasannya.
2. **Bangun** mengikuti rencana yang sudah diperiksa.
3. **Kritik diri.** Periksa hasilnya pada lebar 360, 768, dan 1280 piksel (ambil tangkapan layar bila lingkunganmu mendukung). Jalankan juga dengan gerak dikurangi, tema Malam, zoom 200 persen, dan hanya dengan keyboard. Perbaiki sebelum menyerahkan.
4. **Jangan bertanya** kecuali benar-benar buntu. Untuk hal yang ambigu, pakai default di bagian 16 PRD dan catat di README.

## Aturan keras

- Tidak ada emoji atau karakter simbol sebagai emotikon atau ikon, di kode maupun di teks.
- Tidak memakai font generik (Inter, Roboto, Poppins, Nunito, Montserrat, DM Sans, Space Grotesk, Fredoka).
- Tidak ada gradasi dekoratif, efek kaca, bentuk gumpalan, atau deretan kartu identik.
- Tidak ada huruf kapital semua kecuali di dalam stempel.
- Tidak ada animasi masuk fade-and-slide-up per bagian dan tidak ada efek melayang di setiap kartu. Satu momen animasi besar per layar.
- Semua gestur punya alternatif ketuk dan keyboard.
- Status tidak pernah hanya ditandai warna.
- Seluruh teks antarmuka berbahasa Indonesia dengan suara tulisan di bagian 11 design system.
- Target ketuk minimal 48px, kontras sesuai tabel di design system, fokus keyboard selalu terlihat, `prefers-reduced-motion` dihormati tanpa pengecualian.
- Tidak ada permintaan jaringan keluar selain yang dibutuhkan aplikasi sendiri. Tidak ada CDN.

## Kriteria selesai

- [ ] Semua layar dan keadaannya bisa dijelajahi, termasuk empat hasil OCR dan saklar denda hidup atau mati.
- [ ] Seluruh kasus uji denda lulus.
- [ ] Berfungsi di 320 sampai 1920 piksel tanpa gulir horizontal pada halaman, dan tanpa konten terpotong pada zoom 200 persen.
- [ ] Bar bawah di HP, pembatas buku di tablet dan desktop, urutan tab sama.
- [ ] Bayar dapat diselesaikan dalam 3 ketukan dari beranda.
- [ ] Hanya dengan keyboard, seluruh alur utama dapat diselesaikan.
- [ ] Tidak ada pelanggaran daftar larangan bagian 13.
- [ ] Lighthouse (HP) untuk Aksesibilitas minimal 95, dan LCP di bawah 2,5 detik pada profil 4G.
- [ ] README berisi cara menjalankan, struktur folder, daftar asumsi, dan hal yang sengaja belum dibangun.

## Yang tidak dibangun sekarang

Backend, autentikasi sungguhan, OCR sungguhan, impor CSV sungguhan, Web Push, dan sinkronisasi Google Sheets. Semuanya disimulasikan dengan data contoh dan diberi batas yang jelas agar mudah diganti pada tahap M2 dan M3.

## Serahkan

Kode di repositori, README, dan ringkasan satu paragraf: apa yang dibangun, keputusan desain yang diambil, dan hal yang masih perlu keputusan bendahara.
