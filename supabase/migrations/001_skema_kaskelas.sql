-- KasKelas, M2: skema inti, fungsi denda, tampilan, dan RLS
-- Dijalankan di Supabase (SQL Editor) pada project baru.
-- Keputusan bendahara: denda tanpa batas atas (denda_batas_atas_persen = NULL).

-- =========================================================
-- 1. Tabel
-- =========================================================

create table public.konfigurasi (
  id                       int primary key default 1 check (id = 1),
  nominal_mingguan         int not null default 5000 check (nominal_mingguan > 0),
  denda_aktif              boolean not null default true,
  denda_berlaku_mulai      timestamptz,                 -- diisi otomatis saat saklar dinyalakan lagi
  denda_awal_persen        numeric(6,2) not null default 20,
  denda_kenaikan_persen    numeric(6,2) not null default 10,
  denda_batas_atas_persen  numeric(6,2),                -- NULL = tanpa batas
  pembulatan               int not null default 50 check (pembulatan > 0),
  toleransi_detik          int not null default 30,
  merchant_kode            text not null default '975190623',
  bayar_di_muka_maks       int not null default 4
);
insert into public.konfigurasi default values;

create table public.siswa (
  id        uuid primary key default gen_random_uuid(),
  nrp       text not null unique check (nrp ~ '^[0-9]{3}$'),
  nama      text not null,
  no_absen  int  not null unique,
  no_wa     text,                                       -- hanya terlihat bendahara
  aktif     boolean not null default true
);

-- Satu akun bendahara (siswa_id NULL) dan satu akun per siswa.
create table public.profil (
  id        uuid primary key references auth.users(id) on delete cascade,
  role      text not null check (role in ('siswa', 'bendahara')),
  siswa_id  uuid unique references public.siswa(id),
  check ((role = 'siswa' and siswa_id is not null) or (role = 'bendahara' and siswa_id is null))
);

create table public.minggu (
  id           uuid primary key default gen_random_uuid(),
  mulai        date not null unique,                    -- selalu hari Senin
  akhir        date not null,                           -- Minggu
  jatuh_tempo  timestamptz not null,                    -- Minggu 23:59:59 WIB
  ditagih      boolean not null default true,           -- false = libur
  nominal      int not null check (nominal > 0),
  check (extract(isodow from mulai) = 1)
);

create table public.tagihan (
  id               uuid primary key default gen_random_uuid(),
  siswa_id         uuid not null references public.siswa(id),
  minggu_id        uuid not null references public.minggu(id),
  nominal_pokok    int  not null check (nominal_pokok > 0),
  denda_dibebaskan boolean not null default false,
  alasan_bebas     text,
  unique (siswa_id, minggu_id),
  check (not denda_dibebaskan or alasan_bebas is not null)
);

create table public.pembayaran (
  id           uuid primary key default gen_random_uuid(),
  siswa_id     uuid not null references public.siswa(id),
  metode       text not null check (metode in ('qris', 'cash')),
  nominal_bukti int not null check (nominal_bukti > 0),
  waktu_bayar  timestamptz,                             -- boleh kosong bila bukti tanpa tanggal
  status       text not null check (status in
               ('lunas_sementara','terkonfirmasi','perlu_dicek','ditolak','mencurigakan','dibatalkan')),
  ref_id       text,
  hash_bukti   text,
  hasil_ocr    jsonb,
  gopay_txn_id text,
  dibuat_pada  timestamptz not null default now()
);
-- Anti-duplikat (PRD 8.5): ref_id dan hash gambar tidak boleh dipakai dua kali pada pembayaran aktif.
create unique index pembayaran_ref_unik  on public.pembayaran (ref_id)     where ref_id is not null     and status not in ('ditolak','dibatalkan');
create unique index pembayaran_hash_unik on public.pembayaran (hash_bukti) where hash_bukti is not null and status not in ('ditolak','dibatalkan');

