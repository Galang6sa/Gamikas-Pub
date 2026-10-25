-- KasKelas, M2: fungsi (RPC) yang dipanggil aplikasi
-- Semua perhitungan uang dan hak akses dikerjakan di server. Klien tidak dipercaya.
-- Fungsi bendahara memeriksa is_bendahara() DI DALAM fungsi (security definer melewati RLS).

-- ---------------------------------------------------------------
-- Siswa: ringkasan tagihan milik sendiri pada waktu tertentu
-- ---------------------------------------------------------------
create or replace function public.ringkasan_saya(p_waktu timestamptz default now())
returns table (tagihan_id uuid, minggu_id uuid, mulai date, akhir date, jatuh_tempo timestamptz,
               status text, pokok int, denda int, total int, denda_dibebaskan boolean)
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
         t.denda_dibebaskan
  from public.tagihan t
  join public.minggu m on m.id = t.minggu_id
  left join public.alokasi_pembayaran a on a.tagihan_id = t.id
  left join public.pembayaran p on p.id = a.pembayaran_id
       and p.status in ('terkonfirmasi','lunas_sementara','perlu_dicek')
  left join lateral public.hitung_tagihan(t.id, p_waktu) h on true
  where t.siswa_id = public.siswa_saya()
  order by m.mulai;
$$;

-- Siswa: total yang harus dibayar untuk tagihan terpilih (milik sendiri, belum lunas, ditagih)
create or replace function public.hitung_total_saya(p_tagihan uuid[], p_waktu timestamptz default now())
returns table (jumlah int, pokok int, denda int, total int)
language plpgsql stable security definer set search_path = public as $$
declare v_valid int; v_pokok int; v_denda int;
begin
  if public.siswa_saya() is null then
    raise exception 'Hanya untuk akun siswa' using errcode = '42501';
  end if;
  select count(*) into v_valid
  from public.tagihan t join public.minggu m on m.id = t.minggu_id
  where t.id = any(p_tagihan) and t.siswa_id = public.siswa_saya() and m.ditagih
    and not exists (select 1 from public.alokasi_pembayaran a where a.tagihan_id = t.id);
  if v_valid <> coalesce(array_length(p_tagihan, 1), 0) or v_valid = 0 then
    raise exception 'Tagihan tidak valid atau sudah lunas';
  end if;
  select sum(h.pokok), sum(h.denda) into v_pokok, v_denda
  from unnest(p_tagihan) x(id), lateral public.hitung_tagihan(x.id, p_waktu) h;
  return query select v_valid, v_pokok, v_denda, v_pokok + v_denda;
end;
$$;

-- ---------------------------------------------------------------
-- Bendahara
-- ---------------------------------------------------------------

