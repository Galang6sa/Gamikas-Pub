-- KasKelas, M3: unggah bukti QRIS, pencocokan dengan laporan GoPay, antrean bendahara
-- Gambar bukti TIDAK dikirim ke server: OCR berjalan di browser. Server hanya menerima hasil bacaan dan hash gambar.
-- Status pembayaran QRIS:
--   terkonfirmasi   bukti cocok dengan tepat satu baris laporan GoPay (atau diterima bendahara)
--   lunas_sementara bukti lolos validasi, laporan GoPay belum mencakup waktunya
--   perlu_dicek     waktu tidak terbaca, kandidat ganda, atau merchant tidak terbaca
--   mencurigakan    laporan GoPay sudah mencakup waktunya tetapi tidak ada transaksi yang cocok
--   ditolak         ditolak bendahara

alter table public.konfigurasi add column if not exists merchant_nama text;  -- opsional, nama merchant seperti di bukti

create or replace function public.fmt_rupiah(n int) returns text
language sql immutable as $$ select 'Rp' || regexp_replace(n::text, '(\d)(?=(\d{3})+$)', '\1.', 'g'); $$;

-- ---------------------------------------------------------------
-- Tampilan dan ringkasan: ikutkan status mencurigakan, tambah pembayaran_id
-- ---------------------------------------------------------------
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
       and p.status in ('terkonfirmasi','lunas_sementara','perlu_dicek','mencurigakan')
  where public.is_anggota();

drop function if exists public.ringkasan_saya(timestamptz);
create function public.ringkasan_saya(p_waktu timestamptz default now())
returns table (tagihan_id uuid, minggu_id uuid, mulai date, akhir date, jatuh_tempo timestamptz,
               status text, pokok int, denda int, total int, denda_dibebaskan boolean, pembayaran_id uuid)
language sql stable security definer set search_path = public as $$
  select t.id, m.id, m.mulai, m.akhir, m.jatuh_tempo,
         case when not m.ditagih then 'libur'
              when p.status is not null then p.status
              else 'belum' end,
         case when m.ditagih then t.nominal_pokok else 0 end,
         case when not m.ditagih then 0
              when p.id is not null then coalesce(a.jumlah_denda, 0)
              else h.denda end,
         case when not m.ditagih then 0
              else t.nominal_pokok + case when p.id is not null then coalesce(a.jumlah_denda, 0) else h.denda end end,
         t.denda_dibebaskan,
         p.id
  from public.tagihan t
  join public.minggu m on m.id = t.minggu_id
  left join public.alokasi_pembayaran a on a.tagihan_id = t.id
  left join public.pembayaran p on p.id = a.pembayaran_id
       and p.status in ('terkonfirmasi','lunas_sementara','perlu_dicek','mencurigakan')
  left join lateral public.hitung_tagihan(t.id, p_waktu) h on true
  where t.siswa_id = public.siswa_saya()
  order by m.mulai;
$$;

-- ---------------------------------------------------------------
-- Siswa: ajukan pembayaran QRIS dari hasil bacaan bukti
-- ---------------------------------------------------------------
create or replace function public.ajukan_pembayaran_qris(
  p_tagihan uuid[], p_nominal int, p_waktu timestamptz, p_ref text, p_hash text, p_ocr jsonb)
returns table (pembayaran_id uuid, status text, total int)
language plpgsql security definer set search_path = public as $$
declare
  v_siswa uuid := public.siswa_saya();
  v_valid int; v_total int; v_waktu timestamptz; v_tol int; v_n int; v_gp text; v_status text; v_pay uuid;
  v_cakup boolean; t uuid; h record; v_baris int;