-- Satu pembayaran dapat melunasi banyak tagihan. Satu tagihan hanya dilunasi sekali.
-- Pembatalan = baris alokasi dihapus (data lama tetap ada di log_aktivitas).
create table public.alokasi_pembayaran (
  id            uuid primary key default gen_random_uuid(),
  pembayaran_id uuid not null references public.pembayaran(id) on delete cascade,
  tagihan_id    uuid not null unique references public.tagihan(id),
  jumlah_pokok  int not null check (jumlah_pokok >= 0),
  jumlah_denda  int not null default 0 check (jumlah_denda >= 0)
);

create table public.gopay_txn (
  no_transaksi  text primary key,
  waktu_dibuat  timestamptz not null,                   -- kolom "Transaksi Dibuat" (WIB)
  nominal       int not null,
  ref           text,
  merchant_id   text,
  status        text,
  pembayaran_id uuid unique references public.pembayaran(id) on delete set null,
  batch_impor   uuid,
  diimpor_pada  timestamptz not null default now()
);

create table public.pengeluaran (
  id           uuid primary key default gen_random_uuid(),
  tanggal      date not null,
  nominal      int  not null check (nominal > 0),
  kategori     text not null,
  keterangan   text,
  dibuat_pada  timestamptz not null default now()
);

create table public.log_pengingat (
  id         uuid primary key default gen_random_uuid(),
  siswa_id   uuid not null references public.siswa(id),
  tagihan_id uuid not null references public.tagihan(id),
  tahap      text not null check (tahap in ('tagihan_baru','h_min_1','terakhir','denda_mulai')),
  channel    text not null check (channel in ('push','wa')),
  status     text not null check (status in ('terkirim','dibuka','dikonfirmasi')),
  waktu      timestamptz not null default now()
);
-- Web Push hanya sekali per tahap; wa.me boleh dikirim ulang (peringatan 24 jam ada di aplikasi).
create unique index log_pengingat_push_unik
  on public.log_pengingat (siswa_id, tagihan_id, tahap) where channel = 'push';

create table public.log_aktivitas (
  id      bigint generated always as identity primary key,
  waktu   timestamptz not null default now(),
  aktor   uuid,
  aksi    text not null,
  sebelum jsonb,
  sesudah jsonb,
  alasan  text
);

-- =========================================================
-- 2. Fungsi pembantu hak akses
-- =========================================================

create or replace function public.is_bendahara() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profil where id = auth.uid() and role = 'bendahara');
$$;

create or replace function public.siswa_saya() returns uuid
language sql stable security definer set search_path = public as $$
  select siswa_id from public.profil where id = auth.uid();
$$;

-- =========================================================
-- 3. Logika denda (PRD 5.2)
--    k = minggu penuh terlewat sejak patokan, dibulatkan ke atas
--    persen = awal + kenaikan * (k - 1), dibatasi batas atas bila ada
--    Patokan = jatuh tempo, atau saat saklar dinyalakan bila lebih baru (tidak berlaku surut)
-- =========================================================

create or replace function public.hitung_denda(
  p_nominal        int,
  p_jatuh_tempo    timestamptz,
  p_waktu_bayar    timestamptz,
  p_aktif          boolean,
  p_berlaku_mulai  timestamptz,
  p_awal           numeric,
  p_naik           numeric,
  p_batas          numeric,
  p_pembulatan     int
) returns int
language plpgsql immutable as $$
declare
  basis  timestamptz;
  k      int;
  persen numeric;
begin
  if not p_aktif then return 0; end if;
  basis := greatest(p_jatuh_tempo, coalesce(p_berlaku_mulai, '-infinity'::timestamptz));
  if p_waktu_bayar <= basis then return 0; end if;
  k := ceil(extract(epoch from (p_waktu_bayar - basis)) / 604800.0)::int;
  persen := p_awal + p_naik * (k - 1);
  if p_batas is not null then persen := least(persen, p_batas); end if;
  return (round(p_nominal * persen / 100.0 / p_pembulatan) * p_pembulatan)::int;
end;
$$;