-- Catat pembayaran manual (tunai atau QRIS di luar alur unggah bukti).
-- Tanpa p_tagihan: melunasi p_jumlah_minggu tagihan terlama yang belum lunas.
-- Denda dihitung pada p_waktu (riwayat sebelum denda_berlaku_mulai otomatis Rp0).
create or replace function public.catat_pembayaran_manual(
  p_nrp text, p_metode text, p_waktu timestamptz, p_jumlah_minggu int default null, p_tagihan uuid[] default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_siswa uuid; v_ids uuid[]; v_pay uuid; v_total int := 0; t uuid; h record;
begin
  if not public.is_bendahara() then raise exception 'Hanya bendahara' using errcode = '42501'; end if;
  if p_metode not in ('cash','qris') then raise exception 'Metode harus cash atau qris'; end if;
  if p_waktu > now() + interval '5 minutes' then raise exception 'Waktu bayar tidak boleh di masa depan'; end if;
  select id into v_siswa from public.siswa where nrp = lpad(trim(p_nrp), 3, '0');
  if v_siswa is null then raise exception 'NRP % tidak ditemukan', p_nrp; end if;

  if p_tagihan is not null then
    select array_agg(t.id order by m.mulai) into v_ids
    from public.tagihan t join public.minggu m on m.id = t.minggu_id
    where t.id = any(p_tagihan) and t.siswa_id = v_siswa and m.ditagih
      and not exists (select 1 from public.alokasi_pembayaran a where a.tagihan_id = t.id);
    if coalesce(array_length(v_ids, 1), 0) <> array_length(p_tagihan, 1) then
      raise exception 'Ada tagihan yang bukan milik siswa itu, libur, atau sudah lunas';
    end if;
  else
    if coalesce(p_jumlah_minggu, 0) < 1 then raise exception 'Isi jumlah minggu atau pilih tagihan'; end if;
    select array_agg(x.id order by x.mulai) into v_ids from (
      select t.id, m.mulai from public.tagihan t join public.minggu m on m.id = t.minggu_id
      where t.siswa_id = v_siswa and m.ditagih
        and not exists (select 1 from public.alokasi_pembayaran a where a.tagihan_id = t.id)
      order by m.mulai limit p_jumlah_minggu) x;
    if coalesce(array_length(v_ids, 1), 0) < p_jumlah_minggu then
      raise exception 'Siswa hanya punya % tagihan belum lunas, diminta %', coalesce(array_length(v_ids, 1), 0), p_jumlah_minggu;
    end if;
  end if;

  select coalesce(sum(h2.pokok + h2.denda), 0) into v_total
  from unnest(v_ids) x(id), lateral public.hitung_tagihan(x.id, p_waktu) h2;

  insert into public.pembayaran (siswa_id, metode, nominal_bukti, waktu_bayar, status)
  values (v_siswa, p_metode, v_total, p_waktu, 'terkonfirmasi') returning id into v_pay;

  foreach t in array v_ids loop
    select * into h from public.hitung_tagihan(t, p_waktu);
    insert into public.alokasi_pembayaran (pembayaran_id, tagihan_id, jumlah_pokok, jumlah_denda)
    values (v_pay, t, h.pokok, h.denda);
  end loop;

  insert into public.log_aktivitas (aktor, aksi, sesudah)
  values (auth.uid(), 'catat_pembayaran_manual',
          jsonb_build_object('pembayaran', v_pay, 'nrp', p_nrp, 'metode', p_metode, 'total', v_total, 'minggu', array_length(v_ids, 1)));
  return v_pay;
end;
$$;

create or replace function public.bebaskan_denda(p_tagihan uuid, p_alasan text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_bendahara() then raise exception 'Hanya bendahara' using errcode = '42501'; end if;
  if coalesce(trim(p_alasan), '') = '' then raise exception 'Alasan wajib diisi'; end if;
  if exists (select 1 from public.alokasi_pembayaran where tagihan_id = p_tagihan) then
    raise exception 'Tagihan sudah lunas, denda sudah terkunci. Batalkan pembayarannya dulu bila perlu.';
  end if;
  update public.tagihan set denda_dibebaskan = true, alasan_bebas = trim(p_alasan) where id = p_tagihan;
  if not found then raise exception 'Tagihan tidak ditemukan'; end if;
  insert into public.log_aktivitas (aktor, aksi, sesudah, alasan)
  values (auth.uid(), 'bebaskan_denda', jsonb_build_object('tagihan', p_tagihan), trim(p_alasan));
end;
$$;

create or replace function public.atur_minggu_libur(p_minggu uuid, p_libur boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_bendahara() then raise exception 'Hanya bendahara' using errcode = '42501'; end if;
  if p_libur and exists (
       select 1 from public.alokasi_pembayaran a join public.tagihan t on t.id = a.tagihan_id where t.minggu_id = p_minggu) then
    raise exception 'Minggu ini sudah ada pembayaran, tidak bisa dijadikan libur';
  end if;
  update public.minggu set ditagih = not p_libur where id = p_minggu;
  if not found then raise exception 'Minggu tidak ditemukan'; end if;
  insert into public.log_aktivitas (aktor, aksi, sesudah)
  values (auth.uid(), 'atur_minggu_libur', jsonb_build_object('minggu', p_minggu, 'libur', p_libur));
end;
$$;

-- Batalkan pembayaran: tagihan kembali belum lunas; baris GoPay (bila ada) kembali menjadi uang tanpa pemilik.
create or replace function public.batalkan_pembayaran(p_pembayaran uuid, p_alasan text) returns void
language plpgsql security definer set search_path = public as $$
declare v_lama jsonb;
begin
  if not public.is_bendahara() then raise exception 'Hanya bendahara' using errcode = '42501'; end if;
  if coalesce(trim(p_alasan), '') = '' then raise exception 'Alasan wajib diisi'; end if;
  select to_jsonb(p) into v_lama from public.pembayaran p where id = p_pembayaran and status <> 'dibatalkan';
  if v_lama is null then raise exception 'Pembayaran tidak ditemukan atau sudah dibatalkan'; end if;
  delete from public.alokasi_pembayaran where pembayaran_id = p_pembayaran;
  update public.gopay_txn set pembayaran_id = null where pembayaran_id = p_pembayaran;
  update public.pembayaran set status = 'dibatalkan' where id = p_pembayaran;
  insert into public.log_aktivitas (aktor, aksi, sebelum, alasan)
  values (auth.uid(), 'batalkan_pembayaran', v_lama, trim(p_alasan));
end;
$$;

-- ---------------------------------------------------------------
-- Hak eksekusi: hanya pengguna login. Pemeriksaan peran ada di dalam fungsi.
-- ---------------------------------------------------------------
revoke all on function public.ringkasan_saya(timestamptz), public.hitung_total_saya(uuid[], timestamptz),
  public.catat_pembayaran_manual(text, text, timestamptz, int, uuid[]), public.bebaskan_denda(uuid, text),
  public.atur_minggu_libur(uuid, boolean), public.batalkan_pembayaran(uuid, text) from public, anon;
grant execute on function public.ringkasan_saya(timestamptz), public.hitung_total_saya(uuid[], timestamptz),
  public.catat_pembayaran_manual(text, text, timestamptz, int, uuid[]), public.bebaskan_denda(uuid, text),
  public.atur_minggu_libur(uuid, boolean), public.batalkan_pembayaran(uuid, text) to authenticated;