begin
  if v_siswa is null then raise exception 'Hanya untuk akun siswa' using errcode = '42501'; end if;
  if coalesce(p_nominal, 0) <= 0 then raise exception 'Nominal di bukti tidak terbaca'; end if;
  if p_tagihan is null or coalesce(array_length(p_tagihan, 1), 0) = 0 then raise exception 'Pilih minimal satu minggu'; end if;

  select count(*) into v_valid
  from public.tagihan tg join public.minggu m on m.id = tg.minggu_id
  where tg.id = any(p_tagihan) and tg.siswa_id = v_siswa and m.ditagih
    and not exists (select 1 from public.alokasi_pembayaran a where a.tagihan_id = tg.id);
  if v_valid <> array_length(p_tagihan, 1) then raise exception 'Tagihan tidak valid atau sudah lunas'; end if;

  if p_waktu is not null then
    if p_waktu > now() + interval '5 minutes' then raise exception 'Waktu di bukti tidak masuk akal (di masa depan)'; end if;
    if p_waktu < now() - interval '45 days' then raise exception 'Bukti terlalu lama (lebih dari 45 hari)'; end if;
  end if;
  v_waktu := coalesce(p_waktu, now());

  select coalesce(sum(h2.pokok + h2.denda), 0) into v_total
  from unnest(p_tagihan) x(id), lateral public.hitung_tagihan(x.id, v_waktu) h2;
  if p_nominal <> v_total then
    raise exception 'Nominal di bukti % tidak sama dengan total pilihanmu %. Pilih minggu yang sesuai atau unggah bukti yang benar. Bila membayar lewat jatuh tempo, denda ikut dihitung.',
      public.fmt_rupiah(p_nominal), public.fmt_rupiah(v_total);
  end if;

  select toleransi_detik into v_tol from public.konfigurasi;
  if p_waktu is null then
    v_status := 'perlu_dicek';
  else
    select count(*), min(g.no_transaksi) into v_n, v_gp
    from public.gopay_txn g
    where g.pembayaran_id is null and g.nominal = p_nominal
      and abs(extract(epoch from (g.waktu_dibuat - p_waktu))) <= v_tol;
    if v_n = 1 then
      v_status := 'terkonfirmasi';
    elsif v_n > 1 then
      v_status := 'perlu_dicek'; v_gp := null;
    else
      select exists (select 1 from public.gopay_txn where waktu_dibuat > p_waktu + interval '1 day') into v_cakup;
      if v_cakup then v_status := 'mencurigakan';
      elsif coalesce((p_ocr->>'sukses')::boolean, false) and coalesce((p_ocr->>'merchantCocok')::boolean, false) then v_status := 'lunas_sementara';
      else v_status := 'perlu_dicek';
      end if;
    end if;
  end if;

  begin
    insert into public.pembayaran (siswa_id, metode, nominal_bukti, waktu_bayar, status, ref_id, hash_bukti, hasil_ocr, gopay_txn_id)
    values (v_siswa, 'qris', p_nominal, p_waktu, v_status,
            nullif(trim(coalesce(p_ref, '')), ''), nullif(trim(coalesce(p_hash, '')), ''), p_ocr, v_gp)
    returning id into v_pay;
  exception when unique_violation then
    raise exception 'Bukti ini sudah pernah dipakai. Unggah bukti pembayaran yang baru.';
  end;

  foreach t in array p_tagihan loop
    select * into h from public.hitung_tagihan(t, v_waktu);
    insert into public.alokasi_pembayaran (pembayaran_id, tagihan_id, jumlah_pokok, jumlah_denda) values (v_pay, t, h.pokok, h.denda);
  end loop;

  if v_gp is not null then
    update public.gopay_txn set pembayaran_id = v_pay where no_transaksi = v_gp and pembayaran_id is null;
    get diagnostics v_baris = row_count;
    if v_baris = 0 then  -- baris itu baru saja diambil klaim lain
      update public.pembayaran set status = 'perlu_dicek', gopay_txn_id = null where id = v_pay;
      v_status := 'perlu_dicek';
    end if;
  end if;

  insert into public.log_aktivitas (aktor, aksi, sesudah)
  values (auth.uid(), 'ajukan_pembayaran_qris', jsonb_build_object('pembayaran', v_pay, 'status', v_status, 'total', v_total));
  return query select v_pay, v_status, v_total;
end;
$$;