-- Pokok dan denda satu tagihan bila dibayar pada p_waktu_bayar (memakai konfigurasi saat ini).
create or replace function public.hitung_tagihan(p_tagihan uuid, p_waktu_bayar timestamptz)
returns table (pokok int, denda int)
language sql stable as $$
  select t.nominal_pokok,
         case when t.denda_dibebaskan then 0
              else public.hitung_denda(t.nominal_pokok, m.jatuh_tempo, p_waktu_bayar,
                     k.denda_aktif, k.denda_berlaku_mulai, k.denda_awal_persen,
                     k.denda_kenaikan_persen, k.denda_batas_atas_persen, k.pembulatan)
         end
  from public.tagihan t
  join public.minggu m on m.id = t.minggu_id
  cross join public.konfigurasi k
  where t.id = p_tagihan;
$$;

-- Saat saklar denda dinyalakan kembali: catat waktunya (denda tidak berlaku surut). Semua perubahan konfigurasi dicatat.
create or replace function public.trg_konfigurasi() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.denda_aktif and not old.denda_aktif then
    new.denda_berlaku_mulai := now();
  end if;
  insert into public.log_aktivitas (aktor, aksi, sebelum, sesudah)
  values (auth.uid(), 'ubah_konfigurasi', to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;
create trigger konfigurasi_ubah before update on public.konfigurasi
  for each row execute function public.trg_konfigurasi();

-- =========================================================
-- 4. Pembuatan minggu dan tagihan otomatis
--    Senin 00:00 WIB = Minggu 17:00 UTC
-- =========================================================

create or replace function public.buat_tagihan_minggu(p_senin date) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_nominal int;
  v_ditagih boolean;
begin
  if extract(isodow from p_senin) <> 1 then
    raise exception 'Tanggal % bukan hari Senin', p_senin;
  end if;
  select nominal_mingguan into v_nominal from public.konfigurasi;

  insert into public.minggu (mulai, akhir, jatuh_tempo, nominal)
  values (p_senin, p_senin + 6,
          ((p_senin + 6)::timestamp + time '23:59:59') at time zone 'Asia/Jakarta',
          v_nominal)
  on conflict (mulai) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.minggu where mulai = p_senin;
  end if;

  select ditagih into v_ditagih from public.minggu where id = v_id;
  if v_ditagih then
    insert into public.tagihan (siswa_id, minggu_id, nominal_pokok)
    select s.id, v_id, v_nominal from public.siswa s where s.aktif
    on conflict (siswa_id, minggu_id) do nothing;
  end if;
  return v_id;
end;
$$;

-- Fungsi ini security definer, jadi tidak boleh bisa dipanggil klien lewat API. Hanya penjadwal dan SQL Editor.
revoke all on function public.buat_tagihan_minggu(date) from public, anon, authenticated;

-- Penjadwal (aktifkan ekstensi pg_cron di Supabase dulu, lalu jalankan sekali):
-- select cron.schedule('tagihan-mingguan', '0 17 * * 0',
--   $$ select public.buat_tagihan_minggu((now() at time zone 'Asia/Jakarta')::date) $$);

-- =========================================================
-- 5. Tampilan (view)
-- =========================================================

-- Kolom aman untuk seluruh siswa (tanpa no_wa).
create view public.siswa_publik as
  select id, nrp, nama, no_absen, aktif from public.siswa;

-- Riwayat pembayaran untuk transparansi (tanpa ref_id, hash, dan hasil OCR).
create view public.pembayaran_publik as
  select id, siswa_id, metode, nominal_bukti, waktu_bayar, status, dibuat_pada
  from public.pembayaran
  where status not in ('ditolak','dibatalkan');

-- Data Papan: satu baris per siswa per minggu.
create view public.papan as
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
       and p.status in ('terkonfirmasi','lunas_sementara','perlu_dicek');

-- Saldo kas resmi: hanya pembayaran lunas_sementara dan terkonfirmasi.
create view public.saldo_kas as
  select
    coalesce(sum(a.jumlah_pokok), 0)                         as pemasukan_kas,
    coalesce(sum(a.jumlah_denda), 0)                         as pemasukan_denda,
    (select coalesce(sum(nominal), 0) from public.pengeluaran) as pengeluaran,
    coalesce(sum(a.jumlah_pokok + a.jumlah_denda), 0)
      - (select coalesce(sum(nominal), 0) from public.pengeluaran) as saldo
  from public.alokasi_pembayaran a
  join public.pembayaran p on p.id = a.pembayaran_id
  where p.status in ('lunas_sementara','terkonfirmasi');

-- =========================================================
-- 6. Keamanan baris (RLS)
--    Siswa tidak menulis langsung ke tabel. Unggah bukti, alokasi, dan denda
--    dikerjakan Edge Function dengan service role (klien tidak dipercaya).
-- =========================================================

alter table public.konfigurasi        enable row level security;
alter table public.siswa              enable row level security;
alter table public.profil             enable row level security;
alter table public.minggu             enable row level security;
alter table public.tagihan            enable row level security;
alter table public.pembayaran         enable row level security;
alter table public.alokasi_pembayaran enable row level security;
alter table public.gopay_txn          enable row level security;
alter table public.pengeluaran        enable row level security;
alter table public.log_pengingat      enable row level security;
alter table public.log_aktivitas      enable row level security;

create policy konfigurasi_baca  on public.konfigurasi for select to authenticated using (true);
create policy konfigurasi_ubah  on public.konfigurasi for update to authenticated using (public.is_bendahara()) with check (public.is_bendahara());

create policy siswa_baca  on public.siswa for select to authenticated using (public.is_bendahara() or id = public.siswa_saya());
create policy siswa_tulis on public.siswa for all    to authenticated using (public.is_bendahara()) with check (public.is_bendahara());

create policy profil_baca  on public.profil for select to authenticated using (public.is_bendahara() or id = auth.uid());
create policy profil_tulis on public.profil for all    to authenticated using (public.is_bendahara()) with check (public.is_bendahara());

create policy minggu_baca  on public.minggu for select to authenticated using (true);
create policy minggu_tulis on public.minggu for all    to authenticated using (public.is_bendahara()) with check (public.is_bendahara());

create policy tagihan_baca  on public.tagihan for select to authenticated using (true);
create policy tagihan_tulis on public.tagihan for all    to authenticated using (public.is_bendahara()) with check (public.is_bendahara());

create policy pembayaran_baca  on public.pembayaran for select to authenticated
  using (public.is_bendahara() or siswa_id = public.siswa_saya());
create policy pembayaran_tulis on public.pembayaran for all to authenticated
  using (public.is_bendahara()) with check (public.is_bendahara());

create policy alokasi_baca on public.alokasi_pembayaran for select to authenticated
  using (public.is_bendahara() or exists (
    select 1 from public.pembayaran p where p.id = pembayaran_id and p.siswa_id = public.siswa_saya()));
create policy alokasi_tulis on public.alokasi_pembayaran for all to authenticated
  using (public.is_bendahara()) with check (public.is_bendahara());

create policy gopay_bendahara on public.gopay_txn for all to authenticated
  using (public.is_bendahara()) with check (public.is_bendahara());

create policy pengeluaran_baca  on public.pengeluaran for select to authenticated using (true);
create policy pengeluaran_tulis on public.pengeluaran for all    to authenticated using (public.is_bendahara()) with check (public.is_bendahara());

create policy pengingat_bendahara on public.log_pengingat for all to authenticated
  using (public.is_bendahara()) with check (public.is_bendahara());

create policy aktivitas_baca on public.log_aktivitas for select to authenticated using (public.is_bendahara());

-- Tampilan melewati RLS tabel dasarnya (sengaja, hanya kolom aman). Pastikan anon tidak punya akses.
revoke all on all tables in schema public from anon;
grant select on public.siswa_publik, public.pembayaran_publik, public.papan, public.saldo_kas to authenticated;
