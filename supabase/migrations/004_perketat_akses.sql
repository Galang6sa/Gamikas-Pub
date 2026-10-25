-- KasKelas, M2: perketat akses
-- Masalah di 001: kebijakan "using (true)" berarti SIAPA PUN yang berhasil mendaftar akun Supabase
-- (peran authenticated) bisa membaca papan, daftar nama siswa, tagihan, dan pengeluaran.
-- Perbaikan: hanya pemilik profil (anggota kelas) yang boleh membaca.
-- Tetap WAJIB mematikan pendaftaran publik di Supabase (Authentication, Sign In / Providers, Allow new users to sign up = off).

create or replace function public.is_anggota() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profil where id = auth.uid());
$$;

drop policy konfigurasi_baca  on public.konfigurasi;
drop policy minggu_baca       on public.minggu;
drop policy tagihan_baca      on public.tagihan;
drop policy pengeluaran_baca  on public.pengeluaran;

create policy konfigurasi_baca on public.konfigurasi for select to authenticated using (public.is_anggota());
create policy minggu_baca      on public.minggu      for select to authenticated using (public.is_anggota());
create policy tagihan_baca     on public.tagihan     for select to authenticated using (public.is_anggota());
create policy pengeluaran_baca on public.pengeluaran for select to authenticated using (public.is_anggota());

-- View melewati RLS tabel dasarnya (sengaja, agar hanya kolom aman yang terbuka), jadi saring di dalam view.
create or replace view public.siswa_publik as
  select id, nrp, nama, no_absen, aktif from public.siswa
  where public.is_anggota();

create or replace view public.pembayaran_publik as
  select id, siswa_id, metode, nominal_bukti, waktu_bayar, status, dibuat_pada
  from public.pembayaran
  where status not in ('ditolak','dibatalkan') and public.is_anggota();

create or replace view public.papan as
  select t.id as tagihan_id, s.id as siswa_id, s.no_absen, s.nrp, s.nama,
         m.id as minggu_id, m.mulai, m.akhir, m.jatuh_tempo, m.ditagih,
         t.nominal_pokok, t.denda_dibebaskan,
         p.metode, p.waktu_bayar, a.jumlah_denda,
         case when not m.ditagih then 'libur'
              when p.status is not null then p.status
              else 'belum' end as status
  from public.tagihan t
  join public.siswa  s on s.id = t.siswa_id
  join public.minggu m on m.id = t.minggu_id
  left join public.alokasi_pembayaran a on a.tagihan_id = t.id
  left join public.pembayaran p on p.id = a.pembayaran_id
       and p.status in ('terkonfirmasi','lunas_sementara','perlu_dicek')
  where public.is_anggota();

create or replace view public.saldo_kas as
  select * from (
    select
      coalesce(sum(a.jumlah_pokok), 0)                           as pemasukan_kas,
      coalesce(sum(a.jumlah_denda), 0)                           as pemasukan_denda,
      (select coalesce(sum(nominal), 0) from public.pengeluaran) as pengeluaran,
      coalesce(sum(a.jumlah_pokok + a.jumlah_denda), 0)
        - (select coalesce(sum(nominal), 0) from public.pengeluaran) as saldo
    from public.alokasi_pembayaran a
    join public.pembayaran p on p.id = a.pembayaran_id
    where p.status in ('lunas_sementara','terkonfirmasi')
  ) x
  where public.is_anggota();

-- Catatan: Supabase Advisor akan memberi peringatan "Security Definer View" untuk view di atas.
-- Itu disengaja: view hanya menampilkan kolom aman dan menyaring lewat is_anggota().