create or replace function public.batalkan_klaim_saya(p_pembayaran uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.siswa_saya() is null then raise exception 'Hanya untuk akun siswa' using errcode = '42501'; end if;
  perform 1 from public.pembayaran
   where id = p_pembayaran and siswa_id = public.siswa_saya()
     and status in ('lunas_sementara','perlu_dicek','mencurigakan');
  if not found then raise exception 'Hanya klaim yang belum terkonfirmasi yang bisa dibatalkan'; end if;
  delete from public.alokasi_pembayaran where pembayaran_id = p_pembayaran;
  update public.gopay_txn set pembayaran_id = null where pembayaran_id = p_pembayaran;
  update public.pembayaran set status = 'dibatalkan' where id = p_pembayaran;
  insert into public.log_aktivitas (aktor, aksi, sesudah) values (auth.uid(), 'batalkan_klaim_saya', jsonb_build_object('pembayaran', p_pembayaran));
end;
$$;

-- ---------------------------------------------------------------
-- Bendahara: impor laporan GoPay dan pencocokan otomatis
-- p_baris: [{no_transaksi, waktu_dibuat, nominal, ref, merchant_id, status}]
-- Pencocokan hanya untuk pasangan yang tidak ambigu di kedua arah (satu klaim, satu transaksi).
-- ---------------------------------------------------------------
create or replace function public.impor_gopay(p_baris jsonb)
returns table (baru int, dicocokkan int, tanpa_pemilik int, mencurigakan int)
language plpgsql security definer set search_path = public as $$
declare v_baru int; v_cocok int; v_curiga int; v_kosong int; v_tol int;
begin
  if not public.is_bendahara() then raise exception 'Hanya bendahara' using errcode = '42501'; end if;
  select toleransi_detik into v_tol from public.konfigurasi;

  with ins as (
    insert into public.gopay_txn (no_transaksi, waktu_dibuat, nominal, ref, merchant_id, status)
    select x.no_transaksi, x.waktu_dibuat, x.nominal, x.ref, x.merchant_id, 'SUKSES'
    from jsonb_to_recordset(p_baris) as x(no_transaksi text, waktu_dibuat timestamptz, nominal int, ref text, merchant_id text, status text)
    where upper(coalesce(x.status, 'SUKSES')) in ('SUKSES', 'SUCCESS') and x.no_transaksi is not null and x.nominal > 0
    on conflict (no_transaksi) do nothing
    returning 1)
  select count(*) into v_baru from ins;

  with kandidat as (
    select c.id as pay_id, g.no_transaksi
    from public.pembayaran c
    join public.gopay_txn g on g.pembayaran_id is null and g.nominal = c.nominal_bukti
         and abs(extract(epoch from (g.waktu_dibuat - c.waktu_bayar))) <= v_tol
    where c.metode = 'qris' and c.status in ('lunas_sementara','perlu_dicek','mencurigakan')
      and c.gopay_txn_id is null and c.waktu_bayar is not null),
  per_klaim as (select pay_id, count(*) n from kandidat group by pay_id),
  per_trx   as (select no_transaksi, count(*) n from kandidat group by no_transaksi),
  unik as (
    select k.pay_id, k.no_transaksi from kandidat k
    join per_klaim a on a.pay_id = k.pay_id join per_trx b on b.no_transaksi = k.no_transaksi
    where a.n = 1 and b.n = 1),
  up_p as (update public.pembayaran p set status = 'terkonfirmasi', gopay_txn_id = u.no_transaksi from unik u where p.id = u.pay_id returning p.id),
  up_g as (update public.gopay_txn g set pembayaran_id = u.pay_id from unik u where g.no_transaksi = u.no_transaksi returning 1)
  select count(*) into v_cocok from up_p;

  -- Laporan sudah mencakup waktunya, tidak ada kandidat, tetapi masih "lunas sementara": mencurigakan.
  with curiga as (
    update public.pembayaran p set status = 'mencurigakan'
    where p.metode = 'qris' and p.status = 'lunas_sementara' and p.gopay_txn_id is null and p.waktu_bayar is not null
      and p.waktu_bayar < (select max(waktu_dibuat) from public.gopay_txn) - interval '1 day'
      and not exists (select 1 from public.gopay_txn g where g.pembayaran_id is null and g.nominal = p.nominal_bukti
                      and abs(extract(epoch from (g.waktu_dibuat - p.waktu_bayar))) <= v_tol)
    returning 1)
  select count(*) into v_curiga from curiga;

  select count(*) into v_kosong from public.gopay_txn where pembayaran_id is null;
  insert into public.log_aktivitas (aktor, aksi, sesudah)
  values (auth.uid(), 'impor_gopay', jsonb_build_object('baru', v_baru, 'dicocokkan', v_cocok, 'tanpa_pemilik', v_kosong, 'mencurigakan', v_curiga));
  return query select v_baru, v_cocok, v_kosong, v_curiga;
end;
$$;

-- Bendahara: tetapkan pemilik untuk transaksi GoPay tanpa pemilik. Melunasi tagihan terlama siswa itu.
create or replace function public.tetapkan_pemilik(p_no_transaksi text, p_nrp text) returns uuid
language plpgsql security definer set search_path = public as $$
declare g record; v_siswa uuid; v_nom int; v_k int; v_ids uuid[]; v_total int; v_pay uuid; t uuid; h record;
begin
  if not public.is_bendahara() then raise exception 'Hanya bendahara' using errcode = '42501'; end if;
  select * into g from public.gopay_txn where no_transaksi = p_no_transaksi for update;
  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  if g.pembayaran_id is not null then raise exception 'Transaksi ini sudah punya pemilik'; end if;
  select id into v_siswa from public.siswa where nrp = lpad(trim(p_nrp), 3, '0');
  if v_siswa is null then raise exception 'NRP % tidak ditemukan', p_nrp; end if;
  select nominal_mingguan into v_nom from public.konfigurasi;

  -- jumlah minggu = nominal / nominal mingguan (bila ada denda, dicoba dari k terbesar yang cocok)
  for v_k in reverse greatest(1, g.nominal / v_nom) .. 1 loop
    select array_agg(x.id order by x.mulai) into v_ids from (
      select tg.id, m.mulai from public.tagihan tg join public.minggu m on m.id = tg.minggu_id
      where tg.siswa_id = v_siswa and m.ditagih and not exists (select 1 from public.alokasi_pembayaran a where a.tagihan_id = tg.id)
      order by m.mulai limit v_k) x;
    exit when coalesce(array_length(v_ids, 1), 0) = v_k
          and (select coalesce(sum(h2.pokok + h2.denda), 0) from unnest(v_ids) y(id), lateral public.hitung_tagihan(y.id, g.waktu_dibuat) h2) = g.nominal;
    v_ids := null;
  end loop;
  if v_ids is null then
    raise exception 'Nominal % tidak cocok dengan tagihan belum lunas milik siswa itu (termasuk denda). Bebaskan denda atau periksa minggu yang belum lunas.', public.fmt_rupiah(g.nominal);
  end if;

  insert into public.pembayaran (siswa_id, metode, nominal_bukti, waktu_bayar, status, gopay_txn_id)
  values (v_siswa, 'qris', g.nominal, g.waktu_dibuat, 'terkonfirmasi', g.no_transaksi) returning id into v_pay;
  foreach t in array v_ids loop
    select * into h from public.hitung_tagihan(t, g.waktu_dibuat);
    insert into public.alokasi_pembayaran (pembayaran_id, tagihan_id, jumlah_pokok, jumlah_denda) values (v_pay, t, h.pokok, h.denda);
  end loop;
  update public.gopay_txn set pembayaran_id = v_pay where no_transaksi = g.no_transaksi;
  insert into public.log_aktivitas (aktor, aksi, sesudah)
  values (auth.uid(), 'tetapkan_pemilik', jsonb_build_object('transaksi', g.no_transaksi, 'nrp', p_nrp, 'pembayaran', v_pay));
  return v_pay;
end;
$$;

-- Bendahara: putuskan klaim yang perlu dicek atau mencurigakan.
-- Terima (boleh sambil mengaitkan ke transaksi GoPay) atau tolak (alasan wajib, tagihan kembali belum lunas).
create or replace function public.putuskan_klaim(p_pembayaran uuid, p_terima boolean, p_alasan text default null, p_no_transaksi text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare v_status text; v_baris int;
begin
  if not public.is_bendahara() then raise exception 'Hanya bendahara' using errcode = '42501'; end if;
  select status into v_status from public.pembayaran where id = p_pembayaran for update;
  if v_status is null or v_status not in ('lunas_sementara','perlu_dicek','mencurigakan') then
    raise exception 'Klaim ini tidak sedang menunggu keputusan';
  end if;
  if p_terima then
    if p_no_transaksi is not null then
      update public.gopay_txn set pembayaran_id = p_pembayaran where no_transaksi = p_no_transaksi and pembayaran_id is null;
      get diagnostics v_baris = row_count;
      if v_baris = 0 then raise exception 'Transaksi GoPay itu tidak ditemukan atau sudah punya pemilik'; end if;
      update public.pembayaran set gopay_txn_id = p_no_transaksi where id = p_pembayaran;
    end if;
    update public.pembayaran set status = 'terkonfirmasi' where id = p_pembayaran;
  else
    if coalesce(trim(p_alasan), '') = '' then raise exception 'Alasan penolakan wajib diisi'; end if;
    delete from public.alokasi_pembayaran where pembayaran_id = p_pembayaran;
    update public.gopay_txn set pembayaran_id = null where pembayaran_id = p_pembayaran;
    update public.pembayaran set status = 'ditolak' where id = p_pembayaran;
  end if;
  insert into public.log_aktivitas (aktor, aksi, sesudah, alasan)
  values (auth.uid(), 'putuskan_klaim', jsonb_build_object('pembayaran', p_pembayaran, 'terima', p_terima, 'transaksi', p_no_transaksi), nullif(trim(coalesce(p_alasan, '')), ''));
end;
$$;

-- Hak eksekusi
revoke all on function public.ringkasan_saya(timestamptz), public.ajukan_pembayaran_qris(uuid[], int, timestamptz, text, text, jsonb),
  public.batalkan_klaim_saya(uuid), public.impor_gopay(jsonb), public.tetapkan_pemilik(text, text),
  public.putuskan_klaim(uuid, boolean, text, text) from public, anon;
grant execute on function public.ringkasan_saya(timestamptz), public.ajukan_pembayaran_qris(uuid[], int, timestamptz, text, text, jsonb),
  public.batalkan_klaim_saya(uuid), public.impor_gopay(jsonb), public.tetapkan_pemilik(text, text),
  public.putuskan_klaim(uuid, boolean, text, text) to authenticated;
